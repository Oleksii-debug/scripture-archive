from __future__ import annotations

import unittest

from scripture_archive_platform.desktop_host.authenticode import (
    verify_same_publisher_authenticode,
)
from scripture_archive_platform.desktop_host.updater_main import (
    UPDATER_FAILED,
    UPDATER_OK,
    run_updater,
)
from scripture_archive_platform.desktop_host.version import CURRENT_APPLICATION_VERSION


class PackagedUpdaterEntrypointTests(unittest.TestCase):
    def test_forwards_fixed_argv_with_host_owned_version_and_canonical_authenticode(self) -> None:
        calls: list[tuple[tuple[str, ...], dict[str, object]]] = []

        def execute(argv, **kwargs):
            calls.append((tuple(argv), dict(kwargs)))
            return object()

        argv = (
            "--scripture-archive-apply",
            "--wait-pid",
            "41",
            "--installed-executable",
            r"C:\Program Files\Scripture Archive\ScriptureArchive-R06-DEV01.exe",
            "--staging-root",
            r"C:\Users\user\AppData\Local\ScriptureArchive\application-updates",
        )
        result = run_updater(argv, execute=execute)

        self.assertEqual(result, UPDATER_OK)
        self.assertEqual(len(calls), 1)
        forwarded, kwargs = calls[0]
        self.assertEqual(forwarded, argv)
        self.assertEqual(kwargs["current_version"], CURRENT_APPLICATION_VERSION)
        self.assertIs(kwargs["verify_same_publisher"], verify_same_publisher_authenticode)

    def test_failure_is_fail_closed_without_retrying_or_rewriting_argv(self) -> None:
        calls = 0

        def execute(argv, **kwargs):
            nonlocal calls
            calls += 1
            raise ValueError("local path detail must not escape through entrypoint")

        self.assertEqual(run_updater(("bad",), execute=execute), UPDATER_FAILED)
        self.assertEqual(calls, 1)

    def test_requires_callable_execution_and_verifier_authorities(self) -> None:
        self.assertEqual(run_updater((), execute=None), UPDATER_FAILED)  # type: ignore[arg-type]
        self.assertEqual(run_updater((), verifier=None), UPDATER_FAILED)  # type: ignore[arg-type]


if __name__ == "__main__":
    unittest.main()
