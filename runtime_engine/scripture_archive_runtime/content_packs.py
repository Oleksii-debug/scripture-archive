from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import stat
import tempfile
import uuid
import zipfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any, Mapping

from .content import validate_canonical_node
from .package_adapters import iter_nodes_from_payload
from .security import ValidationError, validate_content_import

CONTENT_PACK_SCHEMA = "scripture.content-pack.v1"
CONTENT_SCHEMA_VERSION = "CONTENT_NODE_SCHEMA_v1.2"
MANIFEST_NAME = "content-pack.json"
STATE_SCHEMA_VERSION = 1
MAX_ARCHIVE_BYTES = 64 * 1024 * 1024
MAX_FILE_COUNT = 1024
MAX_FILE_BYTES = 16 * 1024 * 1024
MAX_UNCOMPRESSED_BYTES = 128 * 1024 * 1024
MAX_COMPRESSION_RATIO = 500

_PACK_ID_RE = re.compile(r"^[a-z0-9][a-z0-9._-]{0,63}$")
_VERSION_RE = re.compile(
    r"^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)"
    r"(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$"
)
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
_DRIVE_RE = re.compile(r"^[A-Za-z]:")
_WINDOWS_INVALID_CHARS = frozenset('<>:"/\\|?*')
_RESERVED_WINDOWS_NAMES = {
    "con", "prn", "aux", "nul", "conin$", "conout$",
    *(f"com{i}" for i in range(1, 10)),
    *(f"lpt{i}" for i in range(1, 10)),
    "com¹", "com²", "com³", "lpt¹", "lpt²", "lpt³",
}
_ALLOWED_DATA_EXTENSIONS = {
    ".json", ".md", ".txt", ".csv", ".tsv",
    ".png", ".jpg", ".jpeg", ".webp", ".gif",
}
_ARCHIVE_EXTENSIONS = {".zip", ".tar", ".gz", ".tgz", ".bz2", ".xz", ".7z", ".rar", ".cab", ".iso"}
_EXECUTABLE_EXTENSIONS = {
    ".exe", ".dll", ".com", ".scr", ".msi", ".msix", ".appx",
    ".bat", ".cmd", ".ps1", ".psm1", ".vbs", ".vbe", ".wsf", ".wsh",
    ".hta", ".lnk", ".reg", ".jar", ".class", ".py", ".pyc", ".pyo",
    ".js", ".mjs", ".cjs", ".html", ".htm", ".svg", ".sh", ".bash",
}


def _validate_windows_component(value: str, *, label: str) -> str:
    if not value or value.endswith((" ", ".")):
        raise ValidationError(f"{label} is unsafe on Windows")
    if any(ord(char) < 32 or char in _WINDOWS_INVALID_CHARS for char in value):
        raise ValidationError(f"{label} is unsafe on Windows")
    stem = value.split(".", 1)[0].casefold()
    if stem in _RESERVED_WINDOWS_NAMES:
        raise ValidationError(f"{label} uses reserved Windows name")
    return value


def _validate_pack_id(value: str) -> str:
    if not _PACK_ID_RE.fullmatch(value):
        raise ValidationError("Invalid content pack id")
    return _validate_windows_component(value, label="Content pack id")


def _validate_version(value: str) -> str:
    match = _VERSION_RE.fullmatch(value)
    if not match:
        raise ValidationError("Content pack version must be semantic version x.y.z")
    prerelease = match.group(4)
    if prerelease:
        for identifier in prerelease.split("."):
            if identifier.isdigit() and len(identifier) > 1 and identifier.startswith("0"):
                raise ValidationError("Content pack version has a leading-zero numeric prerelease identifier")
    return _validate_windows_component(value, label="Content pack version")


def _safe_member_name(name: str, *, allow_directory: bool = False) -> str:
    if not isinstance(name, str) or not name or "\x00" in name:
        raise ValidationError("Archive member has invalid name")
    if "\\" in name:
        raise ValidationError(f"Archive member uses ambiguous backslash path: {name}")
    if name.startswith("/") or _DRIVE_RE.match(name):
        raise ValidationError(f"Archive member is absolute: {name}")

    raw = name[:-1] if allow_directory and name.endswith("/") else name
    if not raw:
        raise ValidationError("Archive contains empty path")
    parts = raw.split("/")
    if any(part in {"", ".", ".."} for part in parts):
        raise ValidationError(f"Archive member contains unsafe path segment: {name}")
    for part in parts:
        _validate_windows_component(part, label=f"Archive member segment in {name}")

    normalized = PurePosixPath(raw).as_posix()
    if normalized != raw:
        raise ValidationError(f"Archive member path is not canonical: {name}")
    return normalized


