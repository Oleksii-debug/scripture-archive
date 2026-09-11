import json
import unittest

from scripture_archive_runtime.cross_testament import NOT_STATED, project_cross_testament
from scripture_archive_runtime.evidence import EvidenceRecord, EvidenceRuntime, PassageRef, Relation
from scripture_archive_runtime.models import Confidence


BOOK_TESTAMENTS = {"Genesis": "OT", "Isaiah": "OT", "Matthew": "NT"}


class CrossTestamentProjectionTests(unittest.TestCase):
    def runtime(self, *, relation: bool = True, unlock_nt: bool = True) -> EvidenceRuntime:
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-OT",
                (PassageRef("ISA7:14", "Isaiah", 7, 14, witness="Isaiah"),),
                "OT proposition",
                Confidence.T1,
                witness="Isaiah",
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-NT",
                (PassageRef("MT1:23", "Matthew", 1, 23, witness="Matthew"),),
                "NT proposition",
                Confidence.T2,
                tx1=True,
                witness="Matthew",
            )
        )
        if relation:
            runtime.add_relation(
                Relation(
                    "REL-X",
                    "EV-OT",
                    "explicit_cross_reference",
                    "EV-NT",
                    passage_ids=("ISA7:14", "MT1:23"),
                )
            )
        runtime.unlock("EV-OT")
        if unlock_nt:
            runtime.unlock("EV-NT")
        return runtime

    def test_explicit_relation_projects_with_provenance_and_linear_parity(self):
        projection = project_cross_testament(
            self.runtime(), book_testaments=BOOK_TESTAMENTS
        )
        self.assertEqual(projection.status, "LINKS")
        self.assertEqual(len(projection.links), 1)
        link = projection.links[0]
        self.assertEqual(link.relation_id, "REL-X")
        self.assertIsNone(link.relation_witness)
        self.assertEqual(link.ot.passage_id, "ISA7:14")
        self.assertEqual(link.nt.passage_id, "MT1:23")
        self.assertEqual(link.ot.evidence[0].witness, "Isaiah")
        self.assertEqual(link.nt.evidence[0].witness, "Matthew")
        self.assertTrue(link.nt.evidence[0].tx1)
        linear = "\n".join(projection.linearize())
        self.assertIn("REL-X", linear)
        self.assertIn("ISA7:14", linear)
        self.assertIn("MT1:23", linear)
        self.assertIn("witness=Isaiah", linear)
        self.assertIn("witness=Matthew", linear)
        self.assertNotIn("Relation witness:", linear)
        self.assertEqual(
            projection.stable_json(),
            json.dumps(
                projection.to_dict(),
                ensure_ascii=False,
                sort_keys=True,
                separators=(",", ":"),
            ),
        )

    def test_no_relation_never_synthesizes_cross_testament_link(self):
        projection = project_cross_testament(
            self.runtime(relation=False), book_testaments=BOOK_TESTAMENTS
        )
        self.assertEqual(projection.links, ())
        self.assertEqual(projection.linearize(), [NOT_STATED])
        self.assertEqual(projection.status, "NOT_STATED_IN_CITED_TEXT")

    def test_locked_endpoint_is_not_exposed(self):
        projection = project_cross_testament(
            self.runtime(unlock_nt=False), book_testaments=BOOK_TESTAMENTS
        )
        self.assertEqual(projection.links, ())
        self.assertEqual(projection.linearize(), [NOT_STATED])
        self.assertNotIn("MT1:23", projection.stable_json())
        self.assertNotIn("EV-NT", projection.stable_json())

    def test_relation_with_locked_third_endpoint_is_suppressed_whole(self):
        runtime = self.runtime(relation=False)
        runtime.add_evidence(
            EvidenceRecord(
                "EV-LOCKED",
                (PassageRef("GEN1:1", "Genesis", 1, 1, witness="Genesis"),),
                "locked supporting proposition",
                Confidence.T1,
                witness="Genesis",
            )
        )
        runtime.add_relation(
            Relation(
                "REL-PARTIAL",
                "EV-OT",
                "explicit_cross_reference",
                "EV-NT",
                passage_ids=("ISA7:14", "MT1:23", "GEN1:1"),
            )
        )
        projection = project_cross_testament(runtime, book_testaments=BOOK_TESTAMENTS)
        self.assertEqual(projection.links, ())
        serialized = projection.stable_json()
        linear = "\n".join(projection.linearize())
        self.assertNotIn("REL-PARTIAL", serialized)
        self.assertNotIn("GEN1:1", serialized)
        self.assertNotIn("REL-PARTIAL", linear)
        self.assertNotIn("GEN1:1", linear)

        full = project_cross_testament(
            runtime,
            book_testaments=BOOK_TESTAMENTS,
            unlocked_only=False,
        )
        self.assertTrue(any(link.relation_id == "REL-PARTIAL" for link in full.links))

    def test_dangling_relation_passage_fails_closed(self):
        runtime = self.runtime(relation=False)
        runtime.add_relation(
            Relation(
                "REL-BAD",
                "EV-OT",
                "explicit_cross_reference",
                "EV-NT",
                passage_ids=("ISA7:14", "MISSING"),
            )
        )
        with self.assertRaisesRegex(ValueError, "unknown passage_id"):
            project_cross_testament(runtime, book_testaments=BOOK_TESTAMENTS)

    def test_conflicting_passage_identity_fails_closed(self):
        runtime = self.runtime(relation=False)
        runtime.add_evidence(
            EvidenceRecord(
                "EV-CONFLICT",
                (PassageRef("ISA7:14", "Genesis", 1, 1),),
                "conflicting location",
                Confidence.T1,
            )
        )
        runtime.unlock("EV-CONFLICT")
        with self.assertRaisesRegex(ValueError, "Conflicting definitions"):
            project_cross_testament(runtime, book_testaments=BOOK_TESTAMENTS)

    def test_record_passage_witness_conflict_fails_closed(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-CONFLICT",
                (PassageRef("MT1:23", "Matthew", 1, 23, witness="Matthew"),),
                "contradictory witness metadata",
                Confidence.T1,
                witness="Mark",
            )
        )
        runtime.unlock("EV-CONFLICT")
        with self.assertRaisesRegex(ValueError, "witness conflicts with passage"):
            project_cross_testament(runtime, book_testaments=BOOK_TESTAMENTS)

    def test_relation_witness_conflict_with_supporting_provenance_fails_closed(self):
        runtime = self.runtime(relation=False)
        runtime.add_relation(
            Relation(
                "REL-CONFLICT",
                "EV-OT",
                "explicit_cross_reference",
                "EV-NT",
                witness="Matthew",
                passage_ids=("ISA7:14", "MT1:23"),
            )
        )
        with self.assertRaisesRegex(ValueError, "witness conflicts with supporting provenance"):
            project_cross_testament(runtime, book_testaments=BOOK_TESTAMENTS)

    def test_relation_witness_matching_all_explicit_support_is_preserved(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-OT",
                (PassageRef("ISA7:14", "Isaiah", 7, 14, witness="Corpus-A"),),
                "OT proposition",
                Confidence.T1,
                witness="Corpus-A",
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-NT",
                (PassageRef("MT1:23", "Matthew", 1, 23, witness="Corpus-A"),),
                "NT proposition",
                Confidence.T1,
                witness="Corpus-A",
            )
        )
        runtime.add_relation(
            Relation(
                "REL-OK",
                "EV-OT",
                "explicit_cross_reference",
                "EV-NT",
                witness="Corpus-A",
                passage_ids=("ISA7:14", "MT1:23"),
            )
        )
        runtime.unlock("EV-OT")
        runtime.unlock("EV-NT")
        projection = project_cross_testament(runtime, book_testaments=BOOK_TESTAMENTS)
        self.assertEqual(projection.links[0].relation_witness, "Corpus-A")
        self.assertIn("Relation witness: Corpus-A", projection.linearize())

    def test_testament_classification_is_explicit_not_inferred(self):
        with self.assertRaisesRegex(ValueError, "No explicit testament classification"):
            project_cross_testament(
                self.runtime(), book_testaments={"Isaiah": "OT"}
            )

    def test_same_testament_relation_does_not_become_ot_nt_link(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-GEN",
                (PassageRef("GEN1:1", "Genesis", 1, 1),),
                "Genesis proposition",
                Confidence.T1,
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-ISA",
                (PassageRef("ISA1:1", "Isaiah", 1, 1),),
                "Isaiah proposition",
                Confidence.T1,
            )
        )
        runtime.add_relation(
            Relation(
                "REL-OT",
                "EV-GEN",
                "explicit_parallel",
                "EV-ISA",
                passage_ids=("GEN1:1", "ISA1:1"),
            )
        )
        runtime.unlock("EV-GEN")
        runtime.unlock("EV-ISA")
        projection = project_cross_testament(
            runtime, book_testaments=BOOK_TESTAMENTS
        )
        self.assertEqual(projection.links, ())
        self.assertEqual(projection.linearize(), [NOT_STATED])

    def test_malformed_passage_ordinals_fail_closed(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-BAD",
                (PassageRef("ISA7:14", "Isaiah", True, 14),),
                "malformed",
                Confidence.T1,
            )
        )
        runtime.unlock("EV-BAD")
        with self.assertRaisesRegex(ValueError, "chapter must be a positive integer"):
            project_cross_testament(runtime, book_testaments=BOOK_TESTAMENTS)


if __name__ == "__main__":
    unittest.main()
