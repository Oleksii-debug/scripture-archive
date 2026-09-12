from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"
WORKFLOW = ROOT.parents[2] / ".github" / "workflows" / "r06-dev02-accessibility-qualification.yml"


class PackagedAccessibilityInspectorSurfaceTests(unittest.TestCase):
    def test_renderer_composes_existing_inspector_without_second_truth_path(self):
        renderer = (FRONTEND / "renderers.js").read_text(encoding="utf-8")
        self.assertIn("renderAccessibilityInspection", renderer)
        self.assertIn("renderBaseTask(task,host)", renderer)
        self.assertIn("renderAccessibilityInspection(task)", renderer)
        self.assertNotIn("fetch(", renderer)
        self.assertNotIn("invoke(", renderer)

    def test_surface_is_keyboard_native_text_only_and_fail_closed_when_report_missing(self):
        ui = (FRONTEND / "accessibility-inspector-ui.js").read_text(encoding="utf-8")
        self.assertIn("document.createElement('details')", ui)
        self.assertIn("document.createElement('summary')", ui)
        self.assertIn("ACCESSIBILITY_INSPECTION_v1", ui)
        self.assertIn("inspection_linear", ui)
        self.assertIn("PASS не припускається", ui)
        self.assertIn("ui.panel.open=report.passed!==true", ui)
        self.assertIn("textContent", ui)
        self.assertNotIn("innerHTML", ui)
        self.assertNotIn("outerHTML", ui)
        self.assertNotIn("eval(", ui)

    def test_findings_preserve_machine_status_code_path_message_and_remediation(self):
        ui = (FRONTEND / "accessibility-inspector-ui.js").read_text(encoding="utf-8")
        for field in ("severity", "code", "path", "message", "remediation"):
            self.assertIn(f"value.{field}", ui)
        self.assertIn("report.passed===true?'PASS':'FAIL'", ui)
        self.assertIn("Знахідок: ${findings.length}", ui)
        self.assertIn("Ремедіація:", ui)

    def test_dev02_gate_tracks_and_executes_packaged_inspector_surface_regression(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("frontend/accessibility-inspector-ui.js", workflow)
        self.assertIn("frontend/renderers.js", workflow)
        self.assertIn("tests/test_packaged_accessibility_inspector_surface.py", workflow)
        self.assertIn("node --check frontend/accessibility-inspector-ui.js", workflow)
        self.assertIn('test_packaged_accessibility_inspector_surface.py', workflow)


if __name__ == "__main__":
    unittest.main()
