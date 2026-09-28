from __future__ import annotations

from collections.abc import Callable, Sequence
import sys
from typing import Any

from scripture_archive_platform.desktop_host.authenticode import (
    verify_same_publisher_authenticode,
)
from scripture_archive_platform.desktop_host.version import CURRENT_APPLICATION_VERSION
from runtime_engine.scripture_archive_runtime.application_update_runner import (
    execute_trusted_updater,
)


UPDATER_OK = 0
UPDATER_FAILED = 2


def run_updater(
    argv: Sequence[str],
    *,
    execute: Callable[..., Any] = execute_trusted_updater,
    verifier: Callable[..., bool] = verify_same_publisher_authenticode,
) -> int:
    """Run one fixed updater command with packaged trust authorities.

    The semantic current version and Authenticode verifier are imported from the
    packaged native host. No browser/web payload can select either authority. Error
    details are intentionally not echoed because argv contains local filesystem paths.
    """

    if not callable(execute) or not callable(verifier):
        return UPDATER_FAILED
    try:
        execute(
            tuple(argv),
            current_version=CURRENT_APPLICATION_VERSION,
            verify_same_publisher=verifier,
        )
    except Exception:
        return UPDATER_FAILED
    return UPDATER_OK


def main() -> int:
    return run_updater(sys.argv[1:])


if __name__ == "__main__":
    raise SystemExit(main())