def _validate_payload_extension(name: str) -> None:
    suffix = PurePosixPath(name).suffix.casefold()
    if suffix in _ARCHIVE_EXTENSIONS:
        raise ValidationError(f"Nested archive is forbidden in content pack: {name}")
    if suffix in _EXECUTABLE_EXTENSIONS:
        raise ValidationError(f"Executable/script content is forbidden in content pack: {name}")
    if suffix not in _ALLOWED_DATA_EXTENSIONS:
        raise ValidationError(f"Unsupported content pack file type: {name}")


def _is_special_zip_member(info: zipfile.ZipInfo) -> bool:
    mode = (info.external_attr >> 16) & 0xFFFF
    if not mode:
        return False
    kind = stat.S_IFMT(mode)
    if info.is_dir():
        return kind not in {0, stat.S_IFDIR}
    return kind not in {0, stat.S_IFREG}


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


@dataclass(frozen=True)
class ContentPackManifest:
    pack_id: str
    version: str
    content_schema_version: str
    entry_points: tuple[str, ...]
    files: Mapping[str, str]
    schema: str = CONTENT_PACK_SCHEMA

    @classmethod
    def from_mapping(cls, value: Mapping[str, Any]) -> "ContentPackManifest":
        if not isinstance(value, Mapping):
            raise ValidationError("Content pack manifest must be an object")
        allowed = {"schema", "pack_id", "version", "content_schema_version", "entry_points", "files"}
        unknown = set(value) - allowed
        missing = allowed - set(value)
        if unknown:
            raise ValidationError("Unknown content pack manifest fields: " + ", ".join(sorted(unknown)))
        if missing:
            raise ValidationError("Missing content pack manifest fields: " + ", ".join(sorted(missing)))
        if value.get("schema") != CONTENT_PACK_SCHEMA:
            raise ValidationError("Unsupported content pack manifest schema")

        pack_id = _validate_pack_id(str(value.get("pack_id", "")))
        version = _validate_version(str(value.get("version", "")))
        content_schema_version = str(value.get("content_schema_version", ""))
        if content_schema_version != CONTENT_SCHEMA_VERSION:
            raise ValidationError(f"Unsupported content schema version: {content_schema_version}")

        raw_entries = value.get("entry_points")
        if not isinstance(raw_entries, list) or not raw_entries:
            raise ValidationError("Content pack entry_points must be a non-empty array")
        entry_points: list[str] = []
        for raw in raw_entries:
            if not isinstance(raw, str):
                raise ValidationError("Content pack entry point must be a string")
            name = _safe_member_name(raw)
            if PurePosixPath(name).suffix.casefold() != ".json":
                raise ValidationError("Content pack entry points must be JSON")
            if name == MANIFEST_NAME:
                raise ValidationError("Manifest cannot be a content entry point")
            if name in entry_points:
                raise ValidationError(f"Duplicate content pack entry point: {name}")
            entry_points.append(name)

        raw_files = value.get("files")
        if not isinstance(raw_files, Mapping) or not raw_files:
            raise ValidationError("Content pack files must be a non-empty object")
        files: dict[str, str] = {}
        casefolded: set[str] = set()
        for raw_name, raw_digest in raw_files.items():
            if not isinstance(raw_name, str) or not isinstance(raw_digest, str):
                raise ValidationError("Content pack files must map path strings to SHA-256 strings")
            name = _safe_member_name(raw_name)
            if name == MANIFEST_NAME:
                raise ValidationError("Manifest must not hash itself")
            _validate_payload_extension(name)
            folded = name.casefold()
            if folded in casefolded:
                raise ValidationError(f"Case-colliding content pack file: {name}")
            casefolded.add(folded)
            digest = raw_digest.casefold()
            if not _SHA256_RE.fullmatch(digest):
                raise ValidationError(f"Invalid SHA-256 for content pack file: {name}")
            files[name] = digest

        missing_entries = sorted(set(entry_points) - set(files))
        if missing_entries:
            raise ValidationError("Entry points missing from files manifest: " + ", ".join(missing_entries))
        return cls(pack_id, version, content_schema_version, tuple(entry_points), files)

    def as_dict(self) -> dict[str, Any]:
        return {
            "schema": self.schema,
            "pack_id": self.pack_id,
            "version": self.version,
            "content_schema_version": self.content_schema_version,
            "entry_points": list(self.entry_points),
            "files": dict(sorted(self.files.items())),
        }


