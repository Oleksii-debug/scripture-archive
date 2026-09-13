import tempfile
import unittest
from pathlib import Path

from runtime_engine.scripture_archive_runtime.evidence import Claim, EvidenceRecord, EvidenceRuntime, PassageRef, Relation
from runtime_engine.scripture_archive_runtime.models import Confidence, Correctness
from scripture_archive_platform.application.runtime_gateway import RuntimeBackedPlayerGateway, build_runtime_gateway
from scripture_archive_platform.application.service import PlatformApplication
from scripture_archive_platform.persistence.store import JsonFileStore
from scripture_archive_platform.transport.contracts import validate_request_shape


REPO_ROOT = Path(__file__).resolve().parents[4]
FRONTEND = Path(__file__).resolve().parents[1] / "frontend"


class _RuntimeHolder:
    def __init__(self, evidence): self.evidence = evidence


class _GraphGateway:
    def __init__(self, graph): self.graph = graph; self.calls = 0
    def get_evidence_graph(self): self.calls += 1; return self.graph


class PackagedEvidenceGraphTests(unittest.TestCase):
    def _runtime(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(EvidenceRecord(
            "E-MARK", (PassageRef("P-MARK-1", "Mark", 1, 1, witness="Mark"),),
            "Visible Mark-local proposition", Confidence.T1, witness="Mark", entity_ids=("person:jesus",),
        ))
        runtime.add_evidence(EvidenceRecord(
            "E-LOCKED", (PassageRef("P-LOCKED", "John", 1, 1, witness="John"),),
            "Locked proposition", Confidence.T1, witness="John",
        ))
        runtime.add_claim(Claim(
            "C-MARK", "Claim supported by the visible record", Confidence.T1,
            required_evidence_ids=("E-MARK",), witness="Mark",
        ))
        runtime.add_relation(Relation(
            "R-MARK", "E-MARK", "mentions", "person:jesus", witness="Mark", passage_ids=("P-MARK-1",),
        ))
        runtime.unlock("E-MARK")
        return runtime

    def test_gateway_projects_only_unlocked_runtime_truth_with_same_linear_graph(self):
        runtime = self._runtime()
        gateway = RuntimeBackedPlayerGateway(
            lambda request: {"api_version":"runtime.v1","request_id":request["request_id"]},
            runtime_application=_RuntimeHolder(runtime),
        )
        graph = gateway.get_evidence_graph()
        self.assertEqual("evidence-graph.v1", graph["schema"])
        self.assertEqual("unlocked_only", graph["evidence_scope"])
        self.assertEqual("D5/runtime", graph["truth_owner"])
        raw_ids = {node["raw_id"] for node in graph["nodes"]}
        self.assertIn("E-MARK", raw_ids); self.assertIn("C-MARK", raw_ids); self.assertNotIn("E-LOCKED", raw_ids)
        self.assertTrue(any("Evidence E-MARK" in line for line in graph["linear"]))
        self.assertFalse(any("E-LOCKED" in line or "Locked proposition" in line for line in graph["linear"]))
        self.assertTrue(any(edge["edge_id"] == "relation:R-MARK" for edge in graph["edges"]))

    def test_packaged_gateway_materializes_checked_in_registry_without_invented_source_structure(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            gateway = build_runtime_gateway(REPO_ROOT, Path(temp_dir))
            runtime = gateway._runtime_application
            self.assertGreater(len(runtime.evidence.evidence), 0)
            linked_tasks = []
            for task in runtime.content.all().values():
                raw = task.optional_evidence_unlock
                if isinstance(raw, str):
                    ids = tuple(item.strip() for item in raw.replace(';', ',').split(',') if item.strip() and item.strip().casefold() != 'none')
                elif isinstance(raw, (list, tuple, set)):
                    ids = tuple(str(item) for item in raw)
                else:
                    ids = ()
                if ids: linked_tasks.append((task, ids))
            self.assertTrue(linked_tasks, "canonical evidence registry must map at least one node")
            task, evidence_ids = linked_tasks[0]
            for evidence_id in evidence_ids:
                self.assertIn(evidence_id, runtime.evidence.evidence)
                record = runtime.evidence.evidence[evidence_id]
                self.assertEqual((), record.passage_refs)
                self.assertIsNone(record.witness)
                self.assertEqual((), record.entity_ids)
                self.assertEqual((), record.relation_ids)
            incorrect = runtime.branches.resolve(task, Correctness.INCORRECT)
            self.assertEqual((), incorrect.evidence_unlocks)
            guided_correct = runtime.branches.resolve(task, Correctness.CORRECT, hint_count=6, hint_threshold=6)
            self.assertEqual((), guided_correct.evidence_unlocks)
            correct = runtime.branches.resolve(task, Correctness.CORRECT)
            self.assertTrue(set(evidence_ids).issubset(set(correct.evidence_unlocks)))
            graph_before = gateway.get_evidence_graph()
            self.assertTrue(all(eid not in {node["raw_id"] for node in graph_before["nodes"]} for eid in evidence_ids))
            runtime.evidence.unlock(evidence_ids[0])
            graph_after = gateway.get_evidence_graph()
            self.assertIn(evidence_ids[0], {node["raw_id"] for node in graph_after["nodes"]})

    def test_transport_forbids_scope_or_locked_evidence_inputs(self):
        request_id, command, payload = validate_request_shape({
            "api_version":"scripture.transport.v1","request_id":"graph-empty","command":"research.get_evidence_graph","payload":{},
        })
        self.assertEqual(("graph-empty","research.get_evidence_graph",{}), (request_id, command, payload))
        for forbidden in ({"include_locked_evidence":True},{"evidence_ids":["E-LOCKED"]},{"scope":"all"}):
            with self.assertRaisesRegex(ValueError, "empty payload"):
                validate_request_shape({
                    "api_version":"scripture.transport.v1","request_id":"graph-forbidden","command":"research.get_evidence_graph","payload":forbidden,
                })

    def test_platform_command_is_read_only_gateway_projection(self):
        expected = {"schema":"evidence-graph.v1","evidence_scope":"unlocked_only","nodes":[],"edges":[],"linear":["Evidence Graph","Evidence scope: unlocked_only"],"truth_owner":"D5/runtime"}
        fake = _GraphGateway(expected)
        with tempfile.TemporaryDirectory() as temp_dir:
            app = PlatformApplication(REPO_ROOT, store=JsonFileStore(Path(temp_dir)), player_gateway=fake)
            response = app.handle({"api_version":"scripture.transport.v1","request_id":"graph-platform","command":"research.get_evidence_graph","payload":{}})
        self.assertTrue(response["ok"]); self.assertEqual(expected, response["data"]); self.assertEqual(1, fake.calls)

    def test_packaged_ui_is_text_first_and_uses_only_fixed_graph_command(self):
        source = (FRONTEND / "evidence-graph-ui.js").read_text(encoding="utf-8")
        transport = (FRONTEND / "transport.js").read_text(encoding="utf-8")
        self.assertIn("research.get_evidence_graph", source)
        self.assertIn("evidence-graph.v1", source)
        self.assertIn("unlocked_only", source)
        self.assertIn("Повний лінійний еквівалент", source)
        self.assertIn("document.createElement('table')", source)
        self.assertIn("textContent", source)
        self.assertNotIn("innerHTML", source)
        self.assertNotIn("include_locked_evidence", source)
        self.assertIn("unwrap(await transportPromise, COMMAND, {})", source)
        self.assertIn("./evidence-graph-ui.js", transport)


if __name__ == "__main__":
    unittest.main()
