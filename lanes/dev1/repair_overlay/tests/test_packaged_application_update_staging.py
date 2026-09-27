import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from runtime_engine.scripture_archive_runtime.application_update import (
    ApplicationUpdateError,
    ApplicationUpdateManifest,
)
from runtime_engine.scripture_archive_runtime.application_update_staging import (
    STAGING_JOURNAL_SCHEMA,
    _copy_exact_bytes,
    stage_local_update,
)
from scripture_archive_platform.desktop_host.update_application import (
    NativeApplicationUpdateLayer,
    STAGE_UPDATE_COMMAND,
    UPDATE_COMMAND,
)


class FakeBaseApplication:
    def __init__(self):
        self.calls = []

    def handle(self, request):
        self.calls.append(request)
        return {"ok": True, "data": {"passthrough": True}}


def repository_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "runtime_engine" / "scripture_archive_runtime" / "application_update.py").exists():
            return parent
    raise RuntimeError("repository root with application_update.py not found")


def request(command, payload=None):
    return {
        "api_version": "scripture.transport.v1",
        "request_id": "update-staging-test-1",
        "command": command,
        "payload": {} if payload is None else payload,
    }


class PackagedApplicationUpdateStagingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.artifact = self.root / "ScriptureArchive-0.6.1.exe"
        self.artifact.write_bytes(b"trusted-staging-exact-update-bytes")
        self.digest = hashlib.sha256(self.artifact.read_bytes()).hexdigest()
        self.manifest = self.root / "update-manifest.json"
        self.manifest.write_text(
            json.dumps(
                {
                    "schema": "scripture.application-update.v1",
                    "product_id": "scripture-archive",
                    "target_platform": "windows-x64",
                    "target_version": "0.6.1",
                    "source_head": "b" * 40,
                    "artifact_name": self.artifact.name,
                    "artifact_size": self.artifact.stat().st_size,
                    "artifact_sha256": self.digest,
                }
            ),
            encoding="utf-8",
        )
        self.staging = self.root / "host-state" / "application-updates"
        self.base = FakeBaseApplication()
        self.selection_calls = 0

    def tearDown(self):
        self.temp.cleanup()

    def selector(self):
        self.selection_calls += 1
        return str(self.manifest), str(self.artifact)

    def layer(self, authenticity=True, *, staging_root=None):
        return NativeApplicationUpdateLayer(
            self.base,
            repository_root(),
            self.selector,
            current_version="0.6.0-r06.3dev.a",
            authenticity_verifier=lambda candidate: authenticity,
            staging_root=self.staging if staging_root is None else staging_root,
        )

    def test_positive_same_publisher_candidate_is_staged_and_reverified(self):
        response = self.layer(True).handle(request(STAGE_UPDATE_COMMAND))
        self.assertTrue(response["ok"])
        data = response["data"]
        self.assertTrue(data["verified"])
        self.assertTrue(data["staged"])
        self.assertEqual("staged", data["status"])
        self.assertEqual("same_publisher_authenticode_verified", data["authenticity"])
        self.assertFalse(data["installation_performed"])

        staged = self.staging / "pending" / self.digest / self.artifact.name
        self.assertEqual(self.artifact.read_bytes(), staged.read_bytes())
        journal_path = self.staging / "pending-update.json"
        journal = json.loads(journal_path.read_text(encoding="utf-8"))
        self.assertEqual(STAGING_JOURNAL_SCHEMA, journal["schema"])
        self.assertEqual("staged", journal["status"])
        self.assertEqual(self.digest, journal["artifact_sha256"])
        self.assertEqual(self.artifact.name, journal["artifact_name"])
        self.assertEqual("same_publisher_authenticode_verified", journal["authenticity"])
        serialized = json.dumps(journal, ensure_ascii=False)
        self.assertNotIn(str(self.root), serialized)
        self.assertNotIn(str(self.artifact), serialized)
        self.assertNotIn("staged_path", journal)
        self.assertNotIn("source_path", journal)

    def test_unsigned_or_unproven_publisher_cannot_be_staged(self):
        response = self.layer(False).handle(request(STAGE_UPDATE_COMMAND))
        self.assertFalse(response["ok"])
        self.assertEqual("UPDATE_AUTHENTICITY_REQUIRED", response["error"]["code"])
        self.assertFalse((self.staging / "pending-update.json").exists())
        self.assertFalse((self.staging / "pending").exists())

    def test_verify_only_keeps_existing_non_staging_semantics(self):
        response = self.layer(True).handle(request(UPDATE_COMMAND))
        self.assertTrue(response["ok"])
        self.assertTrue(response["data"]["verified"])
        self.assertFalse(response["data"]["staged"])
        self.assertEqual("verified", response["data"]["status"])
        self.assertFalse(self.staging.exists())

    def test_browser_cannot_supply_stage_or_filesystem_path(self):
        response = self.layer(True).handle(
            request(STAGE_UPDATE_COMMAND, {"path": "C:\\Users\\attacker\\payload.exe"})
        )
        self.assertFalse(response["ok"])
        self.assertEqual("VALIDATION_ERROR", response["error"]["code"])
        self.assertEqual(0, self.selection_calls)
        self.assertFalse(self.staging.exists())

    def test_unusable_staging_root_fails_closed_without_path_disclosure(self):
        bad_root = self.root / "not-a-directory"
        bad_root.write_text("occupied", encoding="utf-8")
        response = self.layer(True, staging_root=bad_root).handle(request(STAGE_UPDATE_COMMAND))
        self.assertFalse(response["ok"])
        serialized = json.dumps(response, ensure_ascii=False)
        self.assertNotIn(str(self.root), serialized)
        self.assertNotIn(str(self.artifact), serialized)

    def test_runtime_stager_refuses_missing_authenticity_authority(self):
        manifest = ApplicationUpdateManifest.from_json(self.manifest.read_bytes())
        with self.assertRaises(ApplicationUpdateError):
            stage_local_update(
                manifest,
                self.artifact,
                self.staging,
                current_version="0.6.0-r06.3dev.a",
                same_publisher_authenticode_verified=False,
            )
        self.assertFalse(self.staging.exists())

    def test_copy_does_not_create_destination_if_source_open_fails_after_lstat(self):
        destination = self.root / "copy-never-created.tmp"
        with patch.object(Path, "open", side_effect=OSError("source disappeared")):
            with self.assertRaises(ApplicationUpdateError):
                _copy_exact_bytes(self.artifact, destination)
        self.assertFalse(destination.exists())


if __name__ == "__main__":
    unittest.main()
