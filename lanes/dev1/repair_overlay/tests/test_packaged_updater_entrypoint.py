from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from scripture_archive_platform.desktop_host.updater_main import (
    UPDATER_FAILED,
    UPDATER_OK,
    run_updater,
)
from scripture_archive_platform.desktop_host.version import CURRENT_APPLICATION_VERSION


class PackagedUpdaterEntrypointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.install = self.root / "Program Files" / "Scripture Archive"
        self.install.mkdir(parents=True)
        self.installed = self.install / "ScriptureArchive-R06-DEV01.exe"
        self.updater = self.install / "ScriptureArchive-R06-DEV01-Updater.exe"
        self.installed.write_bytes(b"installed")
        self.updater.write_bytes(b"updater")
        self.staging = self.root / "state" / "application-updates"
        self.staging.mkdir(parents=True)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def argv(self, installed: Path | None = None) -> tuple[str, ...]:
        return (
            "--scripture-archive-apply",
            "--wait-pid",
            "41",
            "--installed-executable",
            str(self.installed if installed is None else installed),
            "--staging-root",
            str(self.staging),
        )

    def test_forwards_fixed_sibling_argv_with_host_version_and_verifier(self) -> None:
        execute_calls: list[tuple[tuple[str, ...], dict[str, object]]] = []
        verify_calls: list[tuple[Path, Path]] = []

        def execute(argv, **kwargs):
            execute_calls.append((tuple(argv), dict(kwargs)))
            return object()

        def verifier(installed: Path, updater: Path) -> bool:
            verify_calls.append((installed, updater))
            return True

        argv = self.argv()
        result = run_updater(
            argv,
            execute=execute,
            verifier=verifier,
            updater_executable=self.updater,
        )

        self.assertEqual(result, UPDATER_OK)
        self.assertEqual(verify_calls, [(self.installed.resolve(), self.updater.resolve())])
        self.assertEqual(len(execute_calls), 1)
        forwarded, kwargs = execute_calls[0]
        self.assertEqual(forwarded, argv)
        self.assertEqual(kwargs["current_version"], CURRENT_APPLICATION_VERSION)
        self.assertIs(kwargs["verify_same_publisher"], verifier)

    def test_existing_noncanonical_installed_target_never_reaches_verifier_or_executor(self) -> None:
        other = self.install / "Other.exe"
        other.write_bytes(b"other")
        verified = []
        executed = []
        result = run_updater(
            self.argv(other),
            execute=lambda *args, **kwargs: executed.append((args, kwargs)),
            verifier=lambda *args: verified.append(args) or True,
            updater_executable=self.updater,
        )
        self.assertEqual(result, UPDATER_FAILED)
        self.assertEqual([], verified)
        self.assertEqual([], executed)

    def test_wrong_updater_filename_never_reaches_executor(self) -> None:
        wrong = self.install / "Updater.exe"
        wrong.write_bytes(b"updater")
        executed = []
        self.assertEqual(
            run_updater(
                self.argv(),
                execute=lambda *args, **kwargs: executed.append((args, kwargs)),
                verifier=lambda *args: True,
                updater_executable=wrong,
            ),
            UPDATER_FAILED,
        )
        self.assertEqual([], executed)

    def test_symlink_installed_target_never_reaches_executor(self) -> None:
        real = self.install / "real.exe"
        real.write_bytes(b"real")
        self.installed.unlink()
        try:
            self.installed.symlink_to(real)
        except (OSError, NotImplementedError):
            self.skipTest("symlinks unavailable")
        executed = []
        self.assertEqual(
            run_updater(
                self.argv(),
                execute=lambda *args, **kwargs: executed.append((args, kwargs)),
                verifier=lambda *args: True,
                updater_executable=self.updater,
            ),
            UPDATER_FAILED,
        )
        self.assertEqual([], executed)

    def test_negative_updater_publisher_proof_never_reaches_executor(self) -> None:
        executed = []
        self.assertEqual(
            run_updater(
                self.argv(),
                execute=lambda *args, **kwargs: executed.append((args, kwargs)),
                verifier=lambda installed, updater: False,
                updater_executable=self.updater,
            ),
            UPDATER_FAILED,
        )
        self.assertEqual([], executed)

    def test_malformed_command_fails_before_executor(self) -> None:
        calls = 0

        def execute(argv, **kwargs):
            nonlocal calls
            calls += 1

        self.assertEqual(
            run_updater(
                ("bad",),
                execute=execute,
                verifier=lambda *args: True,
                updater_executable=self.updater,
            ),
            UPDATER_FAILED,
        )
        self.assertEqual(calls, 0)

    def test_requires_callable_execution_and_verifier_authorities(self) -> None:
        self.assertEqual(run_updater((), execute=None), UPDATER_FAILED)  # type: ignore[arg-type]
        self.assertEqual(run_updater((), verifier=None), UPDATER_FAILED)  # type: ignore[arg-type]


if __name__ == "__main__":
    unittest.main()
