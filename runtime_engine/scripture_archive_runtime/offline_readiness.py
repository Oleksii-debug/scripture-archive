"""Fail-closed local dependency verification for offline Scripture Archive launch.

The verifier is deliberately host-neutral and performs no network, download, install,
update, extraction, execution, or canonical content mutation. A Windows host may use
it as a pre-launch gate to prove that a caller-declared set of launch-critical local
files is present and byte-exact without treating a path or manifest assertion as trust.
"""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
from typing import Any, Mapping, Sequence


OFFLINE_MANIFEST_SCHEMA = "scripture.offline-readiness.v1"
OFFLINE_REPORT_SCHEMA = "scripture.offline-readiness-report.v1"
DEFAULT_PRODUCT_ID = "scripture-archive"
DEFAULT_PLATFORM = "windows-x64"
NETWORK_POLICY_FORBIDDEN = "forbidden"
MAX_MANIFEST_BYTES = 512 * 1024
MAX_DEPENDENCIES = 4096
MAX_DEPENDENCY_BYTES = 2 * 1024 * 1024 * 1024
MAX_TOTAL_BYTES = 8 * 1024 * 1024 * 1024
MAX_RELATIVE_PATH = 240
MAX_SEGMENT = 128
ALLOWED_ROLES = frozenset({"application", "ui_asset", "content", "runtime_data", "configuration"})
_HASH_RE = re.compile(r"^[0-9a-f]{64}$")
_PRODUCT_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")
_PLATFORM_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$")
_WINDOWS_RESERVED = {
    "CON", "PRN", "AUX", "NUL",
    *(f"COM{i}" for i in range(1, 10)),
    *(f"LPT{i}" for i in range(1, 10)),
}
_DEPENDENCY_KEYS = frozenset({"path", "role", "size", "sha256"})
_MANIFEST_KEYS = frozenset(
    {"schema", "product_id", "target_platform", "network_policy", "dependencies"}
)


class OfflineReadinessError(ValueError):
    """Machine-readable fail-closed offline-readiness error."""

    def __init__(self, code: str, message: str, *, path: str | None = None) -> None:
        super().__init__(message)
        self.code = _validate_error_token(code, "code")
        self.message = _validate_message(message)
        self.path = _validate_relative_path(path) if path is not None else None

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema": OFFLINE_REPORT_SCHEMA,
            "ready": False,
            "code": self.code,
            "message": self.message,
            "path": self.path,
        }

    def linearize(self) -> str:
        suffix = f" Path: {self.path}." if self.path else ""
        return f"Offline readiness: NOT READY. {self.message}.{suffix}".replace("..", ".")


@dataclass(frozen=True)
class OfflineDependency:
    path: str
    role: str
    size: int
    sha256: str

    @classmethod
    def from_mapping(cls, raw: Mapping[str, Any]) -> "OfflineDependency":
        if not isinstance(raw, Mapping):
            raise OfflineReadinessError("manifest_dependency_type", "dependency must be an object")
        _require_string_keys(raw, "dependency")
        keys = frozenset(raw.keys())
        if keys != _DEPENDENCY_KEYS:
            raise OfflineReadinessError(
                "manifest_dependency_keys",
                f"dependency keys mismatch: missing={sorted(_DEPENDENCY_KEYS - keys)}, extra={sorted(keys - _DEPENDENCY_KEYS)}",
            )
        path = _validate_relative_path(raw["path"])
        role = raw["role"]
        if not isinstance(role, str) or role not in ALLOWED_ROLES:
            raise OfflineReadinessError("manifest_role", "dependency role is unsupported", path=path)
        size = raw["size"]
        if isinstance(size, bool) or not isinstance(size, int):
            raise OfflineReadinessError("manifest_size_type", "dependency size must be an integer", path=path)
        if size < 0 or size > MAX_DEPENDENCY_BYTES:
            raise OfflineReadinessError("manifest_size_range", "dependency size is outside the allowed range", path=path)
        digest = raw["sha256"]
        if not isinstance(digest, str) or _HASH_RE.fullmatch(digest) is None:
            raise OfflineReadinessError("manifest_sha256", "dependency sha256 must be lowercase 64-hex", path=path)
        return cls(path=path, role=role, size=size, sha256=digest)


