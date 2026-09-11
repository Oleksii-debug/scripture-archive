from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"


class DossierUiContractTests(unittest.TestCase):
    def test_dossier_ui_is_reachable_and_uses_only_allowlisted_query(self):
        app = (FRONTEND / "app.js").read_text(encoding="utf-8")
        ui = (FRONTEND / "dossier-ui.js").read_text(encoding="utf-8")
        self.assertIn("DossierUI", app)
        self.assertIn("'dossier'", app)
        self.assertIn("bootstrap.capabilities?.dossiers", app)
        self.assertIn("this.invoke('dossier.get',request)", ui)
        for forbidden in ("include_locked", "filesystem", "shell", "eval(", "fetch("):
            self.assertNotIn(forbidden, ui)

    def test_untrusted_runtime_strings_are_text_only(self):
        ui = (FRONTEND / "dossier-ui.js").read_text(encoding="utf-8")
        self.assertIn("node.textContent=text", ui)
        self.assertIn("this.linear.textContent=d.linear.join", ui)
        self.assertNotIn("innerHTML", ui)
        self.assertNotIn("insertAdjacentHTML", ui)
        self.assertNotIn("document.write", ui)

    def test_keyboard_labels_live_status_focus_and_linear_equivalent_are_explicit(self):
        ui = (FRONTEND / "dossier-ui.js").read_text(encoding="utf-8")
        for token in (
            "heading.tabIndex=-1",
            "resultHeading.tabIndex=-1",
            "linear.tabIndex=0",
            "aria-live",
            "idLabel.htmlFor='dossier-subject-id'",
            "nameLabel.htmlFor='dossier-display-name'",
            "kindLabel.htmlFor='dossier-kind'",
            "Повний лінійний еквівалент",
            "Not stated in cited text",
        ):
            self.assertIn(token, ui)

    def test_client_rejects_scope_subject_schema_and_oversize_results(self):
        ui = (FRONTEND / "dossier-ui.js").read_text(encoding="utf-8")
        self.assertIn("d.schema!=='scripture.dossier-view.v1'", ui)
        self.assertIn("d.evidence_scope!=='unlocked_only'", ui)
        self.assertIn("d.subject.subject_id!==request.subject_id", ui)
        self.assertIn("d.rows.length>1000", ui)
        self.assertIn("d.linear.length>2000", ui)


if __name__ == "__main__":
    unittest.main()
