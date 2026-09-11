#!/usr/bin/env python3
"""Regression for GitHub issue #60: exact-speaker provenance scopes must include their anchors."""
from __future__ import annotations

import importlib.util
import json
import pathlib
import tempfile
import unittest

REPO = pathlib.Path(__file__).resolve().parents[1]
MODULE_PATH = REPO / "tools/dev09_materialize_d4_readable.py"
SPEC = importlib.util.spec_from_file_location("dev09_materializer", MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("cannot load DEV09 materializer")
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)


class D4ProvenanceScopeRegression(unittest.TestCase):
    def test_source_overlay_and_full_materialized_readback(self) -> None:
        raw = M._load_transport_bytes(REPO, None)
        nodes, evidence = M.reconstruct_source(REPO, None)
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

        # Required fixtures from #60.
        self.assertEqual("Genesis 12:1–3", by_evidence["EV-OT-D4-0002"]["source_passage"])
        self.assertEqual("Genesis 17:3–5", by_evidence["EV-OT-D4-0008"]["source_passage"])
        self.assertEqual("Genesis 12:1–3", by_node["OTAB01-N008"]["source_scope_visible_to_player"])
        self.assertEqual("Genesis 17:3–5", by_node["OTAB02-N008"]["source_scope_visible_to_player"])

        # Gate must materialize all 450 and read them back, not only inspect an overlay.
        with tempfile.TemporaryDirectory(prefix="dev09-provenance-regression-") as td:
            temp = pathlib.Path(td)
            overlay_dst = temp / M.OVERLAY_REL
            overlay_dst.parent.mkdir(parents=True, exist_ok=True)
            overlay_dst.write_bytes((REPO / M.OVERLAY_REL).read_bytes())
            transport_zip = temp / "transport.zip"
            transport_zip.write_bytes(raw)
            M.materialize(temp, 30, transport_zip)
            verified = M.verify_readable(temp, require_manifest=True)
            self.assertEqual(M.NODE_AGGREGATE_SHA256, verified["aggregate"])


if __name__ == "__main__":
    unittest.main()
