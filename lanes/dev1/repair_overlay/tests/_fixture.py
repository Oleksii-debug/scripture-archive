from __future__ import annotations

import shutil
from pathlib import Path

_SOURCE_ROOT = Path(__file__).resolve().parents[4]
_CANONICAL_LN01 = Path("docs/campaigns/LN/LN-01_CANONICAL_v1.2")


def make_repo(destination: Path) -> Path:
    """Create an isolated minimal canonical repo fixture from checked-in source bytes."""
    destination = Path(destination)
    source = _SOURCE_ROOT / _CANONICAL_LN01
    target = destination / _CANONICAL_LN01
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source, target)
    return destination
