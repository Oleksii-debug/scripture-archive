import json
import tempfile
import unittest
from pathlib import Path

from scripture_archive_runtime.diagnostics import (
    DIAGNOSTICS_SCHEMA,
    MAX_SUPPORT_SNAPSHOT_BYTES,
    DiagnosticsIdentity,
    build_support_snapshot,
    inspect_persistence,
)
from scripture_archive_runtime.persistence import CURRENT_SCHEMA_VERSION, MAX_RECOVERY_POINTS


class FakeStore:
    def __init__(self, root: Path):
        self.root = root
        self.state_path = root / "state.json"
        self.backup_path = root / "state.json.bak"
        self.backups = root / "backups"
        self.backups.mkdir(parents=True, exist_ok=True)
        self.load_called = False

    def load(self):
        self.load_called = True
        raise AssertionError("diagnostics must not call mutating load")

    def list_recovery_points(self):
        return sorted(self.backups.glob("state.*.*.json"), reverse=True)


def identity():
    return DiagnosticsIdentity(
        product_version="R06-3DEV-A",
        runtime_api_version="runtime.v1",
        build_sha="9dc82b50ac82de00e3af9ee7a58204982d39217d",
    )


def write_state(path: Path, version=CURRENT_SCHEMA_VERSION, **extra):
    payload = {"schema_version": version, **extra}
    path.write_text(json.dumps(payload), encoding="utf-8")


