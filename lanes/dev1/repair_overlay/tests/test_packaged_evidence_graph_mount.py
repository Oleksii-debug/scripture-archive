import unittest
from pathlib import Path


FRONTEND = Path(__file__).resolve().parents[1] / "frontend"


class PackagedEvidenceGraphMountTests(unittest.TestCase):
    def test_real_packaged_shell_mounts_evidence_graph_once(self):
        index = (FRONTEND / "index.html").read_text(encoding="utf-8")
        app = (FRONTEND / "app.js").read_text(encoding="utf-8")
        workbench = (FRONTEND / "research-workbench.js").read_text(encoding="utf-8")

        self.assertIn('<script type="module" src="app.js"></script>', index)
        self.assertIn("new ResearchWorkbenchUI", app)
        self.assertIn(
            "import {installEvidenceGraphSurface} from './evidence-graph-ui.js';",
            workbench,
        )
        constructor = workbench[
            workbench.index("  constructor(") : workbench.index("  _bind(){")
        ]
        self.assertEqual(1, constructor.count("installEvidenceGraphSurface();"))

    def test_mount_remains_research_scoped_not_a_second_shell(self):
        workbench = (FRONTEND / "research-workbench.js").read_text(encoding="utf-8")
        graph = (FRONTEND / "evidence-graph-ui.js").read_text(encoding="utf-8")

        self.assertIn("installEvidenceGraphSurface();", workbench)
        self.assertIn("const research = byId('research-view');", graph)
        self.assertIn("research.append(section);", graph)
        self.assertNotIn("document.body.append(section)", graph)


if __name__ == "__main__":
    unittest.main()
