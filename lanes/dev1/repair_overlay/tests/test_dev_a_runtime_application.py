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
        if command=='player.save_checkpoint': return {'api_version':'runtime.v1','request_id':request_id,'saved':True,'current_node_id':'LN01-N01'}
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
        saved=self.call('player.save_checkpoint',{'campaign_id':'LN','mission_id':'LN-01','node_id':'LN01-N01'})['data']; self.assertEqual('D5/runtime',saved['truth_owner']); self.assertEqual('LN01-N01',saved['checkpoint']['node_id']); self.assertEqual(('player.save_checkpoint',{},'save-player'),self.gateway.calls[-1])
        restored=self.call('player.restore_checkpoint')['data']; self.assertEqual('LN01-N01',restored['checkpoint']['node_id']); self.assertEqual(2,restored['runtime_schema_version'])
    def test_runtime_checkpoint_projection_ignores_forged_browser_metadata(self):
        saved=self.call('player.save_checkpoint',{'campaign_id':'FORGED-CAMPAIGN','mission_id':'FORGED-MISSION','node_id':'FORGED-NODE'})
        self.assertTrue(saved['ok'],saved);data=saved['data'];self.assertEqual('D5/runtime',data['truth_owner'])
        self.assertEqual({'campaign_id':'LN','mission_id':'LN-01','node_id':'LN01-N01','checkpoint_schema':'scripture.player.checkpoint.v1'},data['checkpoint'])
        self.assertEqual(('player.save_checkpoint',{},'save-player'),self.gateway.calls[-1])
        self.assertIsNone(self.app.store.get_json('player','checkpoint'))
    def test_runtime_checkpoint_unknown_canonical_node_fails_closed_on_save_and_restore(self):
        class UnknownCheckpointGateway:
            def invoke(self,command,payload=None,request_id='x'):
                if command=='player.save_checkpoint': return {'api_version':'runtime.v1','request_id':request_id,'saved':True,'current_node_id':'UNKNOWN-NODE'}
                if command=='player.restore_checkpoint': return {'api_version':'runtime.v1','request_id':request_id,'restored':True,'current_node_id':'UNKNOWN-NODE','schema_version':2}
                raise AssertionError(command)
        app=PlatformApplication(self.repo,store=JsonFileStore(Path(self.t.name)/'unknown-node-store'),player_gateway=UnknownCheckpointGateway())
        saved=app.handle({'api_version':'scripture.transport.v1','request_id':'save-unknown','command':'player.save_checkpoint','payload':{}})
        self.assertFalse(saved['ok'],saved);self.assertEqual('VALIDATION_ERROR',saved['error']['code']);self.assertIn('unknown canonical node',saved['error']['message'])
        restored=app.handle({'api_version':'scripture.transport.v1','request_id':'restore-unknown','command':'player.restore_checkpoint','payload':{}})
        self.assertFalse(restored['ok'],restored);self.assertEqual('VALIDATION_ERROR',restored['error']['code']);self.assertIn('unknown canonical node',restored['error']['message'])
        self.assertIsNone(app.store.get_json('player','checkpoint'))
    def test_runtime_checkpoint_requires_positive_persistence_acknowledgement(self):
        class UnacknowledgedGateway:
            def invoke(self,command,payload=None,request_id='x'):
                if command=='player.save_checkpoint': return {'api_version':'runtime.v1','request_id':request_id,'saved':False,'current_node_id':'LN01-N01'}
                if command=='player.restore_checkpoint': return {'api_version':'runtime.v1','request_id':request_id,'restored':False,'current_node_id':'LN01-N01','schema_version':3}
                raise AssertionError(command)
        app=PlatformApplication(self.repo,store=JsonFileStore(Path(self.t.name)/'unacknowledged-store'),player_gateway=UnacknowledgedGateway())
        saved=app.handle({'api_version':'scripture.transport.v1','request_id':'save-unacked','command':'player.save_checkpoint','payload':{}})
        self.assertFalse(saved['ok'],saved);self.assertEqual('VALIDATION_ERROR',saved['error']['code']);self.assertIn('was not acknowledged',saved['error']['message'])
        restored=app.handle({'api_version':'scripture.transport.v1','request_id':'restore-unacked','command':'player.restore_checkpoint','payload':{}})
        self.assertFalse(restored['ok'],restored);self.assertEqual('VALIDATION_ERROR',restored['error']['code']);self.assertIn('was not acknowledged',restored['error']['message'])
        self.assertIsNone(app.store.get_json('player','checkpoint'))
    def test_runtime_checkpoint_restore_requires_valid_schema_version(self):
        class InvalidSchemaGateway:
            def invoke(self,command,payload=None,request_id='x'):
                if command=='player.restore_checkpoint': return {'api_version':'runtime.v1','request_id':request_id,'restored':True,'current_node_id':'LN01-N01','schema_version':0}
                raise AssertionError(command)
        app=PlatformApplication(self.repo,store=JsonFileStore(Path(self.t.name)/'invalid-schema-store'),player_gateway=InvalidSchemaGateway())
        restored=app.handle({'api_version':'scripture.transport.v1','request_id':'restore-invalid-schema','command':'player.restore_checkpoint','payload':{}})
        self.assertFalse(restored['ok'],restored);self.assertEqual('VALIDATION_ERROR',restored['error']['code']);self.assertIn('invalid schema_version',restored['error']['message'])
    def test_runtime_save_before_task_load_returns_null_checkpoint_without_spoofing(self):
        calls=[]
        def runtime(request):
            calls.append(request)
            self.assertEqual('save',request['command']);self.assertEqual({},request['payload'])
            return {'api_version':'runtime.v1','request_id':request['request_id'],'saved':True}
        gateway=RuntimeBackedPlayerGateway(runtime,current_node_getter=lambda:None)
        app=PlatformApplication(self.repo,store=JsonFileStore(Path(self.t.name)/'empty-runtime-store'),player_gateway=gateway)
        saved=app.handle({'api_version':'scripture.transport.v1','request_id':'save-empty','command':'player.save_checkpoint','payload':{'campaign_id':'FORGED','mission_id':'FORGED','node_id':'FORGED'}})
        self.assertTrue(saved['ok'],saved);self.assertEqual('D5/runtime',saved['data']['truth_owner']);self.assertIsNone(saved['data']['checkpoint']);self.assertEqual(1,len(calls))
        self.assertIsNone(app.store.get_json('player','checkpoint'))
    def test_reference_only_checkpoint_fallback_keeps_payload_semantics(self):
        app=PlatformApplication(self.repo,store=JsonFileStore(Path(self.t.name)/'reference-store'))
        payload={'campaign_id':'LN','mission_id':'LN-01','node_id':'LN01-N01'}
        saved=app.handle({'api_version':'scripture.transport.v1','request_id':'save-ref','command':'player.save_checkpoint','payload':payload})
        self.assertTrue(saved['ok'],saved);self.assertEqual('REFERENCE_TEST_ONLY',saved['data']['truth_owner']);self.assertEqual('LN01-N01',saved['data']['checkpoint']['node_id'])
        restored=app.handle({'api_version':'scripture.transport.v1','request_id':'restore-ref','command':'player.restore_checkpoint','payload':{}})
        self.assertEqual(saved['data']['checkpoint'],restored['data']['checkpoint'])
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
