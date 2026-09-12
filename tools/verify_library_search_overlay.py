from __future__ import annotations

import ast
import base64
import hashlib
import importlib.util
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OVERLAY = ROOT / "lanes" / "dev1" / "repair_overlay"
RUNTIME_ENGINE = ROOT / "runtime_engine"
CANONICAL_DEV1_SOURCE_COMMIT = "90a13aca71d2a5f832846a84acbdf0f7c89f5da9"
CANONICAL_SOURCE_PREFIX = "release_inputs/dev1_finalprep02"
EXPECTED_BASE_SHA256 = "10fbd546ff4d985465b85b99f4f64bff95d9ec8b1f27132c6d21b4930c344c35"
EXPECTED_REAL_TESTS = 6
OVERLAY_FIDELITY_PATHS = (
    Path("scripture_archive_platform/content/library.py"),
    Path("scripture_archive_platform/application/service.py"),
    Path("scripture_archive_platform/transport/contracts.py"),
    Path("tests/test_library_search.py"),
)


def verify_exact_checkout() -> None:
    expected = os.environ.get("LIBRARY_SOURCE_SHA", "").strip()
    if not expected:
        raise AssertionError("LIBRARY_SOURCE_SHA is required")
    actual = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()
    if actual != expected:
        raise AssertionError(f"Expected exact source checkout {expected}, got {actual}")


def _safe_extract(archive: zipfile.ZipFile, destination: Path) -> None:
    root = destination.resolve()
    for member in archive.infolist():
        target = (destination / member.filename).resolve()
        if target != root and root not in target.parents:
            raise AssertionError(f"Unsafe archive path: {member.filename}")
    archive.extractall(destination)


def _read_canonical_archive() -> bytes:
    fetch = subprocess.run(
        [
            "git",
            "fetch",
            "--no-tags",
            "--no-recurse-submodules",
            "--depth=1",
            "origin",
            CANONICAL_DEV1_SOURCE_COMMIT,
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )
    if fetch.returncode != 0:
        detail = (fetch.stderr or fetch.stdout).strip()
        raise AssertionError(
            "Unable to fetch pinned canonical DEV1 source donor "
            f"{CANONICAL_DEV1_SOURCE_COMMIT}: {detail}"
        )
    fetched = subprocess.check_output(
        ["git", "rev-parse", "FETCH_HEAD"], cwd=ROOT, text=True
    ).strip()
    if fetched != CANONICAL_DEV1_SOURCE_COMMIT:
        raise AssertionError(
            f"Expected pinned DEV1 donor {CANONICAL_DEV1_SOURCE_COMMIT}, got {fetched}"
        )

    listing = subprocess.check_output(
        [
            "git",
            "ls-tree",
            "-r",
            "--name-only",
            CANONICAL_DEV1_SOURCE_COMMIT,
            "--",
            CANONICAL_SOURCE_PREFIX,
        ],
        cwd=ROOT,
        text=True,
    )
    parts = sorted(
        path.strip()
        for path in listing.splitlines()
        if Path(path.strip()).name.startswith("part-")
        and path.strip().endswith(".b64")
    )
    if not parts:
        raise AssertionError(
            "Pinned canonical FINALPREP02 DEV1 source parts are missing"
        )

    encoded_chunks: list[str] = []
    for path in parts:
        text = subprocess.check_output(
            ["git", "show", f"{CANONICAL_DEV1_SOURCE_COMMIT}:{path}"],
            cwd=ROOT,
            text=True,
        )
        encoded_chunks.append("".join(text.split()))

    return base64.b64decode("".join(encoded_chunks), validate=True)


def compose_real_platform(temp_root: Path) -> Path:
    archive_bytes = _read_canonical_archive()
    digest = hashlib.sha256(archive_bytes).hexdigest()
    if digest != EXPECTED_BASE_SHA256:
        raise AssertionError(
            f"DEV1 base archive hash mismatch: expected {EXPECTED_BASE_SHA256}, got {digest}"
        )

    archive_path = temp_root / "DEV1_R06_PLATFORM_SOURCE.zip"
    archive_path.write_bytes(archive_bytes)
    with zipfile.ZipFile(archive_path) as archive:
        bad_member = archive.testzip()
        if bad_member is not None:
            raise AssertionError(f"DEV1 base archive CRC failure: {bad_member}")
        _safe_extract(archive, temp_root)

    platform_root = temp_root / "r06_platform"
    if not platform_root.is_dir():
        raise AssertionError("DEV1 base archive did not produce r06_platform")
    shutil.copytree(OVERLAY, platform_root, dirs_exist_ok=True)

    for relative in OVERLAY_FIDELITY_PATHS:
        overlay_bytes = (OVERLAY / relative).read_bytes()
        composed_bytes = (platform_root / relative).read_bytes()
        if composed_bytes != overlay_bytes:
            raise AssertionError(f"Overlay fidelity mismatch: {relative.as_posix()}")
    return platform_root


def parse_real_paths(platform_root: Path) -> None:
    for relative in OVERLAY_FIDELITY_PATHS:
        ast.parse(
            (platform_root / relative).read_text(encoding="utf-8"),
            filename=relative.as_posix(),
        )


def load_real_regression_module(platform_root: Path):
    for name in tuple(sys.modules):
        if name == "scripture_archive_platform" or name.startswith(
            "scripture_archive_platform."
        ):
            del sys.modules[name]

    ordered_paths = (platform_root, RUNTIME_ENGINE, ROOT)
    for entry in reversed(ordered_paths):
        value = str(entry)
        while value in sys.path:
            sys.path.remove(value)
        sys.path.insert(0, value)

    module_path = platform_root / "tests" / "test_library_search.py"
    spec = importlib.util.spec_from_file_location(
        "library_search_real_regression", module_path
    )
    if spec is None or spec.loader is None:
        raise AssertionError("Unable to load real Library/Search regression module")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run_real_response_regressions(platform_root: Path) -> None:
    module = load_real_regression_module(platform_root)
    suite = unittest.defaultTestLoader.loadTestsFromModule(module)
    if suite.countTestCases() != EXPECTED_REAL_TESTS:
        raise AssertionError(
            f"Expected {EXPECTED_REAL_TESTS} Library/Search tests, got {suite.countTestCases()}"
        )
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        raise SystemExit(1)


def main() -> None:
    verify_exact_checkout()
    with tempfile.TemporaryDirectory(prefix="scripture-library-qualification-") as tmp:
        platform_root = compose_real_platform(Path(tmp))
        verify_exact_checkout()
        parse_real_paths(platform_root)
        run_real_response_regressions(platform_root)
    print(
        "Library/Search qualification PASS: exact candidate checkout, pinned canonical "
        "FINALPREP02 DEV1 base hash/CRC, overlay fidelity, and six real response-level "
        "regressions."
    )


if __name__ == "__main__":
    main()
