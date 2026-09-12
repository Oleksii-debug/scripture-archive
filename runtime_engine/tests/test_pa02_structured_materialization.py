import json
import shutil
import tempfile
import unittest
from pathlib import Path

from scripture_archive_runtime.dossiers import DossierAssembler, DossierKind, DossierSubject
from scripture_archive_runtime.evidence_graph import build_evidence_graph
from scripture_archive_runtime.evidence_materialization import (
    PA02_STRUCTURED_INDEX,
    load_pa02_structured_evidence,
)
from scripture_archive_runtime.evidence_registry import load_r05_evidence_registry
from scripture_archive_runtime.models import Confidence
from scripture_archive_runtime.witness_matrix import build_witness_matrix


REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCE_PACK = "PA02_DAMASCUS_ROAD_WITNESS_PACK_v0.1.md"
SOURCE_IDS = tuple(f"EV-PA-{number:04d}" for number in range(8, 18))


class PA02StructuredMaterializationTests(unittest.TestCase):
    def test_pinned_source_pack_materializes_real_source_structure(self):
        records, node_links = load_pa02_structured_evidence(REPO_ROOT)

        self.assertEqual(set(SOURCE_IDS), set(records))
        record = records["EV-PA-0008"]
        self.assertEqual(Confidence.T1, record.confidence)
        self.assertFalse(record.tx1)
        self.assertEqual("Acts 9 narrator", record.witness)
        self.assertEqual(("event:damascus-road", "person:saul-paul"), record.entity_ids)
        self.assertEqual(("Acts.9.3-6",), tuple(ref.passage_id for ref in record.passage_refs))
        self.assertIn("light from heaven", record.proposition)
        self.assertEqual((), record.relation_ids)

        mixed = records["EV-PA-0016"]
        self.assertIsNone(mixed.witness)
        self.assertEqual(
            {"Acts 9 narrator", "Acts 22 Paul speech", "Acts 26 Paul speech"},
            {ref.witness for ref in mixed.passage_refs},
        )
        self.assertEqual(("EV-PA-0015",), node_links["PA02-N09"])
        self.assertEqual(set(SOURCE_IDS), set(node_links["PA02-N13"]))

    def test_source_pack_byte_drift_fails_closed(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            evidence_dir = root / "docs" / "evidence"
            evidence_dir.mkdir(parents=True)
            source_dir = REPO_ROOT / "docs" / "evidence"
            shutil.copy2(source_dir / PA02_STRUCTURED_INDEX, evidence_dir / PA02_STRUCTURED_INDEX)
            shutil.copy2(source_dir / SOURCE_PACK, evidence_dir / SOURCE_PACK)
            with (evidence_dir / SOURCE_PACK).open("ab") as handle:
                handle.write(b"\n")
            with self.assertRaisesRegex(ValueError, "Source evidence pack drifted"):
                load_pa02_structured_evidence(root)

    def test_crlf_checkout_representation_matches_pinned_git_blob(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            evidence_dir = root / "docs" / "evidence"
            evidence_dir.mkdir(parents=True)
            source_dir = REPO_ROOT / "docs" / "evidence"
            shutil.copy2(source_dir / PA02_STRUCTURED_INDEX, evidence_dir / PA02_STRUCTURED_INDEX)
            canonical = (source_dir / SOURCE_PACK).read_bytes().replace(b"\r\n", b"\n")
            self.assertIn(b"\n", canonical)
            (evidence_dir / SOURCE_PACK).write_bytes(canonical.replace(b"\n", b"\r\n"))

            records, node_links = load_pa02_structured_evidence(root)

            self.assertEqual(set(SOURCE_IDS), set(records))
            self.assertEqual(("EV-PA-0015",), node_links["PA02-N09"])

    def test_unknown_retrieval_subject_fails_closed(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            evidence_dir = root / "docs" / "evidence"
            evidence_dir.mkdir(parents=True)
            source_dir = REPO_ROOT / "docs" / "evidence"
            shutil.copy2(source_dir / SOURCE_PACK, evidence_dir / SOURCE_PACK)
            index = json.loads((source_dir / PA02_STRUCTURED_INDEX).read_text(encoding="utf-8"))
            index["records"][0]["entity_ids"].append("person:not-declared")
            (evidence_dir / PA02_STRUCTURED_INDEX).write_text(
                json.dumps(index, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, "unknown structured subject"):
                load_pa02_structured_evidence(root)

    def test_canonical_registry_unlock_map_keeps_r05_and_adds_source_records(self):
        bundle = load_r05_evidence_registry(REPO_ROOT)

        self.assertIn("EVR-R05-0090", bundle.node_evidence_ids["PA02-N13"])
        self.assertTrue(set(SOURCE_IDS).issubset(set(bundle.node_evidence_ids["PA02-N13"])))
        self.assertIn("EVR-R05-0090", bundle.records)
        self.assertNotIn("EV-PA-0008", bundle.records)
        self.assertIn("EV-PA-0008", bundle.runtime.evidence)
        self.assertIs(True, bundle.records["EVR-R05-0001"]["nonvisual_access"])

        # R05 grading provenance remains intentionally unparsed.
        r05 = bundle.runtime.evidence["EVR-R05-0090"]
        self.assertEqual((), r05.passage_refs)
        self.assertIsNone(r05.witness)
        self.assertEqual((), r05.entity_ids)

    def test_one_runtime_feeds_dossier_witness_matrix_and_evidence_graph(self):
        bundle = load_r05_evidence_registry(REPO_ROOT)
        runtime = bundle.runtime
        for evidence_id in SOURCE_IDS:
            runtime.unlock(evidence_id)

        dossier = DossierAssembler(runtime).build(
            DossierSubject(
                "event:damascus-road",
                DossierKind.EVENT,
                "Damascus-road encounter",
            )
        ).to_dict()
        self.assertTrue(dossier["stated"])
        dossier_ids = {row["row_id"] for row in dossier["rows"]}
        self.assertTrue(set(SOURCE_IDS).issubset(dossier_ids))
        self.assertIn(
            "Acts.9.3-6",
            {
                passage_id
                for row in dossier["rows"]
                for passage_id in row["passage_ids"]
            },
        )

        witnesses = ("Acts 9 narrator", "Acts 22 Paul speech", "Acts 26 Paul speech")
        matrix = build_witness_matrix(runtime, witnesses=witnesses).to_dict()
        serialized = json.dumps(matrix, ensure_ascii=False, sort_keys=True)
        self.assertIn("EV-PA-0008", serialized)
        self.assertIn("EV-PA-0011", serialized)
        self.assertIn("EV-PA-0014", serialized)
        for witness in witnesses:
            self.assertIn(witness, serialized)

        graph = build_evidence_graph(runtime).to_dict()
        raw_ids = {node["raw_id"] for node in graph["nodes"]}
        self.assertIn("EV-PA-0008", raw_ids)
        self.assertIn("Acts.9.3-6", raw_ids)
        self.assertIn("event:damascus-road", raw_ids)
        edge_ids = {edge["edge_id"] for edge in graph["edges"]}
        self.assertIn("cites:EV-PA-0008:Acts.9.3-6", edge_ids)
        self.assertIn("mentions:EV-PA-0008:event:damascus-road", edge_ids)


if __name__ == "__main__":
    unittest.main()
