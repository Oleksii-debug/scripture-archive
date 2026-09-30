from __future__ import annotations

from pathlib import Path
import tempfile
import unittest

from scripture_archive_runtime.application_update import ApplicationUpdateError
from scripture_archive_runtime.application_update_relaunch import launch_installed_application


class ApplicationUpdateRelaunchTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.tmp_path = Path(self.temp.name)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_relaunch_uses_exact_target_without_shell_and_fixed_working_directory(self) -> None:
        install = self.tmp_path / "Program Files" / "Архів Писання"
        install.mkdir(parents=True)
        target = install / "Scripture Archive.exe"
        target.write_bytes(b"updated")
        calls: list[tuple[tuple[str, ...], dict[str, object]]] = []

        def spawn(argv, **kwargs):
            calls.append((tuple(argv), dict(kwargs)))
            return object()

        launch_installed_application(target, spawn=spawn)

        self.assertEqual(
            calls,
            [
                ((str(target),), {"cwd": str(install), "close_fds": True}),
            ],
        )

    def test_relaunch_rejects_symlink_target_before_spawn(self) -> None:
        real = self.tmp_path / "real.exe"
        real.write_bytes(b"updated")
        target = self.tmp_path / "Scripture Archive.exe"
        try:
            target.symlink_to(real)
        except (OSError, NotImplementedError):
            self.skipTest("symlinks unavailable")
        spawned = False

        def spawn(*args, **kwargs):
            nonlocal spawned
            spawned = True

        with self.assertRaisesRegex(ApplicationUpdateError, "regular non-symlink"):
            launch_installed_application(target, spawn=spawn)
        self.assertFalse(spawned)

    def test_relaunch_translates_process_creation_failure(self) -> None:
        target = self.tmp_path / "Scripture Archive.exe"
        target.write_bytes(b"updated")

        def spawn(*args, **kwargs):
            raise OSError("cannot execute")

        with self.assertRaisesRegex(ApplicationUpdateError, "could not be started"):
            launch_installed_application(target, spawn=spawn)

    def test_relaunch_requires_callable_spawner(self) -> None:
        target = self.tmp_path / "Scripture Archive.exe"
        target.write_bytes(b"updated")

        with self.assertRaisesRegex(ApplicationUpdateError, "process spawner"):
            launch_installed_application(target, spawn=None)  # type: ignore[arg-type]


if __name__ == "__main__":
    unittest.main()