@dataclass(frozen=True)
class OfflineReadinessManifest:
    product_id: str
    target_platform: str
    dependencies: tuple[OfflineDependency, ...]
    schema: str = OFFLINE_MANIFEST_SCHEMA
    network_policy: str = NETWORK_POLICY_FORBIDDEN

    @classmethod
    def from_mapping(cls, raw: Mapping[str, Any]) -> "OfflineReadinessManifest":
        if not isinstance(raw, Mapping):
            raise OfflineReadinessError("manifest_type", "offline manifest must be an object")
        _require_string_keys(raw, "manifest")
        keys = frozenset(raw.keys())
        if keys != _MANIFEST_KEYS:
            raise OfflineReadinessError(
                "manifest_keys",
                f"manifest keys mismatch: missing={sorted(_MANIFEST_KEYS - keys)}, extra={sorted(keys - _MANIFEST_KEYS)}",
            )
        if raw["schema"] != OFFLINE_MANIFEST_SCHEMA:
            raise OfflineReadinessError("manifest_schema", "unsupported offline manifest schema")
        product_id = _validate_identity(raw["product_id"], _PRODUCT_RE, "product_id")
        target_platform = _validate_identity(raw["target_platform"], _PLATFORM_RE, "target_platform")
        if raw["network_policy"] != NETWORK_POLICY_FORBIDDEN:
            raise OfflineReadinessError(
                "network_policy",
                "offline readiness requires network_policy='forbidden'",
            )
        dependencies_raw = raw["dependencies"]
        if isinstance(dependencies_raw, (str, bytes, bytearray)) or not isinstance(dependencies_raw, Sequence):
            raise OfflineReadinessError("manifest_dependencies_type", "dependencies must be an array")
        if not dependencies_raw or len(dependencies_raw) > MAX_DEPENDENCIES:
            raise OfflineReadinessError("manifest_dependency_count", "dependency count is outside the allowed range")
        dependencies = tuple(OfflineDependency.from_mapping(item) for item in dependencies_raw)
        paths = [item.path.casefold() for item in dependencies]
        if len(paths) != len(set(paths)):
            raise OfflineReadinessError("manifest_duplicate_path", "dependency paths must be unique case-insensitively")
        total = sum(item.size for item in dependencies)
        if total > MAX_TOTAL_BYTES:
            raise OfflineReadinessError("manifest_total_size", "declared dependency bytes exceed the aggregate limit")
        return cls(product_id=product_id, target_platform=target_platform, dependencies=dependencies)

    @classmethod
    def from_json(cls, payload: str | bytes) -> "OfflineReadinessManifest":
        if isinstance(payload, bytes):
            try:
                payload = payload.decode("utf-8")
            except UnicodeDecodeError as exc:
                raise OfflineReadinessError("manifest_utf8", "offline manifest must be UTF-8") from exc
        if not isinstance(payload, str):
            raise OfflineReadinessError("manifest_text", "offline manifest must be text or UTF-8 bytes")
        try:
            encoded = payload.encode("utf-8")
        except UnicodeEncodeError as exc:
            raise OfflineReadinessError("manifest_utf8", "offline manifest must be valid UTF-8 text") from exc
        if len(encoded) > MAX_MANIFEST_BYTES:
            raise OfflineReadinessError("manifest_too_large", "offline manifest exceeds the size limit")
        try:
            raw = json.loads(payload, object_pairs_hook=_strict_json_object)
        except OfflineReadinessError:
            raise
        except (TypeError, ValueError) as exc:
            raise OfflineReadinessError("manifest_json", "offline manifest is not valid JSON") from exc
        return cls.from_mapping(raw)


@dataclass(frozen=True)
class VerifiedOfflineDependency:
    path: str
    role: str
    size: int
    sha256: str

    def to_dict(self) -> dict[str, Any]:
        return {"path": self.path, "role": self.role, "size": self.size, "sha256": self.sha256}


@dataclass(frozen=True)
class OfflineReadinessReport:
    product_id: str
    target_platform: str
    network_policy: str
    dependencies: tuple[VerifiedOfflineDependency, ...]
    schema: str = OFFLINE_REPORT_SCHEMA
    ready: bool = True

    @property
    def total_bytes(self) -> int:
        return sum(item.size for item in self.dependencies)

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema": self.schema,
            "ready": self.ready,
            "product_id": self.product_id,
            "target_platform": self.target_platform,
            "network_policy": self.network_policy,
            "dependency_count": len(self.dependencies),
            "total_bytes": self.total_bytes,
            "dependencies": [item.to_dict() for item in self.dependencies],
        }

    def linearize(self) -> str:
        lines = [
            "Offline readiness: READY.",
            f"Product: {self.product_id}.",
            f"Platform: {self.target_platform}.",
            "Runtime network policy: forbidden.",
            f"Verified dependencies: {len(self.dependencies)}; total bytes: {self.total_bytes}.",
        ]
        for index, item in enumerate(self.dependencies, 1):
            lines.append(
                f"Dependency {index}: {item.path}; role {item.role}; size {item.size}; sha256 {item.sha256}."
            )
        return "\n".join(lines)


