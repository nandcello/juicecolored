import time
import unittest
from types import SimpleNamespace
from unittest.mock import Mock

from worker import device_values, perform


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


if __name__ == "__main__":
    unittest.main()
