from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import importlib.util
import json
import os
import platform
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def pywebview_info() -> dict[str, Any]:
    found = importlib.util.find_spec("webview") is not None
    version = None
    if found:
        try:
            version = importlib.metadata.version("pywebview")
        except importlib.metadata.PackageNotFoundError:
            version = "unknown"
    return {"installed": found, "version": version}


def is_admin() -> bool | None:
    if os.name != "nt":
        return None
    try:
        import ctypes
        return bool(ctypes.windll.shell32.IsUserAnAdmin())
    except Exception:
        return None


def webview2_registry_candidates() -> list[dict[str, str]]:
    if os.name != "nt":
        return []
    try:
        import winreg
    except ImportError:
        return []
    locations = [
        (winreg.HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\EdgeUpdate\Clients"),
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\EdgeUpdate\Clients"),
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients"),
    ]
    matches: list[dict[str, str]] = []
    for hive, key_path in locations:
        try:
            with winreg.OpenKey(hive, key_path) as root:
                for index in range(winreg.QueryInfoKey(root)[0]):
                    subkey_name = winreg.EnumKey(root, index)
                    try:
                        with winreg.OpenKey(root, subkey_name) as child:
                            name = str(winreg.QueryValueEx(child, "name")[0])
                            if "webview2" not in name.casefold():
                                continue
                            try:
                                version = str(winreg.QueryValueEx(child, "pv")[0])
                            except OSError:
                                version = "unknown"
                            matches.append({"source": "registry", "key": f"{key_path}\\{subkey_name}", "name": name, "version": version})
                    except OSError:
                        continue
        except OSError:
            continue
    return matches


def webview2_path_candidates() -> list[dict[str, str]]:
    if os.name != "nt":
        return []
    matches: list[dict[str, str]] = []
    for root in filter(None, [os.environ.get("PROGRAMFILES(X86)"), os.environ.get("PROGRAMFILES"), os.environ.get("LOCALAPPDATA")]):
        base = Path(root) / "Microsoft" / "EdgeWebView" / "Application"
        if not base.is_dir():
            continue
        versions = sorted((item.name for item in base.iterdir() if item.is_dir()), reverse=True)
        matches.append({"source": "filesystem", "path": str(base), "version": versions[0] if versions else "present"})
    return matches


def state_write_probe() -> dict[str, Any]:
    if os.name == "nt" and os.environ.get("LOCALAPPDATA"):
        state_root = Path(os.environ["LOCALAPPDATA"]) / "ScriptureArchive"
    else:
        state_root = Path(tempfile.gettempdir()) / "ScriptureArchive"
    probe_dir = state_root / "diagnostics"
    probe_file = probe_dir / f"write-probe-{os.getpid()}.tmp"
    result: dict[str, Any] = {"path": str(state_root), "writable": False, "error": None}
    try:
        probe_dir.mkdir(parents=True, exist_ok=True)
        probe_file.write_text("scripture-archive-write-probe", encoding="utf-8")
        if probe_file.read_text(encoding="utf-8") != "scripture-archive-write-probe":
            raise OSError("write probe readback mismatch")
        result["writable"] = True
    except OSError as exc:
        result["error"] = f"{type(exc).__name__}: {exc}"
    finally:
        try:
            probe_file.unlink(missing_ok=True)
        except OSError:
            pass
    return result


def diagnose(platform_root: Path, *, write_check: bool = False) -> dict[str, Any]:
    platform_root = platform_root.resolve()
    repo_root = platform_root.parent
    required = {
        "run_windows.py": platform_root / "run_windows.py",
        "requirements-build.txt": platform_root / "requirements-build.txt",
        "frontend": platform_root / "frontend",
        "scripture_archive_platform": platform_root / "scripture_archive_platform",
        "campaign_content": repo_root / "docs" / "campaigns",
    }
    data: dict[str, Any] = {
        "schema_version": 1,
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "platform_root": str(platform_root),
        "repo_root": str(repo_root),
        "os_name": os.name,
        "platform": platform.platform(),
        "machine": platform.machine(),
        "python_version": platform.python_version(),
        "python_executable": sys.executable,
        "path_has_spaces": " " in str(platform_root),
        "path_has_non_ascii": any(ord(ch) > 127 for ch in str(platform_root)),
        "is_admin": is_admin(),
        "pywebview": pywebview_info(),
        "webview2_candidates": webview2_registry_candidates() + webview2_path_candidates(),
        "required_paths": {name: {"path": str(path), "exists": path.exists(), "is_file": path.is_file(), "is_dir": path.is_dir()} for name, path in required.items()},
        "environment": {"github_actions": os.environ.get("GITHUB_ACTIONS") == "true", "github_ref_name": os.environ.get("GITHUB_REF_NAME"), "github_sha": os.environ.get("GITHUB_SHA")},
    }
    if write_check:
        data["state_write_probe"] = state_write_probe()
    return data


def evaluate(data: dict[str, Any], *, require_windows: bool = False, require_pywebview: bool = False, require_webview2: bool = False, require_source: bool = True, require_write: bool = False) -> list[str]:
    problems: list[str] = []
    if require_windows and data["os_name"] != "nt":
        problems.append("Windows runtime required but current OS is not Windows.")
    if require_source:
        missing = [name for name, status in data["required_paths"].items() if not status["exists"]]
        if missing:
            problems.append("Required runtime paths missing: " + ", ".join(sorted(missing)))
    if require_pywebview and not data["pywebview"]["installed"]:
        problems.append("pywebview package is not installed in the diagnostic interpreter.")
    if require_webview2 and not data["webview2_candidates"]:
        problems.append("Edge WebView2 Runtime was not detected by registry/filesystem probes.")
    if require_write:
        probe = data.get("state_write_probe")
        if not probe or not probe.get("writable"):
            problems.append("Local per-user state directory write/readback probe failed.")
    return problems


def verify_artifact(artifact: Path, manifest: Path) -> dict[str, Any]:
    artifact = artifact.resolve()
    manifest = manifest.resolve()
    payload = json.loads(manifest.read_text(encoding="utf-8-sig"))
    expected_name = payload.get("artifact_name")
    expected_size = int(payload["size_bytes"])
    expected_sha = str(payload["sha256"]).casefold()
    actual_size = artifact.stat().st_size
    actual_sha = sha256(artifact)
    problems: list[str] = []
    if expected_name and artifact.name != expected_name:
        problems.append(f"artifact name mismatch: {artifact.name} != {expected_name}")
    if actual_size != expected_size:
        problems.append(f"size mismatch: {actual_size} != {expected_size}")
    if actual_sha.casefold() != expected_sha:
        problems.append(f"sha256 mismatch: {actual_sha} != {expected_sha}")
    return {"artifact": str(artifact), "manifest": str(manifest), "actual_size_bytes": actual_size, "actual_sha256": actual_sha, "ok": not problems, "problems": problems}


def console_safe_text(text: str) -> str:
    """Return text representable by stdout without losing diagnostic information."""
    encoding = getattr(sys.stdout, "encoding", None) or "utf-8"
    try:
        text.encode(encoding)
        return text
    except (LookupError, UnicodeEncodeError):
        return text.encode("ascii", errors="backslashreplace").decode("ascii")


def write_json(path: Path | None, payload: dict[str, Any]) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True)
    print(console_safe_text(text))
    if path is not None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Scripture Archive DEV01 Windows release diagnostics")
    commands = parser.add_subparsers(dest="command", required=True)
    diag = commands.add_parser("diagnose")
    diag.add_argument("--platform-root", type=Path, default=Path(__file__).resolve().parents[1])
    diag.add_argument("--output", type=Path)
    diag.add_argument("--write-check", action="store_true")
    diag.add_argument("--require-windows", action="store_true")
    diag.add_argument("--require-pywebview", action="store_true")
    diag.add_argument("--require-webview2", action="store_true")
    diag.add_argument("--no-require-source", action="store_true")
    diag.add_argument("--require-write", action="store_true")
    verify = commands.add_parser("verify-artifact")
    verify.add_argument("--artifact", type=Path, required=True)
    verify.add_argument("--manifest", type=Path, required=True)
    verify.add_argument("--output", type=Path)
    args = parser.parse_args(argv)
    if args.command == "diagnose":
        payload = diagnose(args.platform_root, write_check=args.write_check)
        problems = evaluate(payload, require_windows=args.require_windows, require_pywebview=args.require_pywebview, require_webview2=args.require_webview2, require_source=not args.no_require_source, require_write=args.require_write)
        payload["ok"] = not problems
        payload["problems"] = problems
        write_json(args.output, payload)
        return 0 if payload["ok"] else 2
    payload = verify_artifact(args.artifact, args.manifest)
    write_json(args.output, payload)
    return 0 if payload["ok"] else 3


if __name__ == "__main__":
    raise SystemExit(main())
