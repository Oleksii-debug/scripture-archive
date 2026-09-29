from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from runtime_engine.scripture_archive_runtime.application_update import ApplicationUpdateManifest
from runtime_engine.scripture_archive_runtime.application_update_process import (
    UpdateProcessError,
    UpdaterProcessPlan,
)
from runtime_engine.scripture_archive_runtime.application_update_staging import stage_local_update
from scripture_archive_platform.desktop_host.pending_update import (
    APPLY_AND_RESTART_COMMAND,
    PENDING_UPDATE_STATUS_COMMAND,
    PREPARE_APPLY_COMMAND,
    NativePendingUpdateLayer,
)
from scripture_archive_platform.desktop_host.updater_launch import (
    launch_packaged_updater,
    packaged_updater_path,
)


CURRENT_VERSION = "0.6.0-r06.3dev.a"


def repository_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "runtime_engine" / "scripture_archive_runtime" / "application_update.py").exists():
            return parent
    raise RuntimeError("repository root with application update runtime not found")


def request(command: str, payload=None, request_id: str = "host-launch-1"):
    return {
        "api_version": "scripture.transport.v1",
        "request_id": request_id,
        "command": command,
        "payload": {} if payload is None else payload,
    }


class FakeBaseApplication:
    def handle(self, value):
        return {"ok": True, "data": {"passthrough": value}}


class PackagedUpdaterLaunchBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.install = self.root / "install"
        self.install.mkdir()
        self.current = self.install / "ScriptureArchive-R06-DEV01.exe"
        self.current.write_bytes(b"current-host")
        self.updater = self.install / "ScriptureArchive-R06-DEV01-Updater.exe"
        self.updater.write_bytes(b"packaged-updater")
        self.staging = self.root / "state" / "application-updates"
        self.staging.mkdir(parents=True)

    def tearDown(self):
        self.temp.cleanup()

    def test_fixed_updater_name_is_derived_from_installed_executable(self):
        self.assertEqual(self.updater, packaged_updater_path(self.current))
        with self.assertRaises(UpdateProcessError):
            packaged_updater_path(self.install / "not-an-executable")

    def test_same_publisher_is_required_before_plan_or_launch(self):
        events = []

        def verify(current, updater):
            events.append(("verify", current, updater))
            return True

        def build_plan(**kwargs):
            events.append(("plan", kwargs))
            return UpdaterProcessPlan(
                updater_executable=kwargs["updater_executable"],
                installed_executable=kwargs["installed_executable"],
                staging_root=kwargs["staging_root"],
                parent_pid=41,
            )

        def launch(plan):
            events.append(("launch", plan))
            return 777

        pid = launch_packaged_updater(
            self.staging,
            current_executable=self.current,
            verify_same_publisher=verify,
            build_plan=build_plan,
            launch_process=launch,
        )
        self.assertEqual(777, pid)
        self.assertEqual(("verify", self.current, self.updater), events[0])
        self.assertEqual("plan", events[1][0])
        self.assertEqual(self.updater, events[1][1]["updater_executable"])
        self.assertEqual(self.current, events[1][1]["installed_executable"])
        self.assertEqual(self.staging, events[1][1]["staging_root"])
        self.assertEqual("launch", events[2][0])

    def test_negative_or_failed_publisher_proof_never_builds_process_plan(self):
        for verifier in (
            lambda current, updater: False,
            lambda current, updater: (_ for _ in ()).throw(RuntimeError("unavailable")),
        ):
            built = []
            with self.subTest(verifier=verifier), self.assertRaises(UpdateProcessError):
                launch_packaged_updater(
                    self.staging,
                    current_executable=self.current,
                    verify_same_publisher=verifier,
                    build_plan=lambda **kwargs: built.append(kwargs),
                    launch_process=lambda plan: 1,
                )
            self.assertEqual([], built)


class PackagedUpdaterHostExecutionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.staging = self.root / "application-updates"
        self.artifact = self.root / "ScriptureArchive-0.6.1.exe"
        self.artifact.write_bytes(b"host-execution-candidate")
        digest = hashlib.sha256(self.artifact.read_bytes()).hexdigest()
        manifest = ApplicationUpdateManifest.from_mapping(
            {
                "schema": "scripture.application-update.v1",
                "product_id": "scripture-archive",
                "target_platform": "windows-x64",
                "target_version": "0.6.1",
                "source_head": "f" * 40,
                "artifact_name": self.artifact.name,
                "artifact_size": self.artifact.stat().st_size,
                "artifact_sha256": digest,
            }
        )
        stage_local_update(
            manifest,
            self.artifact,
            self.staging,
            current_version=CURRENT_VERSION,
            same_publisher_authenticode_verified=True,
        )

    def tearDown(self):
        self.temp.cleanup()

    def layer(self, events, *, pid=222):
        return NativePendingUpdateLayer(
            FakeBaseApplication(),
            repository_root(),
            self.staging,
            current_version=CURRENT_VERSION,
            authenticity_verifier=lambda candidate: True,
            apply_executor=lambda: events.append("launch") or pid,
            shutdown_request=lambda: events.append("shutdown"),
        )

    def test_status_recovers_durable_apply_ready_with_exact_request_id(self):
        events = []
        layer = self.layer(events)
        prepared = layer.handle(request(PREPARE_APPLY_COMMAND, request_id="prepare-rid"))
        self.assertTrue(prepared["ok"])
        self.assertEqual("prepare-rid", prepared["request_id"])

        recovered = layer.handle(request(PENDING_UPDATE_STATUS_COMMAND, request_id="status-rid"))
        self.assertTrue(recovered["ok"])
        self.assertEqual("status-rid", recovered["request_id"])
        self.assertEqual("apply_ready", recovered["data"]["status"])
        self.assertFalse(recovered["data"]["installation_performed"])
        self.assertEqual([], events)

    def test_explicit_execute_launches_before_shutdown_and_leaks_no_pid_or_path(self):
        events = []
        layer = self.layer(events)
        self.assertTrue(layer.handle(request(PREPARE_APPLY_COMMAND))["ok"])
        response = layer.handle(request(APPLY_AND_RESTART_COMMAND, request_id="execute-rid"))
        self.assertTrue(response["ok"])
        self.assertEqual("execute-rid", response["request_id"])
        self.assertEqual(["launch", "shutdown"], events)
        self.assertEqual("updater_started", response["data"]["status"])
        self.assertTrue(response["data"]["updater_process_started"])
        self.assertTrue(response["data"]["restart_requested"])
        self.assertFalse(response["data"]["installation_performed"])
        serialized = json.dumps(response, ensure_ascii=False)
        self.assertNotIn("222", serialized)
        self.assertNotIn(str(self.root), serialized)
        self.assertNotIn("path", serialized)

    def test_execute_without_matching_handoff_never_launches_or_shuts_down(self):
        events = []
        response = self.layer(events).handle(request(APPLY_AND_RESTART_COMMAND))
        self.assertFalse(response["ok"])
        self.assertEqual("UPDATE_APPLY_HANDOFF_REQUIRED", response["error"]["code"])
        self.assertEqual([], events)

    def test_browser_payload_cannot_supply_process_or_path_authority(self):
        events = []
        layer = self.layer(events)
        self.assertTrue(layer.handle(request(PREPARE_APPLY_COMMAND))["ok"])
        response = layer.handle(
            request(
                APPLY_AND_RESTART_COMMAND,
                {"pid": 1, "updater": r"C:\attacker.exe"},
            )
        )
        self.assertFalse(response["ok"])
        self.assertEqual("VALIDATION_ERROR", response["error"]["code"])
        self.assertEqual([], events)

    def test_invalid_child_pid_fails_closed_before_shutdown(self):
        events = []
        layer = self.layer(events, pid=0)
        self.assertTrue(layer.handle(request(PREPARE_APPLY_COMMAND))["ok"])
        response = layer.handle(request(APPLY_AND_RESTART_COMMAND))
        self.assertFalse(response["ok"])
        self.assertEqual("UPDATE_PENDING_INVALID", response["error"]["code"])
        self.assertEqual(["launch"], events)

    def test_execution_callbacks_can_be_bound_after_window_creation(self):
        events = []
        layer = NativePendingUpdateLayer(
            FakeBaseApplication(),
            repository_root(),
            self.staging,
            current_version=CURRENT_VERSION,
            authenticity_verifier=lambda candidate: True,
        )
        unavailable = layer.handle(request(APPLY_AND_RESTART_COMMAND))
        self.assertFalse(unavailable["ok"])
        self.assertEqual("UPDATE_EXECUTION_UNAVAILABLE", unavailable["error"]["code"])
        layer.bind_apply_execution(
            lambda: events.append("launch") or 333,
            lambda: events.append("shutdown"),
        )
        self.assertTrue(layer.handle(request(PREPARE_APPLY_COMMAND))["ok"])
        self.assertTrue(layer.handle(request(APPLY_AND_RESTART_COMMAND))["ok"])
        self.assertEqual(["launch", "shutdown"], events)

    def test_frontend_exposes_accessible_two_step_install_without_html_injection(self):
        platform = Path(__file__).resolve().parents[1]
        script = (platform / "frontend" / "pending-update.js").read_text(encoding="utf-8")
        self.assertIn("application_update.apply_and_restart", script)
        self.assertIn("pending-update-apply-restart", script)
        self.assertIn("Встановити й перезапустити", script)
        self.assertIn("apply.disabled=true", script)
        self.assertIn("button.disabled=busy", script)
        self.assertIn("aria-live", script)
        self.assertIn("textContent", script)
        self.assertNotIn("innerHTML", script)


if __name__ == "__main__":
    unittest.main()
