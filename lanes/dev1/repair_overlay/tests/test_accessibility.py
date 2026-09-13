import unittest
from pathlib import Path

from scripture_archive_platform.accessibility.semantics import audit_static_html


class AccessibilityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.front = Path(__file__).parents[1] / 'frontend'
        cls.html = (cls.front / 'index.html').read_text(encoding='utf-8')
        cls.app = (cls.front / 'app.js').read_text(encoding='utf-8')
        cls.hotkeys = (cls.front / 'hotkeys.js').read_text(encoding='utf-8')
        cls.keymap = (cls.front / 'keymap-ui.js').read_text(encoding='utf-8')
        cls.renderer_wrapper = (cls.front / 'renderers.js').read_text(encoding='utf-8')
        cls.renderers = (cls.front / 'renderers-base.js').read_text(encoding='utf-8')

    def test_required_semantic_document_contract(self):
        self.assertEqual([], audit_static_html(self.html))
        self.assertEqual(1, self.html.count('<main id="main-content"'))
        self.assertEqual(1, self.html.count('<h1'))
        self.assertIn('href="#main-content"', self.html)

    def test_audit_detects_broken_idrefs_labels_and_dialog_names(self):
        broken = self.html.replace('for="draft-search"', 'for="missing-control"', 1)
        broken = broken.replace('aria-labelledby="keymap-heading"', '', 1)
        errors = audit_static_html(broken)
        self.assertTrue(any('unlabeled input: draft-search' in e for e in errors), errors)
        self.assertTrue(any('unnamed dialog: keymap-dialog' in e for e in errors), errors)

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
        broken = self.html.replace(
            '<h2 id="home-heading">',
            '<h2 id="app-title" tabindex="2">',
            1,
        )
        errors = audit_static_html(broken)
        self.assertTrue(any('duplicate ids: app-title' in e for e in errors), errors)
        self.assertTrue(any('positive/invalid tabindex' in e for e in errors), errors)

    def test_ordering_is_keyboard_operable_and_restores_focus_after_redraw(self):
        self.assertNotIn('<canvas', self.html.lower())
        self.assertNotIn('draggable=', self.html.lower())
        self.assertIn("'Вгору'", self.renderers)
        self.assertIn("'Вниз'", self.renderers)
        self.assertIn("dataset.move='up'", self.renderers)
        self.assertIn("dataset.move='down'", self.renderers)
        self.assertIn("button:not(:disabled)", self.renderers)
        self.assertIn("(preferred||fallback)?.focus()", self.renderers)

    def test_composite_renderer_dispatches_child_registry_and_scopes_ids(self):
        self.assertIn('RendererRegistry.get(child.task_type).render(child,childHost)', self.renderers)
        self.assertIn('scopeIds(childHost,', self.renderers)
        self.assertIn('answer:getChild()', self.renderers)
        self.assertIn("section.setAttribute('aria-labelledby',h.id)", self.renderers)
        self.assertIn("failure.setAttribute('role','alert')", self.renderers)
        self.assertNotIn("answer:{text:input.value}", self.renderers)

    def test_shortcut_capture_preserves_escape_tab_scope_and_focus_return(self):
        self.assertIn("if(e.key==='Escape'){this.clearCapture();return}", self.hotkeys)
        self.assertIn("if(e.key==='Tab')return", self.hotkeys)
        self.assertIn('captureScope', self.hotkeys)
        self.assertIn(
            "setCapture(binding=>{inp.value=binding;byId('shortcut-error').textContent=''},inp)",
            self.keymap,
        )
        self.assertIn("closest?.('textarea", self.hotkeys)
        self.assertIn('focusSoon(this.shortcutReturn)', self.keymap)
        self.assertIn('focusSoon(this.keymapReturn)', self.keymap)
        self.assertIn('AccessibilitySettingsUI', self.keymap)

    def test_player_focus_modal_return_and_dynamic_names_are_explicit(self):
        for marker in (
            "focusSoon('feedback-heading')",
            "focusSoon('hint-heading')",
            "focusSoon('evidence-heading')",
        ):
            self.assertIn(marker, self.app)
        self.assertIn("jsonReturnFocus=document.activeElement", self.app)
        self.assertIn("dialog.addEventListener('close'", self.app)
        self.assertIn(
            "progress.setAttribute('aria-labelledby','progress-heading progress-text')",
            self.app,
        )
        self.assertIn("task-meta').setAttribute('role','list')", self.app)
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

    def test_renderer_wrapper_delegates_to_current_implementation_without_content_truth(self):
        self.assertIn("renderTask as renderBaseTask", self.renderer_wrapper)
        self.assertIn("const getAnswer=renderBaseTask(task,host)", self.renderer_wrapper)
        self.assertIn("renderAccessibilityInspection(task)", self.renderer_wrapper)
        self.assertNotRegex(self.renderer_wrapper + self.renderers, r'LN\d{2}-N\d{2}|PA\d{2}-N\d{2}|LN\d{2}N')
        self.assertIn('host.replaceChildren()', self.renderers)
        self.assertIn('RendererRegistry.get(task.task_type).render(task,host)', self.renderers)


if __name__ == '__main__':
    unittest.main()
