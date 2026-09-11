from __future__ import annotations

import json
import re
import stat
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, Protocol, Sequence

from .persistence import CURRENT_SCHEMA_VERSION, MAX_RECOVERY_POINTS, MAX_STATE_BYTES

DIAGNOSTICS_SCHEMA = "scripture.diagnostics.v1"
SUPPORT_SNAPSHOT_SCHEMA = "scripture.support-snapshot.v1"
MAX_SUPPORT_SNAPSHOT_BYTES = 16 * 1024

_SAFE_TOKEN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$")
_BUILD_SHA = re.compile(r"^[0-9a-f]{40}$")


class PersistenceView(Protocol):
    root: Path
    state_path: Path
    backup_path: Path
    backups: Path

    def list_recovery_points(self) -> list[Path]: ...


@dataclass(frozen=True)
class DiagnosticsIdentity:
    product_version: str
    runtime_api_version: str
    build_sha: str

    def __post_init__(self) -> None:
        for label, value in (
            ("product_version", self.product_version),
            ("runtime_api_version", self.runtime_api_version),
        ):
            if not isinstance(value, str) or not _SAFE_TOKEN.fullmatch(value):
                raise ValueError(f"invalid {label}")
        if not isinstance(self.build_sha, str) or not _BUILD_SHA.fullmatch(self.build_sha):
            raise ValueError("invalid build_sha")

    def as_dict(self) -> dict[str, str]:
        return {
            "product_version": self.product_version,
            "runtime_api_version": self.runtime_api_version,
            "build_sha": self.build_sha,
        }


@dataclass(frozen=True)
class DiagnosticFinding:
    code: str
    severity: str

    def __post_init__(self) -> None:
        if not _SAFE_TOKEN.fullmatch(self.code):
            raise ValueError("invalid diagnostic code")
        if self.severity not in {"WARN", "FAIL"}:
            raise ValueError("invalid diagnostic severity")

    def as_dict(self) -> dict[str, str]:
        return {"code": self.code, "severity": self.severity}


@dataclass(frozen=True)
class DiagnosticsReport:
    identity: DiagnosticsIdentity
    state_status: str
    backup_status: str
    recovery_point_count: int
    inspected_recovery_point_count: int
    valid_recovery_point_count: int
    findings: tuple[DiagnosticFinding, ...]
    persistence_schema_version: int = CURRENT_SCHEMA_VERSION
    schema: str = DIAGNOSTICS_SCHEMA

    @property
    def status(self) -> str:
        severities = {finding.severity for finding in self.findings}
        if "FAIL" in severities:
            return "FAIL"
        if "WARN" in severities:
            return "WARN"
        return "PASS"

    def as_dict(self) -> dict[str, Any]:
        return {
            "schema": self.schema,
            "status": self.status,
            "identity": self.identity.as_dict(),
            "persistence": {
                "schema_version": self.persistence_schema_version,
                "state_status": self.state_status,
                "backup_status": self.backup_status,
                "recovery_point_count": self.recovery_point_count,
                "inspected_recovery_point_count": self.inspected_recovery_point_count,
                "valid_recovery_point_count": self.valid_recovery_point_count,
                "recovery_point_limit": MAX_RECOVERY_POINTS,
            },
            "findings": [finding.as_dict() for finding in self.findings],
        }


