from __future__ import annotations

from pathlib import Path
import os
import tempfile
import unittest

from scripture_archive_runtime.application_update_process import (
    UpdateProcessError,
    build_updater_process_plan,
    launch_updater_process,
    parse_trusted_updater_argv,
)


def _files(tmp_path: Path) -> tuple[Path, Path, Path]:
    install = tmp_path / "Program Files" / "Архів Писання"
    install.mkdir(parents=True)
    app = install / "Scripture Archive.exe"
    updater = install / "Scripture Archive Updater.exe"
    app.write_bytes(b"installed")
    updater.write_bytes(b"updater")
    staging = tmp_path / "state" / "updates"
    staging.mkdir(parents=True)
    return updater, app, staging


class ApplicationUpdateProcessTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.tmp_path = Path(self.temp.name)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_build_plan_binds_sibling_packaged_updater_current_pid_and_fixed_argv(self) -> None:
        updater, app, staging = _files(self.tmp_path)
        plan = build_updater_process_plan(
            updater_executable=updater,
            installed_executable=app,
            staging_root=staging,
        )
        self.assertEqual(plan.parent_pid, os.getpid())
        self.assertEqual(plan.updater_executable, updater.resolve())
        self.assertEqual(plan.installed_executable, app.resolve())
        self.assertEqual(plan.staging_root, staging.resolve())
        self.assertEqual(
            plan.argv(),
            (
                str(updater.resolve()),
                "--scripture-archive-apply",
                "--wait-pid",
                str(os.getpid()),
                "--installed-executable",
                str(app.resolve()),
                "--staging-root",
                str(staging.resolve()),
            ),
        )

    def test_build_plan_rejects_external_updater(self) -> None:
        updater, app, staging = _files(self.tmp_path)
        external = self.tmp_path / "outside-updater.exe"
        external.write_bytes(updater.read_bytes())
        with self.assertRaisesRegex(UpdateProcessError, "packaged beside"):
            build_updater_process_plan(
                updater_executable=external,
                installed_executable=app,
                staging_root=staging,
            )

    def test_build_plan_rejects_current_app_as_updater(self) -> None:
        _, app, staging = _files(self.tmp_path)
        with self.assertRaisesRegex(UpdateProcessError, "distinct"):
            build_updater_process_plan(
                updater_executable=app,
                installed_executable=app,
                staging_root=staging,
            )

    def test_build_plan_rejects_symlinked_updater_target_and_staging(self) -> None:
        updater, app, staging = _files(self.tmp_path)
        updater_link = updater.parent / "link-updater.exe"
        staging_link = self.tmp_path / "state-link"
        try:
            updater_link.symlink_to(updater)
            staging_link.symlink_to(staging, target_is_directory=True)
        except (OSError, NotImplementedError):
            self.skipTest("symlinks unavailable")
        with self.assertRaisesRegex(UpdateProcessError, "non-symlink"):
            build_updater_process_plan(
                updater_executable=updater_link,
                installed_executable=app,
                staging_root=staging,
            )
        with self.assertRaisesRegex(UpdateProcessError, "real directory"):
            build_updater_process_plan(
                updater_executable=updater,
                installed_executable=app,
                staging_root=staging_link,
            )

    def test_build_plan_rejects_foreign_parent_pid(self) -> None:
        updater, app, staging = _files(self.tmp_path)
        with self.assertRaisesRegex(UpdateProcessError, "current host process"):
            build_updater_process_plan(
                updater_executable=updater,
                installed_executable=app,
                staging_root=staging,
                parent_pid=os.getpid() + 1,
            )

    def test_launch_is_shell_free_fixed_cwd_and_returns_child_pid(self) -> None:
        updater, app, staging = _files(self.tmp_path)
        plan = build_updater_process_plan(
            updater_executable=updater,
            installed_executable=app,
            staging_root=staging,
        )
        seen: dict[str, object] = {}

        class Child:
            pid = 43210

        def fake_popen(argv, **kwargs):
            seen["argv"] = argv
            seen.update(kwargs)
            return Child()

        pid = launch_updater_process(plan, popen=fake_popen, os_name="posix")
        self.assertEqual(pid, 43210)
        self.assertEqual(seen["argv"], list(plan.argv()))
        self.assertEqual(seen["cwd"], str(app.resolve().parent))
        self.assertIs(seen["shell"], False)
        self.assertIs(seen["close_fds"], True)
        self.assertEqual(seen["creationflags"], 0)

    def test_launch_wraps_process_failure(self) -> None:
        updater, app, staging = _files(self.tmp_path)
        plan = build_updater_process_plan(
            updater_executable=updater,
            installed_executable=app,
            staging_root=staging,
        )

        def broken_popen(*args, **kwargs):
            raise OSError("boom")

        with self.assertRaisesRegex(UpdateProcessError, "failed to launch"):
            launch_updater_process(plan, popen=broken_popen)

    def test_parser_accepts_only_fixed_host_contract(self) -> None:
        updater, app, staging = _files(self.tmp_path)
        plan = build_updater_process_plan(
            updater_executable=updater,
            installed_executable=app,
            staging_root=staging,
        )
        pid, parsed_app, parsed_staging = parse_trusted_updater_argv(plan.argv()[1:])
        self.assertEqual(pid, os.getpid())
        self.assertEqual(parsed_app, app.resolve())
        self.assertEqual(parsed_staging, staging.resolve())

    def test_parser_rejects_noncanonical_or_extended_commands(self) -> None:
        invalid_commands = [
            (),
            ("--scripture-archive-apply",),
            ("--wrong", "--wait-pid", "1", "--installed-executable", "a", "--staging-root", "b"),
            ("--scripture-archive-apply", "--wait-pid", "01", "--installed-executable", "a", "--staging-root", "b"),
            (
                "--scripture-archive-apply",
                "--wait-pid",
                "1",
                "--installed-executable",
                "a",
                "--staging-root",
                "b",
                "--extra",
            ),
        ]
        for argv in invalid_commands:
            with self.subTest(argv=argv):
                with self.assertRaises(UpdateProcessError):
                    parse_trusted_updater_argv(argv)


if __name__ == "__main__":
    unittest.main()
