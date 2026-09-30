from __future__ import annotations

import unittest

from scripture_archive_platform.transport.contracts import validate_request_shape


API_VERSION = "scripture.transport.v1"
UPDATE_COMMANDS = (
    "application_update.apply_and_restart",
    "application_update.commit_post_restart_health",
)


def request(command: str, payload=None, *, request_id: str = "update-contract-rid"):
    return {
        "api_version": API_VERSION,
        "request_id": request_id,
        "command": command,
        "payload": {} if payload is None else payload,
    }


class ApplicationUpdateTransportContractTests(unittest.TestCase):
    def test_host_owned_update_commands_are_allowlisted_with_empty_payload(self) -> None:
        for command in UPDATE_COMMANDS:
            with self.subTest(command=command):
                rid, parsed_command, payload = validate_request_shape(request(command))
                self.assertEqual(rid, "update-contract-rid")
                self.assertEqual(parsed_command, command)
                self.assertEqual(payload, {})

    def test_browser_cannot_supply_update_process_path_or_identity_authority(self) -> None:
        injected_payloads = (
            {"pid": 1},
            {"path": r"C:\attacker.exe"},
            {"version": "9.9.9"},
            {"sha256": "0" * 64},
        )
        for command in UPDATE_COMMANDS:
            for payload in injected_payloads:
                with self.subTest(command=command, payload=payload):
                    with self.assertRaisesRegex(ValueError, "empty payload"):
                        validate_request_shape(request(command, payload))


if __name__ == "__main__":
    unittest.main()
