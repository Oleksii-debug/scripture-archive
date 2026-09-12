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

    def test_locked_relation_evidence_endpoint_is_not_aliased_by_visible_passages(self):
        runtime = EvidenceRuntime()
        p_ot = PassageRef("P-OT", "Isaiah", 7, 14)
        p_nt = PassageRef("P-NT", "Matthew", 1, 23)
        runtime.add_evidence(
            EvidenceRecord("EV-LOCKED", (p_ot,), "locked", Confidence.T1)
        )
        runtime.add_evidence(
            EvidenceRecord("EV-OT-VISIBLE", (p_ot,), "visible OT", Confidence.T1)
        )
        runtime.add_evidence(
            EvidenceRecord("EV-NT-VISIBLE", (p_nt,), "visible NT", Confidence.T1)
        )
        runtime.add_relation(
            Relation(
                "REL-SECRET",
                "EV-LOCKED",
                "explicit_cross_reference",
                "EV-NT-VISIBLE",
                witness="secret-metadata",
                passage_ids=("P-OT", "P-NT"),
            )
        )
        runtime.unlock("EV-OT-VISIBLE")
        runtime.unlock("EV-NT-VISIBLE")

        projection = project_cross_testament(runtime, book_testaments=BOOK_TESTAMENTS)
        self.assertEqual(projection.links, ())
        serialized = projection.stable_json()
        linear = "\n".join(projection.linearize())
        for secret in ("REL-SECRET", "secret-metadata", "P-OT", "P-NT", "EV-LOCKED"):
            self.assertNotIn(secret, serialized)
            self.assertNotIn(secret, linear)

        full = project_cross_testament(
            runtime,
            book_testaments=BOOK_TESTAMENTS,
            unlocked_only=False,
        )
        self.assertEqual(full.links[0].relation_id, "REL-SECRET")
        self.assertEqual(full.links[0].relation_witness, "secret-metadata")

    def test_nary_relation_is_not_pairwise_expanded(self):
        runtime = self.runtime(relation=False)
        runtime.add_evidence(
            EvidenceRecord(
                "EV-GEN",
                (PassageRef("GEN1:1", "Genesis", 1, 1),),
                "third supporting proposition",
                Confidence.T1,
            )
        )
        runtime.unlock("EV-GEN")
        runtime.add_relation(
            Relation(
                "REL-NARY",
                "EV-OT",
                "explicit_group_relation",
                "EV-NT",
                passage_ids=("ISA7:14", "MT1:23", "GEN1:1"),
            )
        )
        projection = project_cross_testament(runtime, book_testaments=BOOK_TESTAMENTS)
        self.assertEqual(projection.links, ())
        self.assertEqual(projection.linearize(), [NOT_STATED])
        self.assertNotIn("REL-NARY", projection.stable_json())

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

    def test_player_visible_text_rejects_unicode_controls_and_separators(self):
        def assert_rejected(runtime: EvidenceRuntime, book_testaments=BOOK_TESTAMENTS):
            with self.assertRaisesRegex(ValueError, "must not contain"):
                project_cross_testament(runtime, book_testaments=book_testaments)

        relation_runtime = self.runtime(relation=False)
        relation_runtime.add_relation(
            Relation(
                "REL-BAD",
                "EV-OT",
                "explicit\ncross_reference",
                "EV-NT",
                passage_ids=("ISA7:14", "MT1:23"),
            )
        )
        assert_rejected(relation_runtime)

        book_runtime = EvidenceRuntime()
        book_runtime.add_evidence(
            EvidenceRecord(
                "EV-BAD-BOOK",
                (PassageRef("BAD1:1", "Isaiah\u2028Injected", 1, 1),),
                "proposition",
                Confidence.T1,
            )
        )
        book_runtime.unlock("EV-BAD-BOOK")
        assert_rejected(book_runtime, {"Isaiah\u2028Injected": "OT"})

        witness_runtime = EvidenceRuntime()
        witness_runtime.add_evidence(
            EvidenceRecord(
                "EV-BAD-WITNESS",
                (PassageRef("ISA1:1", "Isaiah", 1, 1),),
                "proposition",
                Confidence.T1,
                witness="Isaiah\u200bhidden",
            )
        )
        witness_runtime.unlock("EV-BAD-WITNESS")
        assert_rejected(witness_runtime)

        private_runtime = self.runtime(relation=False)
        private_relation_id = "REL\ue000PRIVATE"
        private_runtime.add_relation(
            Relation(
                private_relation_id,
                "EV-OT",
                "explicit_cross_reference",
                "EV-NT",
                passage_ids=("ISA7:14", "MT1:23"),
            )
        )
        assert_rejected(private_runtime)

    def test_international_unicode_remains_visible_and_deterministic(self):
        witness = "Корпус-А"
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "ДОК-СТ",
                (PassageRef("ІС7:14", "Ісая", 7, 14, witness=witness),),
                "старозавітне твердження",
                Confidence.T1,
                witness=witness,
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "ДОК-НТ",
                (PassageRef("МТ1:23", "Матвій", 1, 23, witness=witness),),
                "новозавітне твердження",
                Confidence.T1,
                witness=witness,
            )
        )
        runtime.add_relation(
            Relation(
                "ЗВ-1",
                "ДОК-СТ",
                "явне_посилання",
                "ДОК-НТ",
                witness=witness,
                passage_ids=("ІС7:14", "МТ1:23"),
            )
        )
        runtime.unlock("ДОК-СТ")
        runtime.unlock("ДОК-НТ")
        projection = project_cross_testament(
            runtime,
            book_testaments={"Ісая": "OT", "Матвій": "NT"},
        )
        linear = "\n".join(projection.linearize())
        stable = projection.stable_json()
        for expected in ("ЗВ-1", "Ісая", "Матвій", witness, "явне_посилання"):
            self.assertIn(expected, linear)
            self.assertIn(expected, stable)
        self.assertEqual(stable, projection.stable_json())

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
