import tempfile
import threading
import unittest
from pathlib import Path

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


def request(command, request_id):
    return {
        "api_version": "scripture.transport.v1",
        "request_id": request_id,
        "command": command,
        "payload": {},
    }


class BlockingBaseApplication:
    def __init__(self):
        self.entered = threading.Event()
        self.release = threading.Event()
        self.calls = []

    def handle(self, value):
        self.calls.append(value)
        if value.get("request_id") == "stage-first":
            self.entered.set()
            if not self.release.wait(timeout=5):
                raise AssertionError("test did not release staged update delegation")
        return {"ok": True, "data": {"passthrough": True}}


class PendingUpdateConcurrencyTests(unittest.TestCase):
    def build_layer(self, staging, base):
        return NativePendingUpdateLayer(
            base,
            repository_root(),
            staging,
            current_version=CURRENT_VERSION,
            authenticity_verifier=lambda candidate: True,
        )

    def test_cancel_waits_for_inflight_staging_family_operation(self):
        with tempfile.TemporaryDirectory() as temp:
            staging = Path(temp) / "application-updates"
            staging.mkdir(parents=True)
            journal = staging / "pending-update.json"
            journal.write_text("corrupt-but-fixed-path", encoding="utf-8")

            base = BlockingBaseApplication()
            layer = self.build_layer(staging, base)
            first_result = []
            second_result = []
            second_started = threading.Event()
            second_done = threading.Event()

            first = threading.Thread(
                target=lambda: first_result.append(
                    layer.handle(
                        request("application_update.select_verify_stage", "stage-first")
                    )
                )
            )

            def cancel_pending():
                second_started.set()
                second_result.append(
                    layer.handle(request(CANCEL_PENDING_UPDATE_COMMAND, "cancel-second"))
                )
                second_done.set()

            second = threading.Thread(target=cancel_pending)
            first.start()
            self.assertTrue(base.entered.wait(timeout=2))
            second.start()
            self.assertTrue(second_started.wait(timeout=2))
            self.assertFalse(second_done.wait(timeout=0.1))
            self.assertTrue(journal.exists())

            base.release.set()
            first.join(timeout=2)
            second.join(timeout=2)
            self.assertFalse(first.is_alive())
            self.assertFalse(second.is_alive())
            self.assertEqual(1, len(first_result))
            self.assertEqual(1, len(second_result))
            self.assertTrue(first_result[0]["ok"])
            self.assertTrue(second_result[0]["ok"])
            self.assertEqual("cancelled", second_result[0]["data"]["status"])
            self.assertFalse(journal.exists())
            self.assertEqual(
                "application_update.select_verify_stage",
                base.calls[0]["command"],
            )

    def test_prepare_apply_waits_for_inflight_staging_family_operation(self):
        with tempfile.TemporaryDirectory() as temp:
            staging = Path(temp) / "application-updates"
            staging.mkdir(parents=True)
            # A corrupt fixed journal makes prepare fail closed *after* it obtains
            # the update-family lock. The assertion here is about serialization,
            # not successful apply-handoff creation.
            (staging / "pending-update.json").write_text("corrupt", encoding="utf-8")

            base = BlockingBaseApplication()
            layer = self.build_layer(staging, base)
            first_result = []
            second_result = []
            second_started = threading.Event()
            second_done = threading.Event()

            first = threading.Thread(
                target=lambda: first_result.append(
                    layer.handle(
                        request("application_update.select_verify_stage", "stage-first")
                    )
                )
            )

            def prepare_apply():
                second_started.set()
                second_result.append(
                    layer.handle(request(PREPARE_APPLY_COMMAND, "prepare-second"))
                )
                second_done.set()

            second = threading.Thread(target=prepare_apply)
            first.start()
            self.assertTrue(base.entered.wait(timeout=2))
            second.start()
            self.assertTrue(second_started.wait(timeout=2))
            self.assertFalse(second_done.wait(timeout=0.1))

            base.release.set()
            first.join(timeout=2)
            second.join(timeout=2)
            self.assertFalse(first.is_alive())
            self.assertFalse(second.is_alive())
            self.assertEqual(1, len(first_result))
            self.assertEqual(1, len(second_result))
            self.assertTrue(first_result[0]["ok"])
            self.assertFalse(second_result[0]["ok"])
            self.assertEqual("UPDATE_PENDING_INVALID", second_result[0]["error"]["code"])


if __name__ == "__main__":
    unittest.main()
