import unittest

from scripture_archive_runtime.evidence import (
    Claim,
    EvidenceRecord,
    EvidenceRuntime,
    PassageRef,
    Relation,
)
from scripture_archive_runtime.evidence_graph import build_evidence_graph
from scripture_archive_runtime.models import Confidence


class EvidenceGraphWitnessSafetyTests(unittest.TestCase):
    def test_record_witness_conflicting_with_passage_witness_fails_closed(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-CONFLICT",
                (PassageRef("LK1:1", "Luke", 1, 1, witness="Luke"),),
                "A deliberately conflicting provenance record.",
                Confidence.T1,
                witness="Mark",
            )
        )
        runtime.unlock("EV-CONFLICT")

        with self.assertRaisesRegex(
            ValueError,
            "Conflicting witness provenance for evidence EV-CONFLICT",
        ):
            build_evidence_graph(runtime)

    def test_relation_witness_conflicting_with_visible_support_fails_closed(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-A",
                (PassageRef("MK1:1", "Mark", 1, 1, witness="Mark"),),
                "Mark-local proposition A.",
                Confidence.T1,
                witness="Mark",
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-B",
                (PassageRef("MK1:2", "Mark", 1, 2, witness="Mark"),),
                "Mark-local proposition B.",
                Confidence.T1,
                witness="Mark",
            )
        )
        runtime.add_relation(
            Relation(
                "REL-CONFLICT",
                "EV-A",
                "related",
                "EV-B",
                witness="Luke",
                passage_ids=("MK1:1",),
            )
        )
        runtime.unlock("EV-A")
        runtime.unlock("EV-B")

        with self.assertRaisesRegex(
            ValueError,
            "Conflicting witness provenance for relation REL-CONFLICT",
        ):
            build_evidence_graph(runtime)

    def test_single_witness_claim_does_not_surface_from_other_witness_evidence(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-LUKE",
                (PassageRef("LK1:1", "Luke", 1, 1, witness="Luke"),),
                "Luke-local proposition.",
                Confidence.T1,
                witness="Luke",
            )
        )
        runtime.add_claim(
            Claim(
                "CL-MARK",
                "A claim explicitly scoped to Mark.",
                Confidence.T2,
                required_evidence_ids=("EV-LUKE",),
                witness="Mark",
            )
        )
        runtime.unlock("EV-LUKE")

        graph = build_evidence_graph(runtime)
        graph_ids = {node["graph_id"] for node in graph.to_dict()["nodes"]}
        self.assertIn("evidence:EV-LUKE", graph_ids)
        self.assertNotIn("claim:CL-MARK", graph_ids)
        self.assertNotIn("CL-MARK", "\n".join(graph.linearize()))

    def test_unassigned_cross_witness_record_is_not_harmonized(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-MIXED",
                (
                    PassageRef("MK1:1", "Mark", 1, 1, witness="Mark"),
                    PassageRef("LK1:1", "Luke", 1, 1, witness="Luke"),
                ),
                "An explicit cross-witness synthesis record.",
                Confidence.T2,
                witness=None,
            )
        )
        runtime.unlock("EV-MIXED")

        graph = build_evidence_graph(runtime)
        payload = graph.to_dict()
        evidence = next(
            node for node in payload["nodes"] if node["graph_id"] == "evidence:EV-MIXED"
        )
        self.assertIsNone(evidence["payload"]["witness"])
        passage_witnesses = {
            node["raw_id"]: node["payload"]["witness"]
            for node in payload["nodes"]
            if node["node_type"] == "passage"
        }
        self.assertEqual(passage_witnesses, {"LK1:1": "Luke", "MK1:1": "Mark"})

        linear = "\n".join(graph.linearize())
        self.assertIn("Evidence EV-MIXED", linear)
        self.assertIn("witness=not specified", linear)
        self.assertIn("Passage MK1:1: Mark 1:1; witness=Mark", linear)
        self.assertIn("Passage LK1:1: Luke 1:1; witness=Luke", linear)


if __name__ == "__main__":
    unittest.main()
