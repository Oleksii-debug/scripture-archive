import copy
import unittest

from scripture_archive_runtime.integration_delivery_readiness import (
    DELIVERY_READINESS_INPUT_SCHEMA,
    ExpectedPackage,
    IntegrationReadinessError,
    LaneDeliveryObservation,
    LaneReadinessSpec,
    PackageEvidence,
    evaluate_stage05_readiness,
    readiness_from_payload,
)

D2_BRANCH = "r06-dev2-materialization-05"
D3_BRANCH = "r06-dev3-gospels-materialization-05"
D4_BRANCH = "r06-3dev-c-d4-materialization-05"
D2_HEAD = "1" * 40
D3_HEAD = "2" * 40
D4_HEAD = "3" * 40


def specs():
    return [
        LaneReadinessSpec(
            lane="DEV-B",
            required_branches=(D2_BRANCH, D3_BRANCH),
            required_packages=(
                ExpectedPackage("DEV_LANE_SCRIPTURE_R06_D2_CLOSURE_03.zip", (D2_BRANCH,)),
                ExpectedPackage("DEV_LANE_SCRIPTURE_R06_D3_CLOSURE_03.zip", (D3_BRANCH,)),
                ExpectedPackage("DEV_LANE_SCRIPTURE_R06_3DEVB_MATERIALIZATION_05.zip", (D2_BRANCH, D3_BRANCH)),
            ),
        ),
        LaneReadinessSpec(
            lane="DEV-C",
            required_branches=(D4_BRANCH,),
            required_packages=(
                ExpectedPackage("DEV_LANE_SCRIPTURE_R06_3DEVC_INTEGRATION_05.zip", (D4_BRANCH,)),
            ),
        ),
    ]


def pkg(name, heads):
    return PackageEvidence(
        filename=name,
        drive_id="drive-id",
        sha256="a" * 64,
        raw_readback_pass=True,
        zip_crc_pass=True,
        pinned_heads=heads,
    )


def observations():
    return [
        LaneDeliveryObservation(
            lane="DEV-B",
            report_status="COMPLETED",
            report_terminal=True,
            report_readback_pass=True,
            integration_allowed=True,
            reported_heads={D2_BRANCH: D2_HEAD, D3_BRANCH: D3_HEAD},
            live_heads={D2_BRANCH: D2_HEAD, D3_BRANCH: D3_HEAD},
            packages={
                "DEV_LANE_SCRIPTURE_R06_D2_CLOSURE_03.zip": pkg("DEV_LANE_SCRIPTURE_R06_D2_CLOSURE_03.zip", {D2_BRANCH: D2_HEAD}),
                "DEV_LANE_SCRIPTURE_R06_D3_CLOSURE_03.zip": pkg("DEV_LANE_SCRIPTURE_R06_D3_CLOSURE_03.zip", {D3_BRANCH: D3_HEAD}),
                "DEV_LANE_SCRIPTURE_R06_3DEVB_MATERIALIZATION_05.zip": pkg("DEV_LANE_SCRIPTURE_R06_3DEVB_MATERIALIZATION_05.zip", {D2_BRANCH: D2_HEAD, D3_BRANCH: D3_HEAD}),
            },
            materialization_manifest_verified=True,
            final_input_validation_passed=True,
        ),
        LaneDeliveryObservation(
            lane="DEV-C",
            report_status="COMPLETED",
            report_terminal=True,
            report_readback_pass=True,
            integration_allowed=True,
            reported_heads={D4_BRANCH: D4_HEAD},
            live_heads={D4_BRANCH: D4_HEAD},
            packages={
                "DEV_LANE_SCRIPTURE_R06_3DEVC_INTEGRATION_05.zip": pkg("DEV_LANE_SCRIPTURE_R06_3DEVC_INTEGRATION_05.zip", {D4_BRANCH: D4_HEAD}),
            },
            materialization_manifest_verified=True,
            final_input_validation_passed=True,
        ),
    ]


