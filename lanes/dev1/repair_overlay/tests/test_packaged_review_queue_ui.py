from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1] / "frontend"


class PackagedReviewQueueUiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.transport = (ROOT / "transport.js").read_text(encoding="utf-8")
        cls.js = (ROOT / "review-queue-ui.js").read_text(encoding="utf-8")
        cls.app = (ROOT / "app.js").read_text(encoding="utf-8")

    def test_transport_loads_supplemental_review_surface(self):
        self.assertEqual(self.transport.count("import('./review-queue-ui.js')"), 1)
        self.assertIn("export async function chooseTransport", self.transport)
        self.assertIn("export async function unwrap", self.transport)

    def test_queue_projection_is_read_only_but_training_start_is_explicit_runtime_capability(self):
        commands = set(re.findall(r"api\('([^']+)'", self.js))
        self.assertEqual(commands, {"system.bootstrap", "player.get_review_queue", "player.start_review"})
        self.assertIn("review_training", self.js)
        self.assertIn("player.start_review", self.js)
        self.assertNotIn("player.load_node", self.js)
        self.assertNotIn("player.next", self.js)
        self.assertNotIn("player.submit_answer", self.js)
        self.assertNotIn("target_node_id", self.js)
        self.assertNotIn("node_id: item", self.js)
        self.assertIn("браузері", self.js)
        self.assertIn("D5/runtime Scheduler", self.js)

    def test_runtime_queue_fields_are_rendered_without_local_policy(self):
        for field in ("queue_id", "concept_id", "node_id", "due_at", "priority", "relation", "reason"):
            self.assertIn(field, self.js)
        self.assertIn("runtime order", self.js)
        self.assertIn("без локального re-ranking", self.js)
        self.assertNotIn(".sort(", self.js)
        self.assertNotIn("Date.now() >", self.js)

    def test_training_handoff_uses_runtime_response_not_queue_row_target(self):
        self.assertIn("scripture-review-training-started", self.js)
        self.assertIn("detail: data", self.js)
        self.assertIn("data?.truth_owner !== 'D5/runtime'", self.js)
        self.assertIn("document.addEventListener('scripture-review-training-started'", self.app)
        self.assertIn("reviewTraining=data.review_session;presentNode(data)", self.app)
        self.assertNotIn("scripture-review-training-started',e=>loadNode", self.app)

    def test_accessible_semantics_focus_and_exclusive_view(self):
        for token in (
            "aria-labelledby", "role: 'note'", "role: 'status'", "'aria-live': 'polite'",
            "'aria-atomic': 'true'", "scope: 'col'", "caption", "heading.focus()", "MutationObserver",
            "hideOtherViews", "type: 'button'", "Почати тренування",
        ):
            self.assertIn(token, self.js)

    def test_dynamic_data_is_text_only_bounded_and_fail_closed(self):
        self.assertNotIn("innerHTML", self.js)
        self.assertNotIn("insertAdjacentHTML", self.js)
        self.assertIn("textContent", self.js)
        self.assertIn("const MAX_VISIBLE_ITEMS = 500", self.js)
        self.assertIn("const MAX_QUEUE_ITEMS = 5000", self.js)
        self.assertIn("rawQueue.map(validateQueueItem)", self.js)
        self.assertIn("Number.isInteger(raw.priority)", self.js)
        self.assertIn("slice(0, MAX_VISIBLE_ITEMS)", self.js)

    def test_persisted_item_schema_is_defensively_validated(self):
        self.assertIn("Object.prototype.hasOwnProperty.call(raw, name)", self.js)
        self.assertIn("Object.prototype.hasOwnProperty.call(raw, 'node_id')", self.js)
        self.assertIn("Object.prototype.hasOwnProperty.call(raw, 'priority')", self.js)
        self.assertIn("CONTROL_OR_LINE_SEPARATOR", self.js)
        self.assertIn("ISO_TIMESTAMP.test(dueAt)", self.js)
        self.assertIn("Number.isNaN(Date.parse(dueAt))", self.js)
        self.assertIn("REVIEW_RELATIONS.has(relation)", self.js)
        for relation in ("EXACT", "VARIANT", "PASSAGE_REVISIT", "CROSS_CONTEXT", "SYNTHESIS", "NONE"):
            self.assertIn(relation, self.js)

    def test_main_player_separates_story_branch_next_from_review_scheduler_next(self):
        self.assertIn("reviewMode?null:(r.next_node_id||null)", self.app)
        self.assertIn("async function nextReview()", self.app)
        self.assertIn("await api('player.start_review')", self.app)
        self.assertIn("await api('player.finish_review')", self.app)
        self.assertIn("Наступне повторення", self.app)
        self.assertIn("Завершити тренування", self.app)
        self.assertIn("isReviewTraining()?reviewAnswerSubmitted:Boolean(nextNodeId)", self.app)


if __name__ == "__main__":
    unittest.main()
