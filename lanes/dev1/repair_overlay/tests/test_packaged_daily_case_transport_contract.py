import unittest

from scripture_archive_platform.application.service import PlatformApplication
from scripture_archive_platform.transport.contracts import validate_request_shape


class _DailyCaseGateway:
    def __init__(self):
        self.calls = 0

    def get_daily_case(self):
        self.calls += 1
        return {
            "schema": "scripture.player.daily_case.v1",
            "read_only": True,
            "daily_case": {
                "schema": "daily-case.v1",
                "case_id": "2026-09-12",
                "title": "Daily Case",
                "item_count": 0,
                "items": [],
            },
            "linear": ["Daily Case 2026-09-12: Daily Case", "No eligible source-audited tasks."],
            "candidate_count": 0,
            "truth": {"mutation": False, "inferred_source_claims": False},
        }


class PackagedDailyCaseTransportContractTests(unittest.TestCase):
    @staticmethod
    def _request(payload):
        return {
            "api_version": "scripture.transport.v1",
            "request_id": "daily-case-contract",
            "command": "player.get_daily_case",
            "payload": payload,
        }

    def test_versioned_transport_allowlists_only_empty_daily_case_payload(self):
        rid, command, payload = validate_request_shape(self._request({}))
        self.assertEqual(rid, "daily-case-contract")
        self.assertEqual(command, "player.get_daily_case")
        self.assertEqual(payload, {})

        for forbidden in (
            {"limit": 50},
            {"node_id": "LN01-N01"},
            {"include_locked_evidence": True},
        ):
            with self.subTest(payload=forbidden):
                with self.assertRaises(ValueError):
                    validate_request_shape(self._request(forbidden))

    def test_platform_handle_reaches_read_only_gateway_through_real_contract(self):
        gateway = _DailyCaseGateway()
        app = object.__new__(PlatformApplication)
        app.player_gateway = gateway

        response = app.handle(self._request({}))
        self.assertTrue(response["ok"])
        self.assertEqual(response["data"]["schema"], "scripture.player.daily_case.v1")
        self.assertTrue(response["data"]["read_only"])
        self.assertEqual(gateway.calls, 1)

        rejected = app.handle(self._request({"limit": 1}))
        self.assertFalse(rejected["ok"])
        self.assertEqual(rejected["error"]["code"], "VALIDATION_ERROR")
        self.assertEqual(gateway.calls, 1)


if __name__ == "__main__":
    unittest.main()
