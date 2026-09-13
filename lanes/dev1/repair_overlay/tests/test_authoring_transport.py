import tempfile, unittest
from pathlib import Path
from _fixture import make_repo
from scripture_archive_platform.application.service import build_default_application
from scripture_archive_platform.transport.contracts import ALLOWLISTED_COMMANDS, validate_request_shape

class AuthoringTransportTests(unittest.TestCase):
 def setUp(self):
  self.t=tempfile.TemporaryDirectory(); self.repo=make_repo(Path(self.t.name)/'repo'); self.app=build_default_application(self.repo,Path(self.t.name)/'store')
 def tearDown(self): self.t.cleanup()
 def req(self,cmd,payload): return self.app.handle({'api_version':'scripture.transport.v1','request_id':'dev04','command':cmd,'payload':payload})
 def test_task_template_and_delete_are_allowlisted(self):
  r=self.req('authoring.new_node_from_task_type',{'title':'Choice','task_type':'SINGLE_CHOICE'}); self.assertTrue(r['ok'],r); d=r['data']['draft']; self.assertEqual('SINGLE_CHOICE',d['node']['task_type'])
  r=self.req('authoring.delete_draft',{'draft_id':d['draft_id']}); self.assertTrue(r['ok'],r); self.assertTrue(r['data']['deleted'])
 def test_fork_canonical_node_is_read_only_and_pins_identity(self):
  before=(self.repo/'docs/campaigns/LN/LN-01_CANONICAL_v1.2/nodes_part_01.json').read_bytes()
  r=self.req('authoring.fork_canonical_node',{'node_id':'LN01-N01'}); self.assertTrue(r['ok'],r); d=r['data']['draft']; self.assertEqual('LN01-N01',d['node']['node_id']); self.assertEqual({'node':'LN01-N01'},d['base_identity'])
  self.assertEqual(before,(self.repo/'docs/campaigns/LN/LN-01_CANONICAL_v1.2/nodes_part_01.json').read_bytes())
 def test_reorder_command_is_data_only(self):
  d=self.req('authoring.new_node_from_task_type',{'title':'Order','task_type':'ORDERING'})['data']['draft']; d['node']['ui_metadata']['items']=[{'id':'a'},{'id':'b'},{'id':'c'}]
  r=self.req('authoring.move_collection_item',{'draft':d,'path':'node.ui_metadata.items','index':2,'direction':'up'}); self.assertTrue(r['ok'],r); self.assertEqual(['a','c','b'],[x['id'] for x in r['data']['draft']['node']['ui_metadata']['items']])
  self.assertEqual(['a','b','c'],[x['id'] for x in d['node']['ui_metadata']['items']])
 def test_constructor_v2_lifecycle_is_allowlisted_and_fail_closed(self):
  expected={'authoring.pack_compatibility','authoring.create_snapshot','authoring.list_snapshots','authoring.restore_snapshot','authoring.diff_draft','authoring.history','authoring.undo','authoring.redo','authoring.publish_version','authoring.list_versions','authoring.rollback_version'}
  self.assertTrue(expected.issubset(ALLOWLISTED_COMMANDS))
  r=self.req('authoring.new_draft',{'title':'Campaign','kind':'campaign'}); self.assertTrue(r['ok'],r); d=r['data']['draft']; did=d['draft_id']
  d['campaign']['campaign_id']='ZZ-CAMPAIGN'; d['campaign']['title_ua']='V1'
  r=self.req('authoring.save_draft',{'draft':d}); self.assertTrue(r['ok'],r); d=r['data']['draft']
  r=self.req('authoring.create_snapshot',{'draft_id':did,'label':'Known good'}); self.assertTrue(r['ok'],r); sid=r['data']['snapshot']['snapshot_id']
  d['campaign']['title_ua']='V2'; r=self.req('authoring.save_draft',{'draft':d}); self.assertTrue(r['ok'],r); d=r['data']['draft']
  r=self.req('authoring.diff_draft',{'draft_id':did,'from_snapshot_id':sid}); self.assertTrue(r['ok'],r); self.assertIn('$.campaign.title_ua',r['data']['changed_paths'])
  r=self.req('authoring.undo',{'draft_id':did}); self.assertTrue(r['ok'],r); self.assertEqual('V1',r['data']['draft']['campaign']['title_ua'])
  r=self.req('authoring.redo',{'draft_id':did}); self.assertTrue(r['ok'],r); self.assertEqual('V2',r['data']['draft']['campaign']['title_ua'])
  compat=self.req('authoring.pack_compatibility',{}); self.assertTrue(compat['ok'],compat); compatibility=compat['data']['compatibility']
  bad=dict(compatibility); bad['content_schema_version']='future'
  r=self.req('authoring.publish_version',{'draft_id':did,'compatibility':bad}); self.assertFalse(r['ok'],r); self.assertEqual('VALIDATION_ERROR',r['error']['code'])
  r=self.req('authoring.publish_version',{'draft_id':did,'compatibility':compatibility}); self.assertTrue(r['ok'],r); version=r['data']['version']; self.assertFalse(version['canonical_mutation_performed'])
  r=self.req('authoring.list_versions',{'draft_id':did}); self.assertTrue(r['ok'],r); self.assertEqual(version['version_id'],r['data']['versions'][0]['version_id'])
 def test_player_branch_target_stays_runtime_owned(self):
  self.assertNotIn('player.navigate_branch',ALLOWLISTED_COMMANDS)
  self.assertIn('player.next',ALLOWLISTED_COMMANDS)
  with self.assertRaisesRegex(ValueError,'command not allowlisted'):
   validate_request_shape({'api_version':'scripture.transport.v1','request_id':'security','command':'player.navigate_branch','payload':{'node_id':'LN01-N01','target_node_id':'LN01-N02'}})
  rid,cmd,payload=validate_request_shape({'api_version':'scripture.transport.v1','request_id':'next','command':'player.next','payload':{'node_id':'LN01-N01'}})
  self.assertEqual(('next','player.next',{'node_id':'LN01-N01'}),(rid,cmd,payload))
  with self.assertRaisesRegex(ValueError,'target selection is forbidden'):
   validate_request_shape({'api_version':'scripture.transport.v1','request_id':'target','command':'player.next','payload':{'node_id':'LN01-N01','target_node_id':'LN01-N02'}})
if __name__=='__main__': unittest.main()