def verify_offline_bundle(
    manifest: OfflineReadinessManifest,
    root: str | os.PathLike[str],
    *,
    expected_product_id: str = DEFAULT_PRODUCT_ID,
    expected_platform: str = DEFAULT_PLATFORM,
) -> OfflineReadinessReport:
    """Verify every declared local launch dependency and return deterministic evidence.

    Every public call revalidates the manifest, so directly constructing the frozen
    dataclasses cannot bypass path/hash/size/network-policy invariants. The root and every
    path component must be non-symlink. Each dependency is checked before and after
    streaming SHA-256 hashing so mutation during verification fails closed.
    """

    manifest = _validated_manifest(manifest)
    expected_product_id = _validate_identity(expected_product_id, _PRODUCT_RE, "expected_product_id")
    expected_platform = _validate_identity(expected_platform, _PLATFORM_RE, "expected_platform")
    if manifest.product_id != expected_product_id:
        raise OfflineReadinessError("product_mismatch", "offline manifest targets a different product")
    if manifest.target_platform != expected_platform:
        raise OfflineReadinessError("platform_mismatch", "offline manifest targets a different platform")

    root_path = Path(root)
    try:
        root_before = root_path.lstat()
    except OSError as exc:
        raise OfflineReadinessError("root_unreadable", "offline dependency root is not readable") from exc
    if stat.S_ISLNK(root_before.st_mode) or not stat.S_ISDIR(root_before.st_mode):
        raise OfflineReadinessError("root_type", "offline dependency root must be a non-symlink directory")

    verified: list[VerifiedOfflineDependency] = []
    for dependency in sorted(manifest.dependencies, key=lambda item: item.path.casefold()):
        _verify_dependency(root_path, dependency)
        verified.append(
            VerifiedOfflineDependency(
                path=dependency.path,
                role=dependency.role,
                size=dependency.size,
                sha256=dependency.sha256,
            )
        )

    try:
        root_after = root_path.lstat()
    except OSError as exc:
        raise OfflineReadinessError("root_changed", "offline dependency root disappeared during verification") from exc
    root_before_identity = (root_before.st_dev, root_before.st_ino)
    root_after_identity = (root_after.st_dev, root_after.st_ino)
    if stat.S_ISLNK(root_after.st_mode) or not stat.S_ISDIR(root_after.st_mode) or root_before_identity != root_after_identity:
        raise OfflineReadinessError("root_changed", "offline dependency root identity changed during verification")

    return OfflineReadinessReport(
        product_id=manifest.product_id,
        target_platform=manifest.target_platform,
        network_policy=manifest.network_policy,
        dependencies=tuple(verified),
    )


def _verify_dependency(root: Path, dependency: OfflineDependency) -> None:
    parts = PurePosixPath(dependency.path).parts
    cursor = root
    before: os.stat_result | None = None
    for index, part in enumerate(parts):
        cursor = cursor / part
        try:
            current = cursor.lstat()
        except OSError as exc:
            raise OfflineReadinessError(
                "dependency_missing",
                "declared offline dependency is missing or unreadable",
                path=dependency.path,
            ) from exc
        if stat.S_ISLNK(current.st_mode):
            raise OfflineReadinessError(
                "dependency_symlink",
                "offline dependency path contains a symlink",
                path=dependency.path,
            )
        if index < len(parts) - 1:
            if not stat.S_ISDIR(current.st_mode):
                raise OfflineReadinessError(
                    "dependency_parent_type",
                    "offline dependency parent component is not a directory",
                    path=dependency.path,
                )
        else:
            before = current
    assert before is not None
    if not stat.S_ISREG(before.st_mode):
        raise OfflineReadinessError("dependency_type", "offline dependency must be a regular file", path=dependency.path)
    if before.st_size != dependency.size:
        raise OfflineReadinessError("dependency_size", "offline dependency size does not match manifest", path=dependency.path)

    digest = hashlib.sha256()
    total = 0
    try:
        with cursor.open("rb") as handle:
            while True:
                chunk = handle.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > dependency.size:
                    raise OfflineReadinessError(
                        "dependency_changed",
                        "offline dependency grew during verification",
                        path=dependency.path,
                    )
                digest.update(chunk)
        after = cursor.lstat()
    except OfflineReadinessError:
        raise
    except OSError as exc:
        raise OfflineReadinessError(
            "dependency_unreadable",
            "offline dependency could not be verified",
            path=dependency.path,
        ) from exc
    if stat.S_ISLNK(after.st_mode) or not stat.S_ISREG(after.st_mode):
        raise OfflineReadinessError("dependency_changed", "offline dependency type changed during verification", path=dependency.path)
    before_identity = (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns)
    after_identity = (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns)
    if before_identity != after_identity or total != dependency.size:
        raise OfflineReadinessError("dependency_changed", "offline dependency changed during verification", path=dependency.path)
    if digest.hexdigest() != dependency.sha256:
        raise OfflineReadinessError("dependency_sha256", "offline dependency sha256 does not match manifest", path=dependency.path)


