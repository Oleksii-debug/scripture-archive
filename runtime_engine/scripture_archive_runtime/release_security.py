from __future__ import annotations

import re
import stat
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

SKIP_DIRS = {".git", ".venv", "venv", "__pycache__", "build", "dist", ".pytest_cache", ".mypy_cache"}
FORBIDDEN_BASENAMES = {".env", "token.json", "credentials.json", "cookies.txt", "cookies.sqlite", "session.json"}
TEXT_SUFFIXES = {
    "", ".cfg", ".css", ".csv", ".html", ".ini", ".js", ".json", ".key", ".md", ".pem", ".ps1", ".py", ".toml", ".tsv", ".txt", ".xml", ".yaml", ".yml",
}
PLACEHOLDER_MARKERS = ("EXAMPLE", "PLACEHOLDER", "REDACTED", "CHANGEME", "YOUR_KEY", "YOUR-KEY")

_SECRET_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("PRIVATE_KEY", re.compile(r"-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----")),
    ("OPENAI_API_KEY", re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b")),
    ("GITHUB_TOKEN", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}\b")),
    ("AWS_ACCESS_KEY", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("GOOGLE_API_KEY", re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b")),
    ("SLACK_TOKEN", re.compile(r"\bxox[baprs]-[0-9A-Za-z-]{20,}\b")),
)


@dataclass(frozen=True)
class SecretFinding:
    path: str
    rule: str
    line: int | None

    def as_dict(self) -> dict[str, object]:
        # Deliberately never return matched secret material or exception payloads.
        return {"path": self.path, "rule": self.rule, "line": self.line}


@dataclass(frozen=True)
class SecretScanReport:
    findings: tuple[SecretFinding, ...]
    verified_file_count: int
    clean_file_count: int
    unverified_file_count: int
    skipped_file_count: int

    @property
    def passed(self) -> bool:
        return not self.findings and self.unverified_file_count == 0

    def as_dict(self) -> dict[str, object]:
        return {
            "passed": self.passed,
            "finding_count": len(self.findings),
            "verified_file_count": self.verified_file_count,
            "clean_file_count": self.clean_file_count,
            "unverified_file_count": self.unverified_file_count,
            "skipped_file_count": self.skipped_file_count,
            "findings": [finding.as_dict() for finding in self.findings],
        }


def _looks_like_placeholder(value: str) -> bool:
    upper = value.upper()
    return any(marker in upper for marker in PLACEHOLDER_MARKERS)


def _scan_line(line: str, path: str, line_no: int) -> list[SecretFinding]:
    findings: list[SecretFinding] = []
    for rule, pattern in _SECRET_PATTERNS:
        match = pattern.search(line)
        if match and not _looks_like_placeholder(match.group(0)):
            findings.append(SecretFinding(path=path, rule=rule, line=line_no))
    return findings


def scan_text(text: str, path: str = "<memory>") -> list[SecretFinding]:
    findings: list[SecretFinding] = []
    for line_no, line in enumerate(text.splitlines(), start=1):
        findings.extend(_scan_line(line, path, line_no))
    return findings


def _iter_paths(root: Path) -> Iterable[Path]:
    for path in root.rglob("*"):
        try:
            rel_parts = path.relative_to(root).parts
        except ValueError:
            continue
        if any(part in SKIP_DIRS for part in rel_parts):
            continue
        yield path


def _unverified(path: str, rule: str) -> SecretFinding:
    return SecretFinding(path=path, rule=rule, line=None)


def scan_tree_report(root: Path) -> SecretScanReport:
    root = root.resolve()
    if not root.exists() or not root.is_dir():
        raise ValueError("scan root must be an existing directory")

    findings: list[SecretFinding] = []
    verified_file_count = 0
    clean_file_count = 0
    unverified_file_count = 0
    skipped_file_count = 0

    for path in _iter_paths(root):
        rel = path.relative_to(root).as_posix()
        in_text_scope = path.suffix.lower() in TEXT_SUFFIXES
        forbidden_name = path.name.lower() in FORBIDDEN_BASENAMES

        try:
            file_stat = path.lstat()
        except OSError:
            if in_text_scope or forbidden_name:
                findings.append(_unverified(rel, "SCAN_UNVERIFIED_STAT"))
                unverified_file_count += 1
            continue

        if stat.S_ISLNK(file_stat.st_mode):
            if in_text_scope or forbidden_name:
                findings.append(_unverified(rel, "SCAN_UNVERIFIED_SYMLINK"))
                unverified_file_count += 1
            else:
                skipped_file_count += 1
            continue

        if not stat.S_ISREG(file_stat.st_mode):
            continue

        file_findings_before = len(findings)
        if forbidden_name:
            findings.append(SecretFinding(path=rel, rule="FORBIDDEN_SECRET_FILENAME", line=None))

        if not in_text_scope:
            skipped_file_count += 1
            continue

        try:
            with path.open("r", encoding="utf-8", errors="strict") as stream:
                for line_no, line in enumerate(stream, start=1):
                    if "\x00" in line:
                        findings.append(_unverified(rel, "SCAN_UNVERIFIED_NUL"))
                        unverified_file_count += 1
                        break
                    findings.extend(_scan_line(line, rel, line_no))
                else:
                    verified_file_count += 1
                    if len(findings) == file_findings_before:
                        clean_file_count += 1
                    continue
        except UnicodeDecodeError:
            findings.append(_unverified(rel, "SCAN_UNVERIFIED_DECODE"))
            unverified_file_count += 1
        except OSError:
            findings.append(_unverified(rel, "SCAN_UNVERIFIED_READ"))
            unverified_file_count += 1

    ordered = tuple(sorted(findings, key=lambda item: (item.path, item.line or 0, item.rule)))
    return SecretScanReport(
        findings=ordered,
        verified_file_count=verified_file_count,
        clean_file_count=clean_file_count,
        unverified_file_count=unverified_file_count,
        skipped_file_count=skipped_file_count,
    )


def scan_tree(root: Path) -> list[SecretFinding]:
    """Backward-compatible blocking finding list for existing callers."""
    return list(scan_tree_report(root).findings)
