from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1] / 'frontend'
HTML = (ROOT / 'index.html').read_text(encoding='utf-8')
JS = (ROOT / 'mastery.js').read_text(encoding='utf-8')

class PackagedMasteryCompositionTests(unittest.TestCase):
    def test_uses_existing_runtime_truth_only(self):
        self.assertIn("api('player.get_mastery')", JS)
        self.assertNotIn('review_queue', JS)
        self.assertNotIn('player.get_review', JS)
        self.assertNotIn('innerHTML', JS)

    def test_semantic_keyboard_first_surface(self):
        self.assertIn('id="nav-mastery"', HTML)
        self.assertIn('id="mastery-heading" tabindex="-1"', HTML)
        self.assertIn('role="region" aria-label="Таблиця майстерності" tabindex="0"', HTML)
        self.assertIn('<th scope="col">', HTML)
        self.assertIn('src="mastery.js"', HTML)

    def test_preserves_raw_runtime_fields_and_safe_rendering(self):
        for field in ('concept_id', 'state', 'stability_days', 'difficulty',
                      'consecutive_independent_successes', 'guided_successes',
                      'failures', 'due_at'):
            self.assertIn(f'item.{field}', JS)
        self.assertIn("td.textContent = value ?? '—'", JS)

    def test_mastery_cannot_remain_visible_beside_existing_app_view(self):
        self.assertIn('MutationObserver', JS)
        self.assertIn("BASE_VIEWS.some", JS)
        self.assertIn("hideMastery()", JS)

if __name__ == '__main__':
    unittest.main()
