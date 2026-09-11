import json
import unittest

from scripture_archive_runtime.evidence import (
    Claim,
    EvidenceRecord,
    EvidenceRuntime,
    PassageRef,
    Relation,
)
from scripture_archive_runtime.evidence_graph import (
    CLAIM_NODE,
    ENTITY_NODE,
    EVIDENCE_NODE,
    PASSAGE_NODE,
    build_evidence_graph,
)
from scripture_archive_runtime.models import Confidence


class EvidenceGraphTests(unittest.TestCase):
    def runtime(self) -> EvidenceRuntime:
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-MARK",
                (PassageRef("MK14:13", "Mark", 14, 13, witness="Mark"),),
                "Mark says two disciples.",
                Confidence.T1,
                witness="Mark",
                entity_ids=("PERSON-PETER",),
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-LUKE",
                (PassageRef("LK22:8", "Luke", 22, 8, witness="Luke"),),
                "Luke names Peter and John.",
                Confidence.T1,
                witness="Luke",
                entity_ids=("PERSON-PETER",),
            )
        )
        runtime.add_claim(
            Claim(
                "CL-COMPARE",
                "Luke names the two disciples while Mark does not name them in the cited verse.",
                Confidence.T2,
                tx1=True,
                source_scope="Mark 14:13; Luke 22:8",
                uncertainty="Omission in the cited Mark verse is not denial.",
                required_evidence_ids=("EV-MARK", "EV-LUKE"),
                witness="Mark/Luke comparison",
            )
        )
        runtime.add_relation(
            Relation(
                "REL-PARALLEL",
                "EV-MARK",
                "parallel_witness",
                "EV-LUKE",
                passage_ids=("MK14:13", "LK22:8"),
            )
        )
        runtime.add_relation(
            Relation(
                "REL-MARK-PETER",
                "EV-MARK",
                "mentions_person",
                "PERSON-PETER",
                witness="Mark",
                passage_ids=("MK14:13",),
            )
        )
        return runtime

    def test_default_scope_excludes_locked_evidence_claim_and_hidden_relation(self):
        runtime = self.runtime()
        runtime.unlock("EV-MARK")

        graph = build_evidence_graph(runtime)
        payload = graph.to_dict()
        serialized = json.dumps(payload, ensure_ascii=False, sort_keys=True)

        self.assertEqual(payload["schema"], "evidence-graph.v1")
        self.assertEqual(payload["evidence_scope"], "unlocked_only")
        self.assertIn("EV-MARK", serialized)
        self.assertIn("Mark says two disciples.", serialized)
        self.assertIn("MK14:13", serialized)
        self.assertIn("PERSON-PETER", serialized)
        self.assertIn("REL-MARK-PETER", serialized)

        self.assertNotIn("EV-LUKE", serialized)
        self.assertNotIn("Luke names Peter and John.", serialized)
        self.assertNotIn("LK22:8", serialized)
        self.assertNotIn("CL-COMPARE", serialized)
        self.assertNotIn("REL-PARALLEL", serialized)

    def test_full_scope_includes_supported_claim_and_explicit_relation(self):
        runtime = self.runtime()
        runtime.unlock("EV-MARK")

        graph = build_evidence_graph(runtime, include_locked_evidence=True)
        payload = graph.to_dict()
        nodes = {node["graph_id"]: node for node in payload["nodes"]}
        edges = {edge["edge_id"]: edge for edge in payload["edges"]}

        self.assertEqual(payload["evidence_scope"], "all_runtime_evidence")
        self.assertEqual(nodes["evidence:EV-MARK"]["node_type"], EVIDENCE_NODE)
        self.assertEqual(nodes["evidence:EV-LUKE"]["node_type"], EVIDENCE_NODE)
        self.assertEqual(nodes["claim:CL-COMPARE"]["node_type"], CLAIM_NODE)
        self.assertEqual(nodes["passage:MK14:13"]["node_type"], PASSAGE_NODE)
        self.assertEqual(nodes["entity_ref:PERSON-PETER"]["node_type"], ENTITY_NODE)

        self.assertIn("supports:EV-MARK:CL-COMPARE", edges)
        self.assertIn("supports:EV-LUKE:CL-COMPARE", edges)
        self.assertEqual(edges["relation:REL-PARALLEL"]["edge_type"], "parallel_witness")
        self.assertEqual(
            edges["relation:REL-PARALLEL"]["payload"]["passage_ids"],
            ["MK14:13", "LK22:8"],
        )

    def test_explicit_selection_fails_closed_for_locked_or_unknown_evidence(self):
        runtime = self.runtime()
        runtime.unlock("EV-MARK")

        with self.assertRaises(PermissionError):
            build_evidence_graph(runtime, evidence_ids=("EV-MARK", "EV-LUKE"))
        with self.assertRaises(KeyError):
            build_evidence_graph(runtime, evidence_ids=("EV-MISSING",))

    def test_claim_with_partially_visible_or_unknown_support_cannot_surface(self):
        runtime = self.runtime()
        runtime.unlock("EV-MARK")
        payload = build_evidence_graph(runtime).to_dict()
        self.assertNotIn("CL-COMPARE", json.dumps(payload, sort_keys=True))

        malformed = EvidenceRuntime()
        malformed.add_evidence(
            EvidenceRecord(
                "EV-A",
                (PassageRef("P-A", "Mark", 1, 1, witness="Mark"),),
                "Visible proposition.",
                Confidence.T1,
                witness="Mark",
            )
        )
        malformed.add_claim(
            Claim(
                "CL-BAD",
                "Malformed claim.",
                Confidence.T1,
                required_evidence_ids=("EV-A", "EV-MISSING"),
            )
        )
        malformed.unlock("EV-A")
        with self.assertRaisesRegex(ValueError, "unknown evidence"):
            build_evidence_graph(malformed)

    def test_same_passage_id_with_conflicting_metadata_fails_closed(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-A",
                (PassageRef("P-SAME", "Mark", 1, 1, witness="Mark"),),
                "Mark-local proposition.",
                Confidence.T1,
                witness="Mark",
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-B",
                (PassageRef("P-SAME", "Luke", 1, 1, witness="Luke"),),
                "Luke-local proposition.",
                Confidence.T1,
                witness="Luke",
            )
        )
        runtime.unlock("EV-A")
        runtime.unlock("EV-B")

        with self.assertRaisesRegex(ValueError, "Conflicting passage metadata"):
            build_evidence_graph(runtime)

    def test_relation_with_nonvisible_passage_provenance_is_omitted(self):
        runtime = EvidenceRuntime()
        for evidence_id, passage_id in (("EV-A", "P-A"), ("EV-B", "P-B")):
            runtime.add_evidence(
                EvidenceRecord(
                    evidence_id,
                    (PassageRef(passage_id, "Mark", 1, 1, witness="Mark"),),
                    f"{evidence_id} proposition.",
                    Confidence.T1,
                    witness="Mark",
                )
            )
            runtime.unlock(evidence_id)
        runtime.add_relation(
            Relation(
                "REL-HIDDEN-PROV",
                "EV-A",
                "supports",
                "EV-B",
                passage_ids=("P-HIDDEN",),
            )
        )

        serialized = json.dumps(build_evidence_graph(runtime).to_dict(), sort_keys=True)
        self.assertNotIn("REL-HIDDEN-PROV", serialized)
        self.assertNotIn("P-HIDDEN", serialized)

    def test_ambiguous_relation_endpoint_is_rejected_instead_of_guessed(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-A",
                (PassageRef("P-A", "Mark", 1, 1, witness="Mark"),),
                "A proposition.",
                Confidence.T1,
                witness="Mark",
                entity_ids=("EV-A",),
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-B",
                (PassageRef("P-B", "Mark", 1, 2, witness="Mark"),),
                "B proposition.",
                Confidence.T1,
                witness="Mark",
            )
        )
        runtime.add_relation(Relation("REL-AMBIG", "EV-A", "related", "EV-B"))
        runtime.unlock("EV-A")
        runtime.unlock("EV-B")

        with self.assertRaisesRegex(ValueError, "Ambiguous relation endpoint EV-A"):
            build_evidence_graph(runtime)

    def test_linear_representation_preserves_visible_truth_and_provenance(self):
        runtime = self.runtime()
        runtime.unlock("EV-MARK")
        runtime.unlock("EV-LUKE")
        graph = build_evidence_graph(runtime)
        linear = "\n".join(graph.linearize())

        self.assertIn("Evidence EV-MARK: Mark says two disciples. [T1; witness=Mark]", linear)
        self.assertIn("Evidence EV-LUKE: Luke names Peter and John. [T1; witness=Luke]", linear)
        self.assertIn("Passage MK14:13: Mark 14:13; witness=Mark", linear)
        self.assertIn("Canonical entity reference PERSON-PETER", linear)
        self.assertIn("Claim CL-COMPARE", linear)
        self.assertIn("T2 TX1; witness=Mark/Luke comparison", linear)
        self.assertIn("Required evidence: EV-MARK, EV-LUKE", linear)
        self.assertIn("Source scope: Mark 14:13; Luke 22:8", linear)
        self.assertIn("Uncertainty: Omission in the cited Mark verse is not denial.", linear)
        self.assertIn("Canonical relation REL-PARALLEL", linear)
        self.assertIn("parallel_witness", linear)
        self.assertIn("passages=MK14:13, LK22:8", linear)
        self.assertIn("Canonical relation REL-MARK-PETER", linear)
        self.assertIn("witness=Mark", linear)

    def test_output_is_deterministic_across_runtime_insertion_order(self):
        first = self.runtime()
        first.unlock("EV-MARK")
        first.unlock("EV-LUKE")

        second = EvidenceRuntime()
        second.add_evidence(first.evidence["EV-LUKE"])
        second.add_evidence(first.evidence["EV-MARK"])
        second.add_relation(first.relations["REL-MARK-PETER"])
        second.add_relation(first.relations["REL-PARALLEL"])
        second.add_claim(first.claims["CL-COMPARE"])
        second.unlock("EV-LUKE")
        second.unlock("EV-MARK")

        first_json = json.dumps(build_evidence_graph(first).to_dict(), sort_keys=True)
        second_json = json.dumps(build_evidence_graph(second).to_dict(), sort_keys=True)
        self.assertEqual(first_json, second_json)
        self.assertEqual(build_evidence_graph(first).linearize(), build_evidence_graph(second).linearize())


if __name__ == "__main__":
    unittest.main()
