from __future__ import annotations

import argparse
import hashlib
import json
import stat
import tempfile
from pathlib import Path, PurePosixPath
from zipfile import BadZipFile, ZipFile, ZipInfo

REQUIRED_ROOT = "r06_platform/"
FULL_MANIFEST_SCHEMA = "DEV1_RESOLVED_SOURCE_MANIFEST_v1"
SUMMARY_MANIFEST_SCHEMA = "DEV1_FINALPREP02_GITHUB_RESOLVED_STATE_v1"
DEFAULT_MANIFEST = Path(__file__).with_name("FINALPREP02_RESOLVED_SOURCE_SHA256.json")
SUMMARY_MANIFEST = Path(__file__).with_name("FINALPREP02_RESOLVED_SOURCE_MANIFEST.json")


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


def _load_json(path: Path) -> dict:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"manifest must be a JSON object: {path}")
    return payload


def _load_manifest(path: Path) -> tuple[dict, dict[str, dict]]:
    payload = _load_json(path)
    if payload.get("schema") != FULL_MANIFEST_SCHEMA:
        raise ValueError(
            f"source manifest schema mismatch: expected={FULL_MANIFEST_SCHEMA!r} "
            f"actual={payload.get('schema')!r}"
        )
    file_count = payload.get("file_count")
    files = payload.get("files")
    aggregate = payload.get("aggregate_sha256")
    if not isinstance(file_count, int) or file_count <= 0:
        raise ValueError("source manifest has invalid file_count")
    if not isinstance(aggregate, str) or len(aggregate) != 64:
        raise ValueError("source manifest has invalid aggregate_sha256")
    if not isinstance(files, list) or len(files) != file_count:
        raise ValueError(
            f"source manifest file-count mismatch: declared={file_count} "
            f"records={len(files) if isinstance(files, list) else 'invalid'}"
        )

    by_archive_name: dict[str, dict] = {}
    for record in files:
        if not isinstance(record, dict):
            raise ValueError("source manifest contains a non-object file record")
        relative = record.get("path")
        size = record.get("size")
        sha256 = record.get("sha256")
        blob = record.get("git_blob_sha1")
        if not isinstance(relative, str) or not relative or not _safe_member(relative):
            raise ValueError(f"source manifest contains unsafe path: {relative!r}")
        if relative.startswith(REQUIRED_ROOT):
            raise ValueError(f"source manifest path must be relative to {REQUIRED_ROOT!r}: {relative!r}")
        if not isinstance(size, int) or size < 0:
            raise ValueError(f"source manifest has invalid size for {relative!r}")
        if not isinstance(sha256, str) or len(sha256) != 64:
            raise ValueError(f"source manifest has invalid SHA256 for {relative!r}")
        if not isinstance(blob, str) or len(blob) != 40:
            raise ValueError(f"source manifest has invalid Git blob SHA1 for {relative!r}")
        archive_name = f"{REQUIRED_ROOT}{relative}"
        if archive_name in by_archive_name:
            raise ValueError(f"source manifest contains duplicate path: {relative!r}")
        by_archive_name[archive_name] = record

    return payload, by_archive_name


def _verify_summary_anchor(manifest: dict, summary_path: Path = SUMMARY_MANIFEST) -> None:
    summary = _load_json(summary_path)
    if summary.get("schema") != SUMMARY_MANIFEST_SCHEMA:
        raise ValueError(
            f"summary manifest schema mismatch: expected={SUMMARY_MANIFEST_SCHEMA!r} "
            f"actual={summary.get('schema')!r}"
        )
    if summary.get("source_file_count") != manifest["file_count"]:
        raise ValueError(
            "canonical manifest count disagrees with repository summary: "
            f"full={manifest['file_count']} summary={summary.get('source_file_count')}"
        )
    if summary.get("resolved_source_aggregate_sha256") != manifest["aggregate_sha256"]:
        raise ValueError(
            "canonical manifest aggregate disagrees with repository summary: "
            f"full={manifest['aggregate_sha256']} "
            f"summary={summary.get('resolved_source_aggregate_sha256')}"
        )


