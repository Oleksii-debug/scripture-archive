from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1] / "frontend"


class PackagedReviewQueueUiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.transport = (ROOT / "transport.js").read_text(encoding="utf-8")
        cls.js = (ROOT / "review-queue-ui.js").read_text(encoding="utf-8")

    def test_transport_loads_supplemental_review_surface(self):
        self.assertEqual(self.transport.count("import('./review-queue-ui.js')"), 1)
        self.assertIn("export function chooseTransport", self.transport)
        self.assertIn("export async function unwrap", self.transport)

    def test_ui_uses_only_truthful_read_only_contracts(self):
        commands = set(re.findall(r"api\('([^']+)'", self.js))
        self.assertEqual(commands, {"system.bootstrap", "player.get_review_queue"})
        self.assertIn("review_queue !== true", self.js)
        self.assertIn("truth_owner !== 'D5/runtime'", self.js)
        for forbidden in (
            "player.load_node", "player.next", "player.submit_answer", "player.request_hint",
            "settings.set", "authoring.", "enqueue_review", "Date.now() >", "sort(",
        ):
            self.assertNotIn(forbidden, self.js)

    def test_runtime_queue_fields_are_rendered_without_local_policy(self):
        for field in ("queue_id", "concept_id", "node_id", "due_at", "priority", "relation", "reason"):
            self.assertIn(field, self.js)
        self.assertIn("runtime order", self.js)
        self.assertIn("без локальної scheduling policy", self.js)
        self.assertIn("Read-only проєкція persisted canonical review queue", self.js)

    def test_accessible_semantics_focus_and_exclusive_view(self):
        for token in (
            "aria-labelledby", "role: 'note'", "role: 'status'", "'aria-live': 'polite'",
            "scope: 'col'", "caption", "heading.focus()", "MutationObserver", "hideOtherViews",
            "type: 'button'",
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
        self.assertIn("показано перші", self.js)

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


if __name__ == "__main__":
    unittest.main()
