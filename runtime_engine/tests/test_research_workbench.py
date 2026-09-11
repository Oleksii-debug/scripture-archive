import unittest

from scripture_archive_runtime.evidence import Claim, EvidenceRecord, EvidenceRuntime, PassageRef
from scripture_archive_runtime.models import Confidence
from scripture_archive_runtime.research_workbench import build_research_workbench


class ResearchWorkbenchTests(unittest.TestCase):
    def runtime(self) -> EvidenceRuntime:
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-MARK",
                (PassageRef("MK14:13", "Mark", 14, 13, witness="Mark"),),
                "Mark records two disciples being sent",
                Confidence.T1,
                witness="Mark",
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-LUKE",
                (PassageRef("LK22:8", "Luke", 22, 8, witness="Luke"),),
                "Luke names Peter and John",
                Confidence.T1,
                witness="Luke",
            )
        )
        runtime.add_claim(
            Claim(
                "CL-COMPARE",
                "The witnesses provide different stated detail",
                Confidence.T2,
                source_scope="Mark 14:13; Luke 22:8",
                uncertainty="No harmonized identity is inferred from Mark's omission",
                required_evidence_ids=("EV-MARK", "EV-LUKE"),
            )
        )
        runtime.add_claim(
            Claim(
                "CL-LOCKED",
                "This claim must remain hidden until all required evidence is visible",
                Confidence.T1,
                required_evidence_ids=("EV-LUKE",),
            )
        )
        return runtime

    def collision_runtime(self, *, claim_collision: bool = False) -> EvidenceRuntime:
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-VISIBLE",
                (PassageRef("P-VISIBLE", "Mark", 1, 1, witness="Mark"),),
                "Visible proposition",
                Confidence.T1,
                witness="Mark",
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-SECRET",
                (PassageRef("P-SECRET", "Luke", 1, 1, witness="Luke"),),
                "Locked proposition",
                Confidence.T1,
                witness="Luke",
            )
        )
        if claim_collision:
            runtime.add_claim(
                Claim(
                    "EV-SECRET",
                    "Visible support must not leak a hidden evidence identifier through claim identity",
                    Confidence.T1,
                    required_evidence_ids=("EV-VISIBLE",),
                )
            )
        runtime.unlock("EV-VISIBLE")
        return runtime

    def test_default_projection_is_unlocked_only_and_claims_fail_closed(self):
        runtime = self.runtime()
        runtime.unlock("EV-MARK")

        view = build_research_workbench(runtime).to_dict()

        self.assertEqual([item["evidence_id"] for item in view["evidence"]], ["EV-MARK"])
        self.assertEqual([item["passage_id"] for item in view["passages"]], ["MK14:13"])
        self.assertEqual(view["claims"], [])
        rendered = "\n".join(view["linear"])
        self.assertNotIn("EV-LUKE", rendered)
        self.assertNotIn("CL-COMPARE", rendered)
        self.assertNotIn("CL-LOCKED", rendered)
        self.assertNotIn("EV-LUKE", repr(view["semantic_rows"]))

    def test_explicit_locked_selection_is_rejected_by_default(self):
        runtime = self.runtime()
        runtime.unlock("EV-MARK")
        with self.assertRaises(PermissionError):
            build_research_workbench(runtime, ["EV-MARK", "EV-LUKE"])

    def test_fully_visible_claim_preserves_provenance_and_nonvisual_parity(self):
        runtime = self.runtime()
        runtime.unlock("EV-MARK")
        runtime.unlock("EV-LUKE")

        view = build_research_workbench(runtime, ["EV-LUKE", "EV-MARK"])
        data = view.to_dict()

        self.assertEqual([item["evidence_id"] for item in data["evidence"]], ["EV-LUKE", "EV-MARK"])
        claim = next(item for item in data["claims"] if item["claim_id"] == "CL-COMPARE")
        self.assertEqual(claim["confidence"], "T2")
        self.assertEqual(claim["source_scope"], "Mark 14:13; Luke 22:8")
        self.assertEqual(claim["evidence_ids"], ["EV-LUKE", "EV-MARK"])
        rendered = "\n".join(data["linear"])
        self.assertIn("source_scope=Mark 14:13; Luke 22:8", rendered)
        self.assertIn("uncertainty=No harmonized identity is inferred from Mark's omission", rendered)
        self.assertIn("witness=Mark", rendered)
        self.assertIn("witness=Luke", rendered)
        semantic_ids = {
            row.get("passage_id") or row.get("evidence_id") or row.get("claim_id")
            for row in data["semantic_rows"]
        }
        self.assertTrue({"MK14:13", "LK22:8", "EV-MARK", "EV-LUKE", "CL-COMPARE"}.issubset(semantic_ids))

    def test_input_order_does_not_change_projection(self):
        runtime = self.runtime()
        runtime.unlock("EV-MARK")
        runtime.unlock("EV-LUKE")
        left = build_research_workbench(runtime, ["EV-LUKE", "EV-MARK"]).to_dict()
        right = build_research_workbench(runtime, ["EV-MARK", "EV-LUKE"]).to_dict()
        self.assertEqual(left, right)

    def test_record_to_passage_witness_conflict_fails_closed(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-CONFLICT",
                (PassageRef("P1", "Mark", 1, 1, witness="Luke"),),
                "A proposition",
                Confidence.T1,
                witness="Mark",
            )
        )
        runtime.unlock("EV-CONFLICT")
        with self.assertRaisesRegex(ValueError, "conflicts with passage witness"):
            build_research_workbench(runtime)

    def test_same_passage_id_with_conflicting_metadata_fails_closed(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-1",
                (PassageRef("P1", "Mark", 1, 1, witness="Mark"),),
                "One",
                Confidence.T1,
                witness="Mark",
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-2",
                (PassageRef("P1", "Mark", 1, 2, witness="Mark"),),
                "Two",
                Confidence.T1,
                witness="Mark",
            )
        )
        runtime.unlock("EV-1")
        runtime.unlock("EV-2")
        with self.assertRaisesRegex(ValueError, "conflicting canonical metadata"):
            build_research_workbench(runtime)

    def test_malformed_passage_metadata_fails_closed(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-BAD",
                (PassageRef("P1", "Mark", True, 1, witness="Mark"),),
                "Bad metadata",
                Confidence.T1,
                witness="Mark",
            )
        )
        runtime.unlock("EV-BAD")
        with self.assertRaisesRegex(ValueError, "chapter must be a positive integer"):
            build_research_workbench(runtime)

    def test_hidden_evidence_id_shadows_visible_passage_id(self):
        runtime = self.collision_runtime()
        runtime.evidence["EV-VISIBLE"] = EvidenceRecord(
            "EV-VISIBLE",
            (PassageRef("EV-SECRET", "Mark", 1, 1, witness="Mark"),),
            "Visible proposition",
            Confidence.T1,
            witness="Mark",
        )

        with self.assertRaisesRegex(ValueError, "passage EV-SECRET collides with non-visible evidence id"):
            build_research_workbench(runtime)

        full = build_research_workbench(runtime, unlocked_only=False).to_dict()
        self.assertIn("EV-SECRET", [item["passage_id"] for item in full["passages"]])
        self.assertIn("EV-SECRET", [item["evidence_id"] for item in full["evidence"]])

    def test_hidden_evidence_id_shadows_visible_claim_id(self):
        runtime = self.collision_runtime(claim_collision=True)

        with self.assertRaisesRegex(ValueError, "claim EV-SECRET collides with non-visible evidence id"):
            build_research_workbench(runtime)

        full = build_research_workbench(runtime, unlocked_only=False).to_dict()
        self.assertIn("EV-SECRET", [item["claim_id"] for item in full["claims"]])
        self.assertIn("EV-SECRET", [item["evidence_id"] for item in full["evidence"]])

    def test_non_boolean_tx1_is_rejected_instead_of_coerced(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-BAD-TX1",
                (PassageRef("P1", "Mark", 1, 1, witness="Mark"),),
                "Bad TX1 type",
                Confidence.T1,
                tx1=1,
                witness="Mark",
            )
        )
        runtime.unlock("EV-BAD-TX1")
        with self.assertRaisesRegex(ValueError, "evidence tx1 must be boolean"):
            build_research_workbench(runtime)

    def test_non_boolean_claim_tx1_is_rejected_instead_of_coerced(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-1",
                (PassageRef("P1", "Mark", 1, 1, witness="Mark"),),
                "Visible support",
                Confidence.T1,
                witness="Mark",
            )
        )
        runtime.add_claim(
            Claim(
                "CL-BAD-TX1",
                "Bad claim TX1 type",
                Confidence.T1,
                tx1=1,
                required_evidence_ids=("EV-1",),
            )
        )
        runtime.unlock("EV-1")
        with self.assertRaisesRegex(ValueError, "claim tx1 must be boolean"):
            build_research_workbench(runtime)

    def test_unlocked_only_flag_must_be_boolean(self):
        runtime = self.runtime()
        runtime.unlock("EV-MARK")
        with self.assertRaisesRegex(ValueError, "unlocked_only must be boolean"):
            build_research_workbench(runtime, unlocked_only=1)

    def test_projection_does_not_mutate_runtime_unlock_state(self):
        runtime = self.runtime()
        runtime.unlock("EV-MARK")
        before = set(runtime.unlocked)
        build_research_workbench(runtime)
        self.assertEqual(runtime.unlocked, before)


if __name__ == "__main__":
    unittest.main()
