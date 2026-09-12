import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from scripture_archive_runtime.application_update import (
    ApplicationUpdateError,
    ApplicationUpdateManifest,
    SemVer,
    UPDATE_MANIFEST_SCHEMA,
    verify_artifact_bytes,
    verify_local_update,
)


SOURCE_HEAD = "9dc82b50ac82de00e3af9ee7a58204982d39217d"
ARTIFACT = b"scripture-archive-release-bytes\x00\x01"


def manifest_dict(**overrides):
    value = {
        "schema": UPDATE_MANIFEST_SCHEMA,
        "product_id": "scripture-archive",
        "target_platform": "windows-x64",
        "target_version": "1.2.0",
        "source_head": SOURCE_HEAD,
        "artifact_name": "ScriptureArchive-1.2.0-win-x64.zip",
        "artifact_size": len(ARTIFACT),
        "artifact_sha256": hashlib.sha256(ARTIFACT).hexdigest(),
    }
    value.update(overrides)
    return value


class ApplicationUpdateTests(unittest.TestCase):
    def test_valid_manifest_and_exact_bytes_are_verified(self):
        manifest = ApplicationUpdateManifest.from_mapping(manifest_dict())
        result = verify_artifact_bytes(manifest, ARTIFACT, current_version="1.1.9")
        self.assertEqual(result.target_version, "1.2.0")
        self.assertEqual(result.source_head, SOURCE_HEAD)
        self.assertEqual(result.artifact_sha256, hashlib.sha256(ARTIFACT).hexdigest())

    def test_tamper_and_truncation_fail_closed(self):
        manifest = ApplicationUpdateManifest.from_mapping(manifest_dict())
        with self.assertRaisesRegex(ApplicationUpdateError, "SHA-256"):
            verify_artifact_bytes(manifest, ARTIFACT[:-1] + b"x", current_version="1.1.9")
        with self.assertRaisesRegex(ApplicationUpdateError, "size"):
            verify_artifact_bytes(manifest, ARTIFACT[:-1], current_version="1.1.9")

    def test_wrong_product_or_platform_fails_closed(self):
        for field, value, message in (
            ("product_id", "other-product", "different product"),
            ("target_platform", "linux-x64", "different platform"),
        ):
            with self.subTest(field=field):
                manifest = ApplicationUpdateManifest.from_mapping(manifest_dict(**{field: value}))
                with self.assertRaisesRegex(ApplicationUpdateError, message):
                    verify_artifact_bytes(manifest, ARTIFACT, current_version="1.1.9")

    def test_semver_precedence_and_downgrade_policy(self):
        self.assertLess(SemVer.parse("1.0.0-rc.2").compare_precedence(SemVer.parse("1.0.0")), 0)
        self.assertLess(SemVer.parse("1.0.0-rc.2").compare_precedence(SemVer.parse("1.0.0-rc.10")), 0)
        manifest = ApplicationUpdateManifest.from_mapping(manifest_dict(target_version="1.0.0"))
        with self.assertRaisesRegex(ApplicationUpdateError, "downgrade"):
            verify_artifact_bytes(manifest, ARTIFACT, current_version="1.1.0")
        result = verify_artifact_bytes(manifest, ARTIFACT, current_version="1.1.0", allow_downgrade=True)
        self.assertEqual(result.target_version, "1.0.0")
        with self.assertRaisesRegex(ApplicationUpdateError, "not newer"):
            verify_artifact_bytes(manifest, ARTIFACT, current_version="1.0.0+local")

    def test_malformed_semver_and_manifest_shape_are_rejected(self):
        for version in ("01.2.3", "1.2", "1.2.3-01", "v1.2.3", "1.2.3+"):
            with self.subTest(version=version):
                with self.assertRaises(ApplicationUpdateError):
                    ApplicationUpdateManifest.from_mapping(manifest_dict(target_version=version))
        extra = manifest_dict()
        extra["download_url"] = "https://example.invalid/update.zip"
        with self.assertRaisesRegex(ApplicationUpdateError, "keys mismatch"):
            ApplicationUpdateManifest.from_mapping(extra)
        payload = json.dumps(manifest_dict()).encode("utf-8")
        self.assertEqual(ApplicationUpdateManifest.from_json(payload).target_version, "1.2.0")
        duplicate = payload.decode("utf-8").replace(
            '"schema": "scripture.application-update.v1"',
            '"schema": "scripture.application-update.v1", "schema": "scripture.application-update.v1"',
            1,
        )
        with self.assertRaisesRegex(ApplicationUpdateError, "duplicate key"):
            ApplicationUpdateManifest.from_json(duplicate)
        non_string_key = manifest_dict()
        non_string_key[1] = "unexpected"
        with self.assertRaisesRegex(ApplicationUpdateError, "keys must be strings"):
            ApplicationUpdateManifest.from_mapping(non_string_key)

    def test_path_like_or_windows_ambiguous_artifact_names_are_rejected(self):
        invalid = (
            "../update.zip", "dir/update.zip", "dir\\update.zip", "C:update.zip",
            "CON.zip", "nul.txt", "update.zip.", ".hidden.zip", "update zip",
        )
        for artifact_name in invalid:
            with self.subTest(artifact_name=artifact_name):
                with self.assertRaises(ApplicationUpdateError):
                    ApplicationUpdateManifest.from_mapping(manifest_dict(artifact_name=artifact_name))

    def test_local_file_verification_is_name_bound_and_read_only(self):
        manifest = ApplicationUpdateManifest.from_mapping(manifest_dict())
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / manifest.artifact_name
            path.write_bytes(ARTIFACT)
            result = verify_local_update(manifest, path, current_version="1.1.0")
            self.assertEqual(result.artifact_size, len(ARTIFACT))
            renamed = path.with_name("other.zip")
            path.rename(renamed)
            with self.assertRaisesRegex(ApplicationUpdateError, "name"):
                verify_local_update(manifest, renamed, current_version="1.1.0")

    def test_direct_manifest_construction_cannot_bypass_validation(self):
        valid = manifest_dict()
        unsafe_cases = (
            {"source_head": "not-a-git-head"},
            {"artifact_name": "../update.zip"},
            {"artifact_name": "CON.zip"},
            {"artifact_sha256": "0" * 63},
            {"artifact_size": 0},
            {"artifact_size": True},
            {"schema": "scripture.application-update.v0"},
        )
        for overrides in unsafe_cases:
            with self.subTest(overrides=overrides):
                values = dict(valid)
                values.update(overrides)
                unsafe = ApplicationUpdateManifest(
                    product_id=values["product_id"],
                    target_platform=values["target_platform"],
                    target_version=values["target_version"],
                    source_head=values["source_head"],
                    artifact_name=values["artifact_name"],
                    artifact_size=values["artifact_size"],
                    artifact_sha256=values["artifact_sha256"],
                    schema=values["schema"],
                )
                with self.assertRaises(ApplicationUpdateError):
                    verify_artifact_bytes(unsafe, ARTIFACT, current_version="1.1.0")

    def test_downgrade_opt_in_requires_real_boolean(self):
        manifest = ApplicationUpdateManifest.from_mapping(manifest_dict(target_version="1.0.0"))
        for unsafe_opt_in in ("false", "yes", 1, 0, None):
            with self.subTest(unsafe_opt_in=unsafe_opt_in):
                with self.assertRaisesRegex(ApplicationUpdateError, "must be a boolean"):
                    verify_artifact_bytes(
                        manifest,
                        ARTIFACT,
                        current_version="1.1.0",
                        allow_downgrade=unsafe_opt_in,
                    )

    def test_source_head_hash_and_size_bounds_are_strict(self):
        bad_cases = (
            {"source_head": "A" * 40},
            {"source_head": "f" * 39},
            {"artifact_sha256": "A" * 64},
            {"artifact_size": 0},
            {"artifact_size": True},
        )
        for overrides in bad_cases:
            with self.subTest(overrides=overrides):
                with self.assertRaises(ApplicationUpdateError):
                    ApplicationUpdateManifest.from_mapping(manifest_dict(**overrides))


if __name__ == "__main__":
    unittest.main()
