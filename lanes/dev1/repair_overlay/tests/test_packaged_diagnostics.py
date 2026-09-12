import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from scripture_archive_platform.desktop_host.diagnostics import NativeDiagnosticsLayer


QUALIFIED_DIAGNOSTICS_BLOB = "037bfa655d745cfdd041399250e324da038d8ebf"


class FakeBaseApplication:
    def __init__(self):
        self.calls = []

    def handle(self, request):
        self.calls.append(request)
        return {"ok": True, "data": {"passthrough": True}}


def repository_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "runtime_engine" / "scripture_archive_runtime" / "diagnostics.py").exists():
            return parent
    raise RuntimeError("repository root with diagnostics.py not found")


def diagnostics_request(payload=None):
    return {
        "api_version": "scripture.transport.v1",
        "request_id": "diagnostics-test-1",
        "command": "diagnostics.get_report",
        "payload": {} if payload is None else payload,
    }


def git_blob_sha(payload: bytes) -> str:
    header = f"blob {len(payload)}\0".encode("ascii")
    return hashlib.sha1(header + payload).hexdigest()


class PackagedDiagnosticsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.runtime_root = self.root / "packaged-root"
        (self.runtime_root / "r06_platform").mkdir(parents=True)
        self.identity = self.runtime_root / "r06_platform" / "build_identity.json"
        self.identity.write_text(json.dumps({"build_sha": "a" * 40}), encoding="utf-8")
        self.persistence_root = self.root / "local-state" / "runtime-v2"
        self.base = FakeBaseApplication()
        self.layer = NativeDiagnosticsLayer(
            self.base,
            self.runtime_root,
            self.persistence_root,
            current_version="0.6.0-r06.3dev.a",
            core_root=repository_root(),
        )

    def tearDown(self):
        self.temp.cleanup()

    def test_empty_payload_diagnostics_is_read_only_when_state_root_is_absent(self):
        self.assertFalse(self.persistence_root.exists())
        response = self.layer.handle(diagnostics_request())
        self.assertTrue(response["ok"])
        self.assertFalse(self.persistence_root.exists())
        data = response["data"]
        self.assertTrue(data["read_only"])
        self.assertEqual("not_performed", data["recovery_execution"])
        self.assertEqual("a" * 40, data["report"]["identity"]["build_sha"])
        self.assertEqual("ABSENT", data["report"]["persistence"]["state_status"])

    def test_report_and_support_snapshot_do_not_disclose_state_content_or_local_paths(self):
        self.persistence_root.mkdir(parents=True)
        (self.persistence_root / "backups").mkdir()
        secret = "PRIVATE-NOTE-DO-NOT-RETURN"
        (self.persistence_root / "state.json").write_text(
            json.dumps({"schema_version": 3, "profile": {"note": secret}}),
            encoding="utf-8",
        )
        response = self.layer.handle(diagnostics_request())
        self.assertTrue(response["ok"])
        serialized = json.dumps(response, ensure_ascii=False)
        self.assertNotIn(secret, serialized)
        self.assertNotIn(str(self.root), serialized)
        self.assertNotIn(str(self.persistence_root), serialized)
        self.assertIn("scripture.support-snapshot.v1", response["data"]["support_snapshot"])

    def test_browser_payload_cannot_choose_path_or_request_recovery(self):
        response = self.layer.handle(
            diagnostics_request({"path": "C:\\Users\\attacker\\state.json", "recover": True})
        )
        self.assertFalse(response["ok"])
        self.assertEqual("VALIDATION_ERROR", response["error"]["code"])
        self.assertEqual([], self.base.calls)
        self.assertFalse(self.persistence_root.exists())

    def test_invalid_packaged_identity_fails_closed_without_path_disclosure(self):
        self.identity.write_text('{"build_sha":"bad"}', encoding="utf-8")
        response = self.layer.handle(diagnostics_request())
        self.assertFalse(response["ok"])
        self.assertEqual("DIAGNOSTICS_UNAVAILABLE", response["error"]["code"])
        serialized = json.dumps(response, ensure_ascii=False)
        self.assertNotIn(str(self.root), serialized)
        self.assertNotIn("bad", serialized)

    def test_duplicate_identity_key_fails_closed(self):
        self.identity.write_text(
            '{"build_sha":"' + "a" * 40 + '","build_sha":"' + "b" * 40 + '"}',
            encoding="utf-8",
        )
        response = self.layer.handle(diagnostics_request())
        self.assertFalse(response["ok"])
        self.assertEqual("DIAGNOSTICS_UNAVAILABLE", response["error"]["code"])

    def test_non_diagnostics_commands_delegate_unchanged(self):
        request = {
            "api_version": "scripture.transport.v1",
            "request_id": "bootstrap-1",
            "command": "system.bootstrap",
            "payload": {},
        }
        response = self.layer.handle(request)
        self.assertTrue(response["data"]["passthrough"])
        self.assertEqual([request], self.base.calls)

    def test_packaged_stack_reuses_exact_qualified_diagnostics_core_blob(self):
        core = repository_root() / "runtime_engine" / "scripture_archive_runtime" / "diagnostics.py"
        self.assertEqual(QUALIFIED_DIAGNOSTICS_BLOB, git_blob_sha(core.read_bytes()))

    def test_frontend_is_semantic_empty_payload_and_text_only(self):
        platform = Path(__file__).resolve().parents[1]
        script = (platform / "frontend" / "diagnostics-ui.js").read_text(encoding="utf-8")
        loader = (platform / "frontend" / "application-update.js").read_text(encoding="utf-8")
        self.assertIn("diagnostics.get_report", script)
        self.assertIn("payload:{}", script)
        self.assertIn("nav-diagnostics", script)
        self.assertIn("diagnostics-heading", script)
        self.assertIn("aria-live", script)
        self.assertIn("role:'status'", script)
        self.assertIn("tabindex:'-1'", script)
        self.assertIn("textContent", script)
        self.assertNotIn("innerHTML", script)
        self.assertNotIn("payload:{path", script.replace(" ", ""))
        self.assertIn("import('./diagnostics-ui.js')", loader)

    def test_builder_binds_exact_sha_and_explicitly_bundles_diagnostics(self):
        platform = Path(__file__).resolve().parents[1]
        build = (platform / "packaging" / "build_windows.ps1").read_text(encoding="utf-8")
        self.assertIn("runtime_engine.scripture_archive_runtime.diagnostics", build)
        self.assertIn("build_identity.json", build)
        self.assertIn("^[0-9a-f]{40}$", build)
        self.assertIn('$actualGitSha', build)
        self.assertIn('--add-data "$BuildIdentity${Sep}r06_platform"', build)
        self.assertLess(build.index("$actualGitSha = $null"), build.index("pyinstaller.exe"))

    def test_desktop_host_wraps_update_layer_with_read_only_diagnostics(self):
        platform = Path(__file__).resolve().parents[1]
        main = (
            platform
            / "scripture_archive_platform"
            / "desktop_host"
            / "main.py"
        ).read_text(encoding="utf-8")
        self.assertIn("NativeApplicationUpdateLayer", main)
        self.assertIn("NativeDiagnosticsLayer", main)
        self.assertIn('Path(platform_app.store.root) / "runtime-v2"', main)
        self.assertLess(
            main.index("app = NativeApplicationUpdateLayer("),
            main.index("app = NativeDiagnosticsLayer("),
        )


if __name__ == "__main__":
    unittest.main()
