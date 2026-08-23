import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS_ENTRY = (ROOT / 'frontend' / 'styles.css').read_text(encoding='utf-8')
FOUNDATION_PATH = ROOT / 'frontend' / 'styles.foundation.css'
CSS_FOUNDATION = FOUNDATION_PATH.read_text(encoding='utf-8') if FOUNDATION_PATH.exists() else ''
CSS = CSS_FOUNDATION + '\n' + CSS_ENTRY
HTML = (ROOT / 'frontend' / 'index.html').read_text(encoding='utf-8')
RENDERERS = (ROOT / 'frontend' / 'renderers.js').read_text(encoding='utf-8')


class VisualDesignStaticTests(unittest.TestCase):
    def test_local_composition_entrypoint_preserves_foundation(self):
        self.assertTrue(FOUNDATION_PATH.exists())
        self.assertIn('@import url("./styles.foundation.css")', CSS_ENTRY)

    def test_no_remote_assets_or_tracking(self):
        self.assertNotRegex(CSS, r'url\s*\(\s*["\']?https?://')
        self.assertNotRegex(HTML, r'<(?:img|script|link)[^>]+https?://')

    def test_required_theme_and_accessibility_media(self):
        for marker in ('prefers-color-scheme: dark', 'prefers-reduced-motion: reduce', 'forced-colors: active', 'prefers-contrast: more'):
            self.assertIn(marker, CSS)

    def test_focus_never_removed(self):
        self.assertIn(':focus-visible', CSS)
        self.assertIn(':focus-within', CSS_ENTRY)
        self.assertNotRegex(CSS, r'outline\s*:\s*(?:0|none)')

    def test_nonvisual_semantics_preserved(self):
        for marker in ('class="skip-link"', 'id="main-content"', 'role="status"', 'aria-live="polite"', 'id="nonvisual-equivalent"', 'role="img"'):
            self.assertIn(marker, HTML)

    def test_visual_states_and_surfaces_exist(self):
        for marker in ('.notice.success', '.notice.warning', '.notice.error', '#evidence-panel', '.source-panel', '.card:hover', 'progress::-webkit-progress-value'):
            self.assertIn(marker, CSS)

    def test_task_specific_visual_hook_is_data_only(self):
        self.assertIn('host.dataset.taskType=task.task_type', RENDERERS)
        for task_type in ('OT_NT_LINK', 'CLAIM_EVIDENCE', 'EVIDENCE_SELECT', 'PARALLEL_WITNESS_COMPARE', 'COMPOSITE_MULTI_STEP', 'ORDERING', 'MATCHING', 'SPEAKER_RECIPIENT'):
            self.assertIn(task_type, CSS)

    def test_semantic_visibility_helpers_remain(self):
        self.assertRegex(CSS, r'\.hidden\s*\{[^}]*display\s*:\s*none\s*!important')
        self.assertIn('.sr-status', CSS)


if __name__ == '__main__':
    unittest.main()