@dataclass(frozen=True)
class ContentPackInspection:
    manifest: ContentPackManifest
    archive_sha256: str
    file_count: int
    uncompressed_bytes: int
    node_count: int


def _validate_canonical_entry_payload(payload: Any, *, seen_node_ids: set[str]) -> int:
    validate_content_import(payload)
    count = 0
    for node in iter_nodes_from_payload(payload):
        validate_canonical_node(node)
        node_id = str(node["node_id"])
        if node_id in seen_node_ids:
            raise ValidationError(f"Duplicate node_id across content pack entry points: {node_id}")
        seen_node_ids.add(node_id)
        count += 1
    if count == 0:
        raise ValidationError("Content pack entry point contains no canonical nodes")
    return count


def inspect_content_pack(archive: str | Path) -> ContentPackInspection:
    archive_path = Path(archive).expanduser().resolve()
    try:
        archive_size = archive_path.stat().st_size
    except OSError as exc:
        raise ValidationError("Content pack archive is not readable") from exc
    if archive_size > MAX_ARCHIVE_BYTES:
        raise ValidationError("Content pack archive exceeds compressed size limit")

    try:
        with zipfile.ZipFile(archive_path, "r") as zf:
            infos = zf.infolist()
            if len(infos) > MAX_FILE_COUNT:
                raise ValidationError("Content pack exceeds file-count limit")

            file_infos: dict[str, zipfile.ZipInfo] = {}
            folded_names: set[str] = set()
            total_uncompressed = 0
            for info in infos:
                if info.flag_bits & 0x1:
                    raise ValidationError(f"Encrypted content pack member is forbidden: {info.filename}")
                name = _safe_member_name(info.filename, allow_directory=info.is_dir())
                folded = name.casefold()
                if folded in folded_names:
                    raise ValidationError(f"Duplicate/case-colliding archive member: {name}")
                folded_names.add(folded)
                if _is_special_zip_member(info):
                    raise ValidationError(f"Symlink/special archive member is forbidden: {name}")
                if info.is_dir():
                    continue
                if info.file_size > MAX_FILE_BYTES:
                    raise ValidationError(f"Content pack member exceeds per-file limit: {name}")
                total_uncompressed += info.file_size
                if total_uncompressed > MAX_UNCOMPRESSED_BYTES:
                    raise ValidationError("Content pack exceeds total uncompressed size limit")
                if info.file_size and info.file_size / max(info.compress_size, 1) > MAX_COMPRESSION_RATIO:
                    raise ValidationError(f"Content pack member has unsafe compression ratio: {name}")
                if name != MANIFEST_NAME:
                    _validate_payload_extension(name)
                file_infos[name] = info

            if MANIFEST_NAME not in file_infos:
                raise ValidationError(f"Content pack is missing root {MANIFEST_NAME}")
            try:
                manifest_raw = json.loads(zf.read(file_infos[MANIFEST_NAME]).decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                raise ValidationError("Content pack manifest is not valid UTF-8 JSON") from exc
            manifest = ContentPackManifest.from_mapping(manifest_raw)

            archive_payload_names = set(file_infos) - {MANIFEST_NAME}
            manifest_payload_names = set(manifest.files)
            if archive_payload_names != manifest_payload_names:
                missing = sorted(manifest_payload_names - archive_payload_names)
                extra = sorted(archive_payload_names - manifest_payload_names)
                detail = []
                if missing:
                    detail.append("missing=" + ",".join(missing))
                if extra:
                    detail.append("unmanifested=" + ",".join(extra))
                raise ValidationError("Content pack file manifest mismatch: " + "; ".join(detail))

            decoded_json: dict[str, Any] = {}
            for name, expected_digest in manifest.files.items():
                data = zf.read(file_infos[name])
                if _sha256_bytes(data) != expected_digest:
                    raise ValidationError(f"Content pack SHA-256 mismatch: {name}")
                if PurePosixPath(name).suffix.casefold() == ".json":
                    try:
                        decoded = json.loads(data.decode("utf-8"))
                    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                        raise ValidationError(f"Content pack JSON is invalid: {name}") from exc
                    validate_content_import(decoded)
                    decoded_json[name] = decoded

            seen_node_ids: set[str] = set()
            node_count = sum(
                _validate_canonical_entry_payload(decoded_json[name], seen_node_ids=seen_node_ids)
                for name in manifest.entry_points
            )
    except (zipfile.BadZipFile, zipfile.LargeZipFile) as exc:
        raise ValidationError("Content pack is not a valid ZIP archive") from exc

    return ContentPackInspection(
        manifest=manifest,
        archive_sha256=_sha256_file(archive_path),
        file_count=len(file_infos),
        uncompressed_bytes=total_uncompressed,
        node_count=node_count,
    )


class ContentPackStore:
    """Immutable version store with atomic activation metadata and rollback."""

    def __init__(self, root: str | Path) -> None:
        self.root = Path(root).expanduser().resolve()
        self.packs_root = self.root / "packs"
        self.staging_root = self.root / ".staging"
        self.state_path = self.root / "active-packs.json"
        self.root.mkdir(parents=True, exist_ok=True)
        self.packs_root.mkdir(exist_ok=True)
        self.staging_root.mkdir(exist_ok=True)

    def _pack_dir(self, pack_id: str, version: str) -> Path:
        safe_pack_id = _validate_pack_id(pack_id)
        safe_version = _validate_version(version)
        pack_root = self.packs_root / safe_pack_id
        if pack_root.exists():
            for child in pack_root.iterdir():
                if child.is_dir() and child.name.casefold() == safe_version.casefold() and child.name != safe_version:
                    raise ValidationError(
                        f"Content pack version collides case-insensitively on Windows: {safe_version}"
                    )
        return pack_root / safe_version

    def _load_state(self) -> dict[str, Any]:
        if not self.state_path.exists():
            return {"schema_version": STATE_SCHEMA_VERSION, "active": {}, "previous": {}}
        try:
            data = json.loads(self.state_path.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ValidationError("Content pack activation state is corrupt") from exc
        if not isinstance(data, dict) or data.get("schema_version") != STATE_SCHEMA_VERSION:
            raise ValidationError("Unsupported content pack activation state")
        active = data.get("active")
        previous = data.get("previous")
        if not isinstance(active, dict) or not isinstance(previous, dict):
            raise ValidationError("Content pack activation state is invalid")
        for mapping in (active, previous):
            for pack_id, version in mapping.items():
                _validate_pack_id(str(pack_id))
                _validate_version(str(version))
        return {"schema_version": STATE_SCHEMA_VERSION, "active": dict(active), "previous": dict(previous)}

    def _save_state(self, state: Mapping[str, Any]) -> None:
        payload = json.dumps(state, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
        tmp = self.root / f".active-packs.{os.getpid()}.{uuid.uuid4().hex}.tmp"
        try:
            with tmp.open("x", encoding="utf-8", newline="\n") as fh:
                fh.write(payload)
                fh.flush()
                os.fsync(fh.fileno())
            os.replace(tmp, self.state_path)
            self._fsync_directory(self.root)
        finally:
            tmp.unlink(missing_ok=True)

    def _read_installed_manifest(self, pack_id: str, version: str) -> ContentPackManifest:
        pack_dir = self._pack_dir(pack_id, version)
        manifest_path = pack_dir / MANIFEST_NAME
        if not manifest_path.is_file():
            raise ValidationError(f"Content pack version is not installed: {pack_id}@{version}")
        try:
            raw = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ValidationError("Installed content pack manifest is corrupt") from exc
        manifest = ContentPackManifest.from_mapping(raw)
        if manifest.pack_id != pack_id or manifest.version != version:
            raise ValidationError("Installed content pack identity does not match its directory")
        return manifest

    def verify_installed(self, pack_id: str, version: str) -> ContentPackManifest:
        manifest = self._read_installed_manifest(pack_id, version)
        pack_dir = self._pack_dir(pack_id, version)
        actual: set[str] = set()
        for path in pack_dir.rglob("*"):
            if path.is_symlink():
                raise ValidationError("Installed content pack contains symlink")
            if path.is_file():
                rel = path.relative_to(pack_dir).as_posix()
                actual.add(rel)
        expected = set(manifest.files) | {MANIFEST_NAME}
        if actual != expected:
            raise ValidationError("Installed content pack file set does not match manifest")
        for name, digest in manifest.files.items():
            path = pack_dir.joinpath(*PurePosixPath(name).parts)
            if _sha256_file(path) != digest:
                raise ValidationError(f"Installed content pack SHA-256 mismatch: {name}")
        return manifest

    def install(self, archive: str | Path) -> ContentPackInspection:
        archive_path = Path(archive).expanduser().resolve()
        inspection = inspect_content_pack(archive_path)
        manifest = inspection.manifest
        target = self._pack_dir(manifest.pack_id, manifest.version)
        if target.exists():
            raise ValidationError(f"Content pack version is immutable and already installed: {manifest.pack_id}@{manifest.version}")
        target.parent.mkdir(parents=True, exist_ok=True)
        stage = self.staging_root / f"{manifest.pack_id}-{manifest.version}-{uuid.uuid4().hex}"
        stage.mkdir()
        try:
            with zipfile.ZipFile(archive_path, "r") as zf:
                for info in zf.infolist():
                    name = _safe_member_name(info.filename, allow_directory=info.is_dir())
                    destination = stage.joinpath(*PurePosixPath(name).parts)
                    resolved = destination.resolve()
                    if resolved != stage and stage not in resolved.parents:
                        raise ValidationError("Content pack extraction attempted to escape staging root")
                    if info.is_dir():
                        destination.mkdir(parents=True, exist_ok=True)
                        continue
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    with zf.open(info, "r") as src, destination.open("xb") as dst:
                        shutil.copyfileobj(src, dst, length=1024 * 1024)
                        dst.flush()
                        os.fsync(dst.fileno())
            for name, digest in manifest.files.items():
                if _sha256_file(stage.joinpath(*PurePosixPath(name).parts)) != digest:
                    raise ValidationError(f"Extracted content pack SHA-256 mismatch: {name}")
            os.replace(stage, target)
            self._fsync_directory(target.parent)
        finally:
            if stage.exists():
                shutil.rmtree(stage, ignore_errors=True)
        self.verify_installed(manifest.pack_id, manifest.version)
        return inspection

    def activate(self, pack_id: str, version: str) -> ContentPackManifest:
        manifest = self.verify_installed(pack_id, version)
        state = self._load_state()
        current = state["active"].get(pack_id)
        if current == version:
            return manifest
        if current is not None:
            state["previous"][pack_id] = current
        else:
            state["previous"].pop(pack_id, None)
        state["active"][pack_id] = version
        self._save_state(state)
        return manifest

    def rollback(self, pack_id: str) -> ContentPackManifest:
        _validate_pack_id(pack_id)
        state = self._load_state()
        current = state["active"].get(pack_id)
        previous = state["previous"].get(pack_id)
        if current is None or previous is None:
            raise ValidationError(f"No rollback version available for content pack: {pack_id}")
        manifest = self.verify_installed(pack_id, previous)
        state["active"][pack_id] = previous
        state["previous"][pack_id] = current
        self._save_state(state)
        return manifest

    def active_versions(self) -> dict[str, str]:
        return dict(self._load_state()["active"])

    def installed_versions(self, pack_id: str) -> tuple[str, ...]:
        pack_root = self.packs_root / _validate_pack_id(pack_id)
        if not pack_root.exists():
            return ()
        versions = []
        for child in pack_root.iterdir():
            if child.is_dir():
                try:
                    versions.append(_validate_version(child.name))
                except ValidationError:
                    continue
        return tuple(sorted(versions))

    def export_pack(self, pack_id: str, version: str, destination: str | Path) -> Path:
        manifest = self.verify_installed(pack_id, version)
        pack_dir = self._pack_dir(pack_id, version)
        target = Path(destination).expanduser().resolve()
        target.parent.mkdir(parents=True, exist_ok=True)
        fd, temp_name = tempfile.mkstemp(prefix=f".{target.name}.", suffix=".tmp", dir=target.parent)
        os.close(fd)
        tmp = Path(temp_name)
        try:
            with zipfile.ZipFile(tmp, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
                for name in [MANIFEST_NAME, *sorted(manifest.files)]:
                    data = pack_dir.joinpath(*PurePosixPath(name).parts).read_bytes()
                    info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
                    info.compress_type = zipfile.ZIP_DEFLATED
                    info.external_attr = (stat.S_IFREG | 0o644) << 16
                    zf.writestr(info, data)
            inspect_content_pack(tmp)
            os.replace(tmp, target)
            self._fsync_directory(target.parent)
        finally:
            tmp.unlink(missing_ok=True)
        return target

    @staticmethod
    def _fsync_directory(path: Path) -> None:
        flags = getattr(os, "O_DIRECTORY", 0)
        try:
            fd = os.open(str(path), os.O_RDONLY | flags)
        except OSError:
            return
        try:
            os.fsync(fd)
        except OSError:
            pass
        finally:
            os.close(fd)
