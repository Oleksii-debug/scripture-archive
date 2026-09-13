from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from scripture_archive_platform.content.effective_pedagogy import (
    EffectivePedagogyError,
    apply_r05_pedagogy_overlays,
)
from scripture_archive_platform.content.loader import CanonicalContentLoader, TaskPresentationMapper


REPO_ROOT = Path(__file__).resolve().parents[4]


class EffectivePedagogyCompositionTests(unittest.TestCase):
    def _write_overlay(self, root: Path, chunks: list[tuple[str, dict]]) -> None:
        overlay_root = root / "docs" / "campaigns" / "LN" / "R05_PEDAGOGY_OVERLAYS"
        overlay_root.mkdir(parents=True, exist_ok=True)
        names = []
        for name, payload in chunks:
            names.append(name)
            (overlay_root / name).write_text(
                json.dumps(payload, ensure_ascii=False), encoding="utf-8"
            )
        (overlay_root / "R05_PEDAGOGY_OVERLAY_INDEX.json").write_text(
            json.dumps(
                {
                    "schema_version": "CONTENT_NODE_PEDAGOGY_OVERLAY_INDEX_v1.0",
                    "precedence": "overlay_over_base_node_record",
                    "chunks": names,
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

    def test_current_package_ln05_uses_source_specific_effective_hints(self) -> None:
        loader = CanonicalContentLoader(REPO_ROOT)
        node = loader.load_node("LN05-N01")
        self.assertTrue(node["hints"]["H1"].startswith("Мета LN05-N01:"))
        self.assertIn("All three direct passages", node["hints"]["H6"])
        self.assertEqual(
            node["accepted_answer"],
            "Matthew 26:36–46; Mark 14:32–42; Luke 22:39–46.",
        )
        self.assertEqual(node["confidence_code"], "T1")

        surface = TaskPresentationMapper().to_renderable(
            node, loader.mission_for_node("LN05-N01")
        )
        self.assertNotIn("hints", surface)
        self.assertNotIn("accepted_answer", surface)

    def test_allowed_overlay_keys_override_without_touching_source_truth(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            nodes = {
                "LN05-N01": {
                    "node_id": "LN05-N01",
                    "mission_id": "LN-05",
                    "accepted_answer": "base answer",
                    "required_evidence": "base evidence",
                    "hints": {"H1": "base"},
                    "mastery_mode": "independent",
                }
            }
            self._write_overlay(
                root,
                [
                    (
                        "part.json",
                        {
                            "precedence": "overlay_over_base_node_record",
                            "mission_id": "LN-05",
                            "patches": {
                                "LN05-N01": {
                                    "hints": {"H1": "effective"},
                                    "mastery_mode": "independent; H7 reveal guided",
                                }
                            },
                        },
                    )
                ],
            )
            effective = apply_r05_pedagogy_overlays(root, nodes)
            self.assertEqual(effective["LN05-N01"]["hints"]["H1"], "effective")
            self.assertEqual(effective["LN05-N01"]["accepted_answer"], "base answer")
            self.assertEqual(effective["LN05-N01"]["required_evidence"], "base evidence")
            self.assertEqual(nodes["LN05-N01"]["hints"]["H1"], "base")

    def test_forbidden_key_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            nodes = {"LN05-N01": {"node_id": "LN05-N01", "mission_id": "LN-05"}}
            self._write_overlay(
                root,
                [
                    (
                        "part.json",
                        {
                            "precedence": "overlay_over_base_node_record",
                            "mission_id": "LN-05",
                            "patches": {"LN05-N01": {"accepted_answer": "rewrite truth"}},
                        },
                    )
                ],
            )
            with self.assertRaisesRegex(EffectivePedagogyError, "forbidden keys"):
                apply_r05_pedagogy_overlays(root, nodes)

    def test_unknown_and_duplicate_node_patches_fail_closed(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            nodes = {"LN05-N01": {"node_id": "LN05-N01", "mission_id": "LN-05"}}
            self._write_overlay(
                root,
                [
                    (
                        "unknown.json",
                        {
                            "precedence": "overlay_over_base_node_record",
                            "mission_id": "LN-05",
                            "patches": {"LN05-N99": {"hints": {"H1": "bad"}}},
                        },
                    )
                ],
            )
            with self.assertRaisesRegex(EffectivePedagogyError, "unknown node"):
                apply_r05_pedagogy_overlays(root, nodes)

        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            nodes = {"LN05-N01": {"node_id": "LN05-N01", "mission_id": "LN-05"}}
            chunk = {
                "precedence": "overlay_over_base_node_record",
                "mission_id": "LN-05",
                "patches": {"LN05-N01": {"hints": {"H1": "effective"}}},
            }
            self._write_overlay(root, [("one.json", chunk), ("two.json", chunk)])
            with self.assertRaisesRegex(EffectivePedagogyError, "duplicate pedagogy overlay patch"):
                apply_r05_pedagogy_overlays(root, nodes)

    def test_missing_chunk_and_mission_mismatch_fail_closed(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            overlay_root = root / "docs" / "campaigns" / "LN" / "R05_PEDAGOGY_OVERLAYS"
            overlay_root.mkdir(parents=True)
            (overlay_root / "R05_PEDAGOGY_OVERLAY_INDEX.json").write_text(
                json.dumps(
                    {
                        "precedence": "overlay_over_base_node_record",
                        "chunks": ["missing.json"],
                    }
                ),
                encoding="utf-8",
            )
            with self.assertRaisesRegex(EffectivePedagogyError, "missing pedagogy overlay chunk"):
                apply_r05_pedagogy_overlays(
                    root, {"LN05-N01": {"node_id": "LN05-N01", "mission_id": "LN-05"}}
                )

        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            nodes = {"LN05-N01": {"node_id": "LN05-N01", "mission_id": "LN-05"}}
            self._write_overlay(
                root,
                [
                    (
                        "part.json",
                        {
                            "precedence": "overlay_over_base_node_record",
                            "mission_id": "LN-09",
                            "patches": {"LN05-N01": {"hints": {"H1": "bad mission"}}},
                        },
                    )
                ],
            )
            with self.assertRaisesRegex(EffectivePedagogyError, "mission mismatch"):
                apply_r05_pedagogy_overlays(root, nodes)


if __name__ == "__main__":
    unittest.main()
