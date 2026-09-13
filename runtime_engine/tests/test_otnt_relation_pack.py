import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from scripture_archive_runtime.cross_testament import project_cross_testament
from scripture_archive_runtime.evidence import EvidenceRuntime
from scripture_archive_runtime.otnt_relation_pack import (
    PACK_FILENAME,
    SOURCE_AUDITED_STATUS,
    load_otnt_relation_pack,
    materialize_otnt_relation_pack,
)


REPO_ROOT = Path(__file__).resolve().parents[2]
RELATION_ID = "REL.OTNT.EXPLICIT_WRITTEN_QUOTATION.MAT26_31.ZEC13_7"


class OTNTRelationPackTests(unittest.TestCase):
    def _raw_pack(self) -> dict:
        return json.loads(
            (REPO_ROOT / "docs" / "evidence" / PACK_FILENAME).read_text(encoding="utf-8")
        )

    def _write_pack(self, root: Path, raw: dict) -> None:
        evidence_dir = root / "docs" / "evidence"
        evidence_dir.mkdir(parents=True)
        (evidence_dir / PACK_FILENAME).write_text(
            json.dumps(raw, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    def _audited_pack(self) -> dict:
        raw = self._raw_pack()
        raw["status"] = SOURCE_AUDITED_STATUS
        raw["audit"] = {
            "state": "SOURCE_AUDITED",
            "auditor": "independent-source-auditor",
            "accepted_at": "2026-09-12T18:00:00Z",
            "evidence_ref": "github:#78/source-audit-placeholder",
        }
        return raw

    def test_checked_in_pack_is_source_audited_and_materializes_real_link(self):
        bundle = load_otnt_relation_pack(REPO_ROOT)

        self.assertEqual(bundle.status, SOURCE_AUDITED_STATUS)
        self.assertTrue(bundle.source_audited)
        self.assertEqual(len(bundle.runtime.evidence), 2)
        self.assertEqual(len(bundle.runtime.relations), 1)
        self.assertEqual(bundle.runtime.unlocked, set())
        self.assertEqual(set(bundle.book_testaments.values()), {"OT", "NT"})

        target = EvidenceRuntime()
        result = materialize_otnt_relation_pack(target, bundle)
        self.assertTrue(result.source_audited)
        self.assertEqual(result.evidence_added, 2)
        self.assertEqual(result.relations_added, 1)
        self.assertEqual(result.evidence_unlocked, 2)
        self.assertEqual(target.unlocked, set(target.evidence))

        projection = project_cross_testament(
            target,
            book_testaments=bundle.book_testaments,
        )
        self.assertEqual(projection.status, "LINKS")
        self.assertEqual(len(projection.links), 1)
        link = projection.links[0]
        self.assertEqual(link.relation_id, RELATION_ID)
        self.assertEqual(link.relation_type, "EXPLICIT_WRITTEN_QUOTATION")
        self.assertEqual(link.ot.passage_id, "OT.ZEC.13.7.WEBU")
        self.assertEqual(link.nt.passage_id, "NT.MAT.26.31.WEBU")
        self.assertEqual(link.ot.evidence[0].confidence, "T1")
        self.assertEqual(link.nt.evidence[0].confidence, "T1")

    def test_independently_audited_pack_materializes_and_projects_one_real_link(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            self._write_pack(root, self._audited_pack())
            bundle = load_otnt_relation_pack(root)
            self.assertTrue(bundle.source_audited)

            target = EvidenceRuntime()
            result = materialize_otnt_relation_pack(target, bundle)
            self.assertEqual(result.evidence_added, 2)
            self.assertEqual(result.relations_added, 1)
            self.assertEqual(result.evidence_unlocked, 2)
            self.assertEqual(target.unlocked, set(target.evidence))

            projection = project_cross_testament(
                target,
                book_testaments=bundle.book_testaments,
            )
            self.assertEqual(projection.status, "LINKS")
            self.assertEqual(len(projection.links), 1)
            link = projection.links[0]
            self.assertEqual(link.relation_id, RELATION_ID)
            self.assertEqual(link.relation_type, "EXPLICIT_WRITTEN_QUOTATION")
            self.assertEqual(link.ot.passage_id, "OT.ZEC.13.7.WEBU")
            self.assertEqual(link.nt.passage_id, "NT.MAT.26.31.WEBU")
            self.assertEqual(link.ot.evidence[0].confidence, "T1")
            self.assertEqual(link.nt.evidence[0].confidence, "T1")

    def test_excerpt_hash_mismatch_fails_closed(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            raw = self._raw_pack()
            raw["passages"][0]["excerpt"] += " tampered"
            self._write_pack(root, raw)

            with self.assertRaisesRegex(ValueError, "excerpt SHA-256 mismatch"):
                load_otnt_relation_pack(root)

    def test_source_audited_status_without_independent_metadata_fails_closed(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            raw = self._raw_pack()
            raw["status"] = SOURCE_AUDITED_STATUS
            raw["audit"] = {
                "state": "SOURCE_AUDITED",
                "auditor": None,
                "accepted_at": None,
                "evidence_ref": None,
            }
            self._write_pack(root, raw)

            with self.assertRaisesRegex(
                ValueError,
                "SOURCE_AUDITED pack requires auditor, accepted_at, and evidence_ref",
            ):
                load_otnt_relation_pack(root)

    def test_audited_materialization_collision_is_atomic(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            self._write_pack(root, self._audited_pack())
            bundle = load_otnt_relation_pack(root)

            target = EvidenceRuntime()
            colliding_id = sorted(bundle.runtime.evidence)[0]
            target.add_evidence(bundle.runtime.evidence[colliding_id])

            with self.assertRaisesRegex(ValueError, "evidence ID collision"):
                materialize_otnt_relation_pack(target, bundle)

            self.assertEqual(set(target.evidence), {colliding_id})
            self.assertEqual(target.relations, {})
            self.assertEqual(target.unlocked, set())


if __name__ == "__main__":
    unittest.main()
