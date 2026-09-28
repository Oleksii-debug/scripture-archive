import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from runtime_engine.scripture_archive_runtime.application_update import (
    ApplicationUpdateError,
    ApplicationUpdateManifest,
)
from runtime_engine.scripture_archive_runtime.application_update_apply import (
    APPLY_INTENT_SCHEMA,
    discard_apply_handoff,
    inspect_apply_handoff,
    prepare_apply_handoff,
)
from runtime_engine.scripture_archive_runtime.application_update_pending import (
    inspect_pending_update,
    staged_artifact_path,
)
from runtime_engine.scripture_archive_runtime.application_update_staging import stage_local_update
from scripture_archive_platform.desktop_host.pending_update import (
    CANCEL_PENDING_UPDATE_COMMAND,
    PREPARE_APPLY_COMMAND,
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
        "request_id": "apply-handoff-test-1",
        "command": command,
        "payload": {} if payload is None else payload,
    }


class FakeBaseApplication:
    def handle(self, value):
        return {"ok": True, "data": {"passthrough": value}}


class ApplyHandoffFixture(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.staging = self.root / "application-updates"
        self.artifact = self.root / "ScriptureArchive-0.6.1.exe"
        self.artifact.write_bytes(b"apply-handoff-exact-bytes")
        self.digest = hashlib.sha256(self.artifact.read_bytes()).hexdigest()
        self.manifest = ApplicationUpdateManifest.from_mapping(
            {
                "schema": "scripture.application-update.v1",
                "product_id": "scripture-archive",
                "target_platform": "windows-x64",
                "target_version": "0.6.1",
                "source_head": "e" * 40,
                "artifact_name": self.artifact.name,
                "artifact_size": self.artifact.stat().st_size,
                "artifact_sha256": self.digest,
            }
        )

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


class ApplyHandoffRuntimeTests(ApplyHandoffFixture):
    def test_prepare_writes_fixed_path_only_after_pending_reverification(self):
        self.stage()
        pending = prepare_apply_handoff(self.staging, current_version=CURRENT_VERSION)
        self.assertEqual(self.digest, pending.artifact_sha256)
        intent_path = self.staging / "apply-update.json"
        self.assertTrue(intent_path.is_file())
        payload = json.loads(intent_path.read_text(encoding="utf-8"))
        self.assertEqual(APPLY_INTENT_SCHEMA, payload["schema"])
        self.assertEqual("ready", payload["status"])
        self.assertEqual(self.digest, payload["artifact_sha256"])
        self.assertNotIn("path", payload)
        self.assertNotIn("source_path", payload)
        self.assertNotIn("staged_path", payload)
        self.assertEqual(pending, inspect_apply_handoff(self.staging, current_version=CURRENT_VERSION))

    def test_prepare_is_idempotent_for_same_exact_identity(self):
        self.stage()
        first = prepare_apply_handoff(self.staging, current_version=CURRENT_VERSION)
        before = (self.staging / "apply-update.json").read_bytes()
        second = prepare_apply_handoff(self.staging, current_version=CURRENT_VERSION)
        self.assertEqual(first, second)
        self.assertEqual(before, (self.staging / "apply-update.json").read_bytes())

    def test_divergent_existing_intent_fails_closed_instead_of_overwrite(self):
        self.stage()
        prepare_apply_handoff(self.staging, current_version=CURRENT_VERSION)
        path = self.staging / "apply-update.json"
        payload = json.loads(path.read_text(encoding="utf-8"))
        payload["target_version"] = "9.9.9"
        path.write_text(json.dumps(payload), encoding="utf-8")
        with self.assertRaises(ApplicationUpdateError):
            prepare_apply_handoff(self.staging, current_version=CURRENT_VERSION)
        self.assertEqual("9.9.9", json.loads(path.read_text(encoding="utf-8"))["target_version"])

    def test_staged_byte_mutation_detaches_and_blocks_apply_handoff(self):
        self.stage()
        prepare_apply_handoff(self.staging, current_version=CURRENT_VERSION)
        pending = inspect_pending_update(self.staging, current_version=CURRENT_VERSION)
        staged_artifact_path(self.staging, pending).write_bytes(b"x" * self.manifest.artifact_size)
        with self.assertRaises(ApplicationUpdateError):
            inspect_apply_handoff(self.staging, current_version=CURRENT_VERSION)

    def test_discard_removes_only_apply_authority_and_keeps_pending_and_bytes(self):
        self.stage()
        pending = prepare_apply_handoff(self.staging, current_version=CURRENT_VERSION)
        staged = staged_artifact_path(self.staging, pending)
        self.assertTrue(discard_apply_handoff(self.staging))
        self.assertFalse((self.staging / "apply-update.json").exists())
        self.assertTrue((self.staging / "pending-update.json").exists())
        self.assertTrue(staged.is_file())
        self.assertIsNone(inspect_apply_handoff(self.staging, current_version=CURRENT_VERSION))

    def test_no_pending_update_means_no_apply_handoff(self):
        with self.assertRaises(ApplicationUpdateError):
            prepare_apply_handoff(self.staging, current_version=CURRENT_VERSION)


class ApplyHandoffHostTests(ApplyHandoffFixture):
    def layer(self, verifier):
        return NativePendingUpdateLayer(
            FakeBaseApplication(),
            repository_root(),
            self.staging,
            current_version=CURRENT_VERSION,
            authenticity_verifier=verifier,
        )

    def test_prepare_command_rechecks_authenticity_and_returns_no_paths(self):
        self.stage()
        calls = []
        response = self.layer(lambda candidate: calls.append(candidate) or True).handle(
            request(PREPARE_APPLY_COMMAND)
        )
        self.assertTrue(response["ok"])
        self.assertEqual("apply_ready", response["data"]["status"])
        self.assertFalse(response["data"]["installation_performed"])
        self.assertFalse(response["data"]["restart_performed"])
        self.assertEqual(1, len(calls))
        serialized = json.dumps(response, ensure_ascii=False)
        self.assertNotIn(str(self.root), serialized)
        self.assertNotIn("path", serialized)
        self.assertIsNotNone(inspect_apply_handoff(self.staging, current_version=CURRENT_VERSION))

    def test_prepare_command_rejects_browser_payload_authority(self):
        self.stage()
        response = self.layer(lambda candidate: True).handle(
            request(PREPARE_APPLY_COMMAND, {"path": "C:\\attacker.exe"})
        )
        self.assertFalse(response["ok"])
        self.assertEqual("VALIDATION_ERROR", response["error"]["code"])
        self.assertFalse((self.staging / "apply-update.json").exists())

    def test_negative_authenticode_never_creates_apply_handoff(self):
        self.stage()
        response = self.layer(lambda candidate: False).handle(request(PREPARE_APPLY_COMMAND))
        self.assertFalse(response["ok"])
        self.assertEqual("UPDATE_PENDING_AUTHENTICITY_INVALID", response["error"]["code"])
        self.assertFalse((self.staging / "apply-update.json").exists())

    def test_signature_then_byte_mutation_never_creates_apply_handoff(self):
        self.stage()

        def verifier(candidate):
            candidate.write_bytes(b"x" * self.manifest.artifact_size)
            return True

        response = self.layer(verifier).handle(request(PREPARE_APPLY_COMMAND))
        self.assertFalse(response["ok"])
        self.assertFalse((self.staging / "apply-update.json").exists())

    def test_cancel_disarms_apply_intent_before_pending_authority(self):
        self.stage()
        self.assertTrue(self.layer(lambda candidate: True).handle(request(PREPARE_APPLY_COMMAND))["ok"])
        response = self.layer(lambda candidate: True).handle(request(CANCEL_PENDING_UPDATE_COMMAND))
        self.assertTrue(response["ok"])
        self.assertEqual("cancelled", response["data"]["status"])
        self.assertTrue(response["data"]["apply_handoff_removed"])
        self.assertFalse((self.staging / "apply-update.json").exists())
        self.assertFalse((self.staging / "pending-update.json").exists())

    def test_frontend_is_keyboard_native_and_explicitly_denies_false_install_claim(self):
        platform = Path(__file__).resolve().parents[1]
        script = (platform / "frontend" / "pending-update.js").read_text(encoding="utf-8")
        self.assertIn("application_update.prepare_apply", script)
        self.assertIn("pending-update-prepare-apply", script)
        self.assertIn("installation_performed===false", script)
        self.assertIn("ще не замінювались", script)
        self.assertIn("aria-live", script)
        self.assertIn("textContent", script)
        self.assertNotIn("innerHTML", script)


if __name__ == "__main__":
    unittest.main()
