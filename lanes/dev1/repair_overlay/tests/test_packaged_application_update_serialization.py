import threading
import unittest

from scripture_archive_platform.desktop_host.pending_update import (
    CANCEL_PENDING_UPDATE_COMMAND,
    PENDING_UPDATE_STATUS_COMMAND,
    PREPARE_APPLY_COMMAND,
)
from scripture_archive_platform.desktop_host.update_application import (
    STAGE_UPDATE_COMMAND,
    UPDATE_COMMAND,
)
from scripture_archive_platform.desktop_host.update_serialization import (
    SerializedApplicationUpdateLayer,
)


class BlockingUpdateApplication:
    def __init__(self):
        self.first_entered = threading.Event()
        self.second_attempted = threading.Event()
        self.second_entered = threading.Event()
        self.release_first = threading.Event()
        self.state_lock = threading.Lock()
        self.active = 0
        self.max_active = 0
        self.order = []

    def handle(self, request):
        request_id = request.get("request_id") if isinstance(request, dict) else None
        with self.state_lock:
            self.active += 1
            self.max_active = max(self.max_active, self.active)
            self.order.append(("enter", request_id))
        try:
            if request_id == "first":
                self.first_entered.set()
                if not self.release_first.wait(timeout=5):
                    raise AssertionError("test did not release first update operation")
            elif request_id == "second":
                self.second_entered.set()
            return {"ok": True, "request_id": request_id}
        finally:
            with self.state_lock:
                self.order.append(("exit", request_id))
                self.active -= 1


class SerializedApplicationUpdateLayerTests(unittest.TestCase):
    @staticmethod
    def request(command, request_id):
        return {
            "api_version": "scripture.transport.v1",
            "request_id": request_id,
            "command": command,
            "payload": {},
        }

    def test_stage_and_cancel_cannot_overlap_same_host_process(self):
        app = BlockingUpdateApplication()
        layer = SerializedApplicationUpdateLayer(app)
        results = []

        first = threading.Thread(
            target=lambda: results.append(
                layer.handle(self.request(STAGE_UPDATE_COMMAND, "first"))
            )
        )

        def run_second():
            app.second_attempted.set()
            results.append(layer.handle(self.request(CANCEL_PENDING_UPDATE_COMMAND, "second")))

        second = threading.Thread(target=run_second)
        first.start()
        self.assertTrue(app.first_entered.wait(timeout=2))
        second.start()
        self.assertTrue(app.second_attempted.wait(timeout=2))

        self.assertFalse(app.second_entered.wait(timeout=0.1))
        self.assertEqual(1, app.max_active)

        app.release_first.set()
        first.join(timeout=2)
        second.join(timeout=2)
        self.assertFalse(first.is_alive())
        self.assertFalse(second.is_alive())
        self.assertTrue(app.second_entered.is_set())
        self.assertEqual(1, app.max_active)
        self.assertEqual(
            [
                ("enter", "first"),
                ("exit", "first"),
                ("enter", "second"),
                ("exit", "second"),
            ],
            app.order,
        )
        self.assertEqual(2, len(results))

    def test_all_five_update_commands_share_the_serialized_boundary(self):
        class RecordingApplication:
            def __init__(self):
                self.commands = []

            def handle(self, request):
                self.commands.append(request.get("command"))
                return {"ok": True}

        app = RecordingApplication()
        layer = SerializedApplicationUpdateLayer(app)
        commands = (
            UPDATE_COMMAND,
            STAGE_UPDATE_COMMAND,
            PENDING_UPDATE_STATUS_COMMAND,
            PREPARE_APPLY_COMMAND,
            CANCEL_PENDING_UPDATE_COMMAND,
        )
        for index, command in enumerate(commands):
            self.assertTrue(layer.handle(self.request(command, f"serial-{index}"))["ok"])
        self.assertEqual(list(commands), app.commands)

    def test_prepare_apply_cannot_overlap_staging_same_host_process(self):
        app = BlockingUpdateApplication()
        layer = SerializedApplicationUpdateLayer(app)
        results = []
        first = threading.Thread(
            target=lambda: results.append(
                layer.handle(self.request(STAGE_UPDATE_COMMAND, "first"))
            )
        )

        def run_second():
            app.second_attempted.set()
            results.append(layer.handle(self.request(PREPARE_APPLY_COMMAND, "second")))

        second = threading.Thread(target=run_second)
        first.start()
        self.assertTrue(app.first_entered.wait(timeout=2))
        second.start()
        self.assertTrue(app.second_attempted.wait(timeout=2))
        self.assertFalse(app.second_entered.wait(timeout=0.1))
        app.release_first.set()
        first.join(timeout=2)
        second.join(timeout=2)
        self.assertFalse(first.is_alive())
        self.assertFalse(second.is_alive())
        self.assertTrue(app.second_entered.is_set())
        self.assertEqual(1, app.max_active)
        self.assertEqual(2, len(results))

    def test_unrelated_command_delegates_without_rewriting_request(self):
        seen = []

        class RecordingApplication:
            def handle(self, request):
                seen.append(request)
                return {"ok": True, "data": {"passthrough": True}}

        layer = SerializedApplicationUpdateLayer(RecordingApplication())
        request = self.request("system.bootstrap", "bootstrap-1")
        response = layer.handle(request)
        self.assertTrue(response["data"]["passthrough"])
        self.assertEqual([request], seen)


if __name__ == "__main__":
    unittest.main()
