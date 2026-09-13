from __future__ import annotations

import unittest
from pathlib import Path

from runtime_engine.scripture_archive_runtime.application import RuntimeApplication
from runtime_engine.scripture_archive_runtime.content import ContentRepository
from scripture_archive_platform.content.loader import CanonicalContentLoader


REPO_ROOT = Path(__file__).resolve().parents[4]


class EffectivePedagogyRuntimeBridgeTests(unittest.TestCase):
    def test_runtime_delivers_effective_hint_without_pre_render_answer_leak(self) -> None:
        loader = CanonicalContentLoader(REPO_ROOT)
        node = loader.load_node("LN05-N01")
        content = ContentRepository([node], adapt_legacy=True, lane="DEV-A")
        runtime = RuntimeApplication(content)

        rendered = runtime.load_task("LN05-N01")
        self.assertEqual(rendered["task"]["hints_available"], 7)
        self.assertNotIn("hints", rendered["task"])
        self.assertNotIn("accepted_answer", rendered["task"])

        hint1 = runtime.request_hint("LN05-N01")
        self.assertEqual(hint1["hint"]["level"], 1)
        self.assertTrue(hint1["hint"]["text"].startswith("Мета LN05-N01:"))

        hint2 = runtime.request_hint("LN05-N01")
        self.assertEqual(hint2["hint"]["level"], 2)
        self.assertIn("All three direct passages", hint2["hint"]["text"])
        self.assertNotEqual(hint1["hint"]["text"], hint2["hint"]["text"])


if __name__ == "__main__":
    unittest.main()
