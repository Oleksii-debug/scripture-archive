import unittest

from scripture_archive_runtime.evidence import Claim, EvidenceRecord, EvidenceRuntime, PassageRef
from scripture_archive_runtime.models import Confidence
from scripture_archive_runtime.research_workbench import build_research_workbench


class ResearchWorkbenchClaimShadowTests(unittest.TestCase):
    def test_gated_claim_id_shadows_visible_passage_id(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-VISIBLE",
                (PassageRef("CL-SECRET", "Mark", 1, 1, witness="Mark"),),
                "Visible proposition",
                Confidence.T1,
                witness="Mark",
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-LOCKED",
                (PassageRef("P-LOCKED", "Luke", 1, 1, witness="Luke"),),
                "Locked proposition",
                Confidence.T1,
                witness="Luke",
            )
        )
        runtime.add_claim(
            Claim(
                "CL-SECRET",
                "Claim gated by locked evidence",
                Confidence.T1,
                required_evidence_ids=("EV-LOCKED",),
            )
        )
        runtime.unlock("EV-VISIBLE")

        with self.assertRaisesRegex(ValueError, "passage CL-SECRET collides with non-visible claim id"):
            build_research_workbench(runtime)

        full = build_research_workbench(runtime, unlocked_only=False).to_dict()
        self.assertIn("CL-SECRET", [item["passage_id"] for item in full["passages"]])
        self.assertIn("CL-SECRET", [item["claim_id"] for item in full["claims"]])

    def test_gated_claim_id_shadows_visible_evidence_id(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "CL-SECRET",
                (PassageRef("P-VISIBLE", "Mark", 1, 1, witness="Mark"),),
                "Visible proposition",
                Confidence.T1,
                witness="Mark",
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-LOCKED",
                (PassageRef("P-LOCKED", "Luke", 1, 1, witness="Luke"),),
                "Locked proposition",
                Confidence.T1,
                witness="Luke",
            )
        )
        runtime.add_claim(
            Claim(
                "CL-SECRET",
                "Claim gated by locked evidence",
                Confidence.T1,
                required_evidence_ids=("EV-LOCKED",),
            )
        )
        runtime.unlock("CL-SECRET")

        with self.assertRaisesRegex(ValueError, "evidence CL-SECRET collides with non-visible claim id"):
            build_research_workbench(runtime)

        full = build_research_workbench(runtime, unlocked_only=False).to_dict()
        self.assertIn("CL-SECRET", [item["evidence_id"] for item in full["evidence"]])
        self.assertIn("CL-SECRET", [item["claim_id"] for item in full["claims"]])


if __name__ == "__main__":
    unittest.main()
