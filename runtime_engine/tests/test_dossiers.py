import unittest

from scripture_archive_runtime.dossiers import (
    CURRENT_SCOPE_UNAVAILABLE,
    NOT_STATED,
    DossierAssembler,
    DossierKind,
    DossierSubject,
)
from scripture_archive_runtime.evidence import Claim, EvidenceRecord, EvidenceRuntime, PassageRef, Relation
from scripture_archive_runtime.models import Confidence


class DossierCoreTests(unittest.TestCase):
    def make_runtime(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-VISIBLE",
                (PassageRef("ACTS-9-1", "Acts", 9, 1, witness="Luke"),),
                "Luke explicitly places the person in the cited scene.",
                Confidence.T1,
                tx1=False,
                witness="Luke",
                entity_ids=("PERSON-PAUL",),
                relation_ids=("REL-VISIBLE", "REL-LOCKED-ENDPOINT"),
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-LOCKED",
                (PassageRef("ACTS-22-1", "Acts", 22, 1, witness="Luke"),),
                "This proposition must stay locked.",
                Confidence.T1,
                witness="Luke",
                entity_ids=("PERSON-PAUL",),
            )
        )
        runtime.add_claim(
            Claim(
                "CLAIM-VISIBLE",
                "A source-bounded synthesis supported by visible evidence.",
                Confidence.T2,
                tx1=True,
                source_scope="Acts 9:1",
                uncertainty="Witness-local scope only",
                required_evidence_ids=("EV-VISIBLE",),
                witness="Luke",
            )
        )
        runtime.add_claim(
            Claim(
                "CLAIM-LOCKED",
                "This claim depends on locked evidence.",
                Confidence.T2,
                required_evidence_ids=("EV-VISIBLE", "EV-LOCKED"),
            )
        )
        runtime.add_relation(
            Relation(
                "REL-VISIBLE",
                "PERSON-PAUL",
                "appears_in",
                "EVENT-SCENE",
                witness="Luke",
                passage_ids=("RELATION-ONLY-PASSAGE",),
            )
        )
        runtime.add_relation(
            Relation(
                "REL-LOCKED-ENDPOINT",
                "PERSON-PAUL",
                "references",
                "EV-LOCKED",
                passage_ids=("ACTS-22-1",),
            )
        )
        runtime.add_relation(
            Relation(
                "REL-UNSUPPORTED",
                "PERSON-PAUL",
                "associated_with",
                "PLACE-UNSUPPORTED",
            )
        )
        runtime.unlock("EV-VISIBLE")
        return runtime

    def test_player_safe_view_omits_locked_truth_and_identifiers(self):
        runtime = self.make_runtime()
        view = DossierAssembler(runtime).build(
            DossierSubject("PERSON-PAUL", DossierKind.PERSON, "Paul")
        )
        payload = repr(view.to_dict())
        self.assertIn("EV-VISIBLE", payload)
        self.assertIn("CLAIM-VISIBLE", payload)
        self.assertIn("REL-VISIBLE", payload)
        self.assertNotIn("EV-LOCKED", payload)
        self.assertNotIn("CLAIM-LOCKED", payload)
        self.assertNotIn("REL-LOCKED-ENDPOINT", payload)
        self.assertNotIn("REL-UNSUPPORTED", payload)
        self.assertNotIn("RELATION-ONLY-PASSAGE", payload)

    def test_provenance_and_nonvisual_rows_have_parity(self):
        runtime = self.make_runtime()
        view = DossierAssembler(runtime).build(
            DossierSubject("PERSON-PAUL", DossierKind.PERSON, "Paul")
        )
        claim = next(row for row in view.rows if row.row_id == "CLAIM-VISIBLE")
        self.assertEqual(claim.confidence, Confidence.T2)
        self.assertTrue(claim.tx1)
        self.assertEqual(claim.witness, "Luke")
        self.assertEqual(claim.source_scope, "Acts 9:1")
        self.assertEqual(claim.uncertainty, "Witness-local scope only")
        self.assertEqual(claim.passage_ids, ("ACTS-9-1",))
        self.assertEqual(claim.passage_witnesses, (("ACTS-9-1", "Luke"),))
        self.assertEqual(claim.evidence_ids, ("EV-VISIBLE",))
        linear = "\n".join(view.linearize())
        for token in (
            "confidence=T2",
            "TX1=true",
            "witness=Luke",
            "source_scope=Acts 9:1",
            "uncertainty=Witness-local scope only",
            "passages=ACTS-9-1",
            "passage_witnesses=ACTS-9-1@Luke",
            "evidence=EV-VISIBLE",
        ):
            self.assertIn(token, linear)
        self.assertEqual(list(view.semantic_rows()), view.to_dict()["rows"])

    def test_player_safe_no_support_is_scope_qualified(self):
        runtime = self.make_runtime()
        view = DossierAssembler(runtime).build(
            DossierSubject("PERSON-UNKNOWN", DossierKind.PERSON, "Unknown")
        )
        self.assertFalse(view.stated)
        self.assertEqual(view.to_dict()["status_text"], CURRENT_SCOPE_UNAVAILABLE)
        self.assertEqual(view.linearize()[-1], CURRENT_SCOPE_UNAVAILABLE)
        self.assertNotEqual(view.to_dict()["status_text"], NOT_STATED)

    def test_unrestricted_no_support_is_exact_not_stated_result(self):
        runtime = self.make_runtime()
        view = DossierAssembler(runtime).build(
            DossierSubject("PERSON-UNKNOWN", DossierKind.PERSON, "Unknown"),
            unlocked_only=False,
        )
        self.assertFalse(view.stated)
        self.assertEqual(view.to_dict()["status_text"], NOT_STATED)
        self.assertEqual(view.linearize()[-1], NOT_STATED)

    def test_player_safe_locked_only_subject_is_scope_qualified_without_leak(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-LOCKED-ONLY",
                (PassageRef("MK-1-1", "Mark", 1, 1, witness="Mark"),),
                "Locked support must not be disclosed.",
                Confidence.T1,
                witness="Mark",
                entity_ids=("PERSON-X",),
            )
        )
        view = DossierAssembler(runtime).build(
            DossierSubject("PERSON-X", DossierKind.PERSON, "X")
        )
        semantic = repr(view.to_dict())
        linear = "\n".join(view.linearize())
        self.assertFalse(view.stated)
        self.assertEqual(view.to_dict()["status_text"], CURRENT_SCOPE_UNAVAILABLE)
        self.assertEqual(view.linearize()[-1], CURRENT_SCOPE_UNAVAILABLE)
        self.assertNotEqual(view.to_dict()["status_text"], NOT_STATED)
        self.assertNotIn("EV-LOCKED-ONLY", semantic)
        self.assertNotIn("EV-LOCKED-ONLY", linear)
        self.assertNotIn("MK-1-1", semantic)
        self.assertNotIn("MK-1-1", linear)
        self.assertNotIn("Locked support must not be disclosed.", semantic)
        self.assertNotIn("Locked support must not be disclosed.", linear)

    def test_unrestricted_view_is_explicit_and_deterministic(self):
        runtime = self.make_runtime()
        subject = DossierSubject("PERSON-PAUL", DossierKind.PERSON, "Paul")
        first = DossierAssembler(runtime).build(subject, unlocked_only=False)
        second = DossierAssembler(runtime).build(subject, unlocked_only=False)
        self.assertEqual(first.to_dict(), second.to_dict())
        ids = [row.row_id for row in first.rows]
        self.assertIn("EV-LOCKED", ids)
        self.assertIn("CLAIM-LOCKED", ids)
        self.assertIn("REL-UNSUPPORTED", ids)

    def test_conflicting_record_and_passage_witness_fail_closed(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-CONFLICT",
                (PassageRef("MK-1-1", "Mark", 1, 1, witness="Luke"),),
                "Conflicting witness metadata must not be attributed.",
                Confidence.T1,
                witness="Mark",
                entity_ids=("PERSON-X",),
            )
        )
        runtime.unlock("EV-CONFLICT")
        view = DossierAssembler(runtime).build(
            DossierSubject("PERSON-X", DossierKind.PERSON, "X")
        )
        semantic = repr(view.to_dict())
        linear = "\n".join(view.linearize())
        self.assertFalse(view.stated)
        self.assertEqual(view.to_dict()["status_text"], CURRENT_SCOPE_UNAVAILABLE)
        self.assertEqual(view.linearize()[-1], CURRENT_SCOPE_UNAVAILABLE)
        self.assertNotIn("EV-CONFLICT", semantic)
        self.assertNotIn("EV-CONFLICT", linear)
        self.assertNotIn("MK-1-1", semantic)
        self.assertNotIn("MK-1-1", linear)

    def test_conflicting_relation_and_claim_witness_fail_closed(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-LUKE",
                (PassageRef("LK-1-1", "Luke", 1, 1, witness="Luke"),),
                "Luke-local evidence.",
                Confidence.T1,
                witness="Luke",
                entity_ids=("PERSON-X",),
                relation_ids=("REL-CONFLICT",),
            )
        )
        runtime.add_claim(
            Claim(
                "CLAIM-CONFLICT",
                "A claim declared as a different witness must not be emitted.",
                Confidence.T2,
                required_evidence_ids=("EV-LUKE",),
                witness="Mark",
            )
        )
        runtime.add_relation(
            Relation(
                "REL-CONFLICT",
                "PERSON-X",
                "appears_in",
                "EVENT-X",
                witness="Mark",
                passage_ids=("LK-1-1",),
            )
        )
        runtime.unlock("EV-LUKE")
        view = DossierAssembler(runtime).build(
            DossierSubject("PERSON-X", DossierKind.PERSON, "X")
        )
        semantic = repr(view.to_dict())
        linear = "\n".join(view.linearize())
        self.assertIn("EV-LUKE", semantic)
        self.assertIn("passage_witnesses", semantic)
        self.assertIn("LK-1-1@Luke", linear)
        self.assertNotIn("REL-CONFLICT", semantic)
        self.assertNotIn("REL-CONFLICT", linear)
        self.assertNotIn("CLAIM-CONFLICT", semantic)
        self.assertNotIn("CLAIM-CONFLICT", linear)

    def test_invalid_subject_fails_closed(self):
        with self.assertRaises(ValueError):
            DossierSubject("", DossierKind.PERSON, "Paul")
        with self.assertRaises(ValueError):
            DossierSubject("PERSON-PAUL", DossierKind.PERSON, " ")
        with self.assertRaises(ValueError):
            DossierSubject("PERSON-PAUL", "PERSON", "Paul")
        with self.assertRaises(ValueError):
            DossierSubject(123, DossierKind.PERSON, "Paul")


if __name__ == "__main__":
    unittest.main()
