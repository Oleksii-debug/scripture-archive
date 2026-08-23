import tempfile, unittest
from pathlib import Path
from _fixture import make_repo
from scripture_archive_platform.application.service import build_default_application

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
if __name__=='__main__': unittest.main()
