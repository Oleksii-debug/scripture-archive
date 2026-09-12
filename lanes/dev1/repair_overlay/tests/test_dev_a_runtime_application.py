import tempfile
import unittest
from pathlib import Path
from _fixture import make_repo
from scripture_archive_platform.application.service import PlatformApplication
from scripture_archive_platform.application.runtime_gateway import RuntimeBackedPlayerGateway
from scripture_archive_platform.persistence.store import JsonFileStore

class FakeGateway:
    def __init__(self): self.calls=[]
    def invoke(self,command,payload=None,request_id='x'):
        self.calls.append((command,dict(payload or {}),request_id))
        if command=='player.load_node': return {'api_version':'runtime.v1','request_id':request_id,'task':{'node_id':payload['node_id']}}
        if command=='player.submit_answer': return {'api_version':'runtime.v1','request_id':request_id,'grade':{'correctness':'CORRECT','score':1.0,'confidence':'T1','tx1':False,'feedback':'runtime feedback','evidence':['Luke 22:8']},'branch':{'next_node_id':'LN01-N02'},'mastery_consequence':[{'concept_id':'GOSPEL_PARALLELS'}],'accessibility':[{'message':'correct'}]}
        if command=='player.request_hint': return {'api_version':'runtime.v1','request_id':request_id,'hint':{'level':1,'text':'runtime hint'},'accessibility':{'message':'hint'}}
        if command=='player.reveal_evidence': return {'api_version':'runtime.v1','request_id':request_id,'unlocked':['EV-1'],'linear':['EV-1 — Luke 22:8']}
        if command in {'player.next','player.navigate_branch'}: return {'api_version':'runtime.v1','request_id':request_id,'task':{'node_id':'LN01-N02'}}
        if command=='player.get_mastery': return {'api_version':'runtime.v1','request_id':request_id,'mastery':[{'concept_id':'GOSPEL_PARALLELS','state':'STABLE'}]}
        if command=='player.save_checkpoint': return {'api_version':'runtime.v1','request_id':request_id,'saved':True}
        if command=='player.restore_checkpoint': return {'api_version':'runtime.v1','request_id':request_id,'restored':True,'current_node_id':'LN01-N01','schema_version':2}
        raise AssertionError(command)

class DevARuntimeApplicationTests(unittest.TestCase):
    def setUp(self):
        self.t=tempfile.TemporaryDirectory(); root=Path(self.t.name); self.repo=make_repo(root/'repo'); self.gateway=FakeGateway(); self.app=PlatformApplication(self.repo,store=JsonFileStore(root/'store'),player_gateway=self.gateway)
    def tearDown(self): self.t.cleanup()
    def call(self,command,payload=None): return self.app.handle({'api_version':'scripture.transport.v1','request_id':'r-1','command':command,'payload':payload or {}})
    def test_player_flow_uses_runtime_truth_and_platform_presentation(self):
        loaded=self.call('player.load_node',{'node_id':'LN01-N01'})['data']; answer={'schema':'ANSWER_DTO_v1','task_type':loaded['task']['task_type'],'text':'Luke names Peter and John'}
        submitted=self.call('player.submit_answer',{'node_id':'LN01-N01','answer':answer})['data']; self.assertEqual('D5/runtime',submitted['truth_owner']); self.assertEqual('CORRECT',submitted['status']); self.assertEqual('LN01-N02',submitted['next_node_id']); self.assertEqual('runtime feedback',submitted['feedback'])
    def test_hint_evidence_progress_mastery_save_restore_delegate_runtime(self):
        self.call('player.load_node',{'node_id':'LN01-N01'}); self.assertEqual('runtime hint',self.call('player.request_hint',{'node_id':'LN01-N01'})['data']['hint']); self.assertEqual(['EV-1 — Luke 22:8'],self.call('player.reveal_evidence',{'node_id':'LN01-N01'})['data']['evidence'])
        self.assertEqual('LN-01',self.call('player.get_progress',{'node_id':'LN01-N01'})['data']['progress']['mission_id']); self.assertEqual('STABLE',self.call('player.get_mastery')['data']['mastery'][0]['state'])
        rejected=self.call('player.navigate_branch',{'node_id':'LN01-N01','target_node_id':'LN01-N02'}); self.assertFalse(rejected['ok']); self.assertEqual('VALIDATION_ERROR',rejected['error']['code'])
        nxt=self.call('player.next',{'node_id':'LN01-N01'})['data']; self.assertEqual('LN01-N02',nxt['task']['node_id']); self.assertEqual('D5/runtime',nxt['truth_owner'])
        self.assertEqual(('player.next',{},'next-LN01-N01'),self.gateway.calls[-1])
        self.assertEqual('D5/runtime',self.call('player.save_checkpoint',{'campaign_id':'LN','mission_id':'LN-01','node_id':'LN01-N01'})['data']['truth_owner']); restored=self.call('player.restore_checkpoint')['data']; self.assertEqual('LN01-N01',restored['checkpoint']['node_id']); self.assertEqual(2,restored['runtime_schema_version'])
    def test_platform_next_request_id_binds_current_context_and_replay_fails_closed(self):
        state={'current':'LN01-N01','calls':[]}
        def runtime(request):
            state['calls'].append(request)
            self.assertEqual('next',request['command']);self.assertEqual({},request['payload'])
            state['current']='LN01-N02'
            return {'api_version':'runtime.v1','request_id':request['request_id'],'task':{'node_id':'LN01-N02'}}
        gateway=RuntimeBackedPlayerGateway(runtime,current_node_getter=lambda:state['current'])
        app=PlatformApplication(self.repo,store=JsonFileStore(Path(self.t.name)/'guard-store'),player_gateway=gateway)
        request={'api_version':'scripture.transport.v1','request_id':'outer-request-id','command':'player.next','payload':{'node_id':'LN01-N01'}}
        first=app.handle(request)
        self.assertTrue(first['ok']);self.assertEqual('LN01-N02',first['data']['task']['node_id']);self.assertEqual(1,len(state['calls']))
        self.assertEqual('next-LN01-N01',state['calls'][0]['request_id']);self.assertEqual({},state['calls'][0]['payload'])
        replay=app.handle(request)
        self.assertFalse(replay['ok']);self.assertEqual('VALIDATION_ERROR',replay['error']['code']);self.assertIn('stale player.next current-node context',replay['error']['message']);self.assertEqual(1,len(state['calls']))
