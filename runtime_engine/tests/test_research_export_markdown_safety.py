import unittest

from scripture_archive_runtime.evidence import Claim, EvidenceRecord, EvidenceRuntime, PassageRef
from scripture_archive_runtime.models import Confidence
from scripture_archive_runtime.research_export import WorkspaceNote, build_research_export


class ResearchExportSecurityTests(unittest.TestCase):
    def test_user_text_cannot_create_markdown_structure_or_links(self):
        export = build_research_export(
            EvidenceRuntime(),
            workspace_id="case\r\n# forged-workspace-heading",
            title="# forged-title",
            notes=(
                WorkspaceNote(
                    "N1",
                    "# forged heading\n- forged list\n1. forged ordered item\n"
                    "[x](javascript:alert(1))\n| table | cell |\n---\n===\n~~~js",
                ),
            ),
        )
        markdown = export.to_markdown()

        self.assertIn("# \\# forged-title", markdown)
        self.assertIn("Workspace: `case # forged-workspace-heading`", markdown)
        self.assertIn("\\# forged heading", markdown)
        self.assertIn("\\- forged list", markdown)
        self.assertIn("1\\. forged ordered item", markdown)
        self.assertIn("\\[x\\]\\(javascript:alert\\(1\\)\\)", markdown)
        self.assertIn("\\| table \\| cell \\|", markdown)
        self.assertIn("\\---", markdown)
        self.assertIn("\\===", markdown)
        self.assertIn("\\~~~js", markdown)
        self.assertNotIn("\n# forged heading", markdown)
        self.assertNotIn("\n- forged list", markdown)
        self.assertNotIn("[x](javascript:", markdown)
        self.assertNotIn("\n---", markdown)
        self.assertNotIn("\n~~~js", markdown)

    def test_unlocked_only_export_does_not_leak_claim_requiring_locked_evidence(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-OPEN",
                (PassageRef("MK1:1", "Mark", 1, 1, witness="Mark"),),
                "visible evidence",
                Confidence.T1,
                witness="Mark",
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-LOCKED",
                (PassageRef("LK1:1", "Luke", 1, 1, witness="Luke"),),
                "locked evidence",
                Confidence.T1,
                witness="Luke",
            )
        )
        runtime.add_claim(
            Claim(
                "CL-LOCKED",
                "claim would disclose locked research truth",
                Confidence.T2,
                required_evidence_ids=("EV-OPEN", "EV-LOCKED"),
            )
        )
        runtime.unlock("EV-OPEN")

        restricted = build_research_export(runtime, workspace_id="case", title="Case")
        self.assertEqual(restricted.payload["claims"], [])
        self.assertEqual(
            [row["evidence_id"] for row in restricted.payload["evidence"]],
            ["EV-OPEN"],
        )
        self.assertNotIn("CL-LOCKED", restricted.to_json())
        self.assertNotIn("EV-LOCKED", restricted.to_json())

        full = build_research_export(
            runtime,
            workspace_id="case",
            title="Case",
            include_locked_evidence=True,
        )
        self.assertEqual([row["claim_id"] for row in full.payload["claims"]], ["CL-LOCKED"])
        self.assertEqual(
            [row["evidence_id"] for row in full.payload["evidence"]],
            ["EV-LOCKED", "EV-OPEN"],
        )

    def test_claim_with_unknown_required_evidence_fails_closed(self):
        runtime = EvidenceRuntime()
        runtime.add_claim(
            Claim(
                "CL-BROKEN",
                "malformed claim",
                Confidence.T2,
                required_evidence_ids=("EV-MISSING",),
            )
        )
        with self.assertRaises(ValueError):
            build_research_export(runtime, workspace_id="case", title="Case")


if __name__ == "__main__":
    unittest.main()
