#!/usr/bin/env python3
from __future__ import annotations

import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
for entry in (
    REPO_ROOT / "runtime_engine",
    REPO_ROOT / "runtime_engine" / "tests",
    REPO_ROOT / "tools",
):
    if str(entry) not in sys.path:
        sys.path.insert(0, str(entry))

from fixtures import LN01_N03
from scripture_archive_runtime.content_packs import ContentPackStore, inspect_content_pack
from validate_dev2_corrected_runtime_compat import (
    PACK_ID,
    PACK_VERSION,
    _runtime_compatibility,
    write_preintegration_pack,
)


class D2CorrectedRuntimeCompatibilityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_pack_writer_is_deterministic_and_installable(self) -> None:
        node = copy.deepcopy(LN01_N03)
        first = self.root / "first.zip"
        second = self.root / "second.zip"
        a = write_preintegration_pack([node] * 0 + [node], first)
        b = write_preintegration_pack([copy.deepcopy(node)], second)
        self.assertEqual(first.read_bytes(), second.read_bytes())
        self.assertEqual(a["archive_sha256"], b["archive_sha256"])
        inspected = inspect_content_pack(first)
        self.assertEqual(PACK_ID, inspected.manifest.pack_id)
        self.assertEqual(PACK_VERSION, inspected.manifest.version)
        self.assertEqual(1, inspected.node_count)

    def test_generic_runtime_self_grade_and_load_path_accepts_canonical_fixture(self) -> None:
        node = copy.deepcopy(LN01_N03)
        # The production helper is cardinality-pinned to D2, so exercise the same
        # runtime primitives here through a one-record content pack round trip.
        archive = self.root / "fixture.zip"
        write_preintegration_pack([node], archive, expected_node_count=1)
        store = ContentPackStore(self.root / "store")
        inspected = store.install(archive)
        self.assertEqual(1, inspected.node_count)
        store.activate(PACK_ID, PACK_VERSION)
        self.assertEqual({PACK_ID: PACK_VERSION}, store.active_versions())


if __name__ == "__main__":
    unittest.main()
