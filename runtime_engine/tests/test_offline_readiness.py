import hashlib
import json
import os
from pathlib import Path
import tempfile
import unittest

from scripture_archive_runtime.offline_readiness import (
    NETWORK_POLICY_FORBIDDEN,
    OFFLINE_MANIFEST_SCHEMA,
    OfflineDependency,
    OfflineReadinessError,
    OfflineReadinessManifest,
    verify_offline_bundle,
)


APP_BYTES = b"offline-app-bytes\x00"
CONTENT_BYTES = b'{"content":"local"}\n'


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def dependency(path: str, role: str, payload: bytes) -> dict:
    return {"path": path, "role": role, "size": len(payload), "sha256": digest(payload)}


def manifest_dict(**overrides) -> dict:
    value = {
        "schema": OFFLINE_MANIFEST_SCHEMA,
        "product_id": "scripture-archive",
        "target_platform": "windows-x64",
        "network_policy": NETWORK_POLICY_FORBIDDEN,
        "dependencies": [
            dependency("app/ScriptureArchive.exe", "application", APP_BYTES),
            dependency("data/canonical.json", "content", CONTENT_BYTES),
        ],
    }
    value.update(overrides)
    return value


class OfflineReadinessTests(unittest.TestCase):
    def _bundle(self, root: Path) -> None:
        (root / "app").mkdir()
        (root / "data").mkdir()
        (root / "app" / "ScriptureArchive.exe").write_bytes(APP_BYTES)
        (root / "data" / "canonical.json").write_bytes(CONTENT_BYTES)

    def test_exact_local_dependency_set_is_ready_and_linearized(self):
        manifest = OfflineReadinessManifest.from_mapping(manifest_dict())
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self._bundle(root)
            report = verify_offline_bundle(manifest, root)
        machine = report.to_dict()
        self.assertTrue(machine["ready"])
        self.assertEqual(machine["network_policy"], "forbidden")
        self.assertEqual(machine["dependency_count"], 2)
        self.assertEqual(machine["total_bytes"], len(APP_BYTES) + len(CONTENT_BYTES))
        self.assertEqual(
            [item["path"] for item in machine["dependencies"]],
            ["app/ScriptureArchive.exe", "data/canonical.json"],
        )
        linear = report.linearize()
        self.assertIn("Offline readiness: READY.", linear)
        self.assertIn("Runtime network policy: forbidden.", linear)
        self.assertIn("app/ScriptureArchive.exe", linear)
        self.assertIn(digest(CONTENT_BYTES), linear)

    def test_missing_tampered_and_truncated_dependencies_fail_closed(self):
        manifest = OfflineReadinessManifest.from_mapping(manifest_dict())
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self._bundle(root)
            (root / "data" / "canonical.json").unlink()
            with self.assertRaisesRegex(OfflineReadinessError, "missing") as caught:
                verify_offline_bundle(manifest, root)
            self.assertEqual(caught.exception.code, "dependency_missing")
            self.assertEqual(caught.exception.path, "data/canonical.json")

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self._bundle(root)
            (root / "data" / "canonical.json").write_bytes(b"X" * len(CONTENT_BYTES))
            with self.assertRaisesRegex(OfflineReadinessError, "sha256"):
                verify_offline_bundle(manifest, root)

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self._bundle(root)
            (root / "data" / "canonical.json").write_bytes(CONTENT_BYTES[:-1])
            with self.assertRaisesRegex(OfflineReadinessError, "size"):
                verify_offline_bundle(manifest, root)

    def test_network_policy_is_strictly_forbidden_and_no_remote_shape_is_allowed(self):
        for policy in ("allowed", "optional", True, None):
            with self.subTest(policy=policy):
                raw = manifest_dict(network_policy=policy)
                with self.assertRaisesRegex(OfflineReadinessError, "network_policy"):
                    OfflineReadinessManifest.from_mapping(raw)
        remote = manifest_dict()
        remote["remote_base_url"] = "https://example.invalid/"
        with self.assertRaisesRegex(OfflineReadinessError, "keys mismatch"):
            OfflineReadinessManifest.from_mapping(remote)

    def test_path_safety_rejects_traversal_windows_ambiguity_and_case_collisions(self):
        unsafe = (
            "../app.exe",
            "/app.exe",
            "app\\app.exe",
            "C:app.exe",
            "app/../app.exe",
            "CON",
            "data/nul.json",
            "data/trailing.",
            "data/trailing ",
            "data//double.json",
            " data/file.json",
            "data/file.json ",
            "data/\x1bescape.json",
        )
        for path in unsafe:
            with self.subTest(path=path):
                raw = manifest_dict(dependencies=[dependency(path, "content", CONTENT_BYTES)])
                with self.assertRaises(OfflineReadinessError):
                    OfflineReadinessManifest.from_mapping(raw)

        collision = manifest_dict(
            dependencies=[
                dependency("Data/file.json", "content", CONTENT_BYTES),
                dependency("data/FILE.json", "content", CONTENT_BYTES),
            ]
        )
        with self.assertRaisesRegex(OfflineReadinessError, "case-insensitively"):
            OfflineReadinessManifest.from_mapping(collision)

    def test_manifest_shape_types_roles_sizes_and_json_duplicate_keys_fail_closed(self):
        bad_dependencies = (
            {"path": "data/a", "role": "network", "size": 1, "sha256": "0" * 64},
            {"path": "data/a", "role": "content", "size": True, "sha256": "0" * 64},
            {"path": "data/a", "role": "content", "size": -1, "sha256": "0" * 64},
            {"path": "data/a", "role": "content", "size": 1, "sha256": "A" * 64},
        )
        for item in bad_dependencies:
            with self.subTest(item=item):
                with self.assertRaises(OfflineReadinessError):
                    OfflineReadinessManifest.from_mapping(manifest_dict(dependencies=[item]))

        with self.assertRaisesRegex(OfflineReadinessError, "dependency count"):
            OfflineReadinessManifest.from_mapping(manifest_dict(dependencies=[]))

        payload = json.dumps(manifest_dict())
        parsed = OfflineReadinessManifest.from_json(payload)
        self.assertEqual(parsed.product_id, "scripture-archive")
        duplicate = payload.replace(
            '"schema": "scripture.offline-readiness.v1"',
            '"schema": "scripture.offline-readiness.v1", "schema": "scripture.offline-readiness.v1"',
            1,
        )
        with self.assertRaisesRegex(OfflineReadinessError, "duplicate key"):
            OfflineReadinessManifest.from_json(duplicate)

    def test_direct_dataclass_construction_cannot_bypass_verifier_validation(self):
        valid = OfflineDependency(
            path="app/ScriptureArchive.exe",
            role="application",
            size=len(APP_BYTES),
            sha256=digest(APP_BYTES),
        )
        unsafe_dependencies = (
            OfflineDependency("../escape.exe", "application", len(APP_BYTES), digest(APP_BYTES)),
            OfflineDependency("app/ScriptureArchive.exe", "network", len(APP_BYTES), digest(APP_BYTES)),
            OfflineDependency("app/ScriptureArchive.exe", "application", True, digest(APP_BYTES)),
            OfflineDependency("app/ScriptureArchive.exe", "application", len(APP_BYTES), "0" * 63),
        )
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "app").mkdir()
            (root / "app" / "ScriptureArchive.exe").write_bytes(APP_BYTES)
            for dep in unsafe_dependencies:
                with self.subTest(dep=dep):
                    manifest = OfflineReadinessManifest(
                        product_id="scripture-archive",
                        target_platform="windows-x64",
                        dependencies=(dep,),
                    )
                    with self.assertRaises(OfflineReadinessError):
                        verify_offline_bundle(manifest, root)

            unsafe_policy = OfflineReadinessManifest(
                product_id="scripture-archive",
                target_platform="windows-x64",
                dependencies=(valid,),
                network_policy="allowed",
            )
            with self.assertRaisesRegex(OfflineReadinessError, "network_policy"):
                verify_offline_bundle(unsafe_policy, root)

    def test_product_platform_and_root_identity_are_bound(self):
        manifest = OfflineReadinessManifest.from_mapping(manifest_dict())
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self._bundle(root)
            with self.assertRaisesRegex(OfflineReadinessError, "different product"):
                verify_offline_bundle(manifest, root, expected_product_id="other")
            with self.assertRaisesRegex(OfflineReadinessError, "different platform"):
                verify_offline_bundle(manifest, root, expected_platform="linux-x64")
            file_root = root / "not-a-root"
            file_root.write_bytes(b"x")
            with self.assertRaisesRegex(OfflineReadinessError, "non-symlink directory"):
                verify_offline_bundle(manifest, file_root)

    def test_symlink_dependency_fails_closed_when_host_can_create_symlinks(self):
        manifest = OfflineReadinessManifest.from_mapping(manifest_dict())
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self._bundle(root)
            target = root / "data" / "canonical-target.json"
            target.write_bytes(CONTENT_BYTES)
            link = root / "data" / "canonical.json"
            link.unlink()
            try:
                os.symlink(target, link)
            except (OSError, NotImplementedError):
                self.skipTest("host does not permit symlink creation")
            with self.assertRaisesRegex(OfflineReadinessError, "symlink"):
                verify_offline_bundle(manifest, root)

    def test_failure_has_machine_and_linear_accessible_evidence(self):
        error = OfflineReadinessError(
            "dependency_missing",
            "declared offline dependency is missing or unreadable",
            path="data/canonical.json",
        )
        self.assertEqual(error.to_dict()["ready"], False)
        self.assertEqual(error.to_dict()["path"], "data/canonical.json")
        linear = error.linearize()
        self.assertIn("NOT READY", linear)
        self.assertIn("data/canonical.json", linear)


if __name__ == "__main__":
    unittest.main()
