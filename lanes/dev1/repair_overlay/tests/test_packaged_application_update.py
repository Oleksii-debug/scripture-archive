import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from scripture_archive_platform.desktop_host.update_application import (
    NativeApplicationUpdateLayer,
    NativeUpdateFileSelector,
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


def update_request(payload=None):
    return {
        "api_version": "scripture.transport.v1",
        "request_id": "update-test-1",
        "command": "application_update.select_verify",
        "payload": {} if payload is None else payload,
    }


class PackagedApplicationUpdateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.artifact = self.root / "ScriptureArchive-0.6.0.exe"
        self.artifact.write_bytes(b"verified-local-update-bytes")
        self.manifest = self.root / "update-manifest.json"
        self.write_manifest(hashlib.sha256(self.artifact.read_bytes()).hexdigest())
        self.base = FakeBaseApplication()
        self.selection_calls = 0

        def selector():
            self.selection_calls += 1
            return str(self.manifest), str(self.artifact)

        self.layer = NativeApplicationUpdateLayer(
            self.base,
            repository_root(),
            selector,
            current_version="0.6.0-r06.3dev.a",
        )

    def tearDown(self):
        self.temp.cleanup()

    def write_manifest(self, digest):
        self.manifest.write_text(
            json.dumps(
                {
                    "schema": "scripture.application-update.v1",
                    "product_id": "scripture-archive",
                    "target_platform": "windows-x64",
                    "target_version": "0.6.0",
                    "source_head": "a" * 40,
                    "artifact_name": self.artifact.name,
                    "artifact_size": self.artifact.stat().st_size,
                    "artifact_sha256": digest,
                }
            ),
            encoding="utf-8",
        )

    def test_browser_payload_cannot_supply_filesystem_path(self):
        response = self.layer.handle(update_request({"path": "C:\\Users\\attacker\\payload.exe"}))
        self.assertFalse(response["ok"])
        self.assertEqual("VALIDATION_ERROR", response["error"]["code"])
        self.assertEqual(0, self.selection_calls)

    def test_valid_native_selection_returns_verified_metadata_without_local_path(self):
        response = self.layer.handle(update_request())
        self.assertTrue(response["ok"])
        data = response["data"]
        self.assertTrue(data["verified"])
        self.assertEqual("verified", data["status"])
        self.assertEqual("scripture-archive", data["product_id"])
        self.assertEqual("windows-x64", data["target_platform"])
        self.assertEqual("0.6.0", data["target_version"])
        self.assertEqual(self.artifact.name, data["artifact_name"])
        serialized = json.dumps(response, ensure_ascii=False)
        self.assertNotIn(str(self.root), serialized)
        self.assertNotIn(str(self.manifest), serialized)
        self.assertNotIn(str(self.artifact), serialized)

    def test_cancel_is_not_reported_as_verified(self):
        layer = NativeApplicationUpdateLayer(
            self.base,
            repository_root(),
            lambda: None,
            current_version="0.6.0-r06.3dev.a",
        )
        response = layer.handle(update_request())
        self.assertTrue(response["ok"])
        self.assertFalse(response["data"]["verified"])
        self.assertEqual("cancelled", response["data"]["status"])

    def test_untrusted_hash_fails_closed_without_path_disclosure(self):
        self.write_manifest("0" * 64)
        response = self.layer.handle(update_request())
        self.assertFalse(response["ok"])
        serialized = json.dumps(response, ensure_ascii=False)
        self.assertNotIn(str(self.root), serialized)
        self.assertNotIn(str(self.artifact), serialized)

    def test_non_update_commands_remain_owned_by_wrapped_application(self):
        request = {
            "api_version": "scripture.transport.v1",
            "request_id": "bootstrap-1",
            "command": "system.bootstrap",
            "payload": {},
        }
        response = self.layer.handle(request)
        self.assertTrue(response["data"]["passthrough"])
        self.assertEqual([request], self.base.calls)
        self.assertEqual(0, self.selection_calls)

    def test_frontend_materializes_semantic_empty_payload_update_surface(self):
        platform = Path(__file__).resolve().parents[1]
        html = (platform / "frontend" / "index.html").read_text(encoding="utf-8")
        script = (platform / "frontend" / "application-update.js").read_text(encoding="utf-8")
        self.assertIn('id="nav-application-update"', html)
        self.assertIn('id="application-update-view"', html)
        self.assertIn('id="application-update-status"', html)
        self.assertIn('role="status"', html)
        self.assertIn("application_update.select_verify", script)
        self.assertIn("payload:{}", script)
        self.assertNotIn("innerHTML", script)
        self.assertNotIn("payload:{path", script.replace(" ", ""))


class NativeUpdateFileSelectorTests(unittest.TestCase):
    class FakeWebview:
        class FileDialog:
            OPEN = "OPEN"

    class FakeWindow:
        def __init__(self, results):
            self.results = list(results)
            self.calls = []

        def create_file_dialog(self, kind, **kwargs):
            self.calls.append((kind, kwargs))
            return self.results.pop(0)

    def test_native_selector_owns_both_file_selections(self):
        selector = NativeUpdateFileSelector(self.FakeWebview)
        window = self.FakeWindow([["C:/safe/update.json"], ["C:/safe/update.exe"]])
        selector.bind_window(window)
        self.assertEqual(("C:/safe/update.json", "C:/safe/update.exe"), selector())
        self.assertEqual(2, len(window.calls))
        self.assertTrue(all(call[1]["allow_multiple"] is False for call in window.calls))

    def test_manifest_picker_cancel_stops_before_artifact_picker(self):
        selector = NativeUpdateFileSelector(self.FakeWebview)
        window = self.FakeWindow([None])
        selector.bind_window(window)
        self.assertIsNone(selector())
        self.assertEqual(1, len(window.calls))


if __name__ == "__main__":
    unittest.main()