def inspect_persistence(store: PersistenceView, identity: DiagnosticsIdentity) -> DiagnosticsReport:
    """Read persistence/recovery metadata without invoking load/migration/recovery writes.

    The returned report is intentionally content-free: it contains no paths, profile
    data, Scripture text, notes, answers, logs, environment variables, or exception
    strings.
    """

    root = Path(store.root)
    findings: list[DiagnosticFinding] = []

    state_status, state_findings = _inspect_state_file(
        root, Path(store.state_path), expected_name="state.json", absent_status="ABSENT"
    )
    findings.extend(state_findings)

    backup_status, backup_findings = _inspect_state_file(
        root, Path(store.backup_path), expected_name="state.json.bak", absent_status="ABSENT"
    )
    findings.extend(backup_findings)

    backups_root = Path(store.backups)
    recovery_root_ok, recovery_root_finding = _inspect_recovery_root(root, backups_root)
    if recovery_root_finding is not None:
        findings.append(recovery_root_finding)

    points: list[Path] = []
    point_list_finding: DiagnosticFinding | None = None
    if recovery_root_ok:
        points, point_list_finding = _safe_recovery_points(store)
        if point_list_finding is not None:
            findings.append(point_list_finding)

    valid_points = 0
    inspected_points = points[:MAX_RECOVERY_POINTS]
    if len(points) > MAX_RECOVERY_POINTS:
        findings.append(DiagnosticFinding("RECOVERY_POINT_LIMIT_EXCEEDED", "WARN"))

    for point in inspected_points:
        status, point_findings = _inspect_recovery_file(backups_root, point)
        if status in {"CURRENT", "MIGRATABLE"}:
            valid_points += 1
        findings.extend(point_findings)

    if state_status == "ABSENT" and (
        backup_status != "ABSENT" or bool(points)
    ):
        findings.append(DiagnosticFinding("STATE_ABSENT_WITH_RECOVERY_AVAILABLE", "WARN"))

    findings = _deduplicate_findings(findings)
    return DiagnosticsReport(
        identity=identity,
        state_status=state_status,
        backup_status=backup_status,
        recovery_point_count=len(points),
        inspected_recovery_point_count=len(inspected_points),
        valid_recovery_point_count=valid_points,
        findings=tuple(findings),
    )


def build_support_snapshot(report: DiagnosticsReport) -> str:
    """Return a bounded, deterministic, sanitized support payload."""

    if not isinstance(report, DiagnosticsReport):
        raise TypeError("report must be DiagnosticsReport")
    payload: Mapping[str, Any] = {
        "schema": SUPPORT_SNAPSHOT_SCHEMA,
        "diagnostics": report.as_dict(),
    }
    encoded = json.dumps(payload, ensure_ascii=True, sort_keys=True, separators=(",", ":"))
    if len(encoded.encode("utf-8")) > MAX_SUPPORT_SNAPSHOT_BYTES:
        raise ValueError("support snapshot exceeds safety limit")
    return encoded


def _inspect_recovery_root(
    persistence_root: Path,
    backups_root: Path,
) -> tuple[bool, DiagnosticFinding | None]:
    if backups_root.name != "backups" or not _path_is_direct_child(
        persistence_root, backups_root
    ):
        return False, DiagnosticFinding("RECOVERY_ROOT_LOCATION_INVALID", "WARN")
    try:
        metadata = backups_root.lstat()
    except FileNotFoundError:
        return False, DiagnosticFinding("RECOVERY_ROOT_ABSENT", "WARN")
    except OSError:
        return False, DiagnosticFinding("RECOVERY_ROOT_STAT_UNVERIFIED", "WARN")
    if stat.S_ISLNK(metadata.st_mode):
        return False, DiagnosticFinding("RECOVERY_ROOT_SYMLINK_REJECTED", "WARN")
    if not stat.S_ISDIR(metadata.st_mode):
        return False, DiagnosticFinding("RECOVERY_ROOT_NOT_DIRECTORY", "WARN")
    return True, None


def _safe_recovery_points(
    store: PersistenceView,
) -> tuple[list[Path], DiagnosticFinding | None]:
    try:
        raw = store.list_recovery_points()
    except Exception:
        return [], DiagnosticFinding("RECOVERY_POINT_ENUMERATION_UNVERIFIED", "WARN")
    if not isinstance(raw, list) or any(not isinstance(path, Path) for path in raw):
        return [], DiagnosticFinding("RECOVERY_POINT_ENUMERATION_INVALID", "WARN")
    # Do not trust provider ordering; diagnostics output must be deterministic.
    return sorted(raw, key=lambda path: path.name, reverse=True), None


