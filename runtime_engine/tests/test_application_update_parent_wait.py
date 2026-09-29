from __future__ import annotations

import os
import unittest

from scripture_archive_runtime.application_update_parent_wait import (
    ParentProcessWaitError,
    wait_for_parent_exit,
)


class ParentProcessWaitTests(unittest.TestCase):
    def test_wait_uses_exact_pid_and_bounded_timeout(self) -> None:
        seen: list[tuple[int, int]] = []

        def backend(pid: int, timeout_ms: int) -> None:
            seen.append((pid, timeout_ms))

        wait_for_parent_exit(4242, timeout_ms=30_000, wait_backend=backend)
        self.assertEqual(seen, [(4242, 30_000)])

    def test_wait_rejects_own_pid_before_backend(self) -> None:
        called = False

        def backend(pid: int, timeout_ms: int) -> None:
            nonlocal called
            called = True

        with self.assertRaisesRegex(ParentProcessWaitError, "own process"):
            wait_for_parent_exit(os.getpid(), wait_backend=backend)
        self.assertFalse(called)

    def test_wait_rejects_invalid_pid(self) -> None:
        for pid in [0, -1, True, 1.5, "1"]:
            with self.subTest(pid=pid), self.assertRaises(ParentProcessWaitError):
                wait_for_parent_exit(pid, wait_backend=lambda *_: None)

    def test_wait_rejects_invalid_or_unbounded_timeout(self) -> None:
        for timeout_ms in [0, -1, 120_001, True, 1.5]:
            with self.subTest(timeout_ms=timeout_ms), self.assertRaises(ParentProcessWaitError):
                wait_for_parent_exit(4242, timeout_ms=timeout_ms, wait_backend=lambda *_: None)

    def test_wait_is_windows_only_without_injected_backend(self) -> None:
        with self.assertRaisesRegex(ParentProcessWaitError, "Windows-only"):
            wait_for_parent_exit(4242, os_name="posix")

    def test_wait_wraps_backend_failure(self) -> None:
        def backend(pid: int, timeout_ms: int) -> None:
            raise OSError("boom")

        with self.assertRaisesRegex(ParentProcessWaitError, "wait failed"):
            wait_for_parent_exit(4242, wait_backend=backend)

    def test_wait_preserves_fail_closed_backend_verdict(self) -> None:
        def backend(pid: int, timeout_ms: int) -> None:
            raise ParentProcessWaitError("parent process did not exit before timeout")

        with self.assertRaisesRegex(ParentProcessWaitError, "did not exit"):
            wait_for_parent_exit(4242, wait_backend=backend)


if __name__ == "__main__":
    unittest.main()