def _verify_archive_manifest(
    bundle: ZipFile,
    infos_by_name: dict[str, ZipInfo],
    expected_records: dict[str, dict],
) -> None:
    actual_file_names = {name for name, info in infos_by_name.items() if not info.is_dir()}
    expected_file_names = set(expected_records)
    if actual_file_names != expected_file_names:
        missing = sorted(expected_file_names - actual_file_names)
        extra = sorted(actual_file_names - expected_file_names)
        raise ValueError(
            "source archive path-set differs from canonical 63-file manifest: "
            f"missing={missing[:5]} extra={extra[:5]} "
            f"expected_count={len(expected_file_names)} actual_count={len(actual_file_names)}"
        )

    for name, record in expected_records.items():
        info = infos_by_name[name]
        data = bundle.read(info)
        actual_size = len(data)
        actual_sha256 = hashlib.sha256(data).hexdigest()
        actual_blob = _git_blob_sha1(data)
        if actual_size != record["size"]:
            raise ValueError(
                f"canonical manifest size mismatch: {name!r} "
                f"expected={record['size']} actual={actual_size}"
            )
        if actual_sha256 != record["sha256"]:
            raise ValueError(
                f"canonical manifest SHA256 mismatch: {name!r} "
                f"expected={record['sha256']} actual={actual_sha256}"
            )
        if actual_blob != record["git_blob_sha1"]:
            raise ValueError(
                f"canonical manifest Git blob mismatch: {name!r} "
                f"expected={record['git_blob_sha1']} actual={actual_blob}"
            )


def _verify_extracted_fidelity(
    expected_records: dict[str, dict],
    extracted_root: Path,
) -> None:
    root = extracted_root / "r06_platform"
    if not root.is_dir():
        raise ValueError("extracted source is missing required r06_platform directory")

    actual_paths: set[str] = set()
    for path in root.rglob("*"):
        if path.is_symlink():
            raise ValueError(f"extracted source symlink is not allowed: {path}")
        if not path.is_file():
            continue
        name = path.relative_to(extracted_root).as_posix()
        actual_paths.add(name)
        record = expected_records.get(name)
        if record is None:
            raise ValueError(f"extracted source contains non-canonical file: {name!r}")
        actual_size = path.stat().st_size
        actual_sha256 = _sha256(path)
        if actual_size != record["size"] or actual_sha256 != record["sha256"]:
            raise ValueError(
                f"extracted source fidelity mismatch: {name!r} "
                f"expected_size={record['size']} actual_size={actual_size} "
                f"expected_sha256={record['sha256']} actual_sha256={actual_sha256}"
            )

    expected_paths = set(expected_records)
    if actual_paths != expected_paths:
        missing = sorted(expected_paths - actual_paths)
        extra = sorted(actual_paths - expected_paths)
        raise ValueError(
            "extracted source path-set mismatch: "
            f"missing={missing[:5]} extra={extra[:5]} "
            f"expected_count={len(expected_paths)} actual_count={len(actual_paths)}"
        )


def verify(
    archive: Path,
    expected_sha256: str,
    manifest_path: Path | None = None,
) -> tuple[str, int]:
    manifest, expected_records = _load_manifest(manifest_path or DEFAULT_MANIFEST)
    _verify_summary_anchor(manifest)

    expected = expected_sha256.strip().lower()
    actual = _sha256(archive)
    if actual != expected:
        raise ValueError(f"source archive SHA256 mismatch: expected={expected} actual={actual}")

    try:
        with ZipFile(archive) as bundle:
            infos = bundle.infolist()
            if not infos:
                raise ValueError("source archive is empty")

            infos_by_name: dict[str, ZipInfo] = {}
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
                if not info.is_dir() and not normalized.startswith(REQUIRED_ROOT):
                    raise ValueError(
                        f"source archive member outside required {REQUIRED_ROOT!r} root: "
                        f"{info.filename!r}"
                    )

            corrupt = bundle.testzip()
            if corrupt is not None:
                raise ValueError(f"source archive CRC failure: {corrupt!r}")

            _verify_archive_manifest(bundle, infos_by_name, expected_records)

            with tempfile.TemporaryDirectory(prefix="dev1-source-fidelity-") as temp_dir:
                extracted_root = Path(temp_dir)
                bundle.extractall(extracted_root)
                _verify_extracted_fidelity(expected_records, extracted_root)
    except BadZipFile as exc:
        raise ValueError("source archive is not a valid ZIP") from exc

    return actual, len(expected_records)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Verify immutable DEV1 source against the full canonical 63-file manifest"
    )
    parser.add_argument("archive", type=Path)
    parser.add_argument("expected_sha256")
    parser.add_argument(
        "--manifest",
        type=Path,
        default=DEFAULT_MANIFEST,
        help="Pinned full FINALPREP02 resolved-source manifest",
    )
    args = parser.parse_args()

    try:
        actual, entries = verify(args.archive, args.expected_sha256, args.manifest)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"DEV1 SOURCE ARCHIVE VERIFY FAIL: {exc}")
        return 2

    print(
        "DEV1 SOURCE ARCHIVE VERIFY PASS: "
        f"sha256={actual} entries={entries} canonical_manifest=PASS extraction_fidelity=PASS"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