def _inspect_recovery_file(root: Path, path: Path) -> tuple[str, list[DiagnosticFinding]]:
    if not _path_is_direct_child(root, path):
        return "INVALID", [DiagnosticFinding("RECOVERY_POINT_LOCATION_INVALID", "WARN")]
    return _inspect_json_state_file(path, absent_status="INVALID", prefix="RECOVERY_POINT", severity="WARN")


def _inspect_state_file(
    root: Path,
    path: Path,
    *,
    expected_name: str,
    absent_status: str,
) -> tuple[str, list[DiagnosticFinding]]:
    prefix = "STATE" if expected_name == "state.json" else "BACKUP"
    severity = "FAIL" if prefix == "STATE" else "WARN"
    if path.name != expected_name or not _path_is_direct_child(root, path):
        return "INVALID", [DiagnosticFinding(f"{prefix}_LOCATION_INVALID", severity)]
    return _inspect_json_state_file(path, absent_status=absent_status, prefix=prefix, severity=severity)


def _inspect_json_state_file(
    path: Path,
    *,
    absent_status: str,
    prefix: str,
    severity: str,
) -> tuple[str, list[DiagnosticFinding]]:
    try:
        metadata = path.lstat()
    except FileNotFoundError:
        return absent_status, []
    except OSError:
        return "UNVERIFIED", [DiagnosticFinding(f"{prefix}_STAT_UNVERIFIED", severity)]

    if stat.S_ISLNK(metadata.st_mode):
        return "INVALID", [DiagnosticFinding(f"{prefix}_SYMLINK_REJECTED", severity)]
    if not stat.S_ISREG(metadata.st_mode):
        return "INVALID", [DiagnosticFinding(f"{prefix}_NOT_REGULAR_FILE", severity)]
    if metadata.st_size > MAX_STATE_BYTES:
        return "INVALID", [DiagnosticFinding(f"{prefix}_TOO_LARGE", severity)]

    try:
        with path.open("rb") as stream:
            raw = stream.read(MAX_STATE_BYTES + 1)
    except OSError:
        return "UNVERIFIED", [DiagnosticFinding(f"{prefix}_READ_UNVERIFIED", severity)]
    if len(raw) > MAX_STATE_BYTES:
        return "INVALID", [DiagnosticFinding(f"{prefix}_TOO_LARGE", severity)]

    try:
        text = raw.decode("utf-8", errors="strict")
        data = json.loads(text)
    except (UnicodeDecodeError, json.JSONDecodeError):
        return "INVALID", [DiagnosticFinding(f"{prefix}_JSON_INVALID", severity)]
    if not isinstance(data, dict):
        return "INVALID", [DiagnosticFinding(f"{prefix}_ROOT_INVALID", severity)]

    version = data.get("schema_version", 0)
    if type(version) is not int or version < 0:
        return "INVALID", [DiagnosticFinding(f"{prefix}_SCHEMA_INVALID", severity)]
    if version > CURRENT_SCHEMA_VERSION:
        return "INCOMPATIBLE", [DiagnosticFinding(f"{prefix}_SCHEMA_NEWER_THAN_RUNTIME", severity)]
    if version < CURRENT_SCHEMA_VERSION:
        return "MIGRATABLE", [DiagnosticFinding(f"{prefix}_MIGRATION_PENDING", "WARN")]
    return "CURRENT", []


def _path_is_direct_child(root: Path, path: Path) -> bool:
    try:
        root_resolved = root.resolve(strict=False)
        parent_resolved = path.parent.resolve(strict=False)
    except OSError:
        return False
    return parent_resolved == root_resolved


def _deduplicate_findings(
    findings: Sequence[DiagnosticFinding],
) -> list[DiagnosticFinding]:
    # FAIL dominates WARN for the same code.
    by_code: dict[str, str] = {}
    for finding in findings:
        previous = by_code.get(finding.code)
        if previous == "FAIL":
            continue
        by_code[finding.code] = finding.severity
    return [
        DiagnosticFinding(code, by_code[code])
        for code in sorted(by_code)
    ]
