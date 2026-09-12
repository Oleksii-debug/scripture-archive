from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"


class ResearchExportCurrentShellTests(unittest.TestCase):
    def test_current_shell_mounts_export_and_invalidates_late_completion(self):
        app = (FRONTEND / "app.js").read_text(encoding="utf-8")
        ui = (FRONTEND / "research-export.js").read_text(encoding="utf-8")
        self.assertIn("ResearchExportUI", app)
        self.assertIn("'export'", app)
        self.assertIn("bootstrap.capabilities?.research_export", app)
        self.assertIn("if(name!=='export')researchExport?.deactivate()", app)
        self.assertIn("deactivate()", ui)
        self.assertIn("this.requestSerial+=1", ui)
        self.assertIn("serial!==this.requestSerial||!this.active", ui)
        self.assertIn("this.output.textContent=this.exportData[key]", ui)
        self.assertNotIn("innerHTML", ui)

    def test_transport_is_allowlisted_but_caller_cannot_select_scope(self):
        contracts = (ROOT / "scripture_archive_platform" / "transport" / "contracts.py").read_text(encoding="utf-8")
        service = (ROOT / "scripture_archive_platform" / "application" / "service.py").read_text(encoding="utf-8")
        gateway = (ROOT / "scripture_archive_platform" / "application" / "runtime_gateway.py").read_text(encoding="utf-8")
        self.assertIn('"research.export"', contracts)
        self.assertIn("research.export accepts an empty payload", contracts)
        self.assertIn("research_export':bool(self.player_gateway)", service)
        self.assertIn("export_research()", service)
        self.assertIn("include_locked_evidence=False", gateway)
        self.assertIn('workspace_id="runtime-unlocked"', gateway)

    def test_ui_accepts_only_canonical_export_schema_and_unlocked_scope(self):
        ui = (FRONTEND / "research-export.js").read_text(encoding="utf-8")
        self.assertIn("value.schema!=='research-export.v1'", ui)
        self.assertIn("value.evidence_scope!=='unlocked_only'", ui)
        self.assertIn("Number.isInteger(value.counts[key])", ui)
        self.assertNotIn("include_locked_evidence", ui)
        self.assertNotIn("evidence_ids", ui)
        self.assertNotIn("workspace_id", ui)


if __name__ == "__main__":
    unittest.main()
