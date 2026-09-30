from __future__ import annotations

import json
import unittest
from dataclasses import dataclass
from pathlib import Path

from scripture_archive_platform.desktop_host.post_update_health import (
    POST_UPDATE_HEALTH_COMMAND,
    NativePostUpdateHealthLayer,
)


CURRENT_VERSION = "0.6.0-r06.3dev.a"


def request(command=POST_UPDATE_HEALTH_COMMAND, payload=None, request_id="health-rid"):
    return {
        "api_version": "scripture.transport.v1",
        "request_id": request_id,
        "command": command,
        "payload": {} if payload is None else payload,
    }


class FakeBaseApplication:
    def __init__(self):
        self.calls = []

    def handle(self, value):
        self.calls.append(value)
        return {"ok": True, "data": {"passthrough": True}}


@dataclass(frozen=True)
class FakeReceipt:
    previous_version: str = "0.5.9"
    target_version: str = CURRENT_VERSION


class PackagedPostUpdateHealthTests(unittest.TestCase):
    def setUp(self):
        self.base = FakeBaseApplication()
        self.staging = Path("state") / "application-updates"
        self.installed = Path("install") / "ScriptureArchive-R06-DEV01.exe"

    def layer(self, commit):
        return NativePostUpdateHealthLayer(
            self.base,
            self.staging,
            current_version=CURRENT_VERSION,
            install_target=self.installed,
            commit_health=commit,
        )

    def test_health_commit_uses_only_host_owned_version_path_and_preserves_request_id(self):
        calls = []

        def commit(staging_root, **kwargs):
            calls.append((Path(staging_root), kwargs))
            return FakeReceipt()

        response = self.layer(commit).handle(request(request_id="exact-health-rid"))
        self.assertTrue(response["ok"])
        self.assertEqual("exact-health-rid", response["request_id"])
        self.assertEqual("healthy", response["data"]["status"])
        self.assertTrue(response["data"]["health_committed"])
        self.assertTrue(response["data"]["rollback_cleanup_performed"])
        self.assertEqual(
            [
                (
                    self.staging,
                    {
                        "current_version": CURRENT_VERSION,
                        "install_target": self.installed,
                    },
                )
            ],
            calls,
        )
        serialized = json.dumps(response)
        self.assertNotIn(str(self.installed), serialized)
        self.assertNotIn(str(self.staging), serialized)

    def test_no_receipt_is_successful_noop(self):
        response = self.layer(lambda *args, **kwargs: None).handle(request())
        self.assertTrue(response["ok"])
        self.assertEqual("none", response["data"]["status"])
        self.assertFalse(response["data"]["health_committed"])
        self.assertFalse(response["data"]["rollback_cleanup_performed"])

    def test_failed_exact_health_proof_returns_recovery_preserved_error(self):
        def fail(*args, **kwargs):
            raise ValueError("tampered installed bytes")

        response = self.layer(fail).handle(request())
        self.assertFalse(response["ok"])
        self.assertEqual("UPDATE_HEALTH_NOT_COMMITTED", response["error"]["code"])
        self.assertIn("rollback recovery remains preserved", response["error"]["message"])
        self.assertNotIn("tampered", json.dumps(response))

    def test_browser_cannot_supply_health_path_version_or_hash(self):
        calls = []
        response = self.layer(lambda *args, **kwargs: calls.append((args, kwargs))).handle(
            request(payload={"path": "C:\\attacker.exe", "version": "9.9.9", "sha256": "0" * 64})
        )
        self.assertFalse(response["ok"])
        self.assertEqual("VALIDATION_ERROR", response["error"]["code"])
        self.assertEqual([], calls)

    def test_unrelated_command_is_delegated(self):
        original = request(command="system.bootstrap")
        response = self.layer(lambda *args, **kwargs: None).handle(original)
        self.assertTrue(response["data"]["passthrough"])
        self.assertEqual([original], self.base.calls)

    def test_frontend_runs_health_commit_before_pending_startup_recovery(self):
        platform = Path(__file__).resolve().parents[1]
        script = (platform / "frontend" / "pending-update.js").read_text(encoding="utf-8")
        self.assertIn("application_update.commit_post_restart_health", script)
        start = script.index("async function commitPostRestartHealth")
        health_call = script.index("invoke(HEALTH_COMMAND)", start)
        pending_call = script.index("checkPending({startup:true})", start)
        self.assertLess(health_call, pending_call)
        self.assertIn("Rollback recovery збережено", script)
        self.assertIn("aria-live", script)
        self.assertIn("textContent", script)
        self.assertNotIn("innerHTML", script)


if __name__ == "__main__":
    unittest.main()
