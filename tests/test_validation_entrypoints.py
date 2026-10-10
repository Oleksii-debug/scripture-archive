"""Run the repository's standalone validation suites under pytest.

Do not duplicate validator implementations. Original Python scripts remain usable.
"""
from pathlib import Path
import subprocess
import sys

import pytest

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = (
    "test_validate_canonical_missions_and_nodes.py",
    "test_r05_effective_canonical_state.py",
)


@pytest.mark.parametrize("script_name", SCRIPTS)
def test_existing_validation_program(script_name: str) -> None:
    script = ROOT / "tools" / script_name
    assert script.is_file(), f"Required test program missing: {script}"
    completed = subprocess.run(
        [sys.executable, str(script), str(ROOT)],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=180,
        check=False,
    )
    assert completed.returncode == 0, (
        f"{script_name} failed with exit code {completed.returncode}\n"
        f"stdout:\n{completed.stdout[-16000:]}\n"
        f"stderr:\n{completed.stderr[-16000:]}"
    )
