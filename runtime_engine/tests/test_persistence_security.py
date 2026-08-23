import json
import tempfile
import unittest
from pathlib import Path

from scripture_archive_runtime.persistence import CURRENT_SCHEMA_VERSION, PersistenceStore
from scripture_archive_runtime.security import ValidationError, validate_command_dto, validate_content_import


class PersistenceSecurityTests(unittest.TestCase):
    def test_atomic_save_creates_backup_and_roundtrips(self):
        with tempfile.TemporaryDirectory() as td:
            store=PersistenceStore(td); state=store.default_state(); state["profile"]={"name":"Олексій"}; store.save(state); state["profile"]={"name":"Олексій 2"}; store.save(state)
            self.assertTrue(store.backup_path.exists()); self.assertEqual(store.load()["profile"]["name"],"Олексій 2")
    def test_migration_creates_pre_migration_backup(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); (root/"state.json").write_text(json.dumps({"schema_version":2,"profile":{},"settings":{},"sessions":[],"history":{},"mastery":{},"review_queue":[],"constructor_drafts":{},"keymap":{},"evidence_exposure":{},"accessibility_state":{}}),encoding="utf-8")
            state=PersistenceStore(root).load(); self.assertEqual(state["schema_version"],CURRENT_SCHEMA_VERSION); self.assertTrue((root/"backups"/"state.pre_migration_v2.json").exists()); self.assertIn("session_rollup",state)
    def test_corrupt_primary_recovers_backup(self):
        with tempfile.TemporaryDirectory() as td:
            store=PersistenceStore(td); good=store.default_state(); good["profile"]={"id":"safe"}; store.save(good); store.save(good); store.state_path.write_text("{broken",encoding="utf-8")
            recovered=store.load(); self.assertEqual(recovered["profile"]["id"],"safe"); self.assertTrue(list(Path(td).glob("state.corrupt.*.json")))
    def test_content_import_rejects_executable_keys(self):
        with self.assertRaises(ValidationError): validate_content_import({"node_id":"X","script":"evil()"})
    def test_command_dto_allowlist_and_size(self):
        validate_command_dto({"api_version":"runtime.v1","command":"get_mastery","request_id":"r1","payload":{}})
        with self.assertRaises(ValidationError): validate_command_dto({"api_version":"runtime.v1","command":"run_shell","request_id":"r2","payload":{}})
        with self.assertRaises(ValidationError): validate_command_dto({"api_version":"runtime.v1","command":"save","request_id":"bad id","payload":{}})
    def test_persistence_path_escape_is_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            store=PersistenceStore(td)
            with self.assertRaises(ValidationError): store._ensure_inside(Path(td).parent/"escape.json")

if __name__ == "__main__": unittest.main()
