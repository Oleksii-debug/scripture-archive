import hashlib
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from scripture_archive_platform.desktop_host.authenticode import (
    _same_valid_signer_payload,
    _windows_system_directory,
    verify_same_publisher_authenticode,
)
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

    def _layer_with_authenticity_verifier(self, verifier):
        def selector():
            self.selection_calls += 1
            return str(self.manifest), str(self.artifact)

        return NativeApplicationUpdateLayer(
            self.base,
            repository_root(),
            selector,
            current_version="0.6.0-r06.3dev.a",
            authenticity_verifier=verifier,
        )

    def test_positive_same_publisher_signal_is_reported_only_after_byte_recheck(self):
        calls = []

        def verifier(candidate):
            calls.append(candidate)
            return True

        response = self._layer_with_authenticity_verifier(verifier).handle(update_request())
        self.assertTrue(response["ok"])
        self.assertTrue(response["data"]["verified"])
        self.assertEqual("same_publisher_authenticode_verified", response["data"]["authenticity"])
        self.assertEqual([self.artifact], calls)

    def test_negative_or_unavailable_authenticity_does_not_fake_publisher_proof(self):
        for verifier in (
            lambda candidate: False,
            lambda candidate: (_ for _ in ()).throw(RuntimeError("unavailable")),
        ):
            with self.subTest(verifier=verifier):
                response = self._layer_with_authenticity_verifier(verifier).handle(update_request())
                self.assertTrue(response["ok"])
                self.assertTrue(response["data"]["verified"])
                self.assertEqual(
                    "not_proven_by_local_hash_verification",
                    response["data"]["authenticity"],
                )

    def test_positive_signature_then_mutated_bytes_fails_entire_request_closed(self):
        original_size = self.artifact.stat().st_size

        def mutate_after_signature(candidate):
            candidate.write_bytes(b"x" * original_size)
            return True

        response = self._layer_with_authenticity_verifier(mutate_after_signature).handle(update_request())
        self.assertFalse(response["ok"])
        self.assertEqual("VALIDATION_ERROR", response["error"]["code"])
        serialized = json.dumps(response, ensure_ascii=False)
        self.assertNotIn(str(self.root), serialized)
        self.assertNotIn(str(self.artifact), serialized)

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
        self.assertIn("same_publisher_authenticode_verified", script)
        self.assertIn("Підтверджено: чинний Authenticode", script)
        self.assertIn("Автентичність видавця не підтверджена", script)
        self.assertNotIn("innerHTML", script)
        self.assertNotIn("payload:{path", script.replace(" ", ""))


class AuthenticodePayloadTests(unittest.TestCase):
    VALID_A = "0123456789ABCDEF0123456789ABCDEF01234567"
    VALID_B = "89ABCDEF0123456789ABCDEF0123456789ABCDEF"

    @staticmethod
    def payload(left_status="Valid", right_status="Valid", left_thumb=None, right_thumb=None, extra=False):
        left = {"status": left_status, "thumbprint": left_thumb or AuthenticodePayloadTests.VALID_A}
        right = {"status": right_status, "thumbprint": right_thumb or AuthenticodePayloadTests.VALID_A}
        if extra:
            left["unexpected"] = True
        return json.dumps([left, right])

    def test_parser_accepts_only_two_valid_matching_signers(self):
        self.assertTrue(_same_valid_signer_payload(self.payload()))

    def test_parser_rejects_signer_mismatch_invalid_status_and_extra_fields(self):
        self.assertFalse(_same_valid_signer_payload(self.payload(right_thumb=self.VALID_B)))
        self.assertFalse(_same_valid_signer_payload(self.payload(right_status="HashMismatch")))
        self.assertFalse(_same_valid_signer_payload(self.payload(extra=True)))

    def test_parser_rejects_malformed_shapes_and_thumbprints(self):
        for payload in (
            "not-json",
            "{}",
            "[]",
            json.dumps([{"status": "Valid", "thumbprint": self.VALID_A}]),
            json.dumps([
                {"status": "Valid", "thumbprint": "xyz"},
                {"status": "Valid", "thumbprint": "xyz"},
            ]),
        ):
            with self.subTest(payload=payload):
                self.assertFalse(_same_valid_signer_payload(payload))

    def test_non_windows_verifier_fails_closed_before_subprocess(self):
        current = Path("current.exe")
        candidate = Path("candidate.exe")
        with mock.patch(
            "scripture_archive_platform.desktop_host.authenticode.os.name",
            "posix",
        ), mock.patch(
            "scripture_archive_platform.desktop_host.authenticode.subprocess.run"
        ) as run:
            self.assertFalse(
                verify_same_publisher_authenticode(
                    current,
                    candidate,
                )
            )
            run.assert_not_called()

    def test_windows_verifier_uses_native_system_directory_not_hostile_environment(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            current = root / "current.exe"
            candidate = root / "candidate.exe"
            current.write_bytes(b"current")
            candidate.write_bytes(b"candidate")
            system32 = root / "trusted-system32"
            powershell_root = system32 / "WindowsPowerShell" / "v1.0"
            modules = powershell_root / "Modules"
            modules.mkdir(parents=True)
            powershell = powershell_root / "powershell.exe"
            powershell.write_bytes(b"fake-powershell")
            payload = self.payload()

            completed = mock.Mock(returncode=0, stdout=payload)
            with mock.patch(
                "scripture_archive_platform.desktop_host.authenticode.os.name",
                "nt",
            ), mock.patch(
                "scripture_archive_platform.desktop_host.authenticode._windows_system_directory",
                return_value=system32,
            ), mock.patch.dict(
                "scripture_archive_platform.desktop_host.authenticode.os.environ",
                {
                    "WINDIR": str(root / "attacker-windir"),
                    "PSModulePath": str(root / "attacker-modules"),
                },
                clear=False,
            ), mock.patch(
                "scripture_archive_platform.desktop_host.authenticode.subprocess.run",
                return_value=completed,
            ) as run:
                self.assertTrue(verify_same_publisher_authenticode(current, candidate))

            args, kwargs = run.call_args
            self.assertEqual(str(powershell), args[0][0])
            self.assertNotIn("attacker-windir", args[0][0])
            self.assertEqual(str(modules), kwargs["env"]["PSModulePath"])
            self.assertNotIn("attacker-modules", kwargs["env"]["PSModulePath"])
            self.assertIn(
                "Microsoft.PowerShell.Security\\Get-AuthenticodeSignature",
                args[0][-1],
            )

    @unittest.skipUnless(os.name == "nt", "Windows Authenticode integration only")
    def test_windows_verifier_executes_real_system_authenticode_command(self):
        system_directory = _windows_system_directory()
        self.assertIsInstance(system_directory, Path)
        powershell = system_directory / "WindowsPowerShell" / "v1.0" / "powershell.exe"
        self.assertTrue(powershell.is_file())
        self.assertTrue(verify_same_publisher_authenticode(powershell, powershell))


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
