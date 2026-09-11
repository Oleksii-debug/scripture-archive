import copy
import unittest

from scripture_archive_runtime.integration_delivery_readiness import IntegrationReadinessError
from scripture_archive_runtime.integration_exact_input import (
    EXACT_DELIVERY_INPUT_SCHEMA,
    exact_readiness_from_payload,
)

D4_BRANCH = "r06-3dev-c-d4-materialization-05"
D4_HEAD = "3" * 40
PACKAGE = "DEV_LANE_SCRIPTURE_R06_3DEVC_INTEGRATION_05.zip"
DRIVE_ID = "1ExactDriveIdentityForDevC"
SHA256 = "c" * 64


def payload():
    return {
        "schema": EXACT_DELIVERY_INPUT_SCHEMA,
        "specs": [
            {
                "lane": "DEV-C",
                "required_branches": [D4_BRANCH],
                "required_packages": [
                    {
                        "filename": PACKAGE,
                        "required_head_branches": [D4_BRANCH],
                        "expected_drive_id": DRIVE_ID,
                        "expected_sha256": SHA256,
                    }
                ],
            }
        ],
        "observations": [
            {
                "lane": "DEV-C",
                "report_status": "COMPLETED",
                "report_terminal": True,
                "report_readback_pass": True,
                "integration_allowed": True,
                "reported_heads": {D4_BRANCH: D4_HEAD},
                "live_heads": {D4_BRANCH: D4_HEAD},
                "packages": {
                    PACKAGE: {
                        "filename": PACKAGE,
                        "drive_id": DRIVE_ID,
                        "sha256": SHA256,
                        "raw_readback_pass": True,
                        "zip_crc_pass": True,
                        "pinned_heads": {D4_BRANCH: D4_HEAD},
                    }
                },
                "materialization_manifest_verified": True,
                "final_input_validation_passed": True,
            }
        ],
    }


class ExactIntegrationInputTests(unittest.TestCase):
    def test_exact_package_identity_and_base_readiness_pass(self):
        result = exact_readiness_from_payload(payload())
        self.assertTrue(result["ready_for_final_1196_gate"])
        self.assertEqual(result["blocker_codes"], [])
        self.assertEqual(result["blocker_count"], 0)
        self.assertTrue(result["package_identity_results"][0]["ready"])

    def test_wrong_drive_id_fails_closed(self):
        data = payload()
        data["observations"][0]["packages"][PACKAGE]["drive_id"] = "wrong-drive-id"
        result = exact_readiness_from_payload(data)
        self.assertFalse(result["ready_for_final_1196_gate"])
        self.assertIn("PACKAGE_DRIVE_ID_MISMATCH", result["blocker_codes"])

    def test_wrong_sha256_fails_closed(self):
        data = payload()
        data["observations"][0]["packages"][PACKAGE]["sha256"] = "d" * 64
        result = exact_readiness_from_payload(data)
        self.assertFalse(result["ready_for_final_1196_gate"])
        self.assertIn("PACKAGE_SHA256_MISMATCH", result["blocker_codes"])

    def test_unexpected_package_evidence_fails_closed(self):
        data = payload()
        data["observations"][0]["packages"]["EXTRA.zip"] = {
            "filename": "EXTRA.zip",
            "drive_id": "extra-drive",
            "sha256": "e" * 64,
            "raw_readback_pass": True,
            "zip_crc_pass": True,
            "pinned_heads": {D4_BRANCH: D4_HEAD},
        }
        result = exact_readiness_from_payload(data)
        self.assertFalse(result["ready_for_final_1196_gate"])
        self.assertIn("UNEXPECTED_PACKAGE_EVIDENCE", result["blocker_codes"])

    def test_missing_expected_package_identity_is_input_error(self):
        data = payload()
        del data["specs"][0]["required_packages"][0]["expected_sha256"]
        with self.assertRaises(IntegrationReadinessError):
            exact_readiness_from_payload(data)

    def test_base_stale_head_still_blocks_strict_gate(self):
        data = payload()
        data["observations"][0]["reported_heads"][D4_BRANCH] = "4" * 40
        result = exact_readiness_from_payload(data)
        self.assertFalse(result["ready_for_final_1196_gate"])
        self.assertIn("REPORT_HEAD_STALE", result["blocker_codes"])
        self.assertTrue(result["package_identity_results"][0]["ready"])

    def test_result_is_deterministic(self):
        data = payload()
        first = exact_readiness_from_payload(copy.deepcopy(data))
        second = exact_readiness_from_payload(copy.deepcopy(data))
        self.assertEqual(first, second)


if __name__ == "__main__":
    unittest.main()
