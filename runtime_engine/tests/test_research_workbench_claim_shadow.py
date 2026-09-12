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

    def test_zero_required_omitted_claim_id_shadows_visible_passage_id(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-VISIBLE",
                (PassageRef("CL-ZERO", "Mark", 1, 1, witness="Mark"),),
                "Visible proposition",
                Confidence.T1,
                witness="Mark",
            )
        )
        runtime.add_claim(
            Claim(
                "CL-ZERO",
                "Zero-support claims are omitted",
                Confidence.T1,
                required_evidence_ids=(),
            )
        )
        runtime.unlock("EV-VISIBLE")

        with self.assertRaisesRegex(ValueError, "passage CL-ZERO collides with non-visible claim id"):
            build_research_workbench(runtime)

        full = build_research_workbench(runtime, unlocked_only=False).to_dict()
        self.assertIn("CL-ZERO", [item["passage_id"] for item in full["passages"]])
        self.assertNotIn("CL-ZERO", [item["claim_id"] for item in full["claims"]])

    def test_unknown_required_omitted_claim_id_shadows_visible_evidence_id(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "CL-UNKNOWN",
                (PassageRef("P-VISIBLE", "Mark", 1, 1, witness="Mark"),),
                "Visible proposition",
                Confidence.T1,
                witness="Mark",
            )
        )
        runtime.add_claim(
            Claim(
                "CL-UNKNOWN",
                "Unknown-support claims are omitted",
                Confidence.T1,
                required_evidence_ids=("EV-UNKNOWN",),
            )
        )
        runtime.unlock("CL-UNKNOWN")

        with self.assertRaisesRegex(ValueError, "evidence CL-UNKNOWN collides with non-visible claim id"):
            build_research_workbench(runtime)

        full = build_research_workbench(runtime, unlocked_only=False).to_dict()
        self.assertIn("CL-UNKNOWN", [item["evidence_id"] for item in full["evidence"]])
        self.assertNotIn("CL-UNKNOWN", [item["claim_id"] for item in full["claims"]])

    def test_declared_claim_witness_requires_explicit_support_witness(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-NO-WITNESS",
                (PassageRef("P-NO-WITNESS", "John", 1, 1),),
                "Visible support without explicit witness attribution",
                Confidence.T1,
            )
        )
        runtime.add_claim(
            Claim(
                "CL-JOHN",
                "Must not invent John-local attribution",
                Confidence.T1,
                witness="John",
                required_evidence_ids=("EV-NO-WITNESS",),
            )
        )
        runtime.unlock("EV-NO-WITNESS")

        with self.assertRaisesRegex(ValueError, "claim CL-JOHN witness is not established by evidence support"):
            build_research_workbench(runtime)

    def test_declared_claim_witness_is_emitted_when_every_support_establishes_it(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-JOHN",
                (PassageRef("JN1:1", "John", 1, 1, witness="John"),),
                "Explicit John-local support",
                Confidence.T1,
                witness="John",
            )
        )
        runtime.add_claim(
            Claim(
                "CL-JOHN",
                "John-local claim",
                Confidence.T1,
                witness="John",
                required_evidence_ids=("EV-JOHN",),
            )
        )
        runtime.unlock("EV-JOHN")

        view = build_research_workbench(runtime).to_dict()
        claim = next(item for item in view["claims"] if item["claim_id"] == "CL-JOHN")
        self.assertEqual("John", claim["witness"])
        self.assertIn("witness=John", "\n".join(view["linear"]))
        semantic_claim = next(
            row for row in view["semantic_rows"]
            if row.get("kind") == "claim" and row.get("claim_id") == "CL-JOHN"
        )
        self.assertEqual("John", semantic_claim["witness"])

    def test_canonical_invalid_record_and_passage_witnesses_fail_closed(self):
        malformed = (
            " Mark",
            "Mark ",
            "Mark\x85",
            "Mark\u2028",
            "Mark\u2029",
        )
        for index, witness in enumerate(malformed):
            with self.subTest(witness=repr(witness)):
                runtime = EvidenceRuntime()
                evidence_id = f"EV-MALFORMED-{index}"
                runtime.add_evidence(
                    EvidenceRecord(
                        evidence_id,
                        (PassageRef(f"P-MALFORMED-{index}", "Mark", 1, 1, witness=witness),),
                        "Malformed witness attribution must not become Workbench truth",
                        Confidence.T1,
                        witness=witness,
                    )
                )
                runtime.unlock(evidence_id)

                with self.assertRaisesRegex(
                    ValueError,
                    "has malformed or conflicting witness attribution",
                ):
                    build_research_workbench(runtime)

    def test_canonical_invalid_passage_only_witness_fails_closed(self):
        for index, witness in enumerate((" Mark", "Mark\x85", "Mark\u2028", "Mark\u2029")):
            with self.subTest(witness=repr(witness)):
                runtime = EvidenceRuntime()
                evidence_id = f"EV-PASSAGE-MALFORMED-{index}"
                runtime.add_evidence(
                    EvidenceRecord(
                        evidence_id,
                        (PassageRef(f"P-PASSAGE-MALFORMED-{index}", "Mark", 1, 1, witness=witness),),
                        "Malformed passage witness must fail closed",
                        Confidence.T1,
                    )
                )
                runtime.unlock(evidence_id)

                with self.assertRaisesRegex(
                    ValueError,
                    "has malformed or conflicting witness attribution",
                ):
                    build_research_workbench(runtime)

    def test_canonical_invalid_declared_claim_witness_fails_closed(self):
        malformed = (" Mark", "Mark ", "Mark\x85", "Mark\u2028", "Mark\u2029")
        for index, witness in enumerate(malformed):
            with self.subTest(witness=repr(witness)):
                runtime = EvidenceRuntime()
                evidence_id = f"EV-VALID-SUPPORT-{index}"
                claim_id = f"CL-MALFORMED-WITNESS-{index}"
                runtime.add_evidence(
                    EvidenceRecord(
                        evidence_id,
                        (PassageRef(f"P-VALID-{index}", "Mark", 1, 1, witness="Mark"),),
                        "Canonical Mark-local support",
                        Confidence.T1,
                        witness="Mark",
                    )
                )
                runtime.add_claim(
                    Claim(
                        claim_id,
                        "Malformed declared witness must not become Workbench truth",
                        Confidence.T1,
                        witness=witness,
                        required_evidence_ids=(evidence_id,),
                    )
                )
                runtime.unlock(evidence_id)

                with self.assertRaisesRegex(
                    ValueError,
                    f"claim {claim_id} witness is not established by evidence support",
                ):
                    build_research_workbench(runtime)

    def test_ordinary_unicode_witness_matches_canonical_provenance_semantics(self):
        witness = "Марко"
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-UNICODE",
                (PassageRef("P-UNICODE", "Mark", 1, 1, witness=witness),),
                "Ordinary Unicode witness remains valid",
                Confidence.T1,
                witness=witness,
            )
        )
        runtime.add_claim(
            Claim(
                "CL-UNICODE",
                "Unicode-local claim",
                Confidence.T1,
                witness=witness,
                required_evidence_ids=("EV-UNICODE",),
            )
        )
        runtime.unlock("EV-UNICODE")

        view = build_research_workbench(runtime).to_dict()
        self.assertEqual(witness, view["evidence"][0]["witness"])
        self.assertEqual(witness, view["passages"][0]["witness"])
        self.assertEqual(witness, view["claims"][0]["witness"])
        self.assertIn(f"witness={witness}", "\n".join(view["linear"]))


if __name__ == "__main__":
    unittest.main()
