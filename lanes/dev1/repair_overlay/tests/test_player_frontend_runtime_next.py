from pathlib import Path
import unittest


APP = Path(__file__).resolve().parents[1] / "frontend" / "app.js"


class PackagedPlayerRuntimeNextContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = APP.read_text(encoding="utf-8")

    def test_next_uses_runtime_owned_transition(self):
        self.assertIn("api('player.next',{node_id:currentTask.node_id})", self.source)
        self.assertNotIn("loadNode(nextNodeId)", self.source)

    def test_frontend_does_not_expose_caller_selected_branch_navigation(self):
        self.assertNotIn("player.navigate_branch", self.source)
        self.assertNotIn("target_node_id", self.source)

    def test_runtime_next_response_is_rendered_without_reload_command(self):
        self.assertIn("function presentNode(data)", self.source)
        self.assertIn("presentNode(data)", self.source)
        self.assertIn("data.complete_or_queued||!data.task", self.source)


if __name__ == "__main__":
    unittest.main()
