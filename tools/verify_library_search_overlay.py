from __future__ import annotations

import ast
import importlib.util
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OVERLAY = ROOT / "lanes" / "dev1" / "repair_overlay"
LIBRARY = OVERLAY / "scripture_archive_platform" / "content" / "library.py"
SERVICE = OVERLAY / "scripture_archive_platform" / "application" / "service.py"
CONTRACTS = OVERLAY / "scripture_archive_platform" / "transport" / "contracts.py"
TESTS = OVERLAY / "tests" / "test_library_search.py"
EXPECTED_REAL_TESTS = 6


def parse_all() -> None:
    """Fail early on syntax errors in the exact production/test files under qualification."""
    for path in (LIBRARY, SERVICE, CONTRACTS, TESTS):
        ast.parse(path.read_text(encoding="utf-8"), filename=str(path))


def load_real_regression_module():
    """Import the exact overlay regression module against the real overlay package graph."""
    overlay = str(OVERLAY)
    if overlay not in sys.path:
        sys.path.insert(0, overlay)

    module_name = "_library_search_real_qualification_tests"
    spec = importlib.util.spec_from_file_location(module_name, TESTS)
    if spec is None or spec.loader is None:
        raise AssertionError("cannot load real Library/Search regression module")
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


def run_real_response_regressions() -> None:
    """Execute real PlatformApplication/loader/store/transport response-level regressions."""
    module = load_real_regression_module()
    suite = unittest.defaultTestLoader.loadTestsFromModule(module)
    count = suite.countTestCases()
    if count != EXPECTED_REAL_TESTS:
        raise AssertionError(
            f"expected {EXPECTED_REAL_TESTS} real Library/Search regressions, discovered {count}"
        )

    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        raise SystemExit(1)


if __name__ == "__main__":
    parse_all()
    run_real_response_regressions()
    print("LIBRARY_SEARCH_REAL_APPLICATION_QUALIFICATION_PASS")
