from __future__ import annotations

import ctypes
import json
import os
from pathlib import Path
import stat
import subprocess
from typing import Any

_MAX_OUTPUT_BYTES = 8192
_THUMBPRINT_HEX_LEN = 40

_POWERSHELL_SCRIPT = r"""
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$paths = @($env:SCRIPTURE_AUTH_CURRENT, $env:SCRIPTURE_AUTH_CANDIDATE)
$result = @()
foreach ($path in $paths) {
    $signature = Microsoft.PowerShell.Security\Get-AuthenticodeSignature -LiteralPath $path
    $thumbprint = $null
    if ($null -ne $signature.SignerCertificate) {
        $thumbprint = [string]$signature.SignerCertificate.Thumbprint
    }
    $result += [pscustomobject]@{
        status = [string]$signature.Status
        thumbprint = $thumbprint
    }
}
$result | ConvertTo-Json -Compress
""".strip()


def verify_same_publisher_authenticode(
    current_executable: str | os.PathLike[str],
    candidate_artifact: str | os.PathLike[str],
) -> bool:
    """Return True only when Windows validates both files to the same signer.

    This is an authenticity signal only. It does not install, execute, replace, or
    trust a candidate by path. Any later update mutation must re-bind the exact
    staged bytes to the verified manifest digest and repeat authenticity checks.
    """

    if os.name != "nt":
        return False

    # Preserve concrete Path objects supplied by the native layer instead of
    # re-dispatching pathlib's platform factory after the Windows guard. This is
    # behaviorally identical on Windows and keeps cross-platform qualification
    # from corrupting pathlib by mocking the process-wide os.name singleton.
    current = current_executable if isinstance(current_executable, Path) else Path(current_executable)
    candidate = candidate_artifact if isinstance(candidate_artifact, Path) else Path(candidate_artifact)
    if not _regular_non_symlink(current) or not _regular_non_symlink(candidate):
        return False

    system_directory = _windows_system_directory()
    if system_directory is None:
        return False
    powershell_root = system_directory / "WindowsPowerShell" / "v1.0"
    powershell = powershell_root / "powershell.exe"
    modules = powershell_root / "Modules"
    if not _regular_non_symlink(powershell) or not modules.is_dir():
        return False

    environment = os.environ.copy()
    # Do not let inherited user/process module search paths redirect the
    # module-qualified Authenticode command away from the system module tree.
    environment["PSModulePath"] = str(modules)
    environment["SCRIPTURE_AUTH_CURRENT"] = str(current.resolve())
    environment["SCRIPTURE_AUTH_CANDIDATE"] = str(candidate.resolve())
    try:
        completed = subprocess.run(
            [
                str(powershell),
                "-NoLogo",
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                _POWERSHELL_SCRIPT,
            ],
            env=environment,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="strict",
            timeout=10,
            check=False,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    except (OSError, subprocess.SubprocessError, UnicodeError):
        return False

    if completed.returncode != 0:
        return False
    encoded = completed.stdout.encode("utf-8", errors="strict")
    if not encoded or len(encoded) > _MAX_OUTPUT_BYTES:
        return False
    return _same_valid_signer_payload(completed.stdout)


def _windows_system_directory() -> Path | None:
    """Resolve System32 from Win32 itself, never from inherited environment."""

    if os.name != "nt":
        return None
    try:
        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        get_system_directory = kernel32.GetSystemDirectoryW
        get_system_directory.argtypes = [
            ctypes.POINTER(ctypes.c_wchar),
            ctypes.c_uint,
        ]
        get_system_directory.restype = ctypes.c_uint
        capacity = 32768
        buffer = ctypes.create_unicode_buffer(capacity)
        length = int(get_system_directory(buffer, capacity))
    except (AttributeError, OSError, TypeError, ValueError):
        return None
    if length <= 0 or length >= capacity or not buffer.value:
        return None
    system_directory = Path(buffer.value)
    if not system_directory.is_absolute():
        return None
    return system_directory


def _regular_non_symlink(path: Path) -> bool:
    try:
        metadata = path.lstat()
    except OSError:
        return False
    return not stat.S_ISLNK(metadata.st_mode) and stat.S_ISREG(metadata.st_mode)


def _same_valid_signer_payload(payload: str) -> bool:
    """Parse the bounded PowerShell result without trusting extra fields."""

    try:
        value: Any = json.loads(payload)
    except (TypeError, ValueError):
        return False
    if not isinstance(value, list) or len(value) != 2:
        return False

    thumbprints: list[str] = []
    for record in value:
        if not isinstance(record, dict) or set(record) != {"status", "thumbprint"}:
            return False
        if record.get("status") != "Valid":
            return False
        thumbprint = record.get("thumbprint")
        if not isinstance(thumbprint, str):
            return False
        normalized = thumbprint.strip().upper()
        if len(normalized) != _THUMBPRINT_HEX_LEN or any(
            char not in "0123456789ABCDEF" for char in normalized
        ):
            return False
        thumbprints.append(normalized)
    return thumbprints[0] == thumbprints[1]
