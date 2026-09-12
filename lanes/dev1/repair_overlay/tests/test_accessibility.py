import unittest
from pathlib import Path

from scripture_archive_platform.accessibility.semantics import audit_static_html


class AccessibilityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.front = Path(__file__).parents[1] / 'frontend'
        cls.html = (cls.front / 'index.html').read_text(encoding='utf-8')
        cls.js = '\n'.join(p.read_text(encoding='utf-8') for p in cls.front.glob('*.js'))
        cls.app = (cls.front / 'app.js').read_text(encoding='utf-8')

    def test_required_semantic_document_contract(self):
        self.assertEqual([], audit_static_html(self.html))
        self.assertEqual(1, self.html.count('<main id="main-content"'))
        self.assertEqual(1, self.html.count('<h1'))
        self.assertIn('href="#main-content"', self.html)

    def test_audit_detects_broken_idrefs_labels_and_dialog_names(self):
        broken = self.html.replace('for="draft-search"', 'for="missing-control"', 1)
        broken = broken.replace('aria-labelledby="keymap-heading"', '', 1)
        broken = broken.replace('aria-labelledby="progress-heading progress-text"', 'aria-labelledby="missing-progress-label"', 1)
        errors = audit_static_html(broken)
        self.assertTrue(any('unlabeled input: draft-search' in e for e in errors), errors)
        self.assertTrue(any('unnamed dialog: keymap-dialog' in e for e in errors), errors)
        if 'aria-labelledby="progress-heading progress-text"' in self.html:
            self.assertTrue(any('missing id: missing-progress-label' in e for e in errors), errors)

    def test_audit_accepts_implicit_wrapping_label_without_control_id(self):
        valid = (
            '<a class="skip-link" href="#main-content">Skip</a>'
            '<header>Header</header>'
            '<main id="main-content">'
            '<h1>Title</h1><h2>Section</h2><h3>Subsection</h3>'
            '<form><fieldset><legend>Example</legend>'
            '<label>Wrapped input <input name="wrapped"></label>'
            '<label for="choice">Choice</label>'
            '<select id="choice"><option>One</option></select>'
            '<label for="notes">Notes</label><textarea id="notes"></textarea>'
            '<button type="button">Action</button>'
            '</fieldset></form>'
            '<dialog aria-label="Example dialog"></dialog>'
            '<div role="status" aria-live="polite" aria-atomic="true"></div>'
            '</main>'
        )
        self.assertEqual([], audit_static_html(valid))

    def test_audit_detects_duplicate_id_and_positive_tabindex(self):
        broken = self.html.replace('<h2 id="home-heading">', '<h2 id="app-title" tabindex="2">', 1)
        errors = audit_static_html(broken)
        self.assertTrue(any('duplicate ids: app-title' in e for e in errors), errors)
        self.assertTrue(any('positive/invalid tabindex' in e for e in errors), errors)

    def test_no_canvas_no_drag_only_and_reorder_is_focus_safe(self):
        self.assertNotIn('<canvas', self.html.lower())
        self.assertNotIn('draggable=', self.html.lower())
        renderers = (self.front / 'renderers.js').read_text(encoding='utf-8')
        authoring = (self.front / 'authoring.js').read_text(encoding='utf-8')
        for text in (renderers, authoring):
            self.assertIn('Вгору', text)
            self.assertIn('Вниз', text)
        self.assertIn('moved.focus()', renderers)
        self.assertIn('row.focus()', authoring)
        self.assertIn("role','status'", renderers)

    def test_shortcut_capture_preserves_escape_tab_scope_and_focus_return(self):
        hotkeys = (self.front / 'hotkeys.js').read_text(encoding='utf-8')
        keymap = (self.front / 'keymap-ui.js').read_text(encoding='utf-8')
        self.assertIn("if(e.key==='Escape'){this.clearCapture();return}", hotkeys)
        self.assertIn("if(e.key==='Tab')return", hotkeys)
        self.assertIn('captureScope', hotkeys)
        self.assertIn("setCapture(binding=>{inp.value=binding;byId('shortcut-error').textContent=''},inp)", keymap)
        self.assertIn("closest?.('textarea", hotkeys)
        self.assertIn('focusSoon(this.shortcutReturn)', keymap)
        self.assertIn('focusSoon(this.keymapReturn)', keymap)
        self.assertIn('AccessibilitySettingsUI', keymap)

    def test_player_focus_modal_return_and_dynamic_names_are_explicit(self):
        for marker in ("focusSoon('feedback-heading')", "focusSoon('hint-heading')", "focusSoon('evidence-heading')"):
            self.assertIn(marker, self.app)
        self.assertIn("$('current-state-text').textContent", self.app)
        self.assertIn('jsonReturnFocus', self.app)
        self.assertIn("$('json-dialog').addEventListener('close'", self.app)
        self.assertIn("$('progress-bar').setAttribute('aria-labelledby','progress-heading progress-text')", self.app)
        self.assertIn("$('task-meta').setAttribute('role','list')", self.app)
        self.assertIn("s.setAttribute('role','listitem')", self.app)

    def test_dialogs_are_named_and_global_live_region_is_concise(self):
        self.assertGreaterEqual(self.html.count('<dialog'), 3)
        for name in ('keymap-heading', 'shortcut-heading', 'json-heading'):
            self.assertIn(f'aria-labelledby="{name}"', self.html)
        self.assertIn('role="status"', self.html)
        self.assertIn('aria-live="polite"', self.html)
        self.assertIn('aria-atomic="true"', self.html)

    def test_real_form_controls_and_progress_present(self):
        for tag in ['<input', '<select', '<textarea', '<button', '<fieldset', '<legend', '<label']:
            self.assertIn(tag, self.html)
        self.assertIn('id="progress-bar"', self.html)
        self.assertIn('id="task-meta"', self.html)

    def test_renderer_layer_has_no_canonical_node_ids_and_uses_instance_ids(self):
        text = (self.front / 'renderers.js').read_text(encoding='utf-8')
        self.assertNotRegex(text, r'LN\d{2}-N\d{2}|PA\d{2}-N\d{2}|LN\d{2}N')
        self.assertIn('renderInstance', text)
        self.assertIn('uid(host', text)


if __name__ == '__main__':
    unittest.main()
