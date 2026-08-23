from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

MAX_TEXT_BYTES = 1_000_000
SKIP_DIRS = {".git", ".venv", "venv", "__pycache__", "build", "dist", ".pytest_cache", ".mypy_cache"}
FORBIDDEN_BASENAMES = {".env", "token.json", "credentials.json", "cookies.txt", "cookies.sqlite", "session.json"}
TEXT_SUFFIXES = {
    "", ".cfg", ".css", ".csv", ".html", ".ini", ".js", ".json", ".md", ".ps1", ".py", ".toml", ".tsv", ".txt", ".xml", ".yaml", ".yml",
}

_SECRET_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("PRIVATE_KEY", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
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
        # Deliberately never return matched secret material.
        return {"path": self.path, "rule": self.rule, "line": self.line}


def scan_text(text: str, path: str = "<memory>") -> list[SecretFinding]:
    findings: list[SecretFinding] = []
    lines = text.splitlines()
    for line_no, line in enumerate(lines, start=1):
        for rule, pattern in _SECRET_PATTERNS:
            if pattern.search(line):
                findings.append(SecretFinding(path=path, rule=rule, line=line_no))
    return findings


def _iter_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.is_file():
            yield path


def scan_tree(root: Path) -> list[SecretFinding]:
    root = root.resolve()
    if not root.exists() or not root.is_dir():
        raise ValueError("scan root must be an existing directory")

    findings: list[SecretFinding] = []
    for path in _iter_files(root):
        rel = path.relative_to(root).as_posix()
        if path.name.lower() in FORBIDDEN_BASENAMES:
            findings.append(SecretFinding(path=rel, rule="FORBIDDEN_SECRET_FILENAME", line=None))

        if path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        try:
            if path.stat().st_size > MAX_TEXT_BYTES:
                continue
            data = path.read_bytes()
            if b"\x00" in data:
                continue
            text = data.decode("utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        findings.extend(scan_text(text, rel))

    return sorted(findings, key=lambda item: (item.path, item.line or 0, item.rule))
