"""Outbound-only Jarvis bridge. Device commands are sent at most once per job."""

import asyncio
import ipaddress
import json
import logging
import os
from pathlib import Path
import secrets
import socket
import threading
import time

from convex import ConvexClient
from miio.miioprotocol import MiIOProtocol

LIGHT_METHODS = {
    "get_prop", "set_power", "set_bright", "set_ct_abx", "set_rgb", "set_hsv",
    "set_scene", "cron_add", "cron_del", "cron_get", "set_default", "stop_cf", "start_cf",
}
FAN_PROPERTIES = {(2, n) for n in range(1, 11)} | {(3, 1)}
HELLO = bytes.fromhex("21310020" + "ff" * 28)


def device_values(value):
    # Convex numbers arrive as floats; Xiaomi's integer properties need JSON integers.
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, list):
        return [device_values(item) for item in value]
    if isinstance(value, dict):
        return {key: device_values(item) for key, item in value.items()}
    return value


def validate_request(job, device):
    params = job["params"]
    if job["externalId"] != device["id"] or not isinstance(params, list):
        raise ValueError("Invalid device request")
    if device["model"] == "dmaker.fan.p18":
        if job["method"] not in {"get_properties", "set_properties"} or not 1 <= len(params) <= 16:
            raise ValueError("Unsupported fan request")
        for prop in params:
            if str(prop.get("did")) != device["id"] or (prop.get("siid"), prop.get("piid")) not in FAN_PROPERTIES:
                raise ValueError("Unsupported fan property")
    elif device["model"] != "yeelink.light.color4" or job["method"] not in LIGHT_METHODS:
        raise ValueError("Unsupported light request")


def perform(job, device, may_send, protocol_factory=MiIOProtocol, now=time.time):
    validate_request(job, device)
    # Leave enough time for a device acknowledgement. Never send a stale command.
    if now() * 1000 + 5000 >= job["expiresAt"]:
        raise TimeoutError("Device request expired before delivery")
    protocol = protocol_factory(ip=device["ip"], token=device["token"], timeout=4)
    hello = protocol.send_handshake(retry_count=0)
    if int.from_bytes(hello.header.value.device_id, "big") != int(device["id"]):
        raise ValueError("Device address changed")
    if not may_send() or now() * 1000 + 4500 >= job["expiresAt"]:
        raise TimeoutError("Device request expired before delivery")
    # Even an acknowledgement timeout can follow successful physical delivery.
    # Recovery must never resend this request, including direction nudges.
    return protocol.send(job["method"], device_values(job["params"]), retry_count=0)


class Addresses:
    """Rediscover configured device IDs after DHCP changes, without using the cloud."""

    def __init__(self, devices, subnet, cache):
        self.devices = {d["id"]: dict(d) for d in devices}
        self.subnet = ipaddress.ip_network(subnet)
        if not self.subnet.is_private or self.subnet.prefixlen < 24:
            raise ValueError("Use a private /24 or smaller home subnet")
        self.cache = cache
        self.lock = threading.Lock()
        self.wake = threading.Event()
        if cache.exists():
            for did, ip in json.loads(cache.read_text()).items():
                if did in self.devices and ipaddress.ip_address(ip) in self.subnet:
                    self.devices[did]["ip"] = ip

    def get(self, did):
        with self.lock:
            return dict(self.devices[did])

    def probe(self, addresses, timeout):
        found = {}
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.settimeout(0.2)
            for ip in addresses:
                sock.sendto(HELLO, (str(ip), 54321))
            deadline = time.monotonic() + timeout
            while time.monotonic() < deadline:
                try:
                    data, (ip, port) = sock.recvfrom(2048)
                    if port != 54321 or ipaddress.ip_address(ip) not in self.subnet:
                        continue
                    if len(data) == 32 and data[:2] == b"!1":
                        did = str(int.from_bytes(data[8:12], "big"))
                        if did in self.devices:
                            found[did] = ip
                            if len(found) == len(self.devices):
                                break
                except socket.timeout:
                    continue
        return found

    def refresh(self):
        with self.lock:
            current = [d["ip"] for d in self.devices.values()]
        found = self.probe(current, 2)
        if len(found) != len(self.devices):
            found.update(self.probe(self.subnet.hosts(), 4))
        if found:
            with self.lock:
                for did, ip in found.items():
                    self.devices[did]["ip"] = ip
                saved = {did: d["ip"] for did, d in self.devices.items()}
            temporary = self.cache.with_suffix(".tmp")
            temporary.write_text(json.dumps(saved))
            temporary.chmod(0o600)
            temporary.replace(self.cache)

    def run(self):
        while True:
            try:
                self.refresh()
            except Exception:
                print("Home network discovery unavailable; will reconnect.", flush=True)
            self.wake.wait(60)
            self.wake.clear()


async def main():
    # Libraries can log protocol payloads; keep credentials and device state out of logs.
    logging.disable(logging.CRITICAL)
    config = Path(os.environ.get("JARVIS_BRIDGE_CONFIG", str(Path.home() / ".config/jarvis-bridge")))
    settings = json.loads((config / "bridge.json").read_text())
    addresses = Addresses(json.loads((config / "devices.json").read_text()), settings["subnet"], config / "addresses.json")
    secret = settings["secret"]
    url = settings["url"]
    ready = threading.Event()

    def heartbeat():
        client = ConvexClient(url)
        while True:
            if ready.is_set():
                try:
                    client.mutation("localBridge:heartbeat", {"secret": secret})
                except Exception:
                    print("Bridge heartbeat unavailable; reconnecting.", flush=True)
            time.sleep(30)

    threading.Thread(target=heartbeat, daemon=True).start()
    threading.Thread(target=addresses.run, daemon=True).start()
    delay = 1
    while True:
        try:
            client = ConvexClient(url)
            client.mutation("localBridge:heartbeat", {"secret": secret})
            ready.set()
            print("Jarvis local bridge connected.", flush=True)
            # The synchronous iterator blocks other Python threads while idle.
            # Async iteration lets heartbeats and address discovery keep running.
            async for ids in client.subscribe("localBridge:pending", {"secret": secret}):
                delay = 1
                for job_id in ids:
                    identity = {"secret": secret, "id": job_id, "claim": secrets.token_urlsafe(24)}
                    job = client.mutation("localBridge:claim", identity)
                    if job is None:
                        continue
                    try:
                        result = perform(job, addresses.get(job["externalId"]), lambda: client.mutation("localBridge:maySend", identity))
                        outcome = {"result": result}
                    except Exception as exc:
                        addresses.wake.set()
                        # Never transmit raw library exceptions, which can contain packets.
                        outcome = {"error": "Device did not confirm the local request. Refresh before retrying."}
                        print("Local request failed: " + type(exc).__name__, flush=True)
                    # A failure submitting the result must not cause another device command.
                    client.mutation("localBridge:complete", {**identity, **outcome})
        except Exception as exc:
            ready.clear()
            print("Bridge connection interrupted: " + type(exc).__name__, flush=True)
            await asyncio.sleep(delay)
            delay = min(delay * 2, 30)


if __name__ == "__main__":
    asyncio.run(main())
