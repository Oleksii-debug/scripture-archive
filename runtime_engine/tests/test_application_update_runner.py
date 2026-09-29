from __future__ import annotations

from pathlib import Path
import os
import tempfile
import unittest

from scripture_archive_runtime.application_update import ApplicationUpdateError
from scripture_archive_runtime.application_update_parent_wait import ParentProcessWaitError
from scripture_archive_runtime.application_update_process import (
    UpdateProcessError,
    build_updater_process_plan,
)
from scripture_archive_runtime.application_update_runner import execute_trusted_updater
from scripture_archive_runtime.application_update_updater import UpdateApplyResult


def _result(plan) -> UpdateApplyResult:
    return UpdateApplyResult(
        previous_sha256="1" * 64,
        installed_sha256="2" * 64,
        rollback_path=plan.installed_executable.with_name(
            plan.installed_executable.name + ".scripture-archive.rollback"
        ),
        target_path=plan.installed_executable,
        target_version="1.1.0",
    )


def _publish_noop(*args, **kwargs):
    return object()


def _discard_noop(*args, **kwargs):
    return False


class ApplicationUpdateRunnerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.tmp_path = Path(self.temp.name)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def _plan(self):
        install = self.tmp_path / "Program Files" / "Архів Писання"
        install.mkdir(parents=True)
        app = install / "Scripture Archive.exe"
        updater = install / "Scripture Archive Updater.exe"
        app.write_bytes(b"installed")
        updater.write_bytes(b"updater")
        staging = self.tmp_path / "state" / "updates"
        staging.mkdir(parents=True)
        return build_updater_process_plan(
            updater_executable=updater,
            installed_executable=app,
            staging_root=staging,
        )

    def test_runner_waits_applies_publishes_health_then_relaunches_exact_target(self) -> None:
        plan = self._plan()
        events: list[object] = []
        sentinel = _result(plan)

        def wait_for_exit(parent_pid: int) -> None:
            events.append(("wait", parent_pid))

        def consume(staging_root, **kwargs):
            events.append(("consume", Path(staging_root), kwargs))
            return sentinel

        def publish_health(staging_root, **kwargs):
            events.append(("health", Path(staging_root), kwargs))
            return object()

        def launch(target: Path) -> None:
            events.append(("launch", target))

        verifier = lambda installed, staged: True
        result = execute_trusted_updater(
            plan.argv()[1:],
            current_version="1.0.0",
            verify_same_publisher=verifier,
            wait_for_exit=wait_for_exit,
            consume=consume,
            publish_health=publish_health,
            discard_health=_discard_noop,
            launch=launch,
        )

        self.assertIs(result, sentinel)
        self.assertEqual(events[0], ("wait", os.getpid()))
        kind, staging, kwargs = events[1]
        self.assertEqual(kind, "consume")
        self.assertEqual(staging, plan.staging_root)
        self.assertEqual(
            kwargs,
            {
                "current_version": "1.0.0",
                "install_target": plan.installed_executable,
                "verify_same_publisher": verifier,
            },
        )
        kind, staging, kwargs = events[2]
        self.assertEqual(kind, "health")
        self.assertEqual(staging, plan.staging_root)
        self.assertEqual(
            kwargs,
            {
                "previous_version": "1.0.0",
                "target_version": "1.1.0",
                "install_target": plan.installed_executable,
                "previous_sha256": sentinel.previous_sha256,
                "installed_sha256": sentinel.installed_sha256,
            },
        )
        self.assertEqual(events[3], ("launch", plan.installed_executable))

    def test_runner_health_publish_failure_rolls_back_and_disarms_before_no_launch(self) -> None:
        plan = self._plan()
        sentinel = _result(plan)
        events: list[object] = []

        def rollback(target: Path, *, expected_previous_sha256: str) -> str:
            events.append(("rollback", target, expected_previous_sha256))
            return expected_previous_sha256

        def discard(staging_root: Path) -> bool:
            events.append(("discard", Path(staging_root)))
            return True

        def launch(target: Path) -> None:
            events.append(("launch", target))

        with self.assertRaisesRegex(
            ApplicationUpdateError,
            "health receipt publication failed; rollback restored",
        ):
            execute_trusted_updater(
                plan.argv()[1:],
                current_version="1.0.0",
                verify_same_publisher=lambda installed, staged: True,
                wait_for_exit=lambda parent_pid: None,
                consume=lambda *args, **kwargs: sentinel,
                publish_health=lambda *args, **kwargs: (_ for _ in ()).throw(
                    OSError("receipt failed")
                ),
                discard_health=discard,
                rollback=rollback,
                launch=launch,
            )
        self.assertEqual(
            events,
            [
                ("rollback", plan.installed_executable, sentinel.previous_sha256),
                ("discard", plan.staging_root),
            ],
        )

    def test_runner_rolls_back_and_disarms_health_when_updated_process_cannot_start(self) -> None:
        plan = self._plan()
        sentinel = _result(plan)
        events: list[object] = []

        def publish(staging_root, **kwargs):
            events.append(("publish", Path(staging_root)))
            return object()

        def launch(target: Path) -> None:
            events.append(("launch", target))
            raise ApplicationUpdateError("spawn failed")

        def rollback(target: Path, *, expected_previous_sha256: str) -> str:
            events.append(("rollback", target, expected_previous_sha256))
            return expected_previous_sha256

        def discard(staging_root: Path) -> bool:
            events.append(("discard", Path(staging_root)))
            return True

        with self.assertRaisesRegex(ApplicationUpdateError, "rollback restored prior bytes"):
            execute_trusted_updater(
                plan.argv()[1:],
                current_version="1.0.0",
                verify_same_publisher=lambda installed, staged: True,
                wait_for_exit=lambda parent_pid: None,
                consume=lambda *args, **kwargs: sentinel,
                publish_health=publish,
                discard_health=discard,
                launch=launch,
                rollback=rollback,
            )

        self.assertEqual(
            events,
            [
                ("publish", plan.staging_root),
                ("launch", plan.installed_executable),
                ("rollback", plan.installed_executable, sentinel.previous_sha256),
                ("discard", plan.staging_root),
            ],
        )

    def test_runner_surfaces_combined_relaunch_and_rollback_failure(self) -> None:
        plan = self._plan()
        sentinel = _result(plan)

        with self.assertRaisesRegex(
            ApplicationUpdateError,
            "relaunch failed and rollback also failed",
        ):
            execute_trusted_updater(
                plan.argv()[1:],
                current_version="1.0.0",
                verify_same_publisher=lambda installed, staged: True,
                wait_for_exit=lambda parent_pid: None,
                consume=lambda *args, **kwargs: sentinel,
                publish_health=_publish_noop,
                discard_health=_discard_noop,
                launch=lambda target: (_ for _ in ()).throw(OSError("spawn failed")),
                rollback=lambda *args, **kwargs: (_ for _ in ()).throw(
                    OSError("rollback failed")
                ),
            )

    def test_runner_rolls_back_consumer_target_substitution_before_health_or_launch(self) -> None:
        plan = self._plan()
        sentinel = UpdateApplyResult(
            previous_sha256="1" * 64,
            installed_sha256="2" * 64,
            rollback_path=plan.installed_executable.with_suffix(".rollback"),
            target_path=self.tmp_path / "other.exe",
            target_version="1.1.0",
        )
        events: list[object] = []

        def publish(*args, **kwargs):
            events.append(("health",))

        def launch(target: Path) -> None:
            events.append(("launch", target))

        def rollback(target: Path, *, expected_previous_sha256: str) -> str:
            events.append(("rollback", target, expected_previous_sha256))
            return expected_previous_sha256

        with self.assertRaisesRegex(
            ApplicationUpdateError,
            "unexpected install target; rollback restored",
        ):
            execute_trusted_updater(
                plan.argv()[1:],
                current_version="1.0.0",
                verify_same_publisher=lambda installed, staged: True,
                wait_for_exit=lambda parent_pid: None,
                consume=lambda *args, **kwargs: sentinel,
                publish_health=publish,
                discard_health=_discard_noop,
                launch=launch,
                rollback=rollback,
            )
        self.assertEqual(
            events,
            [("rollback", plan.installed_executable, sentinel.previous_sha256)],
        )

    def test_runner_never_consumes_when_parent_exit_cannot_be_proven(self) -> None:
        plan = self._plan()
        consumed = False

        def blocked_wait(parent_pid: int) -> None:
            raise ParentProcessWaitError("parent still alive")

        def consume(*args, **kwargs):
            nonlocal consumed
            consumed = True
            raise AssertionError("must not consume")

        with self.assertRaisesRegex(ParentProcessWaitError, "parent still alive"):
            execute_trusted_updater(
                plan.argv()[1:],
                current_version="1.0.0",
                verify_same_publisher=lambda installed, staged: True,
                wait_for_exit=blocked_wait,
                consume=consume,
            )
        self.assertFalse(consumed)

    def test_runner_rejects_malformed_command_before_wait_or_consume(self) -> None:
        waited = False
        consumed = False

        def wait_for_exit(parent_pid: int) -> None:
            nonlocal waited
            waited = True

        def consume(*args, **kwargs):
            nonlocal consumed
            consumed = True
            raise AssertionError("must not consume")

        with self.assertRaisesRegex(UpdateProcessError, "invalid updater command shape"):
            execute_trusted_updater(
                ("--scripture-archive-apply", "--wait-pid", "1"),
                current_version="1.0.0",
                verify_same_publisher=lambda installed, staged: True,
                wait_for_exit=wait_for_exit,
                consume=consume,
            )
        self.assertFalse(waited)
        self.assertFalse(consumed)

    def test_runner_rejects_invalid_trusted_current_version_before_wait(self) -> None:
        for current_version in ["", "1", "01.0.0", "1.0", "1.0.0 "]:
            with self.subTest(current_version=current_version):
                plan = self._plan()
                waited = False

                def wait_for_exit(parent_pid: int) -> None:
                    nonlocal waited
                    waited = True

                with self.assertRaises(ApplicationUpdateError):
                    execute_trusted_updater(
                        plan.argv()[1:],
                        current_version=current_version,
                        verify_same_publisher=lambda installed, staged: True,
                        wait_for_exit=wait_for_exit,
                    )
                self.assertFalse(waited)
                # Recreate the temporary fixture for the next subtest.
                if current_version != "1.0.0 ":
                    self.temp.cleanup()
                    self.temp = tempfile.TemporaryDirectory()
                    self.tmp_path = Path(self.temp.name)

    def test_runner_requires_callable_security_dependencies_before_wait(self) -> None:
        cases = [
            ({"verify_same_publisher": None}, "same-publisher verifier"),
            ({"wait_for_exit": None}, "parent-exit waiter"),
            ({"consume": None}, "apply consumer"),
            ({"launch": None}, "application launcher"),
            ({"rollback": None}, "rollback consumer"),
            ({"publish_health": None}, "health receipt publisher"),
            ({"discard_health": None}, "health receipt discarder"),
        ]
        for override, message in cases:
            with self.subTest(override=override, message=message):
                plan = self._plan()
                kwargs = {
                    "current_version": "1.0.0",
                    "verify_same_publisher": lambda installed, staged: True,
                }
                kwargs.update(override)
                with self.assertRaisesRegex(ApplicationUpdateError, message):
                    execute_trusted_updater(plan.argv()[1:], **kwargs)  # type: ignore[arg-type]
                self.temp.cleanup()
                self.temp = tempfile.TemporaryDirectory()
                self.tmp_path = Path(self.temp.name)


if __name__ == "__main__":
    unittest.main()
