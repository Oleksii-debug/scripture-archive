import unittest
from scripture_archive_platform.domain.models import BUILTIN_TASK_TYPES
from scripture_archive_platform.domain.registries import build_task_registries
from scripture_archive_platform.transport.answer_contracts import answer_contract_descriptor

class CrossLaneContractTests(unittest.TestCase):
    def test_all_current_task_families_have_renderer_editor_grader_slots(self):
        task,render,grader,editor,templates=build_task_registries()
        self.assertEqual(14,len(BUILTIN_TASK_TYPES))
        for name in BUILTIN_TASK_TYPES:
            self.assertIn(name,task);self.assertIn(name,render);self.assertIn(name,editor);self.assertIn(name,grader)
            self.assertEqual('DEV5/runtime',grader.get(name)['ownership'])
    def test_registry_uses_exact_answer_dto_v1_descriptor(self):
        task,*_=build_task_registries()
        for name in BUILTIN_TASK_TYPES:
            self.assertIn('ANSWER_DTO_v1',task.get(name).response_shape)
            for field in answer_contract_descriptor(name)['fields']:
                self.assertIn(field,task.get(name).response_shape)
