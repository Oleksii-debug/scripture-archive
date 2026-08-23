from __future__ import annotations

import argparse
import json
import os
import platform
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

HTML = """<!doctype html>
<html lang="uk">
<head><meta charset="utf-8"><title>Scripture Archive WebView2 probe</title></head>
<body><main id="probe-main"><h1 id="probe-heading">Архів Писання — WebView2 probe</h1></main></body>
</html>"""


def write_result(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Launch a real pywebview EdgeChromium host and verify a semantic DOM marker.")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--timeout-seconds", type=int, default=20)
    args = parser.parse_args(argv)

    result: dict[str, Any] = {
        "schema_version": 1,
        "started_utc": datetime.now(timezone.utc).isoformat(),
        "platform": platform.platform(),
        "machine": platform.machine(),
        "renderer_requested": "edgechromium",
        "renderer_actual": None,
        "window_callback_started": False,
        "javascript_executed": False,
        "main_found": False,
        "heading_text": None,
        "user_agent": None,
        "ok": False,
        "error": None,
        "scope": "Real pywebview EdgeChromium/WebView2 host + JavaScript/DOM smoke only; not full application or NVDA acceptance.",
    }
    completed = threading.Event()

    def watchdog() -> None:
        if completed.wait(max(1, args.timeout_seconds)):
            return
        result["error"] = f"WebView2 host probe timed out after {args.timeout_seconds} seconds"
        write_result(args.output, result)
        os._exit(124)

    threading.Thread(target=watchdog, name="webview2-probe-watchdog", daemon=True).start()

    try:
        import webview

        def probe(window: Any) -> None:
            result["window_callback_started"] = True
            try:
                dom = window.evaluate_js(
                    """({
                        mainFound: Boolean(document.querySelector('main#probe-main')),
                        headingText: document.querySelector('h1#probe-heading')?.textContent || null,
                        userAgent: navigator.userAgent
                    })"""
                )
                result["javascript_executed"] = True
                result["main_found"] = bool(dom and dom.get("mainFound"))
                result["heading_text"] = dom.get("headingText") if isinstance(dom, dict) else None
                result["user_agent"] = dom.get("userAgent") if isinstance(dom, dict) else None
                result["renderer_actual"] = getattr(webview, "renderer", None)
                result["ok"] = (
                    result["renderer_actual"] == "edgechromium"
                    and result["main_found"]
                    and result["heading_text"] == "Архів Писання — WebView2 probe"
                )
                if not result["ok"]:
                    result["error"] = "EdgeChromium renderer or semantic DOM marker verification failed"
            except Exception as exc:  # probe must serialize failure rather than hide it in GUI callback
                result["error"] = f"{type(exc).__name__}: {exc}"
            finally:
                completed.set()
                try:
                    window.destroy()
                except Exception:
                    pass

        window = webview.create_window(
            "Scripture Archive WebView2 probe",
            html=HTML,
            width=640,
            height=480,
            resizable=False,
        )
        webview.start(probe, window, gui="edgechromium", debug=False, private_mode=True)
    except Exception as exc:
        result["error"] = f"{type(exc).__name__}: {exc}"
        completed.set()

    write_result(args.output, result)
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    return 0 if result["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
