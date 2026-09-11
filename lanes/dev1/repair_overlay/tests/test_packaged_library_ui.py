from pathlib import Path
import re
import unittest

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'frontend'/'index.html').read_text(encoding='utf-8')
JS=(ROOT/'frontend'/'library-search.js').read_text(encoding='utf-8')

class PackagedLibraryUIContractTests(unittest.TestCase):
    def test_reachable_semantic_keyboard_surface(self):
        self.assertIn('id="nav-library"',HTML)
        self.assertIn('id="library-view"',HTML)
        self.assertIn('aria-labelledby="library-heading"',HTML)
        self.assertIn('role="search"',HTML)
        self.assertIn('role="status"',HTML)
        self.assertIn('aria-live="polite"',HTML)
        self.assertIn('id="library-heading" tabindex="-1"',HTML)
        self.assertIn('id="library-results-heading" tabindex="-1"',HTML)
        self.assertIn('src="library-search.js"',HTML)

    def test_only_allowlisted_library_commands_are_invoked(self):
        commands=set(re.findall(r"api\('([^']+)'",JS))
        self.assertEqual(commands,{'library.catalog','library.search'})
        for forbidden in ('player.load_node','player.next','player.navigate_branch','authoring.','shell','python_eval'):
            self.assertNotIn(forbidden,JS)

    def test_no_html_injection_or_second_truth(self):
        self.assertNotIn('innerHTML',JS)
        self.assertNotIn('insertAdjacentHTML',JS)
        self.assertIn('.textContent=',JS)
        self.assertIn('source_references',JS)
        self.assertNotIn('accepted_answer',JS)
        self.assertNotIn('grading',JS)
        self.assertNotIn('required_evidence',JS)

    def test_full_bible_text_nonclaim_is_explicit(self):
        self.assertIn("catalog?.bundled_full_bible_text===true",JS)
        self.assertIn("catalog?.text_provider_available===true",JS)
        self.assertIn('не містить повного тексту Біблії',JS)
        self.assertIn('відсутній текст не вигадується',JS)

    def test_stale_search_cannot_steal_hidden_view(self):
        self.assertIn('requestGeneration',JS)
        self.assertIn("view()?.classList.contains('hidden')",JS)
        self.assertIn('generation!==requestGeneration',JS)
        self.assertIn('button.disabled=true',JS)
        self.assertIn('button.disabled=false',JS)

if __name__=='__main__':
    unittest.main()
