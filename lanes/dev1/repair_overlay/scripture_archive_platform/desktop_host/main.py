from __future__ import annotations

import logging
import sys
from pathlib import Path

from scripture_archive_platform.application.speech_application import build_default_application
from scripture_archive_platform.desktop_host.bridge import DesktopBridge
from scripture_archive_platform.desktop_host.diagnostics import NativeDiagnosticsLayer
from scripture_archive_platform.desktop_host.update_application import (
    NativeApplicationUpdateLayer,
    NativeUpdateFileSelector,
)

# Semantic compatibility version for the current R06-3DEV-A packaged lineage.
# It is deliberately host-owned rather than supplied by an update manifest/web payload.
CURRENT_APPLICATION_VERSION = "0.6.0-r06.3dev.a"


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
    app = NativeApplicationUpdateLayer(
        platform_app,
        root,
        selector,
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
    logging.info("Starting EdgeChromium WebView; frontend=%s log=%s", front, log_path)
    webview.start(gui="edgechromium", debug=False, private_mode=True)
    return 0
