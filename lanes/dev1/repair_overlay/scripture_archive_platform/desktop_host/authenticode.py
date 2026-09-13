from __future__ import annotations

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
    $signature = Get-AuthenticodeSignature -LiteralPath $path
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

    current = Path(current_executable)
    candidate = Path(candidate_artifact)
    if not _regular_non_symlink(current) or not _regular_non_symlink(candidate):
        return False

    windir = os.environ.get("WINDIR")
    if not windir:
        return False
    powershell = Path(windir) / "System32" / "WindowsPowerShell" / "v1.0" / "powershell.exe"
    if not _regular_non_symlink(powershell):
        return False

    environment = os.environ.copy()
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
