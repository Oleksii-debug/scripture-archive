import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRY = (ROOT / 'frontend' / 'styles.css').read_text(encoding='utf-8')
FOUNDATION = (ROOT / 'frontend' / 'styles.foundation.css').read_text(encoding='utf-8')
RENDERERS = (ROOT / 'frontend' / 'renderers-base.js').read_text(encoding='utf-8')


def _luminance(value: str) -> float:
    rgb = [int(value[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def _contrast(a: str, b: str) -> float:
    la, lb = _luminance(a), _luminance(b)
    lighter, darker = max(la, lb), min(la, lb)
    return (lighter + 0.05) / (darker + 0.05)


class Dev03VisualPolishContractTests(unittest.TestCase):
    def test_entrypoint_import_is_local_only(self):
        self.assertIn('@import url("./styles.foundation.css")', ENTRY)
        self.assertNotRegex(ENTRY, r'@import\s+url\(["\']?https?://')

    def test_primary_button_foreground_meets_wcag_against_both_gradient_stops(self):
        accents = re.findall(r'--accent:\s*(#[0-9a-fA-F]{6})', FOUNDATION)
        strong = re.findall(r'--accent-strong:\s*(#[0-9a-fA-F]{6})', FOUNDATION)
        foregrounds = re.findall(r'--on-accent:\s*(#[0-9a-fA-F]{6})', ENTRY)
        self.assertGreaterEqual(len(accents), 2)
        self.assertGreaterEqual(len(strong), 2)
        self.assertGreaterEqual(len(foregrounds), 2)
        light_fg, dark_fg = foregrounds[0], foregrounds[1]
        for stop in (accents[0], strong[0]):
            self.assertGreaterEqual(_contrast(stop, light_fg), 4.5)
        for stop in (accents[1], strong[1]):
            self.assertGreaterEqual(_contrast(stop, dark_fg), 4.5)

    def test_minimum_primary_control_height_is_44_css_pixels(self):
        self.assertIn('--control-min-size: 2.75rem', ENTRY)
        self.assertIn('min-height: var(--control-min-size)', ENTRY)

    def test_focus_parity_is_not_mouse_only(self):
        for marker in ('.card:focus-within', '.surface:focus-within', '.answer-surface fieldset:focus-within'):
            self.assertIn(marker, ENTRY)
        self.assertNotRegex(ENTRY, r'outline\s*:\s*(?:0|none)')

    def test_major_task_families_receive_non_truth_visual_hooks(self):
        for task_type in (
            'SHORT_TEXT', 'LONG_TEXT', 'ARGUMENT', 'ORDERING', 'MATCHING',
            'SPEAKER_RECIPIENT', 'EVIDENCE_SELECT', 'CLAIM_EVIDENCE',
            'PARALLEL_WITNESS_COMPARE', 'OT_NT_LINK', 'COMPOSITE_MULTI_STEP',
        ):
            self.assertIn(f'data-task-type="{task_type}"', ENTRY)
        self.assertIn('host.dataset.taskType=task.task_type', RENDERERS)

    def test_visual_layer_contains_no_campaign_or_answer_truth(self):
        self.assertNotRegex(ENTRY, r'\b(?:LN|PA)-\d{2}\b')
        for forbidden in ('accepted_answer', 'accepted_variants', 'required_evidence', 'confidence_code', 'textual_variant_flag'):
            self.assertNotIn(forbidden, ENTRY)

    def test_mobile_motion_contrast_and_forced_color_fallbacks_are_explicit(self):
        for marker in (
            '@media (max-width: 720px)', '@media (max-width: 520px)',
            '@media (prefers-reduced-motion: reduce)', '@media (prefers-contrast: more)',
            '@media (forced-colors: active)', 'HighlightText', 'CanvasText',
        ):
            self.assertIn(marker, ENTRY)


if __name__ == '__main__':
    unittest.main()
