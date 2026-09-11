from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"


class ResearchExportUiContractTests(unittest.TestCase):
    def test_export_ui_is_reachable_and_uses_allowlisted_read_only_query(self):
        app = (FRONTEND / "app.js").read_text(encoding="utf-8")
        ui = (FRONTEND / "research-export.js").read_text(encoding="utf-8")

        self.assertIn("ResearchExportUI", app)
        self.assertIn("'export'", app)
        self.assertIn("bootstrap.capabilities?.research_export", app)
        self.assertIn("this.invoke('research.export',{})", ui)
        self.assertNotIn("include_locked_evidence", ui)
        self.assertNotIn("evidence_ids", ui)
        self.assertNotIn("workspace_id", ui)

    def test_html_export_is_rendered_as_text_not_executed_dom(self):
        ui = (FRONTEND / "research-export.js").read_text(encoding="utf-8")
        self.assertIn("this.output.textContent=this.exportData[key]", ui)
        self.assertNotIn("innerHTML", ui)
        self.assertNotIn("insertAdjacentHTML", ui)
        self.assertNotIn("document.write", ui)

    def test_keyboard_focus_live_status_and_single_flight_are_explicit(self):
        ui = (FRONTEND / "research-export.js").read_text(encoding="utf-8")
        self.assertIn("heading.tabIndex=-1", ui)
        self.assertIn("output.tabIndex=0", ui)
        self.assertIn("aria-live", ui)
        self.assertIn("if(this.inFlight)return this.inFlight", ui)
        self.assertIn("this.refreshButton.disabled=true", ui)
        self.assertIn("this.refreshButton.disabled=false", ui)
        self.assertIn("showView('export','export-heading')", ui)
        self.assertIn("showView('research','research-heading')", ui)

    def test_client_rejects_scope_widening_or_malformed_counts(self):
        ui = (FRONTEND / "research-export.js").read_text(encoding="utf-8")
        self.assertIn("value.evidence_scope!=='unlocked_only'", ui)
        self.assertIn("value.schema!=='research-export.v1'", ui)
        self.assertIn("Number.isInteger(value.counts[key])", ui)


if __name__ == "__main__":
    unittest.main()
