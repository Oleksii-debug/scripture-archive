import unittest

from scripture_archive_runtime.evidence import EvidenceRuntime
from scripture_archive_runtime.research_export import WorkspaceNote, build_research_export


class ResearchExportMarkdownSafetyTests(unittest.TestCase):
    def test_user_text_cannot_create_markdown_structure_or_links(self):
        export = build_research_export(
            EvidenceRuntime(),
            workspace_id="case\r\n# forged-workspace-heading",
            title="# forged-title",
            notes=(
                WorkspaceNote(
                    "N1",
                    "# forged heading\n- forged list\n1. forged ordered item\n[x](javascript:alert(1))\n| table | cell |",
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
        self.assertNotIn("\n# forged heading", markdown)
        self.assertNotIn("\n- forged list", markdown)
        self.assertNotIn("[x](javascript:", markdown)


if __name__ == "__main__":
    unittest.main()
