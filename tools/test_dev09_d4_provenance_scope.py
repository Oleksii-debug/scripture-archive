#!/usr/bin/env python3
"""Regressions for #60 provenance and full D4 evidence materialization fidelity."""
from __future__ import annotations

import importlib.util
import json
import os
import pathlib
import tempfile
import unittest

REPO = pathlib.Path(__file__).resolve().parents[1]
MATERIALIZER_PATH = REPO / "tools/dev09_materialize_d4_readable.py"
FIDELITY_PATH = REPO / "tools/dev09_d4_evidence_fidelity.py"


def load_module(name: str, path: pathlib.Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


M = load_module("dev09_materializer", MATERIALIZER_PATH)
F = load_module("dev09_evidence_fidelity", FIDELITY_PATH)


class D4ProvenanceScopeRegression(unittest.TestCase):
    def transport_path(self) -> pathlib.Path | None:
        value = os.environ.get("DEV09_D4_TRANSPORT_ZIP")
        return pathlib.Path(value) if value else None

    def test_source_overlay_and_full_materialized_readback(self) -> None:
        source_zip = self.transport_path()
        raw = M._load_transport_bytes(REPO, source_zip)
        nodes, evidence = M.reconstruct_source(REPO, source_zip)
        self.assertEqual(450, len(nodes))
        self.assertEqual(90, len(evidence))
        overlay = M.load_overlay(REPO)
        self.assertEqual(5, len(overlay["evidence_repairs"]))
        self.assertEqual(29, overlay["changed_node_count"])

        by_evidence = {record["evidence_id"]: record for record in evidence}
        by_node = {node["node_id"]: node for node in nodes}
        for repair in overlay["evidence_repairs"]:
            record = by_evidence[repair["evidence_id"]]
            self.assertEqual(repair["new_source_passage"], record["source_passage"])
            self.assertEqual(repair["speaker_or_narrator"], record["speaker_or_narrator"])
            for node_id in repair["affected_node_ids"]:
                serialized = json.dumps(by_node[node_id], ensure_ascii=False)
                self.assertNotIn(repair["old_source_passage"], serialized)
                self.assertIn(repair["new_source_passage"], serialized)

        self.assertEqual("Genesis 12:1–3", by_evidence["EV-OT-D4-0002"]["source_passage"])
        self.assertEqual("Genesis 17:3–5", by_evidence["EV-OT-D4-0008"]["source_passage"])
        self.assertEqual(
            "Genesis 12:1–3", by_node["OTAB01-N008"]["source_scope_visible_to_player"]
        )
        self.assertEqual(
            "Genesis 17:3–5", by_node["OTAB02-N008"]["source_scope_visible_to_player"]
        )

        with tempfile.TemporaryDirectory(prefix="dev09-provenance-regression-") as td:
            temp = pathlib.Path(td)
            overlay_dst = temp / M.OVERLAY_REL
            overlay_dst.parent.mkdir(parents=True, exist_ok=True)
            overlay_dst.write_bytes((REPO / M.OVERLAY_REL).read_bytes())
            transport_zip = temp / "transport.zip"
            transport_zip.write_bytes(raw)
            M.materialize(temp, 30, transport_zip)
            F.seal(temp)
            verified = M.verify_readable(temp, require_manifest=True)
            F.verify(temp)
            self.assertEqual(M.NODE_AGGREGATE_SHA256, verified["aggregate"])

            repaired_ids = {
                repair["evidence_id"] for repair in overlay["evidence_repairs"]
            }
            target = None
            for path in sorted((temp / F.EVIDENCE_REL).glob("*.jsonl")):
                lines = path.read_text(encoding="utf-8").splitlines()
                for index, line in enumerate(lines):
                    record = json.loads(line)
                    if record["evidence_id"] not in repaired_ids:
                        record["_fidelity_negative_probe"] = "must-fail"
                        lines[index] = F.canon(record).decode("utf-8")
                        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
                        target = record["evidence_id"]
                        break
                if target:
                    break
            self.assertIsNotNone(target)
            with self.assertRaises(SystemExit):
                F.verify(temp)


if __name__ == "__main__":
    unittest.main()
