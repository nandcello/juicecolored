import threading
import time
import unittest
from types import SimpleNamespace
from unittest.mock import Mock

from worker import DeviceLanes, deliver, device_values, perform


class DeliveryTests(unittest.TestCase):
    def setUp(self):
        self.device = {"id": "123", "ip": "192.168.254.126", "token": "0" * 32, "model": "yeelink.light.color4"}
        self.job = {"externalId": "123", "method": "set_power", "params": ["on", "smooth", 500], "expiresAt": (time.time() + 12) * 1000}
        self.protocol = Mock()
        self.protocol.send_handshake.return_value = SimpleNamespace(header=SimpleNamespace(value=SimpleNamespace(device_id=(123).to_bytes(4, "big"))))
        self.factory = Mock(return_value=self.protocol)

    def test_lost_ack_is_never_retried(self):
        self.protocol.send.side_effect = TimeoutError()
        with self.assertRaises(TimeoutError):
            perform(self.job, self.device, lambda: True, self.factory)
        self.protocol.send.assert_called_once_with("set_power", self.job["params"], retry_count=0)

    def test_expired_and_cancelled_requests_are_not_sent(self):
        self.job["expiresAt"] = time.time() * 1000
        with self.assertRaises(TimeoutError):
            perform(self.job, self.device, lambda: True, self.factory)
        self.factory.assert_not_called()
        self.job["expiresAt"] = (time.time() + 12) * 1000
        with self.assertRaises(TimeoutError):
            perform(self.job, self.device, lambda: False, self.factory)
        self.protocol.send.assert_not_called()

    def test_changed_address_cannot_target_a_different_device(self):
        self.protocol.send_handshake.return_value.header.value.device_id = (456).to_bytes(4, "big")
        with self.assertRaises(ValueError):
            perform(self.job, self.device, lambda: True, self.factory)
        self.protocol.send.assert_not_called()

    def test_firmware_and_network_commands_are_not_allowed(self):
        self.job["method"] = "miIO.config_router"
        with self.assertRaises(ValueError):
            perform(self.job, self.device, lambda: True, self.factory)
        self.factory.assert_not_called()

    def test_convex_numbers_keep_miot_integer_types_and_booleans(self):
        value = device_values([{"siid": 2.0, "piid": 10.0, "value": 50.0}, True])
        self.assertIs(type(value[0]["value"]), int)
        self.assertIs(type(value[1]), bool)


class LaneTests(unittest.TestCase):
    def setUp(self):
        self.devices = {
            "1": {"id": "1", "ip": "192.168.254.10", "token": "0" * 32, "model": "dmaker.fan.p18"},
            "2": {"id": "2", "ip": "192.168.254.11", "token": "0" * 32, "model": "yeelink.light.color4"},
        }
        self.addresses = SimpleNamespace(get=lambda did: dict(self.devices[did]), wake=threading.Event())
        self.client = Mock()
        self.client.mutation.return_value = True
        self.sent = []
        self.release_fan = threading.Event()

        def factory(ip, token, timeout):
            did = next(d["id"] for d in self.devices.values() if d["ip"] == ip)
            protocol = Mock()
            protocol.send_handshake.return_value = SimpleNamespace(header=SimpleNamespace(value=SimpleNamespace(device_id=int(did).to_bytes(4, "big"))))

            def send(method, params, retry_count):
                if did == "1":
                    self.release_fan.wait(3)
                self.sent.append((did, method, params))
                return [{"code": 0}]

            protocol.send.side_effect = send
            return protocol

        self.lanes = DeviceLanes(lambda identity, job: deliver(self.client, identity, job, self.addresses, factory))

    def job(self, did, method, params):
        return {"externalId": did, "method": method, "params": params, "expiresAt": (time.time() + 12) * 1000}

    def test_a_slow_device_does_not_delay_another_device(self):
        fan = self.lanes.submit("1", {"id": "a"}, self.job("1", "set_properties", [{"did": "1", "siid": 2, "piid": 10, "value": 60}, {"did": "1", "siid": 2, "piid": 4, "value": False}]))
        light = self.lanes.submit("2", {"id": "b"}, self.job("2", "set_bright", [60, "smooth", 500]))
        light.result(2)
        self.assertEqual(self.sent, [("2", "set_bright", [60, "smooth", 500])])
        self.assertFalse(fan.done())
        self.release_fan.set()
        fan.result(2)
        # The combined fan change is delivered as one protocol request with both properties.
        self.assertEqual(self.sent[1], ("1", "set_properties", [{"did": "1", "siid": 2, "piid": 10, "value": 60}, {"did": "1", "siid": 2, "piid": 4, "value": False}]))

    def test_one_device_lane_stays_in_order_and_sends_each_job_once(self):
        self.release_fan.set()
        first = self.lanes.submit("1", {"id": "a"}, self.job("1", "set_properties", [{"did": "1", "siid": 2, "piid": 10, "value": 30}]))
        second = self.lanes.submit("1", {"id": "b"}, self.job("1", "set_properties", [{"did": "1", "siid": 2, "piid": 9, "value": 1}]))
        first.result(2), second.result(2)
        self.assertEqual([entry[2][0]["piid"] for entry in self.sent], [10, 9])
        completions = [c for c in self.client.mutation.call_args_list if c.args[0] == "localBridge:complete"]
        self.assertEqual(len(completions), 2)

    def test_failed_delivery_reports_without_resending(self):
        self.devices["2"]["model"] = "unsupported"
        self.lanes.submit("2", {"id": "b"}, self.job("2", "set_bright", [60, "smooth", 500])).result(2)
        self.assertEqual(self.sent, [])
        complete = [c for c in self.client.mutation.call_args_list if c.args[0] == "localBridge:complete"]
        self.assertIn("error", complete[0].args[1])
        self.assertTrue(self.addresses.wake.is_set())


if __name__ == "__main__":
    unittest.main()
