import unittest

from scripture_archive_runtime.dossiers import (
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
        self.assertEqual(claim.evidence_ids, ("EV-VISIBLE",))
        linear = "\n".join(view.linearize())
        for token in (
            "confidence=T2",
            "TX1=true",
            "witness=Luke",
            "source_scope=Acts 9:1",
            "uncertainty=Witness-local scope only",
            "passages=ACTS-9-1",
            "evidence=EV-VISIBLE",
        ):
            self.assertIn(token, linear)
        self.assertEqual(list(view.semantic_rows()), view.to_dict()["rows"])

    def test_no_support_is_exact_not_stated_result(self):
        runtime = self.make_runtime()
        view = DossierAssembler(runtime).build(
            DossierSubject("PERSON-UNKNOWN", DossierKind.PERSON, "Unknown")
        )
        self.assertFalse(view.stated)
        self.assertEqual(view.to_dict()["status_text"], NOT_STATED)
        self.assertEqual(view.linearize()[-1], NOT_STATED)

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

    def test_invalid_subject_fails_closed(self):
        with self.assertRaises(ValueError):
            DossierSubject("", DossierKind.PERSON, "Paul")
        with self.assertRaises(ValueError):
            DossierSubject("PERSON-PAUL", DossierKind.PERSON, " ")


if __name__ == "__main__":
    unittest.main()
