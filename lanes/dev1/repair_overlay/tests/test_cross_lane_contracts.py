import unittest
from scripture_archive_platform.domain.models import BUILTIN_TASK_TYPES
from scripture_archive_platform.domain.registries import build_task_registries

class CrossLaneContractTests(unittest.TestCase):
    def test_cross_lane_task_families_have_platform_renderer_editor_slots(self):
        task,render,grader,editor,templates=build_task_registries()
        for name in ("SPEAKER_RECIPIENT","PARALLEL_WITNESS_COMPARE","OT_NT_LINK"):
            self.assertIn(name, BUILTIN_TASK_TYPES);self.assertIn(name,task);self.assertIn(name,render);self.assertIn(name,editor);self.assertIn(name,grader)
            self.assertEqual("DEV5/runtime",grader.get(name)["ownership"])
    def test_dev5_structured_answer_shapes_are_checkpointed(self):
        task,*_=build_task_registries()
        self.assertEqual("{claim,evidence[]}",task.get("CLAIM_EVIDENCE").response_shape)
        self.assertEqual("{step_id:value}",task.get("COMPOSITE_MULTI_STEP").response_shape)
