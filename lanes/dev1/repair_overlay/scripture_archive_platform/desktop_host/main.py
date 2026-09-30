from __future__ import annotations

import logging
import sys
from pathlib import Path

from scripture_archive_platform.application.speech_application import build_default_application
from scripture_archive_platform.desktop_host.bridge import DesktopBridge
from scripture_archive_platform.desktop_host.diagnostics import NativeDiagnosticsLayer
from scripture_archive_platform.desktop_host.pending_update import NativePendingUpdateLayer
from scripture_archive_platform.desktop_host.post_update_health import NativePostUpdateHealthLayer
from scripture_archive_platform.desktop_host.update_application import (
    NativeApplicationUpdateLayer,
    NativeUpdateFileSelector,
)
from scripture_archive_platform.desktop_host.updater_launch import launch_packaged_updater
from scripture_archive_platform.desktop_host.version import CURRENT_APPLICATION_VERSION


def _runtime_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parents[3]


def configure_logging() -> Path:
    from scripture_archive_platform.persistence.store import JsonFileStore

    log_dir = JsonFileStore.default_root() / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    path = log_dir / "scripture-archive.log"
    logging.basicConfig(
        filename=path,
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        encoding="utf-8",
    )
    return path


def main() -> int:
    log_path = configure_logging()
    root = _runtime_root()
    try:
        import webview
    except ImportError:
        print(
            "pywebview is required on Windows. Run r06_platform\\run_windows.cmd",
            file=sys.stderr,
        )
        return 2

    selector = NativeUpdateFileSelector(webview)
    platform_app = build_default_application(root)
    staging_root = Path(platform_app.store.root) / "application-updates"
    app = NativeApplicationUpdateLayer(
        platform_app,
        root,
        selector,
        current_version=CURRENT_APPLICATION_VERSION,
        staging_root=staging_root,
    )
    # This layer owns one process-local RLock for the complete update command family,
    # so verify/stage/status/cancel/execute cannot race shared durable state.
    pending_layer = NativePendingUpdateLayer(
        app,
        root,
        staging_root,
        current_version=CURRENT_APPLICATION_VERSION,
    )
    # Health commit is intentionally outside pending recovery: after a successful
    # updater relaunch the pending journal still carries the previous version and must
    # be disarmed only after the new packaged native/frontend bridge is alive.
    app = NativePostUpdateHealthLayer(
        pending_layer,
        staging_root,
        current_version=CURRENT_APPLICATION_VERSION,
    )
    app = NativeDiagnosticsLayer(
        app,
        root,
        Path(platform_app.store.root) / "runtime-v2",
        current_version=CURRENT_APPLICATION_VERSION,
    )
    bridge = DesktopBridge(app)
    front = root / "r06_platform" / "frontend" / "index.html"
    if not front.exists():
        front = root / "frontend" / "index.html"
    window = webview.create_window(
        "Архів Писання — R06 DEV1",
        url=front.as_uri(),
        js_api=bridge,
        width=1280,
        height=860,
        min_size=(800, 600),
        resizable=True,
        text_select=True,
    )
    selector.bind_window(window)
    pending_layer.bind_apply_execution(
        lambda: launch_packaged_updater(staging_root),
        window.destroy,
    )
    logging.info("Starting EdgeChromium WebView; frontend=%s log=%s", front, log_path)
    webview.start(gui="edgechromium", debug=False, private_mode=True)
    return 0
