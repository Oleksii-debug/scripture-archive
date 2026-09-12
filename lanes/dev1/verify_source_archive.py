from __future__ import annotations

import argparse
import hashlib
import json
import stat
import tempfile
from pathlib import Path, PurePosixPath
from zipfile import BadZipFile, ZipFile

REQUIRED_ROOT = "r06_platform/"
MANIFEST_SCHEMA = "DEV1_FINALPREP02_GITHUB_RESOLVED_STATE_v1"
DEFAULT_MANIFEST = Path(__file__).with_name("FINALPREP02_RESOLVED_SOURCE_MANIFEST.json")


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _git_blob_sha1(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def _safe_member(name: str) -> bool:
    normalized = name.replace("\\", "/")
    if not normalized or "\x00" in normalized or normalized.startswith("/"):
        return False
    parts = PurePosixPath(normalized).parts
    if not parts or any(part in {"", ".", ".."} for part in parts):
        return False
    if ":" in parts[0]:
        return False
    return True


def _load_manifest(path: Path) -> dict:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload.get("schema") != MANIFEST_SCHEMA:
        raise ValueError(
            f"source manifest schema mismatch: expected={MANIFEST_SCHEMA!r} "
            f"actual={payload.get('schema')!r}"
        )
    source_file_count = payload.get("source_file_count")
    if not isinstance(source_file_count, int) or source_file_count <= 0:
        raise ValueError("source manifest has invalid source_file_count")
    critical_files = payload.get("critical_files")
    if not isinstance(critical_files, list) or not critical_files:
        raise ValueError("source manifest is missing critical_files")
    return payload


def _verify_manifest_critical_files(bundle: ZipFile, infos_by_name: dict[str, object], manifest: dict) -> None:
    for record in manifest["critical_files"]:
        if not isinstance(record, dict):
            raise ValueError("source manifest contains a non-object critical_files record")
        relative = record.get("path")
        if not isinstance(relative, str) or not relative or not _safe_member(relative):
            raise ValueError(f"source manifest contains unsafe critical path: {relative!r}")
        archive_name = f"{REQUIRED_ROOT}{relative}"
        info = infos_by_name.get(archive_name)
        if info is None or info.is_dir():
            raise ValueError(f"source archive is missing manifest critical file: {archive_name!r}")
        data = bundle.read(info)
        actual_size = len(data)
        actual_sha256 = hashlib.sha256(data).hexdigest()
        actual_blob = _git_blob_sha1(data)
        if actual_size != record.get("size"):
            raise ValueError(
                f"source manifest size mismatch: {archive_name!r} "
                f"expected={record.get('size')} actual={actual_size}"
            )
        if actual_sha256 != record.get("sha256"):
            raise ValueError(
                f"source manifest SHA256 mismatch: {archive_name!r} "
                f"expected={record.get('sha256')} actual={actual_sha256}"
            )
        if actual_blob != record.get("git_blob_sha1"):
            raise ValueError(
                f"source manifest Git blob mismatch: {archive_name!r} "
                f"expected={record.get('git_blob_sha1')} actual={actual_blob}"
            )


def _verify_extracted_fidelity(bundle: ZipFile, infos_by_name: dict[str, object], extracted_root: Path) -> None:
    expected: dict[str, tuple[int, str]] = {}
    for name, info in infos_by_name.items():
        if info.is_dir():
            continue
        data = bundle.read(info)
        expected[name] = (info.file_size, hashlib.sha256(data).hexdigest())

    root = extracted_root / "r06_platform"
    if not root.is_dir():
        raise ValueError("extracted source is missing required r06_platform directory")

    actual: dict[str, tuple[int, str]] = {}
    for path in root.rglob("*"):
        if path.is_symlink():
            raise ValueError(f"extracted source symlink is not allowed: {path}")
        if not path.is_file():
            continue
        relative = path.relative_to(extracted_root).as_posix()
        actual[relative] = (path.stat().st_size, _sha256(path))

    expected_names = set(expected)
    actual_names = set(actual)
    if actual_names != expected_names:
        missing = sorted(expected_names - actual_names)
        extra = sorted(actual_names - expected_names)
        raise ValueError(
            "extracted source path-set mismatch: "
            f"missing={missing[:5]} extra={extra[:5]} "
            f"expected_count={len(expected_names)} actual_count={len(actual_names)}"
        )

    for name, expected_identity in expected.items():
        if actual[name] != expected_identity:
            raise ValueError(
                f"extracted source fidelity mismatch: {name!r} "
                f"expected_size={expected_identity[0]} actual_size={actual[name][0]} "
                f"expected_sha256={expected_identity[1]} actual_sha256={actual[name][1]}"
            )


def verify(
    archive: Path,
    expected_sha256: str,
    manifest_path: Path | None = None,
) -> tuple[str, int]:
    manifest = _load_manifest(manifest_path or DEFAULT_MANIFEST)

    expected = expected_sha256.strip().lower()
    actual = _sha256(archive)
    if actual != expected:
        raise ValueError(f"source archive SHA256 mismatch: expected={expected} actual={actual}")

    try:
        with ZipFile(archive) as bundle:
            infos = bundle.infolist()
            if not infos:
                raise ValueError("source archive is empty")

            infos_by_name: dict[str, object] = {}
            file_count = 0
            for info in infos:
                if not _safe_member(info.filename):
                    raise ValueError(f"unsafe source archive member path: {info.filename!r}")
                normalized = info.filename.replace("\\", "/")
                if normalized in infos_by_name:
                    raise ValueError(f"source archive contains duplicate member path: {normalized!r}")
                infos_by_name[normalized] = info

                mode = (info.external_attr >> 16) & 0o170000
                if mode == stat.S_IFLNK:
                    raise ValueError(f"source archive symlink is not allowed: {info.filename!r}")
                if not info.is_dir():
                    if not normalized.startswith(REQUIRED_ROOT):
                        raise ValueError(
                            f"source archive member outside required {REQUIRED_ROOT!r} root: "
                            f"{info.filename!r}"
                        )
                    file_count += 1

            expected_count = manifest["source_file_count"]
            if file_count != expected_count:
                raise ValueError(
                    f"source archive resolved-file count mismatch: expected={expected_count} actual={file_count}"
                )

            corrupt = bundle.testzip()
            if corrupt is not None:
                raise ValueError(f"source archive CRC failure: {corrupt!r}")

            _verify_manifest_critical_files(bundle, infos_by_name, manifest)

            with tempfile.TemporaryDirectory(prefix="dev1-source-fidelity-") as temp_dir:
                extracted_root = Path(temp_dir)
                bundle.extractall(extracted_root)
                _verify_extracted_fidelity(bundle, infos_by_name, extracted_root)
    except BadZipFile as exc:
        raise ValueError("source archive is not a valid ZIP") from exc

    return actual, file_count


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Verify immutable DEV1 source archive and exact post-extraction fidelity"
    )
    parser.add_argument("archive", type=Path)
    parser.add_argument("expected_sha256")
    parser.add_argument(
        "--manifest",
        type=Path,
        default=DEFAULT_MANIFEST,
        help="Pinned FINALPREP02 resolved-source manifest",
    )
    args = parser.parse_args()

    try:
        actual, entries = verify(args.archive, args.expected_sha256, args.manifest)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"DEV1 SOURCE ARCHIVE VERIFY FAIL: {exc}")
        return 2

    print(
        "DEV1 SOURCE ARCHIVE VERIFY PASS: "
        f"sha256={actual} entries={entries} extraction_fidelity=PASS"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
