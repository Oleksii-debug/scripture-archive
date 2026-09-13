"""Temporary fail-closed guard for PR #90 self-mutating materialization runs.

This file exists only on the isolated PR branch and is removed by the exact-head
materialization gate before publication.  It prevents an older queued PR event
from checking out a newer mutable branch head and then executing repository
Python with a write token.
"""
from __future__ import annotations

import json
import os
import pathlib
import subprocess

if os.environ.get("GITHUB_ACTIONS") == "true":
    event_path = os.environ.get("GITHUB_EVENT_PATH")
    if not event_path:
        raise SystemExit("DEV09_EXACT_HEAD_GUARD_FAIL missing GITHUB_EVENT_PATH")
    try:
        event = json.loads(pathlib.Path(event_path).read_text(encoding="utf-8"))
        expected = ((event.get("pull_request") or {}).get("head") or {}).get("sha")
        if not expected:
            raise ValueError("pull_request.head.sha missing")
        actual = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], text=True, stderr=subprocess.STDOUT
        ).strip()
    except Exception as exc:
        raise SystemExit(f"DEV09_EXACT_HEAD_GUARD_FAIL event/readback: {exc}") from exc
    if actual != expected:
        raise SystemExit(
            f"DEV09_EXACT_HEAD_GUARD_FAIL expected={expected} actual={actual}"
        )
    print(f"DEV09_EXACT_HEAD_GUARD_PASS {actual}")
