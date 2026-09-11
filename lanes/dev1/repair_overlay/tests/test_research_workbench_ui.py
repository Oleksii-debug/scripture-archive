import shutil, subprocess, unittest
from pathlib import Path

class ResearchWorkbenchUiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root=Path(__file__).parents[1]
        cls.front=cls.root/'frontend'
        cls.html=(cls.front/'index.html').read_text(encoding='utf-8')
        cls.app=(cls.front/'app.js').read_text(encoding='utf-8')
        cls.ui=(cls.front/'research-workbench.js').read_text(encoding='utf-8')

    def test_surface_is_reachable_and_semantic(self):
        self.assertIn('id="nav-research"',self.html)
        self.assertIn('id="research-current"',self.html)
        self.assertIn('id="research-view"',self.html)
        self.assertIn('role="tablist"',self.html)
        self.assertEqual(3,self.html.count('role="tabpanel"'))
        self.assertIn('<table>',self.html)
        self.assertIn('id="research-linear-output"',self.html)
        self.assertIn("$('nav-research').onclick=openResearch",self.app)
        self.assertIn("$('research-current').onclick=openResearch",self.app)

    def test_no_new_truth_or_persistence_channel(self):
        combined=self.app+'\n'+self.ui
        self.assertNotIn('localStorage',combined)
        self.assertNotIn('sessionStorage',combined)
        self.assertNotIn('innerHTML',self.ui)
        self.assertNotIn("api('research.",combined)
        self.assertNotIn("api('bookmark",combined)
        self.assertNotIn("api('note",combined)
        self.assertIn('textContent',self.ui)
        self.assertIn('no consensus',self.ui.lower().replace('consensus/harmonization','no consensus'))

    def test_locked_evidence_is_not_fetched_by_workbench(self):
        self.assertIn('setEvidence(r)',self.app)
        self.assertNotIn('player.reveal_evidence',self.ui)
        self.assertIn('Докази ще не були відкриті',self.html)

    def test_keyboard_tab_roving_and_return_path(self):
        for key in ['ArrowLeft','ArrowRight','Home','End']:
            self.assertIn(key,self.ui)
        self.assertIn("tab.tabIndex=active?0:-1",self.ui)
        self.assertIn('returnFromResearch',self.app)

    def test_modules_parse(self):
        node=shutil.which('node')
        if not node:self.skipTest('node unavailable')
        for name in ['app.js','research-workbench.js']:
            r=subprocess.run([node,'--check',str(self.front/name)],capture_output=True,text=True)
            self.assertEqual(0,r.returncode,r.stderr)

if __name__=='__main__':unittest.main()