class DiagnosticsTests(unittest.TestCase):
    def test_fresh_store_is_content_free_pass_and_does_not_load(self):
        with tempfile.TemporaryDirectory() as td:
            store = FakeStore(Path(td))
            report = inspect_persistence(store, identity())
            self.assertEqual(report.schema, DIAGNOSTICS_SCHEMA)
            self.assertEqual(report.status, "PASS")
            self.assertEqual(report.state_status, "ABSENT")
            self.assertEqual(report.backup_status, "ABSENT")
            self.assertFalse(store.load_called)
            self.assertNotIn(str(store.root), json.dumps(report.as_dict()))

    def test_current_state_backup_and_recovery_point_pass(self):
        with tempfile.TemporaryDirectory() as td:
            store = FakeStore(Path(td))
            write_state(store.state_path, profile={"secret": "do-not-export"})
            write_state(store.backup_path, notes=["private"])
            point = store.backups / "state.20260911T000000Z.manual.json"
            write_state(point, answer="private")
            report = inspect_persistence(store, identity())
            self.assertEqual(report.status, "PASS")
            self.assertEqual(report.state_status, "CURRENT")
            self.assertEqual(report.backup_status, "CURRENT")
            self.assertEqual(report.recovery_point_count, 1)
            self.assertEqual(report.valid_recovery_point_count, 1)
            snapshot = build_support_snapshot(report)
            self.assertNotIn("do-not-export", snapshot)
            self.assertNotIn("private", snapshot)
            self.assertNotIn(str(store.root), snapshot)

    def test_corrupt_primary_fails_without_leaking_corrupt_text(self):
        with tempfile.TemporaryDirectory() as td:
            store = FakeStore(Path(td))
            store.state_path.write_text('{"token":"sk-super-secret"', encoding="utf-8")
            report = inspect_persistence(store, identity())
            self.assertEqual(report.status, "FAIL")
            payload = json.dumps(report.as_dict())
            self.assertIn("STATE_JSON_INVALID", payload)
            self.assertNotIn("super-secret", payload)

    def test_newer_primary_schema_fails_closed(self):
        with tempfile.TemporaryDirectory() as td:
            store = FakeStore(Path(td))
            write_state(store.state_path, CURRENT_SCHEMA_VERSION + 1)
            report = inspect_persistence(store, identity())
            self.assertEqual(report.state_status, "INCOMPATIBLE")
            self.assertEqual(report.status, "FAIL")
            self.assertIn(
                "STATE_SCHEMA_NEWER_THAN_RUNTIME",
                {item.code for item in report.findings},
            )

    def test_old_primary_schema_warns_without_mutation(self):
        with tempfile.TemporaryDirectory() as td:
            store = FakeStore(Path(td))
            write_state(store.state_path, max(0, CURRENT_SCHEMA_VERSION - 1), marker="keep")
            before = store.state_path.read_bytes()
            report = inspect_persistence(store, identity())
            after = store.state_path.read_bytes()
            self.assertEqual(report.state_status, "MIGRATABLE")
            self.assertEqual(report.status, "WARN")
            self.assertEqual(before, after)
            self.assertFalse(store.load_called)

    def test_invalid_backup_is_warning_not_primary_failure(self):
        with tempfile.TemporaryDirectory() as td:
            store = FakeStore(Path(td))
            write_state(store.state_path)
            store.backup_path.write_text("{broken", encoding="utf-8")
            report = inspect_persistence(store, identity())
            self.assertEqual(report.status, "WARN")
            self.assertEqual(report.backup_status, "INVALID")
            self.assertIn("BACKUP_JSON_INVALID", {item.code for item in report.findings})

    def test_backup_location_failure_is_warning_and_does_not_leak_path(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            store = FakeStore(root)
            write_state(store.state_path)
            store.backup_path = root.parent / "outside-backup.json"
            report = inspect_persistence(store, identity())
            self.assertEqual(report.status, "WARN")
            self.assertEqual(report.backup_status, "INVALID")
            payload = json.dumps(report.as_dict())
            self.assertIn("BACKUP_LOCATION_INVALID", payload)
            self.assertNotIn(str(store.backup_path), payload)

    def test_invalid_recovery_point_is_warn_and_not_counted_valid(self):
        with tempfile.TemporaryDirectory() as td:
            store = FakeStore(Path(td))
            write_state(store.state_path)
            (store.backups / "state.20260911T000000Z.manual.json").write_text(
                "{broken", encoding="utf-8"
            )
            report = inspect_persistence(store, identity())
            self.assertEqual(report.status, "WARN")
            self.assertEqual(report.recovery_point_count, 1)
            self.assertEqual(report.valid_recovery_point_count, 0)
            self.assertIn("RECOVERY_POINT_JSON_INVALID", {item.code for item in report.findings})

    def test_recovery_point_limit_is_reported_without_deleting_anything(self):
        with tempfile.TemporaryDirectory() as td:
            store = FakeStore(Path(td))
            write_state(store.state_path)
            for index in range(MAX_RECOVERY_POINTS + 2):
                write_state(
                    store.backups / f"state.20260911T00000{index}Z.manual.json"
                )
            before = sorted(path.name for path in store.backups.iterdir())
            report = inspect_persistence(store, identity())
            after = sorted(path.name for path in store.backups.iterdir())
            self.assertEqual(before, after)
            self.assertEqual(report.recovery_point_count, MAX_RECOVERY_POINTS + 2)
            self.assertEqual(report.inspected_recovery_point_count, MAX_RECOVERY_POINTS)
            self.assertIn("RECOVERY_POINT_LIMIT_EXCEEDED", {item.code for item in report.findings})

    def test_absent_primary_with_backup_is_warning_not_fresh_pass(self):
        with tempfile.TemporaryDirectory() as td:
            store = FakeStore(Path(td))
            write_state(store.backup_path)
            report = inspect_persistence(store, identity())
            self.assertEqual(report.state_status, "ABSENT")
            self.assertEqual(report.status, "WARN")
            self.assertIn(
                "STATE_ABSENT_WITH_RECOVERY_AVAILABLE",
                {item.code for item in report.findings},
            )

    def test_support_snapshot_is_deterministic_bounded_and_sanitized(self):
        with tempfile.TemporaryDirectory() as td:
            store = FakeStore(Path(td))
            write_state(store.state_path, profile={"email": "person@example.com"})
            report = inspect_persistence(store, identity())
            first = build_support_snapshot(report)
            second = build_support_snapshot(report)
            self.assertEqual(first, second)
            self.assertLessEqual(len(first.encode("utf-8")), MAX_SUPPORT_SNAPSHOT_BYTES)
            parsed = json.loads(first)
            self.assertEqual(parsed["schema"], "scripture.support-snapshot.v1")
            self.assertNotIn("person@example.com", first)

    def test_identity_rejects_paths_and_non_exact_build_sha(self):
        with self.assertRaises(ValueError):
            DiagnosticsIdentity("../R06", "runtime.v1", "a" * 40)
        with self.assertRaises(ValueError):
            DiagnosticsIdentity("R06", "runtime.v1", "A" * 40)
        with self.assertRaises(ValueError):
            DiagnosticsIdentity("R06", "runtime/v1", "a" * 40)


if __name__ == "__main__":
    unittest.main()