class IntegrationReadinessTests(unittest.TestCase):
    def test_exact_terminal_inputs_are_ready(self):
        result = evaluate_stage05_readiness(specs(), observations())
        self.assertTrue(result["ready_for_final_1196_gate"])
        self.assertEqual(result["blocker_codes"], [])
        self.assertEqual(result["blocker_count"], 0)

    def test_running_report_fails_closed(self):
        obs = observations()
        obs[0] = LaneDeliveryObservation(**{**obs[0].__dict__, "report_status": "RUNNING", "report_terminal": False})
        result = evaluate_stage05_readiness(specs(), obs)
        self.assertFalse(result["ready_for_final_1196_gate"])
        self.assertIn("REPORT_NOT_TERMINAL", result["blocker_codes"])

    def test_stale_report_head_fails_closed(self):
        obs = observations()
        obs[0] = LaneDeliveryObservation(**{**obs[0].__dict__, "reported_heads": {D2_BRANCH: "4" * 40, D3_BRANCH: D3_HEAD}})
        result = evaluate_stage05_readiness(specs(), obs)
        self.assertIn("REPORT_HEAD_STALE", result["blocker_codes"])

    def test_missing_package_fails_closed(self):
        obs = observations()
        packages = dict(obs[0].packages)
        packages.pop("DEV_LANE_SCRIPTURE_R06_D2_CLOSURE_03.zip")
        obs[0] = LaneDeliveryObservation(**{**obs[0].__dict__, "packages": packages})
        result = evaluate_stage05_readiness(specs(), obs)
        self.assertIn("PACKAGE_MISSING", result["blocker_codes"])

    def test_unverified_readback_crc_or_package_head_fails(self):
        obs = observations()
        name = "DEV_LANE_SCRIPTURE_R06_D2_CLOSURE_03.zip"
        packages = dict(obs[0].packages)
        packages[name] = PackageEvidence(name, "drive", "b" * 64, False, False, {D2_BRANCH: "5" * 40})
        obs[0] = LaneDeliveryObservation(**{**obs[0].__dict__, "packages": packages})
        result = evaluate_stage05_readiness(specs(), obs)
        self.assertIn("PACKAGE_READBACK_MISSING", result["blocker_codes"])
        self.assertIn("PACKAGE_INTEGRITY_UNVERIFIED", result["blocker_codes"])
        self.assertIn("PACKAGE_HEAD_STALE", result["blocker_codes"])

    def test_manifest_and_final_input_are_separate_hard_gates(self):
        obs = observations()
        obs[1] = LaneDeliveryObservation(**{**obs[1].__dict__, "materialization_manifest_verified": False, "final_input_validation_passed": False})
        result = evaluate_stage05_readiness(specs(), obs)
        self.assertIn("MATERIALIZATION_MANIFEST_UNVERIFIED", result["blocker_codes"])
        self.assertIn("FINAL_INPUT_UNVERIFIED", result["blocker_codes"])

    def test_report_readback_and_explicit_integration_permission_are_required(self):
        obs = observations()
        obs[1] = LaneDeliveryObservation(**{**obs[1].__dict__, "report_readback_pass": False, "integration_allowed": False})
        result = evaluate_stage05_readiness(specs(), obs)
        self.assertIn("REPORT_READBACK_MISSING", result["blocker_codes"])
        self.assertIn("INTEGRATION_NOT_ALLOWED", result["blocker_codes"])

    def test_missing_or_unexpected_lane_fails(self):
        result = evaluate_stage05_readiness(specs(), observations()[:1])
        self.assertIn("REQUIRED_LANE_MISSING", result["blocker_codes"])
        extra = observations() + [LaneDeliveryObservation("DEV-X", "COMPLETED", True, True, True, {}, {}, {}, True, True)]
        result = evaluate_stage05_readiness(specs(), extra)
        self.assertIn("UNEXPECTED_LANE_OBSERVATION", result["blocker_codes"])

    def test_duplicate_lane_is_rejected_as_ambiguous(self):
        with self.assertRaises(IntegrationReadinessError):
            evaluate_stage05_readiness(specs(), observations() + [observations()[0]])

    def test_placeholder_or_non_sha_report_head_is_rejected(self):
        obs = observations()
        obs[0] = LaneDeliveryObservation(**{**obs[0].__dict__, "reported_heads": {D2_BRANCH: "__D2_HEAD__", D3_BRANCH: D3_HEAD}})
        with self.assertRaises(IntegrationReadinessError):
            evaluate_stage05_readiness(specs(), obs)

    def test_payload_api_is_deterministic(self):
        payload = {
            "schema": DELIVERY_READINESS_INPUT_SCHEMA,
            "specs": [
                {
                    "lane": "DEV-C",
                    "required_branches": [D4_BRANCH],
                    "required_packages": [{"filename": "DEV_LANE_SCRIPTURE_R06_3DEVC_INTEGRATION_05.zip", "required_head_branches": [D4_BRANCH]}],
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
                        "DEV_LANE_SCRIPTURE_R06_3DEVC_INTEGRATION_05.zip": {
                            "filename": "DEV_LANE_SCRIPTURE_R06_3DEVC_INTEGRATION_05.zip",
                            "drive_id": "drive-c",
                            "sha256": "c" * 64,
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
        first = readiness_from_payload(copy.deepcopy(payload))
        second = readiness_from_payload(copy.deepcopy(payload))
        self.assertEqual(first, second)
        self.assertTrue(first["ready_for_final_1196_gate"])


if __name__ == "__main__":
    unittest.main()
