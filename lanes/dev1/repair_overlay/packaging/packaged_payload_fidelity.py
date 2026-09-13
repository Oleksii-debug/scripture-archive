from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct
import subprocess
from pathlib import Path
from typing import Any

_HEX40 = re.compile(r"^[0-9a-f]{40}$")
_DRIVE_PATH = re.compile(r"^[A-Za-z]:")
_PROTECTED_PREFIXES = ("r06_platform/frontend/", "docs/campaigns/")
_PROTECTED_EXACT = {"r06_platform/build_identity.json"}


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def normalize_archive_path(value: str) -> str:
    raw = str(value).replace("\\", "/")
    if not raw:
        raise ValueError("Archive path is empty")
    if raw.startswith("/") or _DRIVE_PATH.match(raw):
        raise ValueError(f"Archive path must be relative: {value!r}")
    parts = raw.split("/")
    if any(part in {"", ".", ".."} for part in parts):
        raise ValueError(f"Archive path contains unsafe component: {value!r}")
    return "/".join(parts)


def _is_protected_payload_path(path: str) -> bool:
    return path in _PROTECTED_EXACT or any(path.startswith(prefix) for prefix in _PROTECTED_PREFIXES)


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _git_blob_at(repo_root: Path, git_sha: str, repo_path: str) -> str | None:
    proc = subprocess.run(
        ["git", "-C", str(repo_root), "rev-parse", f"{git_sha}:{repo_path}"],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        return None
    value = proc.stdout.strip().lower()
    if not _HEX40.fullmatch(value):
        raise RuntimeError(f"Invalid Git blob identity for {repo_path}: {value!r}")
    return value


def _entry(
    source: Path,
    package_path: str,
    provenance: str,
    *,
    repo_path: str | None = None,
    git_blob: str | None = None,
) -> dict[str, Any]:
    normalized_package_path = normalize_archive_path(package_path)
    data = source.read_bytes()
    entry: dict[str, Any] = {
        "package_path": normalized_package_path,
        "size_bytes": len(data),
        "sha256": sha256_hex(data),
        "provenance": provenance,
    }
    if repo_path is not None:
        entry["repo_path"] = repo_path
    if git_blob is not None:
        actual_blob = git_blob_sha(data)
        if actual_blob != git_blob:
            raise RuntimeError(
                f"Staged Git blob mismatch for {repo_path}: expected={git_blob} actual={actual_blob}"
            )
        entry["git_blob_sha1"] = git_blob
    return entry


def build_manifest(
    repo_root: Path,
    platform_root: Path,
    build_identity: Path,
    git_sha: str,
    source_archive_sha256: str | None,
) -> dict[str, Any]:
    repo_root = repo_root.resolve()
    platform_root = platform_root.resolve()
    build_identity = build_identity.resolve()
    git_sha = git_sha.strip().lower()
    if not _HEX40.fullmatch(git_sha):
        raise RuntimeError("Exact 40-hex git SHA is required")

    frontend_root = platform_root / "frontend"
    campaigns_root = repo_root / "docs" / "campaigns"
    if not frontend_root.is_dir():
        raise RuntimeError(f"Missing staged frontend: {frontend_root}")
    if not campaigns_root.is_dir():
        raise RuntimeError(f"Missing campaigns payload: {campaigns_root}")
    if not build_identity.is_file():
        raise RuntimeError(f"Missing generated build identity: {build_identity}")

    entries: list[dict[str, Any]] = []
    for source in sorted(path for path in frontend_root.rglob("*") if path.is_file()):
        rel = source.relative_to(frontend_root).as_posix()
        repo_path = f"lanes/dev1/repair_overlay/frontend/{rel}"
        git_blob = _git_blob_at(repo_root, git_sha, repo_path)
        provenance = "git_overlay" if git_blob else "immutable_dev1_source"
        entries.append(
            _entry(
                source,
                f"r06_platform/frontend/{rel}",
                provenance,
                repo_path=repo_path if git_blob else None,
                git_blob=git_blob,
            )
        )

    for source in sorted(path for path in campaigns_root.rglob("*") if path.is_file()):
        rel = source.relative_to(campaigns_root).as_posix()
        repo_path = f"docs/campaigns/{rel}"
        git_blob = _git_blob_at(repo_root, git_sha, repo_path)
        if git_blob is None:
            raise RuntimeError(f"Campaign payload is not Git-tracked at {git_sha}: {repo_path}")
        entries.append(
            _entry(
                source,
                f"docs/campaigns/{rel}",
                "git_campaign",
                repo_path=repo_path,
                git_blob=git_blob,
            )
        )

    entries.append(
        _entry(
            build_identity,
            "r06_platform/build_identity.json",
            "generated_build_identity",
        )
    )
    entries.sort(key=lambda item: item["package_path"])
    package_paths = [item["package_path"] for item in entries]
    if len(package_paths) != len(set(package_paths)):
        raise RuntimeError("Duplicate packaged payload path in fidelity manifest")

    git_pinned = sum(1 for item in entries if item.get("git_blob_sha1"))
    source_only = sum(1 for item in entries if item["provenance"] == "immutable_dev1_source")
    return {
        "schema_version": 1,
        "git_sha": git_sha,
        "source_archive_sha256": source_archive_sha256,
        "entries": entries,
        "counts": {
            "total": len(entries),
            "git_blob_pinned": git_pinned,
            "immutable_source_staged": source_only,
        },
        "proof_scope": [
            "all PyInstaller --add-data frontend files are pinned to exact staged bytes",
            "all PyInstaller --add-data docs/campaigns files are pinned to exact staged bytes and Git blobs",
            "Git-tracked frontend overlay files are pinned to exact Git blobs",
            "generated build identity is pinned to exact staged bytes",
        ],
        "not_proven": [
            "Python module bytecode identity inside PYZ",
            "human NVDA acceptance",
            "visual correctness",
            "full functional acceptance",
        ],
    }


def _raw_carchive_member_names(reader: Any) -> list[str]:
    """Read non-option member names before CArchiveReader collapses duplicate dict keys."""
    try:
        raw_pkg = reader.raw_pkg_data()
        cookie_format = reader._COOKIE_FORMAT
        cookie_length = int(reader._COOKIE_LENGTH)
        cookie_magic = bytes(reader._COOKIE_MAGIC_PATTERN)
        toc_entry_format = reader._TOC_ENTRY_FORMAT
        toc_entry_length = int(reader._TOC_ENTRY_LENGTH)
    except (AttributeError, TypeError, ValueError) as exc:
        raise RuntimeError(f"CArchive reader metadata unavailable: {exc}") from exc

    if not isinstance(raw_pkg, (bytes, bytearray)):
        raise RuntimeError(f"CArchive raw package has invalid type: {type(raw_pkg).__name__}")
    raw_pkg = bytes(raw_pkg)
    if cookie_length <= 0 or len(raw_pkg) < cookie_length:
        raise RuntimeError("CArchive raw package is shorter than its cookie")

    try:
        magic, archive_length, toc_offset, toc_length, _pyvers, _pylib = struct.unpack(
            cookie_format, raw_pkg[-cookie_length:]
        )
    except struct.error as exc:
        raise RuntimeError(f"CArchive cookie parse failed: {exc}") from exc

    if magic != cookie_magic:
        raise RuntimeError("CArchive raw package cookie magic mismatch")
    if archive_length != len(raw_pkg):
        raise RuntimeError(
            f"CArchive raw package length mismatch: cookie={archive_length} actual={len(raw_pkg)}"
        )
    toc_end = toc_offset + toc_length
    cookie_start = len(raw_pkg) - cookie_length
    if toc_offset < 0 or toc_length < 0 or toc_end > cookie_start:
        raise RuntimeError(
            f"CArchive TOC bounds invalid: offset={toc_offset} length={toc_length} cookie_start={cookie_start}"
        )

    toc_data = raw_pkg[toc_offset:toc_end]
    names: list[str] = []
    cur_pos = 0
    while cur_pos < len(toc_data):
        if len(toc_data) - cur_pos < toc_entry_length:
            raise RuntimeError("CArchive TOC contains a truncated entry header")
        header = toc_data[cur_pos:(cur_pos + toc_entry_length)]
        try:
            entry_length, _entry_offset, _data_length, _uncompressed_length, _compression_flag, typecode = \
                struct.unpack(toc_entry_format, header)
        except struct.error as exc:
            raise RuntimeError(f"CArchive TOC entry parse failed: {exc}") from exc
        if entry_length < toc_entry_length:
            raise RuntimeError(f"CArchive TOC entry length is invalid: {entry_length}")
        next_pos = cur_pos + entry_length
        if next_pos > len(toc_data):
            raise RuntimeError("CArchive TOC entry exceeds declared TOC bounds")
        raw_name = toc_data[cur_pos + toc_entry_length:next_pos].rstrip(b"\0")
        try:
            name = raw_name.decode("utf-8")
            typecode_text = typecode.decode("ascii")
        except UnicodeDecodeError as exc:
            raise RuntimeError(f"CArchive TOC text decode failed: {exc}") from exc
        if typecode_text != "o":
            names.append(name)
        cur_pos = next_pos

    if cur_pos != len(toc_data):
        raise RuntimeError("CArchive TOC parser did not consume the declared TOC length")
    return names


def _archive_index(reader: Any, archive_names: list[str] | None = None) -> tuple[dict[str, str], list[str]]:
    index: dict[str, str] = {}
    errors: list[str] = []
    names = archive_names if archive_names is not None else [str(name) for name in getattr(reader, "toc", {})]
    for raw_name in names:
        name = str(raw_name)
        try:
            normalized = normalize_archive_path(name)
        except ValueError as exc:
            errors.append(f"INVALID_ARCHIVE_PATH {name!r}: {exc}")
            continue
        existing = index.get(normalized)
        if existing is not None:
            errors.append(f"DUPLICATE_NORMALIZED_PATH {normalized}: {existing!r} vs {name!r}")
        else:
            index[normalized] = name
    return index, errors


def verify_reader(
    reader: Any,
    manifest: dict[str, Any],
    *,
    archive_names: list[str] | None = None,
) -> dict[str, Any]:
    entries = manifest.get("entries")
    if manifest.get("schema_version") != 1 or not isinstance(entries, list):
        return {
            "schema_version": 1,
            "ok": False,
            "files_expected": 0,
            "files_verified": 0,
            "errors": ["INVALID_MANIFEST"],
            "entries": [],
        }

    index, errors = _archive_index(reader, archive_names)
    checked: list[dict[str, Any]] = []
    expected_paths: set[str] = set()
    verified = 0
    for expected in entries:
        if not isinstance(expected, dict):
            errors.append("INVALID_MANIFEST_ENTRY")
            continue
        raw_package_path = str(expected.get("package_path", ""))
        try:
            package_path = normalize_archive_path(raw_package_path)
        except ValueError as exc:
            errors.append(f"INVALID_MANIFEST_PATH {raw_package_path!r}: {exc}")
            checked.append({"package_path": raw_package_path, "ok": False, "error": "invalid_manifest_path"})
            continue
        if package_path in expected_paths:
            errors.append(f"DUPLICATE_MANIFEST_PATH {package_path}")
            checked.append({"package_path": package_path, "ok": False, "error": "duplicate_manifest_path"})
            continue
        expected_paths.add(package_path)
        actual_name = index.get(package_path)
        row: dict[str, Any] = {"package_path": package_path, "ok": False}
        if actual_name is None:
            errors.append(f"MISSING {package_path}")
            row["error"] = "missing"
            checked.append(row)
            continue
        try:
            data = reader.extract(actual_name)
        except Exception as exc:  # fail closed on archive reader errors
            errors.append(f"EXTRACT_ERROR {package_path}: {exc}")
            row["error"] = "extract_error"
            checked.append(row)
            continue
        if not isinstance(data, (bytes, bytearray)):
            errors.append(f"INVALID_EXTRACT_TYPE {package_path}: {type(data).__name__}")
            row["error"] = "invalid_extract_type"
            checked.append(row)
            continue
        actual = bytes(data)
        actual_sha = sha256_hex(actual)
        actual_size = len(actual)
        row["size_bytes"] = actual_size
        row["sha256"] = actual_sha
        expected_size = expected.get("size_bytes")
        expected_sha = expected.get("sha256")
        mismatch = False
        if actual_size != expected_size:
            errors.append(
                f"SIZE_MISMATCH {package_path}: expected={expected_size} actual={actual_size}"
            )
            mismatch = True
        if actual_sha != expected_sha:
            errors.append(
                f"SHA256_MISMATCH {package_path}: expected={expected_sha} actual={actual_sha}"
            )
            mismatch = True
        expected_blob = expected.get("git_blob_sha1")
        if expected_blob:
            actual_blob = git_blob_sha(actual)
            row["git_blob_sha1"] = actual_blob
            if actual_blob != expected_blob:
                errors.append(
                    f"GIT_BLOB_MISMATCH {package_path}: expected={expected_blob} actual={actual_blob}"
                )
                mismatch = True
        row["ok"] = not mismatch
        if row["ok"]:
            verified += 1
        checked.append(row)

    for package_path in sorted(index):
        if _is_protected_payload_path(package_path) and package_path not in expected_paths:
            errors.append(f"UNEXPECTED_PROTECTED_PAYLOAD {package_path}")
            checked.append(
                {
                    "package_path": package_path,
                    "ok": False,
                    "error": "unexpected_protected_payload",
                }
            )

    return {
        "schema_version": 1,
        "ok": not errors and verified == len(entries),
        "git_sha": manifest.get("git_sha"),
        "source_archive_sha256": manifest.get("source_archive_sha256"),
        "files_expected": len(entries),
        "files_verified": verified,
        "errors": errors,
        "entries": checked,
        "not_proven": manifest.get("not_proven", []),
    }


def verify_artifact(artifact: Path, manifest: dict[str, Any]) -> dict[str, Any]:
    try:
        from PyInstaller.archive.readers import CArchiveReader
    except Exception as exc:  # pragma: no cover - exercised in Windows build environment
        raise RuntimeError(f"PyInstaller archive reader unavailable: {exc}") from exc
    reader = CArchiveReader(str(artifact))
    archive_names = _raw_carchive_member_names(reader)
    result = verify_reader(reader, manifest, archive_names=archive_names)
    result["artifact"] = str(artifact)
    result["artifact_sha256"] = sha256_hex(artifact.read_bytes())
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Prove staged and embedded Windows package payload fidelity")
    sub = parser.add_subparsers(dest="command", required=True)

    manifest_parser = sub.add_parser("manifest")
    manifest_parser.add_argument("--repo-root", required=True)
    manifest_parser.add_argument("--platform-root", required=True)
    manifest_parser.add_argument("--build-identity", required=True)
    manifest_parser.add_argument("--git-sha", required=True)
    manifest_parser.add_argument("--source-archive-sha256")
    manifest_parser.add_argument("--output", required=True)

    verify_parser = sub.add_parser("verify")
    verify_parser.add_argument("--artifact", required=True)
    verify_parser.add_argument("--manifest", required=True)
    verify_parser.add_argument("--output", required=True)

    ns = parser.parse_args(argv)
    try:
        if ns.command == "manifest":
            payload = build_manifest(
                Path(ns.repo_root),
                Path(ns.platform_root),
                Path(ns.build_identity),
                ns.git_sha,
                ns.source_archive_sha256,
            )
            _write_json(Path(ns.output), payload)
            print(
                "PACKAGE_FIDELITY_MANIFEST_PASS "
                f"files={payload['counts']['total']} git_pinned={payload['counts']['git_blob_pinned']}"
            )
            return 0

        manifest = json.loads(Path(ns.manifest).read_text(encoding="utf-8-sig"))
        result = verify_artifact(Path(ns.artifact), manifest)
        _write_json(Path(ns.output), result)
        print(
            f"PACKAGE_FIDELITY_{'PASS' if result['ok'] else 'FAIL'} "
            f"verified={result['files_verified']}/{result['files_expected']}"
        )
        for error in result["errors"]:
            print(f"ERROR {error}")
        return 0 if result["ok"] else 1
    except Exception as exc:
        print(f"PACKAGE_FIDELITY_ERROR {exc}")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
