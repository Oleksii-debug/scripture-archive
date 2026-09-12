import json
import tempfile
import unittest
from pathlib import Path

from runtime_engine.scripture_archive_runtime.models import Correctness
from scripture_archive_platform.application.runtime_gateway import build_runtime_gateway


REPO_ROOT = Path(__file__).resolve().parents[4]
SOURCE_IDS = {f"EV-PA-{number:04d}" for number in range(8, 18)}


class PackagedStructuredEvidencePopulationTests(unittest.TestCase):
    def test_real_packaged_pa02_node_unlocks_source_structure_for_research(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            gateway = build_runtime_gateway(REPO_ROOT, Path(temp_dir))
            application = gateway._runtime_application
            task = application.content.all()["PA02-N13"]

            raw = task.optional_evidence_unlock
            if isinstance(raw, str):
                unlock_ids = {
                    item.strip()
                    for item in raw.replace(";", ",").split(",")
                    if item.strip() and item.strip().casefold() != "none"
                }
            else:
                unlock_ids = {str(item) for item in raw}

            self.assertTrue(SOURCE_IDS.issubset(unlock_ids))
            correct = application.branches.resolve(task, Correctness.CORRECT)
            self.assertTrue(SOURCE_IDS.issubset(set(correct.evidence_unlocks)))

            for evidence_id in correct.evidence_unlocks:
                application.evidence.unlock(evidence_id)

            matrix = gateway.get_witness_matrix()
            self.assertEqual(
                ["Acts 22 Paul speech", "Acts 26 Paul speech", "Acts 9 narrator"],
                matrix["available_witnesses"],
            )
            serialized_matrix = json.dumps(matrix, ensure_ascii=False, sort_keys=True)
            self.assertIn("EV-PA-0008", serialized_matrix)
            self.assertIn("EV-PA-0011", serialized_matrix)
            self.assertIn("EV-PA-0014", serialized_matrix)

            graph = gateway.get_evidence_graph()
            raw_ids = {node["raw_id"] for node in graph["nodes"]}
            self.assertIn("EV-PA-0008", raw_ids)
            self.assertIn("Acts.9.3-6", raw_ids)
            self.assertIn("event:damascus-road", raw_ids)
            self.assertTrue(
                any(
                    edge["edge_id"] == "cites:EV-PA-0008:Acts.9.3-6"
                    for edge in graph["edges"]
                )
            )


if __name__ == "__main__":
    unittest.main()
