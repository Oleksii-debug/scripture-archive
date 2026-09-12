import re, shutil, subprocess, unittest
from pathlib import Path

class ResearchPersistenceUiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root=Path(__file__).parents[1]
        cls.front=cls.root/'frontend'
        cls.app=(cls.front/'app.js').read_text(encoding='utf-8')
        cls.workbench=(cls.front/'research-workbench.js').read_text(encoding='utf-8')
        cls.ui=(cls.front/'research-persistence.js').read_text(encoding='utf-8')

    def test_packaged_workbench_composes_existing_backend_only(self):
        self.assertIn("from './research-persistence.js'",self.workbench)
        self.assertIn('invoke:api,capabilities:bootstrap.capabilities',self.app)
        self.assertIn('research?.refreshPersistence()',self.app)
        commands=set(re.findall(r"'((?:research\.)[^']+)'",self.ui))
        self.assertEqual({
            'research.list_bookmarks','research.upsert_bookmark','research.delete_bookmark',
            'research.list_notes','research.upsert_note','research.delete_note'
        },commands)

    def test_capability_gate_is_fail_closed(self):
        self.assertIn('research_bookmarks_notes===true',self.ui)
        self.assertIn('research_workspace_persistence===true',self.ui)
        self.assertIn("if(!this.enabled)return",self.ui)
        self.assertIn("if(!this.enabled||!Object.values(COMMANDS).includes(command)",self.ui)
        self.assertIn('c.disabled=!this.enabled',self.ui)

    def test_only_nondraft_current_canonical_context_can_be_saved(self):
        self.assertIn("if(cid==='DRAFT')throw",self.ui)
        self.assertIn("if(task.mission_id&&task.mission_id!==mid)throw",self.ui)
        self.assertIn("kind:'canonical_node'",self.ui)
        self.assertIn('source_references:[...task.source_references]',self.ui)
        self.assertNotIn('truth_owner:OWNER',self.ui)
        self.assertIn("const task=this.task,mission=this.mission,target=buildResearchTarget(task,mission)",self.ui)
        self.assertIn("if(g!==this.generation||this.task!==task||this.mission!==mission)throw new Error('research context changed')",self.ui)
        self.assertIn("if(g!==this.generation||this.task!==task||this.mission!==mission)return",self.ui)
        self.assertIn("catch(e){if(g===this.generation)this.status.textContent=",self.ui)
        self.assertIn('this._setEditorsEnabled(false)',self.ui)
        self.assertIn('this._clearForms()',self.ui)

    def test_response_truth_and_shape_fail_closed(self):
        self.assertIn("t.truth_owner===OWNER",self.ui)
        self.assertIn("kind==='bookmark'?validTarget(row?.target)",self.ui)
        self.assertIn("schema=kind==='bookmark'?'scripture.research.bookmark.v1':'scripture.research.note.v1'",self.ui)
        self.assertIn("data[key].length>500",self.ui)
        self.assertIn("typeof res.deleted!=='boolean'",self.ui)
        self.assertIn('validateResearchList(kind',self.ui)

    def test_records_are_stable_upserts_searchable_and_deletable(self):
        self.assertIn("record[isB?'bookmark_id':'note_id']=target.node_id",self.ui)
        self.assertIn('Зберегти / оновити',self.ui)
        self.assertIn("q.type='search'",self.ui)
        self.assertIn("deleteBookmark:'research.delete_bookmark'",self.ui)
        self.assertIn("deleteNote:'research.delete_note'",self.ui)
        self.assertIn('Пошук у збережених записах',self.ui)

    def test_dynamic_content_uses_safe_dom_text(self):
        self.assertIn('textContent=value',self.ui)
        for forbidden in ('innerHTML','outerHTML','insertAdjacentHTML','localStorage','sessionStorage','eval(','new Function'):
            self.assertNotIn(forbidden,self.ui)
        self.assertIn("status.setAttribute('role','status')",self.ui)
        self.assertIn("label.htmlFor",self.ui)

    def test_session_pins_remain_separate(self):
        self.assertIn('this.pinned=new Set()',self.workbench)
        self.assertNotIn('pinned',self.ui)
        self.assertNotIn('evidence',self.ui.lower())

    def test_modules_parse(self):
        node=shutil.which('node')
        if not node:self.skipTest('node unavailable')
        for name in ['app.js','research-workbench.js','research-persistence.js']:
            r=subprocess.run([node,'--check',str(self.front/name)],capture_output=True,text=True)
            self.assertEqual(0,r.returncode,r.stderr)

if __name__=='__main__':unittest.main()
