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


class EvidenceGraphRelationClaimProvenanceTests(unittest.TestCase):
    def mark_runtime(self) -> EvidenceRuntime:
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-MARK",
                (PassageRef("MK1:1", "Mark", 1, 1, witness="Mark"),),
                "Mark-local support.",
                Confidence.T1,
                witness=None,
                entity_ids=("PERSON-X",),
            )
        )
        runtime.add_claim(
            Claim(
                "CL-MARK",
                "A visible claim supported by Mark-local evidence.",
                Confidence.T2,
                required_evidence_ids=("EV-MARK",),
                witness=None,
            )
        )
        runtime.unlock("EV-MARK")
        return runtime

    def test_claim_endpoint_support_blocks_conflicting_relation_witness(self):
        runtime = self.mark_runtime()
        runtime.add_relation(
            Relation(
                "REL-CLAIM-CONFLICT",
                "CL-MARK",
                "mentions",
                "PERSON-X",
                witness="John",
            )
        )

        with self.assertRaisesRegex(
            ValueError,
            "Conflicting witness provenance for relation REL-CLAIM-CONFLICT",
        ):
            build_evidence_graph(runtime)

    def test_claim_endpoint_support_allows_matching_relation_witness(self):
        runtime = self.mark_runtime()
        runtime.add_relation(
            Relation(
                "REL-CLAIM-MATCH",
                "CL-MARK",
                "mentions",
                "PERSON-X",
                witness="Mark",
            )
        )

        graph = build_evidence_graph(runtime)
        relation = next(
            edge
            for edge in graph.to_dict()["edges"]
            if edge["edge_id"] == "relation:REL-CLAIM-MATCH"
        )
        self.assertEqual(relation["payload"]["witness"], "Mark")
        linear = "\n".join(graph.linearize())
        self.assertIn("Canonical relation REL-CLAIM-MATCH", linear)
        self.assertIn("witness=Mark", linear)

    def test_evidence_endpoint_uses_passage_only_witness_support(self):
        runtime = self.mark_runtime()
        runtime.add_relation(
            Relation(
                "REL-EVIDENCE-CONFLICT",
                "EV-MARK",
                "mentions",
                "PERSON-X",
                witness="John",
            )
        )

        with self.assertRaisesRegex(
            ValueError,
            "Conflicting witness provenance for relation REL-EVIDENCE-CONFLICT",
        ):
            build_evidence_graph(runtime)

    def test_declared_relation_witness_without_explicit_support_fails_closed(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-NONE",
                (),
                "Witness-unassigned support.",
                Confidence.T2,
                witness=None,
                entity_ids=("PERSON-X",),
            )
        )
        runtime.add_claim(
            Claim(
                "CL-NONE",
                "A witness-unassigned claim.",
                Confidence.T2,
                required_evidence_ids=("EV-NONE",),
                witness=None,
            )
        )
        runtime.add_relation(
            Relation(
                "REL-UNSUPPORTED",
                "CL-NONE",
                "mentions",
                "PERSON-X",
                witness="John",
            )
        )
        runtime.unlock("EV-NONE")

        with self.assertRaisesRegex(
            ValueError,
            "without explicit visible supporting witness provenance",
        ):
            build_evidence_graph(runtime)

    def test_witnessless_relation_remains_unassigned_without_inference(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-NONE",
                (),
                "Witness-unassigned support.",
                Confidence.T2,
                witness=None,
                entity_ids=("PERSON-X",),
            )
        )
        runtime.add_claim(
            Claim(
                "CL-NONE",
                "A witness-unassigned claim.",
                Confidence.T2,
                required_evidence_ids=("EV-NONE",),
                witness=None,
            )
        )
        runtime.add_relation(
            Relation(
                "REL-UNASSIGNED",
                "CL-NONE",
                "mentions",
                "PERSON-X",
                witness=None,
            )
        )
        runtime.unlock("EV-NONE")

        graph = build_evidence_graph(runtime)
        relation = next(
            edge
            for edge in graph.to_dict()["edges"]
            if edge["edge_id"] == "relation:REL-UNASSIGNED"
        )
        self.assertIsNone(relation["payload"]["witness"])
        self.assertIn(
            "witness=not specified",
            "\n".join(graph.linearize()),
        )


if __name__ == "__main__":
    unittest.main()
