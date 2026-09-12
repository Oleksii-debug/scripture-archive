import unittest

from scripture_archive_runtime.evidence import Claim, EvidenceRecord, EvidenceRuntime, PassageRef, Relation
from scripture_archive_runtime.models import Confidence
from scripture_archive_runtime.witness_matrix import build_witness_matrix


class WitnessMatrixProvenanceConvergenceTests(unittest.TestCase):
    def test_mixed_support_cannot_publish_declared_third_witness(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-MARK",
                (PassageRef("MK14:13", "Mark", 14, 13, witness="Mark"),),
                "Mark says two disciples.",
                Confidence.T1,
                witness="Mark",
                relation_ids=("REL-PARALLEL",),
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-LUKE",
                (PassageRef("LK22:8", "Luke", 22, 8, witness="Luke"),),
                "Luke names Peter and John.",
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
                witness="John",
                passage_ids=("MK14:13", "LK22:8"),
            )
        )
        runtime.add_claim(
            Claim(
                "CL-COMPARE",
                "Cross-witness comparison.",
                Confidence.T2,
                required_evidence_ids=("EV-MARK", "EV-LUKE"),
                witness="John",
            )
        )
        runtime.unlock("EV-MARK")
        runtime.unlock("EV-LUKE")

        matrix = build_witness_matrix(runtime, witnesses=("Mark", "Luke"))
        row = matrix.to_dict()["rows"][0]

        self.assertEqual(row["relations"][0]["relation_id"], "REL-PARALLEL")
        self.assertIsNone(row["relations"][0]["witness"])
        self.assertEqual(row["claims"][0]["claim_id"], "CL-COMPARE")
        self.assertIsNone(row["claims"][0]["witness"])
        linear = "\n".join(matrix.linearize())
        self.assertIn("Relation REL-PARALLEL: EV-MARK --parallel_witness--> EV-LUKE", linear)
        self.assertIn("Claim CL-COMPARE: Cross-witness comparison.", linear)
        self.assertNotIn("witness=John", linear)
        self.assertNotIn("Witness: John", linear)

    def test_source_local_declared_witness_survives_exact_support_validation(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-MARK-1",
                (PassageRef("MK1:1", "Mark", 1, 1, witness="Mark"),),
                "First Mark record.",
                Confidence.T1,
                witness="Mark",
                relation_ids=("REL-MARK",),
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-MARK-2",
                (PassageRef("MK1:2", "Mark", 1, 2, witness="Mark"),),
                "Second Mark record.",
                Confidence.T1,
                witness="Mark",
                relation_ids=("REL-MARK",),
            )
        )
        runtime.add_relation(
            Relation(
                "REL-MARK",
                "EV-MARK-1",
                "parallel_witness",
                "EV-MARK-2",
                witness="Mark",
                passage_ids=("MK1:1", "MK1:2"),
            )
        )
        runtime.add_claim(
            Claim(
                "CL-MARK",
                "Mark-local synthesis.",
                Confidence.T2,
                required_evidence_ids=("EV-MARK-1", "EV-MARK-2"),
                witness="Mark",
            )
        )
        runtime.unlock("EV-MARK-1")
        runtime.unlock("EV-MARK-2")

        matrix = build_witness_matrix(runtime, witnesses=("Mark", "Luke"))
        row = matrix.to_dict()["rows"][0]

        self.assertEqual(row["relations"][0]["witness"], "Mark")
        self.assertEqual(row["claims"][0]["witness"], "Mark")
        linear = "\n".join(matrix.linearize())
        self.assertIn("witness=Mark", linear)
        self.assertIn("Witness: Mark", linear)


if __name__ == "__main__":
    unittest.main()
