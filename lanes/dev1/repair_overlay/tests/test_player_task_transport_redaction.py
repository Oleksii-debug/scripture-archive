import unittest

from scripture_archive_platform.transport.contracts import ok_response


class PlayerTaskTransportRedactionTests(unittest.TestCase):
    def test_player_task_redacts_grading_private_metadata_recursively(self):
        data = {
            'truth_owner': 'D5/runtime',
            'task': {
                'node_id': 'N-1',
                'task_type': 'SINGLE_CHOICE',
                'prompt': 'Choose',
                'answer_contract': {'schema': 'ANSWER_DTO_v1', 'fields': ['choice']},
                'legacy_answer_contract': {'accepted_choice_ids': ['CORRECT']},
                'options': [
                    {'id': 'CORRECT', 'label': 'A'},
                    {'id': 'DISTRACTOR', 'label': 'B'},
                ],
                'steps': [
                    {
                        'step_id': 's1',
                        'label': 'Nested',
                        'accepted_answer': 'secret',
                        'grading': {'accepted_pairs': {'left': 'right'}},
                    }
                ],
            },
        }

        response = ok_response('r-1', data)
        task = response['data']['task']

        self.assertNotIn('legacy_answer_contract', task)
        self.assertNotIn('accepted_answer', task['steps'][0])
        self.assertNotIn('grading', task['steps'][0])
        self.assertEqual('Choose', task['prompt'])
        self.assertEqual('ANSWER_DTO_v1', task['answer_contract']['schema'])
        self.assertEqual(['CORRECT', 'DISTRACTOR'], [o['id'] for o in task['options']])

    def test_reference_player_task_is_redacted_too(self):
        response = ok_response(
            'r-2',
            {
                'truth_owner': 'REFERENCE_TEST_ONLY',
                'task': {
                    'node_id': 'N-2',
                    'task_type': 'MULTI_SELECT',
                    'accepted_choice_ids': ['A'],
                    'correct_answers': ['A'],
                    'answer_key': {'choices': ['A']},
                },
            },
        )
        self.assertEqual(
            {'node_id': 'N-2', 'task_type': 'MULTI_SELECT'},
            response['data']['task'],
        )

    def test_authoring_payload_without_player_truth_owner_is_not_redacted(self):
        authoring = {
            'draft': True,
            'task': {
                'node_id': 'DRAFT-1',
                'legacy_answer_contract': {'accepted_choice_ids': ['A']},
            },
        }
        response = ok_response('r-3', authoring)
        self.assertEqual(authoring, response['data'])


if __name__ == '__main__':
    unittest.main()
