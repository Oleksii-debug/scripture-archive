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


class EvidenceGraphClaimRelationProvenanceTests(unittest.TestCase):
    def _mark_claim_runtime(self) -> EvidenceRuntime:
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-MARK",
                (PassageRef("MK1:1", "Mark", 1, 1, witness="Mark"),),
                "Mark-local evidence supporting the claim.",
                Confidence.T1,
                witness="Mark",
                entity_ids=("PERSON-X",),
            )
        )
        runtime.add_claim(
            Claim(
                "CL-MARK",
                "A claim supported only by Mark-local evidence.",
                Confidence.T2,
                required_evidence_ids=("EV-MARK",),
                witness="Mark",
            )
        )
        runtime.unlock("EV-MARK")
        return runtime

    def test_claim_endpoint_cannot_publish_foreign_relation_witness(self):
        runtime = self._mark_claim_runtime()
        runtime.add_relation(
            Relation(
                "REL-CLAIM-JOHN",
                "CL-MARK",
                "related",
                "PERSON-X",
                witness="John",
            )
        )

        with self.assertRaisesRegex(
            ValueError,
            "Conflicting or unsupported witness provenance for relation REL-CLAIM-JOHN",
        ):
            build_evidence_graph(runtime)

    def test_claim_endpoint_preserves_matching_relation_witness_in_both_views(self):
        runtime = self._mark_claim_runtime()
        runtime.add_relation(
            Relation(
                "REL-CLAIM-MARK",
                "CL-MARK",
                "related",
                "PERSON-X",
                witness="Mark",
                passage_ids=("MK1:1", "MK1:1"),
            )
        )

        graph = build_evidence_graph(runtime)
        payload = graph.to_dict()
        relation = next(
            edge
            for edge in payload["edges"]
            if edge["edge_id"] == "relation:REL-CLAIM-MARK"
        )
        self.assertEqual(relation["payload"]["witness"], "Mark")
        self.assertEqual(relation["payload"]["passage_ids"], ["MK1:1"])

        linear = "\n".join(graph.linearize())
        self.assertIn("Canonical relation REL-CLAIM-MARK", linear)
        self.assertIn("witness=Mark; passages=MK1:1", linear)

    def test_unrelated_visible_passage_does_not_become_relation_provenance(self):
        runtime = self._mark_claim_runtime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-JOHN",
                (PassageRef("JN1:1", "John", 1, 1, witness="John"),),
                "Unrelated John-local evidence.",
                Confidence.T1,
                witness="John",
            )
        )
        runtime.unlock("EV-JOHN")
        runtime.add_relation(
            Relation(
                "REL-CROSS-ROW-PASSAGE",
                "CL-MARK",
                "related",
                "PERSON-X",
                witness=None,
                passage_ids=("JN1:1",),
            )
        )

        graph = build_evidence_graph(runtime)
        relation_ids = {
            edge["edge_id"]
            for edge in graph.to_dict()["edges"]
            if edge["edge_type"].startswith("canonical:")
        }
        self.assertNotIn("relation:REL-CROSS-ROW-PASSAGE", relation_ids)
        self.assertNotIn("REL-CROSS-ROW-PASSAGE", "\n".join(graph.linearize()))


if __name__ == "__main__":
    unittest.main()
