import json
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

import scripture_archive_runtime.persistence as persistence_module
from scripture_archive_runtime.persistence import CURRENT_SCHEMA_VERSION, PersistenceStore
from scripture_archive_runtime.security import ValidationError, validate_command_dto, validate_content_import


class PersistenceSecurityTests(unittest.TestCase):
    def test_atomic_save_creates_backup_and_roundtrips(self):
        with tempfile.TemporaryDirectory() as td:
            store=PersistenceStore(td); state=store.default_state(); state["profile"]={"name":"Олексій"}; store.save(state); state["profile"]={"name":"Олексій 2"}; store.save(state)
            self.assertTrue(store.backup_path.exists()); self.assertEqual(store.load()["profile"]["name"],"Олексій 2")

    def test_concurrent_saves_serialize_per_root_and_use_independent_temp_files(self):
        with tempfile.TemporaryDirectory() as td:
            first_store = PersistenceStore(td)
            second_store = PersistenceStore(td)
            initial = first_store.default_state()
            initial["profile"] = {"writer": "initial"}
            first_store.save(initial)

            first_at_commit = threading.Event()
            second_started = threading.Event()
            release_first = threading.Event()
            second_at_commit = threading.Event()
            seen_temp_sources: list[Path] = []
            errors: list[BaseException] = []
            seen_lock = threading.Lock()
            real_replace = persistence_module.os.replace

            def synchronized_replace(source, destination):
                source_path = Path(source)
                destination_path = Path(destination)
                if destination_path == first_store.state_path and source_path.name.startswith(".state."):
                    with seen_lock:
                        seen_temp_sources.append(source_path)
                        commit_index = len(seen_temp_sources)
                    if commit_index == 1:
                        first_at_commit.set()
                        if not release_first.wait(timeout=5):
                            raise AssertionError("first save commit was not released")
                    else:
                        second_at_commit.set()
                return real_replace(source, destination)

            def save_writer(store: PersistenceStore, writer: str, started: threading.Event | None = None) -> None:
                state = store.default_state()
                state["profile"] = {"writer": writer}
                if started is not None:
                    started.set()
                try:
                    store.save(state)
                except BaseException as exc:
                    errors.append(exc)

            with patch.object(persistence_module.os, "replace", side_effect=synchronized_replace):
                first_thread = threading.Thread(target=save_writer, args=(first_store, "one"))
                second_thread = threading.Thread(target=save_writer, args=(second_store, "two", second_started))
                first_thread.start()
                self.assertTrue(first_at_commit.wait(timeout=5))
                second_thread.start()
                self.assertTrue(second_started.wait(timeout=5))
                self.assertFalse(second_at_commit.wait(timeout=0.5))
                release_first.set()
                first_thread.join(timeout=10)
                second_thread.join(timeout=10)

            self.assertFalse(first_thread.is_alive())
            self.assertFalse(second_thread.is_alive())
            self.assertEqual(errors, [])
            self.assertEqual(len(seen_temp_sources), 2)
            self.assertEqual(len({path.name for path in seen_temp_sources}), 2)
            self.assertIn(first_store.load()["profile"]["writer"], {"one", "two"})

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
