import unittest

from scripture_archive_runtime.integration_quality_gate import (
    IntegrationQualityGateError,
    QUALITY_GATE_INPUT_SCHEMA,
    evaluate_quality_blockers,
)


def payload():
    return {
        "schema": QUALITY_GATE_INPUT_SCHEMA,
        "repository": "Oleksii-debug/scripture-archive",
        "observed_at": "2026-08-23T15:30:00+03:00",
        "issues": [
            {
                "issue_number": 60,
                "state": "open",
                "title": "D4 source-scope defect",
                "owner_lane": "DEV09",
                "blocks_integration": True,
            }
        ],
    }


class IntegrationQualityGateTests(unittest.TestCase):
    def test_open_explicit_blocker_stops_candidate(self):
        result = evaluate_quality_blockers(payload())
        self.assertFalse(result["ready_for_isolated_candidate"])
        self.assertEqual(result["open_blocker_count"], 1)
        self.assertEqual(result["open_blockers"][0]["issue_number"], 60)

    def test_closed_blocker_allows_candidate(self):
        data = payload()
        data["issues"][0]["state"] = "closed"
        result = evaluate_quality_blockers(data)
        self.assertTrue(result["ready_for_isolated_candidate"])
        self.assertEqual(result["open_blockers"], [])

    def test_nonblocking_open_issue_does_not_block(self):
        data = payload()
        data["issues"][0]["blocks_integration"] = False
        result = evaluate_quality_blockers(data)
        self.assertTrue(result["ready_for_isolated_candidate"])

    def test_duplicate_issue_snapshot_is_rejected(self):
        data = payload()
        data["issues"].append(dict(data["issues"][0]))
        with self.assertRaises(IntegrationQualityGateError):
            evaluate_quality_blockers(data)

    def test_ambiguous_blocking_flag_is_rejected(self):
        data = payload()
        data["issues"][0]["blocks_integration"] = "yes"
        with self.assertRaises(IntegrationQualityGateError):
            evaluate_quality_blockers(data)


if __name__ == "__main__":
    unittest.main()
