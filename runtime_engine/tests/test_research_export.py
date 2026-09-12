import json
import unittest

from scripture_archive_runtime.evidence import Claim, EvidenceRecord, EvidenceRuntime, PassageRef, Relation
from scripture_archive_runtime.models import Confidence
from scripture_archive_runtime.research_export import ChronologyRow, WorkspaceNote, build_research_export


class ResearchExportTests(unittest.TestCase):
    def runtime(self) -> EvidenceRuntime:
        runtime = EvidenceRuntime()
        runtime.add_evidence(EvidenceRecord("EV-B", (PassageRef("LK22:8", "Luke", 22, 8, witness="Luke"),), "Luke names Peter and John", Confidence.T1, witness="Luke", entity_ids=("PERSON-PETER", "PERSON-JOHN"), relation_ids=("REL-AB",)))
        runtime.add_evidence(EvidenceRecord("EV-A", (PassageRef("MK14:13", "Mark", 14, 13, witness="Mark"),), "Mark says two disciples", Confidence.T1, witness="Mark", entity_ids=("DISCIPLES",), relation_ids=("REL-AB",)))
        runtime.add_claim(Claim("CL-1", "Mark alone does not name Peter and John", Confidence.T2, tx1=True, source_scope="Mark 14:13; Luke 22:8", uncertainty="The names are supplied by Luke, not Mark.", required_evidence_ids=("EV-A", "EV-B"), witness="Mark/Luke comparison"))
        runtime.add_relation(Relation("REL-AB", "EV-A", "parallel_witness", "EV-B", passage_ids=("LK22:8", "MK14:13")))
        runtime.unlock("EV-A")
        return runtime

    def test_default_export_is_fail_closed_to_unlocked_evidence(self):
        export = build_research_export(self.runtime(), workspace_id="case-1", title="Case 1")
        self.assertEqual(export.payload["evidence_scope"], "unlocked_only")
        self.assertEqual([row["evidence_id"] for row in export.payload["evidence"]], ["EV-A"])
        self.assertEqual(export.payload["claims"], [])
        self.assertEqual(export.payload["relations"], [])

    def test_workspace_rows_cannot_reference_locked_or_unknown_evidence(self):
        runtime = self.runtime()
        with self.assertRaises(PermissionError):
            build_research_export(runtime, workspace_id="case-1", title="Case 1", notes=(WorkspaceNote("N1", "note", evidence_ids=("EV-B",)),))
        with self.assertRaises(KeyError):
            build_research_export(runtime, workspace_id="case-1", title="Case 1", chronology=(ChronologyRow("T1", "event", "order 1", evidence_ids=("EV-MISSING",)),))

    def test_explicit_full_scope_preserves_source_metadata_without_rewriting_truth(self):
        runtime = self.runtime()
        export = build_research_export(
            runtime,
            workspace_id="case-1",
            title="Case 1",
            include_locked_evidence=True,
            notes=(WorkspaceNote("N1", "User observation", passage_ids=("MK14:13",), evidence_ids=("EV-A",)),),
            chronology=(ChronologyRow("T1", "Sequence marker", "before meal", "during meal", uncertainty="Relative order only; no date inferred.", evidence_ids=("EV-A", "EV-B")),),
            provenance={"source_package": "fixture", "auditor_status": "not claimed"},
        )
        data = json.loads(export.to_json())
        self.assertEqual(data["schema"], "research-export.v1")
        self.assertEqual(data["evidence_scope"], "all_runtime_evidence")
        self.assertEqual([row["evidence_id"] for row in data["evidence"]], ["EV-A", "EV-B"])
        self.assertEqual(data["claims"][0]["confidence"], "T2")
        self.assertTrue(data["claims"][0]["tx1"])
        self.assertEqual(data["claims"][0]["witness"], "Mark/Luke comparison")
        self.assertEqual(data["claims"][0]["source_scope"], "Mark 14:13; Luke 22:8")
        self.assertEqual(data["claims"][0]["uncertainty"], "The names are supplied by Luke, not Mark.")
        self.assertEqual(data["evidence"][0]["passage_refs"][0]["witness"], "Mark")
        self.assertEqual(data["relations"][0]["passage_ids"], ["LK22:8", "MK14:13"])
        self.assertEqual(data["workspace_notes"][0]["kind"], "user_note")
        self.assertEqual(data["chronology"][0]["kind"], "workspace_chronology")

    def test_html_is_semantic_and_escapes_untrusted_workspace_text(self):
        runtime = self.runtime()
        export = build_research_export(
            runtime,
            workspace_id="case-<1>",
            title="Case <unsafe>",
            include_locked_evidence=True,
            notes=(WorkspaceNote("N1", "<script>alert('x')</script> & note", evidence_ids=("EV-A",)),),
            chronology=(ChronologyRow("T1", "<event>", "first", uncertainty="not <certain>", evidence_ids=("EV-A",)),),
        )
        html = export.to_html()
        self.assertIn('<main id="main">', html)
        self.assertIn('<caption>Canonical claim records included in this research export</caption>', html)
        self.assertIn('scope="col"', html)
        self.assertIn('aria-labelledby="chronology-heading"', html)
        self.assertIn("User-authored notes", html)
        self.assertIn("The exporter does not infer dates or consensus", html)
        self.assertNotIn("<script>", html)
        self.assertIn("&lt;script&gt;alert(&#x27;x&#x27;)&lt;/script&gt; &amp; note", html)
        self.assertIn("Mark/Luke comparison", html)

    def test_markdown_is_linear_text_and_escapes_embedded_html(self):
        runtime = self.runtime()
        export = build_research_export(
            runtime,
            workspace_id="case-1",
            title="Research <case>",
            include_locked_evidence=True,
            notes=(WorkspaceNote("N1", "<script>bad</script>", evidence_ids=("EV-A",)),),
        )
        markdown = export.to_markdown()
        self.assertIn("## Claims", markdown)
        self.assertIn("## Evidence", markdown)
        self.assertIn("## User-authored notes", markdown)
        self.assertIn("## Workspace chronology", markdown)
        self.assertIn("Witness: Mark/Luke comparison", markdown)
        self.assertNotIn("<script>", markdown)
        self.assertIn("&lt;script&gt;bad&lt;/script&gt;", markdown)

    def test_output_order_is_deterministic_and_runtime_is_not_mutated(self):
        runtime = self.runtime()
        runtime.unlock("EV-B")
        before = set(runtime.unlocked)
        first = build_research_export(runtime, workspace_id="case-1", title="Case 1", provenance={"z": "last", "a": "first"}, notes=(WorkspaceNote("N-Z", "z"), WorkspaceNote("N-A", "a")), chronology=(ChronologyRow("T-Z", "z", "2"), ChronologyRow("T-A", "a", "1"))).to_json()
        second = build_research_export(runtime, workspace_id="case-1", title="Case 1", provenance={"a": "first", "z": "last"}, notes=(WorkspaceNote("N-A", "a"), WorkspaceNote("N-Z", "z")), chronology=(ChronologyRow("T-A", "a", "1"), ChronologyRow("T-Z", "z", "2"))).to_json()
        self.assertEqual(first, second)
        self.assertEqual(runtime.unlocked, before)
        parsed = json.loads(first)
        self.assertEqual([x["note_id"] for x in parsed["workspace_notes"]], ["N-A", "N-Z"])
        self.assertEqual([x["entry_id"] for x in parsed["chronology"]], ["T-A", "T-Z"])
        self.assertEqual(list(parsed["provenance"]), ["a", "z"])

    def test_identifiers_and_titles_fail_closed_when_empty(self):
        runtime = self.runtime()
        with self.assertRaises(ValueError):
            build_research_export(runtime, workspace_id=" ", title="Case")
        with self.assertRaises(ValueError):
            build_research_export(runtime, workspace_id="case", title=" ")
        with self.assertRaises(ValueError):
            WorkspaceNote(" ", "text")
        with self.assertRaises(ValueError):
            ChronologyRow("T1", " ", "first")


if __name__ == "__main__":
    unittest.main()
