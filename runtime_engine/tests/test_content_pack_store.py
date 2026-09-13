import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

import scripture_archive_runtime.content_packs as content_packs_module
from scripture_archive_runtime import ContentPackStore
from scripture_archive_runtime.security import ValidationError
from test_content_packs import _write_pack


class PublicContentPackStoreTests(unittest.TestCase):
    def test_install_validates_private_snapshot_not_mutable_caller_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "caller-owned.zip"
            _write_pack(source)
            store = ContentPackStore(root / "store")
            real_inspect = content_packs_module.inspect_content_pack
            inspected_paths = []

            def inspect_snapshot(path):
                resolved = Path(path).resolve()
                inspected_paths.append(resolved)
                self.assertEqual(store.staging_root, resolved.parent)
                self.assertNotEqual(source.resolve(), resolved)
                return real_inspect(resolved)

            with patch("scripture_archive_runtime.content_packs.inspect_content_pack", side_effect=inspect_snapshot):
                store.install(source)

            self.assertEqual(1, len(inspected_paths))
            self.assertFalse(inspected_paths[0].exists())
            store.verify_installed("study-core", "1.0.0")

    def test_activation_transactions_are_shared_per_root_across_store_instances(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            store_root = root / "store"
            alpha = root / "alpha.zip"
            beta = root / "beta.zip"
            _write_pack(alpha, pack_id="study-alpha")
            _write_pack(beta, pack_id="study-beta")

            store_a = ContentPackStore(store_root)
            store_b = ContentPackStore(store_root)
            self.assertIs(store_a._state_transaction_lock, store_b._state_transaction_lock)
            store_a.install(alpha)
            store_b.install(beta)

            real_first_load = store_a._load_state
            real_second_load = store_b._load_state
            first_loaded = threading.Event()
            release_first = threading.Event()
            second_started = threading.Event()
            second_loaded = threading.Event()
            errors = []

            def blocking_first_load():
                state = real_first_load()
                first_loaded.set()
                if not release_first.wait(timeout=5):
                    raise AssertionError("first activation was not released")
                return state

            def observed_second_load():
                second_loaded.set()
                return real_second_load()

            def activate(store, pack_id, started=None):
                if started is not None:
                    started.set()
                try:
                    store.activate(pack_id, "1.0.0")
                except BaseException as exc:
                    errors.append(exc)

            with (
                patch.object(store_a, "_load_state", side_effect=blocking_first_load),
                patch.object(store_b, "_load_state", side_effect=observed_second_load),
            ):
                first_thread = threading.Thread(target=activate, args=(store_a, "study-alpha"))
                second_thread = threading.Thread(
                    target=activate,
                    args=(store_b, "study-beta", second_started),
                )
                first_thread.start()
                self.assertTrue(first_loaded.wait(timeout=5))
                second_thread.start()
                self.assertTrue(second_started.wait(timeout=5))

                # The second store shares the same per-root transaction lock and
                # therefore cannot read stale activation state while the first
                # read-modify-write transaction is paused.
                self.assertFalse(second_loaded.wait(timeout=0.5))
                release_first.set()
                first_thread.join(timeout=10)
                second_thread.join(timeout=10)

            self.assertFalse(first_thread.is_alive())
            self.assertFalse(second_thread.is_alive())
            self.assertEqual([], errors)
            self.assertEqual(
                {"study-alpha": "1.0.0", "study-beta": "1.0.0"},
                store_a.active_versions(),
            )

            alpha_next = root / "alpha-next.zip"
            _write_pack(alpha_next, pack_id="study-alpha", version="1.1.0")
            store_a.install(alpha_next)
            store_a.activate("study-alpha", "1.1.0")
            rolled_back = store_b.rollback("study-alpha")
            self.assertEqual("1.0.0", rolled_back.version)
            self.assertEqual(
                {"study-alpha": "1.0.0", "study-beta": "1.0.0"},
                store_b.active_versions(),
            )

    def test_export_cannot_mutate_immutable_store_and_versions_are_semver_sorted(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            versions = (
                "1.0.0-alpha",
                "1.0.0-alpha.1",
                "1.0.0-alpha.2",
                "1.0.0-alpha.10",
                "1.0.0-alpha.beta",
                "1.0.0-beta",
                "1.0.0-beta.2",
                "1.0.0-beta.11",
                "1.0.0-rc.1",
                "1.0.0",
                "1.2.0",
                "1.10.0",
            )
            store = ContentPackStore(root / "store")
            for index, version in enumerate(reversed(versions)):
                archive = root / f"pack-{index}.zip"
                _write_pack(archive, version=version)
                store.install(archive)
            self.assertEqual(versions, store.installed_versions("study-core"))

            with self.assertRaisesRegex(ValidationError, "outside the immutable pack store"):
                store.export_pack("study-core", "1.2.0", store.root / "exports" / "pack.zip")

            exported = store.export_pack("study-core", "1.2.0", root / "outside.zip")
            self.assertTrue(exported.is_file())
            store.verify_installed("study-core", "1.2.0")

    def test_case_distinct_semver_versions_cannot_alias_on_windows(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            upper = root / "upper.zip"
            lower = root / "lower.zip"
            _write_pack(upper, version="1.0.0-Alpha")
            _write_pack(lower, version="1.0.0-alpha")
            store = ContentPackStore(root / "store")
            store.install(upper)
            with self.assertRaisesRegex(ValidationError, "collides case-insensitively"):
                store.install(lower)


if __name__ == "__main__":
    unittest.main()
