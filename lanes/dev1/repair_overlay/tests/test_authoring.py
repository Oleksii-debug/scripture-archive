import tempfile,unittest
from pathlib import Path
from _fixture import make_repo
from scripture_archive_platform.application.service import build_default_application
class AuthoringTests(unittest.TestCase):
 def setUp(self):self.t=tempfile.TemporaryDirectory();self.repo=make_repo(Path(self.t.name)/'repo');self.app=build_default_application(self.repo,Path(self.t.name)/'store')
 def tearDown(self):self.t.cleanup()
 def req(self,cmd,payload):return self.app.handle({'api_version':'scripture.transport.v1','request_id':'t','command':cmd,'payload':payload})['data']
 def valid_draft(self):
  d=self.req('authoring.new_draft',{'title':'Test'})['draft'];n=d['node'];n.update({'node_id':'ZZ01-N01','mission_id':'ZZ-01','task_type':'SINGLE_CHOICE','task_family':'source orientation','skill_target':'source scope','knowledge_target':'fixture','why_this_node_exists':'Distinct learning purpose','player_prompt':'Choose the source','source_scope_visible_to_player':'Fixture 1:1','accepted_answer':'accepted','accepted_variants':['accepted'],'required_evidence':['Fixture 1:1'],'rejected_answers':['B'],'rejection_reason':'Not in text','success_feedback':'Correct','partial_feedback':'Partial','failure_feedback':'Wrong','hints':{f'H{i}':('Clue' if i<7 else 'Answer A with source Fixture 1:1; guided mastery.') for i in range(1,8)},'functional_nonvisual_equivalent':'Keyboard complete labels and textual equivalent.'});n['ui_metadata']['options']=[{'id':'accepted','label':'A'},{'id':'b','label':'B'}];return d
 def test_create_validate_save_reload(self):
  d=self.valid_draft();v=self.req('authoring.validate_draft',{'draft':d});self.assertTrue(v['valid'],v);saved=self.req('authoring.save_draft',{'draft':d})['draft'];loaded=self.req('authoring.load_draft',{'draft_id':saved['draft_id']})['draft'];self.assertEqual('ZZ01-N01',loaded['node']['node_id']);self.assertEqual('DRAFT',loaded['status'])
 def test_publish_candidate_does_not_mutate_canonical(self):
  d=self.valid_draft();before=(self.repo/'docs/campaigns/LN/LN-01_CANONICAL_v1.2/nodes_part_01.json').read_bytes();candidate=self.req('authoring.prepare_publish_candidate',{'draft':d})['candidate'];after=(self.repo/'docs/campaigns/LN/LN-01_CANONICAL_v1.2/nodes_part_01.json').read_bytes();self.assertEqual(before,after);self.assertFalse(candidate['canonical_mutation_performed']);self.assertTrue(candidate['publish_manifest']['requires_source_audit'])
 def test_h7_and_nonvisual_are_hard_validation(self):
  d=self.valid_draft();d['node']['hints']['H7']='';d['node']['functional_nonvisual_equivalent']='';r=self.req('authoring.validate_draft',{'draft':d});self.assertFalse(r['valid']);self.assertTrue(any('H7' in x for x in r['errors']));self.assertTrue(any('nonvisual' in x for x in r['errors']))
 def test_import_is_data_only_and_gets_new_draft_id(self):
  import json
  d=self.valid_draft();d['node']['player_prompt']='<script>throw new Error()</script>';r=self.req('authoring.import_draft',{'text':json.dumps(d)})['draft'];self.assertNotEqual(d['draft_id'],r['draft_id']);self.assertIn('<script>',r['node']['player_prompt']);self.assertEqual('import_data_only',r['change_record'][0]['action'])
