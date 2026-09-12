import json
import unittest

from scripture_archive_runtime.evidence import EvidenceRecord, EvidenceRuntime, PassageRef, Relation
from scripture_archive_runtime.models import Confidence
from scripture_archive_runtime.witness_matrix import build_witness_matrix


class WitnessMatrixRelationVisibilityTests(unittest.TestCase):
    def test_relation_passage_ids_are_limited_to_visible_evidence(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-MARK",
                (PassageRef("MK14:13", "Mark", 14, 13, witness="Mark"),),
                "Visible Mark record.",
                Confidence.T1,
                witness="Mark",
                relation_ids=("REL-PARALLEL",),
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-LUKE",
                (PassageRef("LK22:8", "Luke", 22, 8, witness="Luke"),),
                "Visible Luke record.",
                Confidence.T1,
                witness="Luke",
                relation_ids=("REL-PARALLEL",),
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-JOHN-LOCKED",
                (PassageRef("JN20:30", "John", 20, 30, witness="John"),),
                "Locked John record.",
                Confidence.T1,
                witness="John",
            )
        )
        runtime.add_relation(
            Relation(
                "REL-PARALLEL",
                "EV-MARK",
                "parallel_witness",
                "EV-LUKE",
                passage_ids=("MK14:13", "LK22:8", "JN20:30"),
            )
        )
        runtime.unlock("EV-MARK")
        runtime.unlock("EV-LUKE")

        matrix = build_witness_matrix(runtime, witnesses=("Mark", "Luke"))
        payload = matrix.to_dict()
        relation = payload["rows"][0]["relations"][0]

        self.assertEqual(relation["passage_ids"], ["MK14:13", "LK22:8"])
        serialized = json.dumps(payload, ensure_ascii=False, sort_keys=True)
        linear = "\n".join(matrix.linearize())
        self.assertNotIn("EV-JOHN-LOCKED", serialized)
        self.assertNotIn("JN20:30", serialized)
        self.assertNotIn("JN20:30", linear)

    def test_malformed_relation_id_is_not_projected_or_attached_to_evidence(self):
        runtime = EvidenceRuntime()
        malformed_relation_id = "REL-BAD" + chr(8232)
        runtime.add_evidence(
            EvidenceRecord(
                "EV-MARK",
                (PassageRef("MK1:1", "Mark", 1, 1, witness="Mark"),),
                "Visible Mark record.",
                Confidence.T1,
                witness="Mark",
                relation_ids=(malformed_relation_id,),
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-LUKE",
                (PassageRef("LK1:1", "Luke", 1, 1, witness="Luke"),),
                "Visible Luke record.",
                Confidence.T1,
                witness="Luke",
                relation_ids=(malformed_relation_id,),
            )
        )
        runtime.add_relation(
            Relation(
                malformed_relation_id,
                "EV-MARK",
                "parallel_witness",
                "EV-LUKE",
                passage_ids=("MK1:1", "LK1:1"),
            )
        )
        runtime.unlock("EV-MARK")
        runtime.unlock("EV-LUKE")

        matrix = build_witness_matrix(runtime, witnesses=("Mark", "Luke"))
        payload = matrix.to_dict()
        serialized = json.dumps(payload, ensure_ascii=False, sort_keys=True)
        linear = "\n".join(matrix.linearize())

        self.assertNotIn(malformed_relation_id, serialized)
        self.assertNotIn(malformed_relation_id, linear)
        self.assertTrue(all(row["relations"] == [] for row in payload["rows"]))
        self.assertTrue(
            all(
                evidence["relation_ids"] == []
                for row in payload["rows"]
                for cell in row["cells"]
                for evidence in cell["evidence"]
            )
        )

    def test_malformed_relation_passage_token_fails_closed_for_entire_relation(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-MARK",
                (PassageRef("MK1:1", "Mark", 1, 1, witness="Mark"),),
                "Visible Mark record.",
                Confidence.T1,
                witness="Mark",
                relation_ids=("REL-PARALLEL",),
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-LUKE",
                (PassageRef("LK1:1", "Luke", 1, 1, witness="Luke"),),
                "Visible Luke record.",
                Confidence.T1,
                witness="Luke",
                relation_ids=("REL-PARALLEL",),
            )
        )
        runtime.add_relation(
            Relation(
                "REL-PARALLEL",
                "EV-MARK",
                "parallel_witness",
                "EV-LUKE",
                passage_ids=("MK1:1", "LK1:1" + chr(0)),
            )
        )
        runtime.unlock("EV-MARK")
        runtime.unlock("EV-LUKE")

        matrix = build_witness_matrix(runtime, witnesses=("Mark", "Luke"))
        payload = matrix.to_dict()
        serialized = json.dumps(payload, ensure_ascii=False, sort_keys=True)
        linear = "\n".join(matrix.linearize())

        self.assertNotIn("REL-PARALLEL", serialized)
        self.assertNotIn("REL-PARALLEL", linear)
        self.assertTrue(all(row["relations"] == [] for row in payload["rows"]))


if __name__ == "__main__":
    unittest.main()
