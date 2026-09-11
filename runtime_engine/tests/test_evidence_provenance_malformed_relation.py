import unittest

from scripture_archive_runtime.evidence import EvidenceRecord, EvidenceRuntime, PassageRef, Relation
from scripture_archive_runtime.evidence_provenance import (
    validated_relation_witness,
    visible_relation_passage_ids,
)
from scripture_archive_runtime.models import Confidence


class MalformedRelationProvenanceTests(unittest.TestCase):
    def setUp(self):
        self.runtime = EvidenceRuntime()
        self.record = EvidenceRecord(
            "EV-MARK",
            (PassageRef("MK-1-1", "Mark", 1, 1, witness="Mark"),),
            "Mark-local evidence.",
            Confidence.T1,
            witness="Mark",
        )
        self.runtime.add_evidence(self.record)
        self.runtime.unlock(self.record.evidence_id)

    def _assert_relation_fails_closed(self, relation: Relation) -> None:
        self.assertIsNone(
            validated_relation_witness(self.runtime, relation, ("EV-MARK",))
        )
        self.assertEqual(
            visible_relation_passage_ids(self.runtime, relation, ("EV-MARK",)),
            (),
        )

    def test_unhashable_relation_identity_and_endpoints_fail_closed(self):
        malformed_relations = (
            Relation([], "PERSON-X", "supports", "PERSON-Y", witness="Mark"),
            Relation("REL-BAD-SOURCE", [], "supports", "PERSON-Y", witness="Mark"),
            Relation("REL-BAD-TARGET", "PERSON-X", "supports", {}, witness="Mark"),
        )

        for relation in malformed_relations:
            with self.subTest(relation=relation):
                self._assert_relation_fails_closed(relation)

    def test_padded_and_control_relation_tokens_fail_closed(self):
        malformed_relations = (
            Relation(" REL-PADDED ", "PERSON-X", "supports", "PERSON-Y", witness="Mark"),
            Relation("REL-CONTROL\n", "PERSON-X", "supports", "PERSON-Y", witness="Mark"),
            Relation("REL-SOURCE-PADDED", " PERSON-X ", "supports", "PERSON-Y", witness="Mark"),
            Relation("REL-SOURCE-CONTROL", "PERSON\x00X", "supports", "PERSON-Y", witness="Mark"),
            Relation("REL-TARGET-PADDED", "PERSON-X", "supports", " PERSON-Y ", witness="Mark"),
            Relation("REL-TARGET-CONTROL", "PERSON-X", "supports", "PERSON\u2028Y", witness="Mark"),
        )

        for relation in malformed_relations:
            with self.subTest(relation=relation):
                self._assert_relation_fails_closed(relation)

    def test_malformed_relation_passage_ids_fail_closed_before_set_membership(self):
        malformed_passage_sets = (
            (["MK-1-1"],),
            ([],),
            (" MK-1-1 ",),
            ("MK-1-1\n",),
            "MK-1-1",
            None,
        )

        for passage_ids in malformed_passage_sets:
            relation = Relation(
                "REL-PASSAGE-MALFORMED",
                "PERSON-X",
                "supports",
                "PERSON-Y",
                witness="Mark",
                passage_ids=passage_ids,
            )
            with self.subTest(passage_ids=passage_ids):
                self._assert_relation_fails_closed(relation)

    def test_valid_generic_non_evidence_endpoints_remain_supported(self):
        relation = Relation(
            "REL-GENERIC",
            "PERSON-PETER",
            "mentioned_at",
            "PLACE-GALILEE",
            witness="Mark",
            passage_ids=("MK-1-1",),
        )

        self.assertEqual(
            validated_relation_witness(self.runtime, relation, ("EV-MARK",)),
            "Mark",
        )
        self.assertEqual(
            visible_relation_passage_ids(self.runtime, relation, ("EV-MARK",)),
            ("MK-1-1",),
        )


if __name__ == "__main__":
    unittest.main()
