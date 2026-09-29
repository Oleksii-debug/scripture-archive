from __future__ import annotations

import ctypes
from ctypes import wintypes
import os
from typing import Callable


class ParentProcessWaitError(RuntimeError):
    """The updater could not prove that the application process exited."""


_SYNCHRONIZE = 0x00100000
_WAIT_OBJECT_0 = 0x00000000
_WAIT_TIMEOUT = 0x00000102
_WAIT_FAILED = 0xFFFFFFFF
_DEFAULT_TIMEOUT_MS = 120_000


def _validate_parent_pid(parent_pid: int) -> int:
    if not isinstance(parent_pid, int) or isinstance(parent_pid, bool) or parent_pid <= 0:
        raise ParentProcessWaitError("parent pid must be a positive integer")
    if parent_pid == os.getpid():
        raise ParentProcessWaitError("updater cannot wait on its own process")
    return parent_pid


def _windows_wait_backend(parent_pid: int, timeout_ms: int) -> None:
    try:
        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    except (AttributeError, OSError) as exc:
        raise ParentProcessWaitError("Windows synchronization API is unavailable") from exc

    open_process = kernel32.OpenProcess
    open_process.argtypes = (wintypes.DWORD, wintypes.BOOL, wintypes.DWORD)
    open_process.restype = wintypes.HANDLE

    wait_for_single_object = kernel32.WaitForSingleObject
    wait_for_single_object.argtypes = (wintypes.HANDLE, wintypes.DWORD)
    wait_for_single_object.restype = wintypes.DWORD

    close_handle = kernel32.CloseHandle
    close_handle.argtypes = (wintypes.HANDLE,)
    close_handle.restype = wintypes.BOOL

    handle = open_process(_SYNCHRONIZE, False, parent_pid)
    if not handle:
        raise ParentProcessWaitError("cannot open parent process for synchronization")

    try:
        result = wait_for_single_object(handle, timeout_ms)
    finally:
        close_handle(handle)

    if result == _WAIT_OBJECT_0:
        return
    if result == _WAIT_TIMEOUT:
        raise ParentProcessWaitError("parent process did not exit before timeout")
    if result == _WAIT_FAILED:
        raise ParentProcessWaitError("waiting for parent process failed")
    raise ParentProcessWaitError("unexpected parent wait result")


def wait_for_parent_exit(
    parent_pid: int,
    *,
    timeout_ms: int = _DEFAULT_TIMEOUT_MS,
    wait_backend: Callable[[int, int], None] | None = None,
    os_name: str | None = None,
) -> None:
    """Prove that the old packaged application has exited before replacement.

    Production Windows execution uses the kernel process handle as the waitable
    authority. There is deliberately no polling loop, sleep, process-name
    lookup, shell command, or browser-controlled timeout. Tests may inject a
    backend to verify ordering without weakening production behavior.
    """

    pid = _validate_parent_pid(parent_pid)
    if not isinstance(timeout_ms, int) or isinstance(timeout_ms, bool):
        raise ParentProcessWaitError("timeout must be an integer")
    if timeout_ms <= 0 or timeout_ms > _DEFAULT_TIMEOUT_MS:
        raise ParentProcessWaitError("timeout is outside the permitted bound")

    backend = wait_backend
    if backend is None:
        effective_os_name = os.name if os_name is None else os_name
        if effective_os_name != "nt":
            raise ParentProcessWaitError("native parent wait is Windows-only")
        backend = _windows_wait_backend

    try:
        backend(pid, timeout_ms)
    except ParentProcessWaitError:
        raise
    except Exception as exc:
        raise ParentProcessWaitError("parent process wait failed") from exc
