import json
from pathlib import Path
import shutil
from tempfile import TemporaryDirectory
import unittest

from scripture_archive_runtime.d4_otnt_relation_registry import (
    load_independently_audited_d4_otnt,
    materialize_independently_audited_d4_otnt,
)
from scripture_archive_runtime.evidence import EvidenceRuntime
from scripture_archive_runtime.otnt_relation_pack import (
    load_otnt_relation_pack,
    materialize_otnt_relation_pack,
)


REPO_ROOT = Path(__file__).resolve().parents[2]
MANIFEST = Path("docs/evidence/D4_OTNT_INDEPENDENT_AUDIT_MANIFEST_v1.json")
RELATION_DIR = Path("docs/campaigns/OT/R06_D4_STAGE05_READABLE/relations")
SHARDS = ("relations_001_012.jsonl", "relations_013_024.jsonl")
REPAIR_REQUIRED = {"REL-OTNT-D4-0005", "REL-OTNT-D4-0006"}


class D4OTNTRelationRegistryTests(unittest.TestCase):
    def _copy_authority(self, root: Path) -> None:
        manifest_target = root / MANIFEST
        manifest_target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(REPO_ROOT / MANIFEST, manifest_target)
        relation_target = root / RELATION_DIR
        relation_target.mkdir(parents=True, exist_ok=True)
        for name in SHARDS:
            shutil.copyfile(REPO_ROOT / RELATION_DIR / name, relation_target / name)

    def test_exact_independent_audit_materializes_only_22_accepted_relations(self):
        bundle = load_independently_audited_d4_otnt(REPO_ROOT)

        self.assertEqual(bundle.source_head, "ab2ad3719781a4855a8040516bd86663e6a64d6c")
        self.assertEqual(bundle.audit_comment_id, 5647653309)
        self.assertEqual(len(bundle.accepted_relation_ids), 22)
        self.assertEqual(set(bundle.repair_required_relation_ids), REPAIR_REQUIRED)
        self.assertEqual(len(bundle.runtime.evidence), 22)
        self.assertEqual(len(bundle.runtime.relations), 22)
        self.assertEqual(len(bundle.runtime.unlocked), 22)
        self.assertTrue(REPAIR_REQUIRED.isdisjoint(bundle.runtime.relations))
        self.assertTrue(
            all(relation_id in bundle.runtime.relations for relation_id in bundle.accepted_relation_ids)
        )

    def test_authored_noncontiguous_reference_and_source_locator_are_retained(self):
        bundle = load_independently_audited_d4_otnt(REPO_ROOT)
        relation_id = "REL-OTNT-D4-0022"
        evidence = bundle.runtime.evidence[f"EV-{relation_id}"]
        nt = evidence.passage_refs[1]

        self.assertEqual(nt.reference, "Revelation 1:7,13")
        self.assertEqual(nt.verse_start, 7)
        self.assertIsNone(nt.verse_end)
        self.assertIn("Revelation 1:7,13", nt.passage_id)
        self.assertEqual(
            bundle.metadata[relation_id]["nt_source_locator"],
            "https://ebible.org/web/REV01.htm",
        )

    def test_d4_feed_coexists_with_already_canonical_161_relation_pack(self):
        target = EvidenceRuntime()
        canonical = load_otnt_relation_pack(REPO_ROOT)
        canonical_result = materialize_otnt_relation_pack(target, canonical)
        before_evidence = len(target.evidence)
        before_relations = len(target.relations)
        before_unlocked = len(target.unlocked)

        d4 = load_independently_audited_d4_otnt(REPO_ROOT)
        result = materialize_independently_audited_d4_otnt(target, d4)

        self.assertEqual(result.evidence_added, 22)
        self.assertEqual(result.relations_added, 22)
        self.assertEqual(result.evidence_unlocked, 22)
        self.assertEqual(len(target.evidence), before_evidence + 22)
        self.assertEqual(len(target.relations), before_relations + 22)
        self.assertEqual(len(target.unlocked), before_unlocked + 22)
        self.assertEqual(canonical_result.relations_added, 1)
        self.assertTrue(REPAIR_REQUIRED.isdisjoint(target.relations))

    def test_source_blob_tamper_fails_closed(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            self._copy_authority(root)
            shard = root / RELATION_DIR / SHARDS[0]
            shard.write_bytes(shard.read_bytes() + b"\n")

            with self.assertRaisesRegex(ValueError, "audited source blob mismatch"):
                load_independently_audited_d4_otnt(root)

    def test_audit_partition_tamper_fails_closed(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            self._copy_authority(root)
            manifest_path = root / MANIFEST
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["accepted_relation_ids"].append("REL-OTNT-D4-0005")
            manifest["repair_required"].pop("REL-OTNT-D4-0005")
            manifest_path.write_text(
                json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, "accepted relation set drift"):
                load_independently_audited_d4_otnt(root)

    def test_collision_preflight_leaves_target_unmodified(self):
        bundle = load_independently_audited_d4_otnt(REPO_ROOT)
        colliding_id = sorted(bundle.runtime.evidence)[0]
        target = EvidenceRuntime()
        target.add_evidence(bundle.runtime.evidence[colliding_id])

        with self.assertRaisesRegex(ValueError, "evidence ID collision"):
            materialize_independently_audited_d4_otnt(target, bundle)

        self.assertEqual(set(target.evidence), {colliding_id})
        self.assertEqual(target.relations, {})
        self.assertEqual(target.unlocked, set())


if __name__ == "__main__":
    unittest.main()
