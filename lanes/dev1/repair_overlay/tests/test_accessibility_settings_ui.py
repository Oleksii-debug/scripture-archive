from __future__ import annotations
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"


class AccessibilitySettingsCompositionTests(unittest.TestCase):
    def test_keymap_materialization_owns_narrow_startup_hook(self):
        text = (FRONTEND / "keymap-ui.js").read_text(encoding="utf-8")
        self.assertIn("AccessibilitySettingsUI", text)
        self.assertIn("await this.accessibilitySettings.initialize()", text)
        self.assertIn("keymap.list", text)
        self.assertNotIn("settings.set", text)

    def test_settings_surface_is_allowlisted_and_safe_dom_only(self):
        text = (FRONTEND / "settings-ui.js").read_text(encoding="utf-8")
        self.assertIn("this.api('settings.get')", text)
        self.assertIn("this.api('settings.set', {settings: candidate})", text)
        self.assertNotIn("innerHTML", text)
        self.assertNotIn("eval(", text)
        self.assertNotIn("Function(", text)
        self.assertIn("aria-haspopup", text)
        self.assertIn("aria-live", text)
        self.assertIn("dialog.addEventListener('close', () => trigger.focus())", text)

    def test_normalization_and_application_fail_closed(self):
        module = (FRONTEND / "settings-ui.js").resolve()
        script = f"""
          import {{normalizeSettings, applySettings}} from {json.dumps(module.as_uri())};
          const bad = normalizeSettings({{
            theme: 'sepia', font_scale: '1.5', high_contrast_mode: 1,
            reduced_motion: 'true', arbitrary_css: 'body{{display:none}}'
          }});
          if (JSON.stringify(bad) !== JSON.stringify({{
            theme:'system',font_scale:1,high_contrast_mode:false,reduced_motion:false
          }})) throw new Error('malformed settings did not fail closed');
          const root = {{dataset: {{theme:'dark',highContrast:'true',reducedMotion:'true'}}}};
          const good = applySettings({{
            theme:'light',font_scale:1.25,high_contrast_mode:false,reduced_motion:true
          }}, root);
          if (root.dataset.theme !== 'light') throw new Error('theme');
          if (root.dataset.fontScale !== '125') throw new Error('scale');
          if ('highContrast' in root.dataset) throw new Error('contrast clear');
          if (root.dataset.reducedMotion !== 'true') throw new Error('motion');
          const root2 = {{dataset: {{theme:'dark'}}}};
          applySettings({{}}, root2);
          if ('theme' in root2.dataset) throw new Error('system theme must clear override');
          console.log('PASS', JSON.stringify(good));
        """
        result = subprocess.run(
            ["node", "--input-type=module", "--eval", script],
            cwd=ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("PASS", result.stdout)

    def test_reload_rejects_noncanonical_persisted_truth_before_mutation(self):
        module = (FRONTEND / "settings-ui.js").resolve()
        script = f"""
          import {{AccessibilitySettingsUI}} from {json.dumps(module.as_uri())};

          const invalidResponses = [
            {{}},
            {{settings: {{theme:'dark'}}}},
            {{settings: {{
              theme:'dark', font_scale:1.25, high_contrast_mode:false, reduced_motion:'false'
            }}}},
          ];

          for (const response of invalidResponses) {{
            const root = {{dataset: {{theme:'dark',fontScale:'150',highContrast:'true'}}}};
            const ui = new AccessibilitySettingsUI({{
              api: async command => {{
                if (command !== 'settings.get') throw new Error('unexpected command');
                return response;
              }},
              announce: () => {{}},
              documentObject: {{documentElement: root}},
            }});
            const before = JSON.stringify(root.dataset);
            let rejected = false;
            try {{
              await ui.reload();
            }} catch (error) {{
              rejected = true;
            }}
            if (!rejected) throw new Error('noncanonical settings.get response was accepted');
            if (JSON.stringify(root.dataset) !== before) throw new Error('presentation mutated on rejected settings.get');
          }}

          const root = {{dataset: {{theme:'dark',fontScale:'150',highContrast:'true'}}}};
          const canonical = {{
            theme:'light',font_scale:1.25,high_contrast_mode:false,reduced_motion:true
          }};
          const ui = new AccessibilitySettingsUI({{
            api: async command => {{
              if (command !== 'settings.get') throw new Error('unexpected command');
              return {{settings: canonical}};
            }},
            announce: () => {{}},
            documentObject: {{documentElement: root}},
          }});
          const loaded = await ui.reload();
          if (JSON.stringify(loaded) !== JSON.stringify(canonical)) throw new Error('canonical load changed');
          if (root.dataset.theme !== 'light' || root.dataset.fontScale !== '125') throw new Error('canonical presentation not applied');
          if ('highContrast' in root.dataset) throw new Error('canonical contrast clear');
          if (root.dataset.reducedMotion !== 'true') throw new Error('canonical motion not applied');
          console.log('PASS reload truth');
        """
        result = subprocess.run(
            ["node", "--input-type=module", "--eval", script],
            cwd=ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("PASS reload truth", result.stdout)

    def test_styles_use_fixed_attribute_tokens(self):
        text = (FRONTEND / "settings.css").read_text(encoding="utf-8")
        for token in ('data-font-scale="150"', 'data-high-contrast="true"', 'data-reduced-motion="true"'):
            self.assertIn(token, text)
        self.assertNotIn("url(", text)
        self.assertNotIn("expression(", text)


if __name__ == "__main__":
    unittest.main()
