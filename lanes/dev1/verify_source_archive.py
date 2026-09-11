from __future__ import annotations

import argparse
import hashlib
import stat
from pathlib import Path, PurePosixPath
from zipfile import BadZipFile, ZipFile


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _safe_member(name: str) -> bool:
    normalized = name.replace("\\", "/")
    if not normalized or "\x00" in normalized or normalized.startswith("/"):
        return False
    parts = PurePosixPath(normalized).parts
    if not parts or any(part == ".." for part in parts):
        return False
    if ":" in parts[0]:
        return False
    return True


def verify(archive: Path, expected_sha256: str) -> tuple[str, int]:
    expected = expected_sha256.strip().lower()
    actual = _sha256(archive)
    if actual != expected:
        raise ValueError(f"source archive SHA256 mismatch: expected={expected} actual={actual}")

    try:
        with ZipFile(archive) as bundle:
            infos = bundle.infolist()
            if not infos:
                raise ValueError("source archive is empty")

            for info in infos:
                if not _safe_member(info.filename):
                    raise ValueError(f"unsafe source archive member path: {info.filename!r}")
                mode = (info.external_attr >> 16) & 0o170000
                if mode == stat.S_IFLNK:
                    raise ValueError(f"source archive symlink is not allowed: {info.filename!r}")

            normalized_names = [info.filename.replace("\\", "/") for info in infos]
            if not any(name.startswith("r06_platform/") for name in normalized_names):
                raise ValueError("source archive is missing required r06_platform/ root")

            corrupt = bundle.testzip()
            if corrupt is not None:
                raise ValueError(f"source archive CRC failure: {corrupt!r}")
    except BadZipFile as exc:
        raise ValueError("source archive is not a valid ZIP") from exc

    return actual, len(infos)


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify immutable DEV1 source archive before extraction")
    parser.add_argument("archive", type=Path)
    parser.add_argument("expected_sha256")
    args = parser.parse_args()

    try:
        actual, entries = verify(args.archive, args.expected_sha256)
    except (OSError, ValueError) as exc:
        print(f"DEV1 SOURCE ARCHIVE VERIFY FAIL: {exc}")
        return 2

    print(f"DEV1 SOURCE ARCHIVE VERIFY PASS: sha256={actual} entries={entries}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
