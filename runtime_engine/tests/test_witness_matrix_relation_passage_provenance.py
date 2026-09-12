import unittest

from scripture_archive_runtime.evidence import EvidenceRecord, EvidenceRuntime, PassageRef, Relation
from scripture_archive_runtime.models import Confidence
from scripture_archive_runtime.witness_matrix import build_witness_matrix


class WitnessMatrixRelationPassageProvenanceTests(unittest.TestCase):
    def test_relation_passages_are_bounded_to_relation_row_support_not_matrix_global_visibility(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-MARK",
                (PassageRef("MK14:13", "Mark", 14, 13, witness="Mark"),),
                "Mark endpoint support.",
                Confidence.T1,
                witness="Mark",
                relation_ids=("REL-AB",),
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-LUKE",
                (PassageRef("LK22:8", "Luke", 22, 8, witness="Luke"),),
                "Luke endpoint support.",
                Confidence.T1,
                witness="Luke",
                relation_ids=("REL-AB",),
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-JOHN",
                (PassageRef("JN20:30", "John", 20, 30, witness="John"),),
                "Unrelated visible row support.",
                Confidence.T1,
                witness="John",
            )
        )
        runtime.add_relation(
            Relation(
                "REL-AB",
                "EV-MARK",
                "parallel_witness",
                "EV-LUKE",
                passage_ids=("MK14:13", "JN20:30", "LK22:8", "MK14:13"),
            )
        )
        runtime.unlock("EV-MARK")
        runtime.unlock("EV-LUKE")
        runtime.unlock("EV-JOHN")

        matrix = build_witness_matrix(runtime, witnesses=("Mark", "Luke", "John"))
        payload = matrix.to_dict()
        relation_rows = [
            row for row in payload["rows"] if row["relations"]
        ]
        self.assertEqual(len(relation_rows), 1)
        relation = relation_rows[0]["relations"][0]

        self.assertEqual(relation["relation_id"], "REL-AB")
        self.assertEqual(relation["passage_ids"], ["MK14:13", "LK22:8"])

        # JN20:30 remains legitimately visible in its own singleton evidence row,
        # but it must never be serialized as REL-AB provenance.
        linear = matrix.linearize()
        self.assertIn("  Passage IDs: MK14:13, LK22:8", linear)
        relation_passage_lines = [line for line in linear if line.startswith("  Passage IDs:")]
        self.assertEqual(relation_passage_lines, ["  Passage IDs: MK14:13, LK22:8"])
        self.assertIn("    Passage JN20:30: John 20:30; witness=John", linear)


if __name__ == "__main__":
    unittest.main()
