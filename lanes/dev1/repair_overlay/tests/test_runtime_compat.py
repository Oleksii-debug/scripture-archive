import unittest
from scripture_archive_platform.transport.runtime_compat import RuntimeEngineContractAdapter, RuntimeContractError

class RuntimeCompatTests(unittest.TestCase):
    def req(self, command, payload=None):
        return {'api_version':'scripture.transport.v1','request_id':'r-1','command':command,'payload':payload or {}}
    def test_player_commands_map_to_current_dev5_runtime_v1(self):
        adapter=RuntimeEngineContractAdapter(lambda r:{'api_version':'runtime.v1','request_id':r['request_id'],'echo':r})
        expected={'player.load_node':'load_task','player.submit_answer':'submit_answer','player.request_hint':'request_hint','player.next':'next','player.save_checkpoint':'save','player.restore_checkpoint':'restore','player.reveal_evidence':'get_evidence'}
        for public,internal in expected.items():
            payload={} if public=='player.next' else {'node_id':'LN01-N01'}
            if public=='player.submit_answer':payload.update({'task_type':'SHORT_TEXT','answer':{'schema':'ANSWER_DTO_v1','task_type':'SHORT_TEXT','text':'x'}})
            rr=adapter.to_runtime_request(self.req(public,payload));self.assertEqual('runtime.v1',rr['api_version']);self.assertEqual(internal,rr['command']);self.assertEqual('r-1',rr['request_id'])
    def test_submit_answer_validates_dto_before_runtime(self):
        adapter=RuntimeEngineContractAdapter(lambda r:r)
        rr=adapter.to_runtime_request(self.req('player.submit_answer',{'node_id':'N','task_type':'SINGLE_CHOICE','answer':{'choice':'a'}}));self.assertEqual('ANSWER_DTO_v1',rr['payload']['answer']['schema'])
        with self.assertRaises(RuntimeContractError):adapter.to_runtime_request(self.req('player.submit_answer',{'node_id':'N','task_type':'SINGLE_CHOICE','answer':'a'}))
    def test_player_navigate_branch_is_disabled_until_runtime_issues_validated_choice_capability(self):
        adapter=RuntimeEngineContractAdapter(lambda r:r)
        with self.assertRaisesRegex(RuntimeContractError,'player.navigate_branch is disabled'):
            adapter.to_runtime_request(self.req('player.navigate_branch',{'target_node_id':'LN01-N99'}))
    def test_player_next_rejects_target_payload(self):
        adapter=RuntimeEngineContractAdapter(lambda r:r)
        with self.assertRaisesRegex(RuntimeContractError,'target selection is forbidden'):
            adapter.to_runtime_request(self.req('player.next',{'node_id':'LN01-N99'}))
        with self.assertRaisesRegex(RuntimeContractError,'target selection is forbidden'):
            adapter.to_runtime_request(self.req('player.next',{'target_node_id':'LN01-N99'}))
    def test_platform_only_command_refuses_runtime_mapping(self):
        adapter=RuntimeEngineContractAdapter(lambda r:r)
        with self.assertRaises(RuntimeContractError):adapter.to_runtime_request(self.req('authoring.list_drafts'))
    def test_runtime_response_must_be_json_safe_and_runtime_v1(self):
        adapter=RuntimeEngineContractAdapter(lambda r:{'api_version':'runtime.v1','request_id':'r-1','task':{'node_id':'LN01-N01'}})
        response=adapter.invoke_runtime(self.req('player.load_node',{'node_id':'LN01-N01'}));self.assertEqual('LN01-N01',response['task']['node_id'])
        bad=RuntimeEngineContractAdapter(lambda r:{'api_version':'wrong','request_id':'r-1'})
        with self.assertRaises(RuntimeContractError):bad.invoke_runtime(self.req('player.load_node',{'node_id':'LN01-N01'}))
