import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from runtime_engine.scripture_archive_runtime.application_update import (
    ApplicationUpdateError,
    ApplicationUpdateManifest,
)
from runtime_engine.scripture_archive_runtime.application_update_pending import (
    discard_pending_update,
    inspect_pending_update,
    staged_artifact_path,
)
from runtime_engine.scripture_archive_runtime.application_update_staging import (
    stage_local_update,
)
from scripture_archive_platform.desktop_host.pending_update import (
    CANCEL_PENDING_UPDATE_COMMAND,
    PENDING_UPDATE_STATUS_COMMAND,
    NativePendingUpdateLayer,
)


CURRENT_VERSION = "0.6.0-r06.3dev.a"


def repository_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "runtime_engine" / "scripture_archive_runtime" / "application_update.py").exists():
            return parent
    raise RuntimeError("repository root with application update runtime not found")


def request(command, payload=None):
    return {
        "api_version": "scripture.transport.v1",
        "request_id": "pending-update-test-1",
        "command": command,
        "payload": {} if payload is None else payload,
    }


class FakeBaseApplication:
    def __init__(self):
        self.calls = []

    def handle(self, value):
        self.calls.append(value)
        return {"ok": True, "data": {"passthrough": True}}


class CountingContextLock:
    def __init__(self):
        self.entries = 0

    def __enter__(self):
        self.entries += 1
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class PendingUpdateRuntimeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.staging = self.root / "application-updates"
        self.artifact = self.root / "ScriptureArchive-0.6.1.exe"
        self.artifact.write_bytes(b"pending-update-recovery-exact-bytes")
        self.digest = hashlib.sha256(self.artifact.read_bytes()).hexdigest()
        self.manifest = ApplicationUpdateManifest.from_mapping(
            {
                "schema": "scripture.application-update.v1",
                "product_id": "scripture-archive",
                "target_platform": "windows-x64",
                "target_version": "0.6.1",
                "source_head": "c" * 40,
                "artifact_name": self.artifact.name,
                "artifact_size": self.artifact.stat().st_size,
                "artifact_sha256": self.digest,
            }
        )

    def tearDown(self):
        self.temp.cleanup()

    def stage(self):
        return stage_local_update(
            self.manifest,
            self.artifact,
            self.staging,
            current_version=CURRENT_VERSION,
            same_publisher_authenticode_verified=True,
        )

    def test_restart_readback_reverifies_exact_staged_bytes(self):
        self.stage()
        pending = inspect_pending_update(self.staging, current_version=CURRENT_VERSION)
        self.assertIsNotNone(pending)
        self.assertEqual("staged", pending.status)
        self.assertEqual("same_publisher_authenticode_verified", pending.authenticity)
        self.assertEqual("0.6.1", pending.target_version)
        self.assertEqual(self.digest, pending.artifact_sha256)
        staged = staged_artifact_path(self.staging, pending)
        self.assertEqual(self.artifact.read_bytes(), staged.read_bytes())
        self.assertNotIn("path", pending.__dict__)

    def test_missing_journal_means_no_pending_update(self):
        self.assertIsNone(inspect_pending_update(self.staging, current_version=CURRENT_VERSION))
        self.assertFalse(discard_pending_update(self.staging))

    def test_staged_byte_mutation_fails_closed(self):
        self.stage()
        pending = inspect_pending_update(self.staging, current_version=CURRENT_VERSION)
        staged = staged_artifact_path(self.staging, pending)
        staged.write_bytes(b"x" * self.manifest.artifact_size)
        with self.assertRaises(ApplicationUpdateError):
            inspect_pending_update(self.staging, current_version=CURRENT_VERSION)

    def test_journal_extra_field_and_version_mismatch_fail_closed(self):
        self.stage()
        journal_path = self.staging / "pending-update.json"
        journal = json.loads(journal_path.read_text(encoding="utf-8"))
        journal["unexpected"] = True
        journal_path.write_text(json.dumps(journal), encoding="utf-8")
        with self.assertRaises(ApplicationUpdateError):
            inspect_pending_update(self.staging, current_version=CURRENT_VERSION)

        self.stage()
        with self.assertRaises(ApplicationUpdateError):
            inspect_pending_update(self.staging, current_version="0.6.0-r06.3dev.b")

    def test_cancel_removes_only_pending_authority_and_keeps_staged_bytes_inert(self):
        self.stage()
        pending = inspect_pending_update(self.staging, current_version=CURRENT_VERSION)
        staged = staged_artifact_path(self.staging, pending)
        self.assertTrue(staged.is_file())
        self.assertTrue(discard_pending_update(self.staging))
        self.assertFalse((self.staging / "pending-update.json").exists())
        self.assertTrue(staged.is_file())
        self.assertIsNone(inspect_pending_update(self.staging, current_version=CURRENT_VERSION))

    def test_corrupt_journal_can_be_disarmed_without_parsing_or_recursive_delete(self):
        self.staging.mkdir(parents=True)
        journal_path = self.staging / "pending-update.json"
        journal_path.write_bytes(b"not-json")
        inert = self.staging / "pending" / "untrusted" / "keep.bin"
        inert.parent.mkdir(parents=True)
        inert.write_bytes(b"inert")
        self.assertTrue(discard_pending_update(self.staging))
        self.assertFalse(journal_path.exists())
        self.assertEqual(b"inert", inert.read_bytes())


class PendingUpdateHostTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.staging = self.root / "application-updates"
        self.artifact = self.root / "ScriptureArchive-0.6.1.exe"
        self.artifact.write_bytes(b"host-pending-update-exact-bytes")
        digest = hashlib.sha256(self.artifact.read_bytes()).hexdigest()
        self.manifest = ApplicationUpdateManifest.from_mapping(
            {
                "schema": "scripture.application-update.v1",
                "product_id": "scripture-archive",
                "target_platform": "windows-x64",
                "target_version": "0.6.1",
                "source_head": "d" * 40,
                "artifact_name": self.artifact.name,
                "artifact_size": self.artifact.stat().st_size,
                "artifact_sha256": digest,
            }
        )
        self.base = FakeBaseApplication()

    def tearDown(self):
        self.temp.cleanup()

    def stage(self):
        stage_local_update(
            self.manifest,
            self.artifact,
            self.staging,
            current_version=CURRENT_VERSION,
            same_publisher_authenticode_verified=True,
        )

    def layer(self, verifier):
        return NativePendingUpdateLayer(
            self.base,
            repository_root(),
            self.staging,
            current_version=CURRENT_VERSION,
            authenticity_verifier=verifier,
        )

    def test_status_reverifies_signature_and_returns_no_local_paths(self):
        self.stage()
        calls = []

        def verifier(candidate):
            calls.append(candidate)
            return True

        response = self.layer(verifier).handle(request(PENDING_UPDATE_STATUS_COMMAND))
        self.assertTrue(response["ok"])
        data = response["data"]
        self.assertTrue(data["pending"])
        self.assertEqual("staged", data["status"])
        self.assertEqual("same_publisher_authenticode_verified", data["authenticity"])
        self.assertFalse(data["installation_performed"])
        self.assertEqual(1, len(calls))
        serialized = json.dumps(response, ensure_ascii=False)
        self.assertNotIn(str(self.root), serialized)
        self.assertNotIn("staged_path", serialized)
        self.assertNotIn("source_path", serialized)

    def test_positive_signature_followed_by_mutated_bytes_fails_closed(self):
        self.stage()

        def mutate_after_signature(candidate):
            candidate.write_bytes(b"x" * self.manifest.artifact_size)
            return True

        response = self.layer(mutate_after_signature).handle(request(PENDING_UPDATE_STATUS_COMMAND))
        self.assertFalse(response["ok"])
        self.assertEqual("UPDATE_PENDING_INVALID", response["error"]["code"])

    def test_negative_signature_fails_closed_without_pending_claim(self):
        self.stage()
        response = self.layer(lambda candidate: False).handle(request(PENDING_UPDATE_STATUS_COMMAND))
        self.assertFalse(response["ok"])
        self.assertEqual("UPDATE_PENDING_AUTHENTICITY_INVALID", response["error"]["code"])

    def test_cancel_disarms_even_corrupt_journal_without_signature_execution(self):
        self.staging.mkdir(parents=True)
        (self.staging / "pending-update.json").write_text("corrupt", encoding="utf-8")
        calls = []
        response = self.layer(lambda candidate: calls.append(candidate) or True).handle(
            request(CANCEL_PENDING_UPDATE_COMMAND)
        )
        self.assertTrue(response["ok"])
        self.assertEqual("cancelled", response["data"]["status"])
        self.assertFalse(response["data"]["pending"])
        self.assertFalse(response["data"]["staged_bytes_removed"])
        self.assertEqual([], calls)
        self.assertFalse((self.staging / "pending-update.json").exists())

    def test_update_command_family_shares_outer_operation_lock(self):
        layer = self.layer(lambda candidate: True)
        lock = CountingContextLock()
        layer._operation_lock = lock

        stage_request = request("application_update.select_verify_stage")
        stage_response = layer.handle(stage_request)
        self.assertTrue(stage_response["ok"])
        self.assertTrue(stage_response["data"]["passthrough"])
        self.assertEqual([stage_request], self.base.calls)
        self.assertEqual(1, lock.entries)

        cancel_response = layer.handle(request(CANCEL_PENDING_UPDATE_COMMAND))
        self.assertTrue(cancel_response["ok"])
        self.assertEqual("none", cancel_response["data"]["status"])
        self.assertEqual(2, lock.entries)

    def test_browser_payload_cannot_supply_pending_state_or_path(self):
        response = self.layer(lambda candidate: True).handle(
            request(PENDING_UPDATE_STATUS_COMMAND, {"path": "C:\\Users\\attacker\\state.json"})
        )
        self.assertFalse(response["ok"])
        self.assertEqual("VALIDATION_ERROR", response["error"]["code"])
        self.assertEqual([], self.base.calls)

    def test_unrelated_commands_are_delegated(self):
        original = request("system.bootstrap")
        response = self.layer(lambda candidate: True).handle(original)
        self.assertTrue(response["data"]["passthrough"])
        self.assertEqual([original], self.base.calls)

    def test_frontend_exposes_keyboard_native_status_and_cancel_without_html_injection(self):
        platform = Path(__file__).resolve().parents[1]
        script = (platform / "frontend" / "pending-update.js").read_text(encoding="utf-8")
        entry = (platform / "frontend" / "application-update.js").read_text(encoding="utf-8")
        self.assertIn("application_update.pending_status", script)
        self.assertIn("application_update.cancel_pending", script)
        self.assertIn("pending-update-check", script)
        self.assertIn("pending-update-cancel", script)
        self.assertIn("aria-live", script)
        self.assertIn("aria-busy", script)
        self.assertIn("console.error", script)
        self.assertIn("textContent", script)
        self.assertNotIn("innerHTML", script)
        self.assertNotIn("${error?.message", script)
        self.assertIn("Файли програми не змінено.", script)
        self.assertIn("Rollback recovery збережено", script)
        self.assertIn("./pending-update.js", entry)


if __name__ == "__main__":
    unittest.main()
