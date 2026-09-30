"""Trusted post-update application relaunch boundary.

The standalone updater owns this boundary after a successful atomic apply.  It launches
only the exact installed target returned by the canonical apply consumer, never a browser-
supplied command line, and never through a shell.
"""

from __future__ import annotations

import os
from pathlib import Path
import stat
import subprocess
from typing import Callable

from .application_update import ApplicationUpdateError


ProcessSpawner = Callable[..., object]


def launch_installed_application(
    install_target: str | os.PathLike[str],
    *,
    spawn: ProcessSpawner = subprocess.Popen,
) -> None:
    """Launch the exact installed executable without shell interpretation.

    This proves the target is still a regular non-symlink file immediately before
    process creation and fixes the child working directory to the real install
    directory.  Successful process creation is the only claim here; later health
    confirmation remains a separate post-restart responsibility.
    """

    if not callable(spawn):
        raise ApplicationUpdateError("application process spawner is required")

    target = Path(install_target)
    try:
        target_meta = target.lstat()
        parent_meta = target.parent.lstat()
    except OSError as exc:
        raise ApplicationUpdateError("installed application could not be inspected for relaunch") from exc

    if stat.S_ISLNK(target_meta.st_mode) or not stat.S_ISREG(target_meta.st_mode):
        raise ApplicationUpdateError("installed application relaunch target must be a regular non-symlink file")
    if stat.S_ISLNK(parent_meta.st_mode) or not stat.S_ISDIR(parent_meta.st_mode):
        raise ApplicationUpdateError("installed application directory must be a real directory")

    try:
        spawn((str(target),), cwd=str(target.parent), close_fds=True)
    except (OSError, ValueError) as exc:
        raise ApplicationUpdateError("updated application process could not be started") from exc