def _validated_manifest(manifest: OfflineReadinessManifest) -> OfflineReadinessManifest:
    if not isinstance(manifest, OfflineReadinessManifest):
        raise OfflineReadinessError("manifest_instance", "manifest must be OfflineReadinessManifest")
    return OfflineReadinessManifest.from_mapping(
        {
            "schema": manifest.schema,
            "product_id": manifest.product_id,
            "target_platform": manifest.target_platform,
            "network_policy": manifest.network_policy,
            "dependencies": [
                {"path": item.path, "role": item.role, "size": item.size, "sha256": item.sha256}
                for item in manifest.dependencies
            ],
        }
    )


def _validate_relative_path(value: Any) -> str:
    if not isinstance(value, str):
        raise OfflineReadinessError("manifest_path_type", "dependency path must be a string")
    if not value or len(value) > MAX_RELATIVE_PATH or value != value.strip():
        raise OfflineReadinessError("manifest_path", "dependency path is empty, padded, or too long")
    if "\\" in value or ":" in value or value.startswith("/"):
        raise OfflineReadinessError("manifest_path", "dependency path must be a safe relative POSIX-style path")
    if any(ord(char) < 32 or ord(char) == 127 for char in value):
        raise OfflineReadinessError("manifest_path", "dependency path contains control characters")
    path = PurePosixPath(value)
    parts = path.parts
    if not parts or any(part in {"", ".", ".."} for part in parts):
        raise OfflineReadinessError("manifest_path", "dependency path contains unsafe components")
    normalized = "/".join(parts)
    if normalized != value:
        raise OfflineReadinessError("manifest_path", "dependency path is not canonical")
    for part in parts:
        if len(part) > MAX_SEGMENT or part.endswith((".", " ")):
            raise OfflineReadinessError("manifest_path", "dependency path has unsafe Windows component semantics")
        stem = part.split(".", 1)[0].upper()
        if stem in _WINDOWS_RESERVED:
            raise OfflineReadinessError("manifest_path", "dependency path uses a reserved Windows device name")
    return value


def _validate_identity(value: Any, pattern: re.Pattern[str], field: str) -> str:
    if not isinstance(value, str) or pattern.fullmatch(value) is None:
        raise OfflineReadinessError("manifest_identity", f"{field} is invalid")
    return value


def _require_string_keys(raw: Mapping[Any, Any], label: str) -> None:
    if any(not isinstance(key, str) for key in raw):
        raise OfflineReadinessError("manifest_keys", f"{label} keys must be strings")


def _strict_json_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in pairs:
        if key in out:
            raise OfflineReadinessError("manifest_duplicate_key", f"offline manifest contains duplicate key: {key}")
        out[key] = value
    return out


def _validate_error_token(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value or len(value) > 64 or re.fullmatch(r"[a-z][a-z0-9_]*", value) is None:
        raise ValueError(f"{field} must be a bounded lowercase token")
    return value


def _validate_message(value: Any) -> str:
    if not isinstance(value, str) or not value or len(value) > 512:
        raise ValueError("offline readiness message must be bounded text")
    if any((ord(char) < 32 and char not in "\t") or ord(char) == 127 for char in value):
        raise ValueError("offline readiness message contains control characters")
    return value
