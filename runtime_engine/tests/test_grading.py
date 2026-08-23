import unittest

from scripture_archive_runtime.grading import GraderRegistry
from scripture_archive_runtime.models import Correctness, TaskDefinition
from tests.fixtures import LN01_N03, PA02_N04, node_from


class GradingTests(unittest.TestCase):
    def setUp(self): self.registry=GraderRegistry()
    def task(self,**changes): return TaskDefinition.from_canonical(node_from(**changes))
    def test_real_ln_fixture_preserves_t2_source_scope(self):
        task=TaskDefinition.from_canonical(LN01_N03); result=self.registry.grade(task,LN01_N03["accepted_answer"])
        self.assertEqual(result.correctness,Correctness.CORRECT); self.assertEqual(result.confidence.value,"T2"); self.assertIn("Mark 14:13",result.source_scope); self.assertFalse(result.tx1)
    def test_real_pa_fixture_is_proposition_graded_without_harmonizing(self):
        task=TaskDefinition.from_canonical(PA02_N04); self.assertEqual(self.registry.grade(task,PA02_N04["accepted_answer"]).correctness,Correctness.CORRECT); self.assertEqual(self.registry.grade(task,"all three explicitly say noon").correctness,Correctness.INCORRECT)
    def test_translation_neutral_explicit_proposition_aliases(self):
        task=self.task(response_mode="short text",task_type="SHORT_TEXT",accepted_answer="Luke names Peter and John",grading={"accepted_propositions":[{"id":"witness","required":True,"aliases":["Luke","Лука"]},{"id":"names","required":True,"aliases":["Peter and John","Петро та Іван","Петра й Івана"]}]})
        ua=self.registry.grade(task,"Лука прямо називає Петра й Івана"); self.assertEqual(ua.correctness,Correctness.CORRECT); self.assertEqual(ua.details["mode"],"proposition-groups")
    def test_multiselect_partial_and_exact(self):
        task=self.task(task_type="MULTI_SELECT",response_mode="multi-select",accepted_answer=["Acts 9","Acts 22","Acts 26"],grading={"accepted_set":["Acts 9","Acts 22","Acts 26"]})
        self.assertEqual(self.registry.grade(task,["Acts 9","Acts 22"]).correctness,Correctness.PARTIAL); self.assertEqual(self.registry.grade(task,["Acts 26","Acts 9","Acts 22"]).correctness,Correctness.CORRECT)
    def test_ordering_and_matching(self):
        ordering=self.task(task_type="ORDERING",response_mode="ordering",accepted_answer=["A","B","C"],grading={"accepted_order":["A","B","C"]}); self.assertEqual(self.registry.grade(ordering,["A","B","C"]).correctness,Correctness.CORRECT); self.assertEqual(self.registry.grade(ordering,["A","C","B"]).correctness,Correctness.PARTIAL)
        matching=self.task(task_type="MATCHING",response_mode="matching",accepted_answer={"Acts 9":"narrative","Acts 22":"speech"},grading={"accepted_pairs":{"Acts 9":"narrative","Acts 22":"speech"}}); self.assertEqual(self.registry.grade(matching,{"Acts 9":"narrative","Acts 22":"speech"}).correctness,Correctness.CORRECT)
    def test_claim_evidence_and_tx1_payload(self):
        task=self.task(task_type="CLAIM_EVIDENCE",response_mode="claim/evidence",textual_variant_flag="TX1",accepted_answer="Mark rooster wording is qualified",required_evidence=["EV-MARK"],grading={"accepted_propositions":[{"id":"qualified","required":True,"aliases":["qualified","кваліфіковане"]}],"required_evidence_ids":["EV-MARK"]})
        result=self.registry.grade(task,{"claim":"це кваліфіковане твердження","evidence":["EV-MARK"]}); self.assertEqual(result.correctness,Correctness.CORRECT); self.assertTrue(result.tx1); self.assertIsNotNone(result.uncertainty)
    def test_evidence_select_uses_canonical_accepted_answer_without_adapter_grading(self):
        task=self.task(task_type="EVIDENCE_SELECT",response_mode="evidence select",accepted_answer=["EV-MARK","EV-LUKE"],accepted_variants=[],required_evidence=[],grading={})
        result=self.registry.grade(task,{"evidence_ids":["EV-LUKE","EV-MARK"]}); self.assertEqual(result.correctness,Correctness.CORRECT); self.assertEqual(result.score,1.0)
    def test_claim_evidence_uses_canonical_structured_answer_without_adapter_grading(self):
        task=self.task(task_type="CLAIM_EVIDENCE",response_mode="claim/evidence",accepted_answer={"claim":"Mark states two disciples","evidence_ids":["EV-MARK"]},accepted_variants=[],required_evidence=[],grading={})
        result=self.registry.grade(task,{"claim":"Mark states two disciples","evidence_ids":["EV-MARK"]}); self.assertEqual(result.correctness,Correctness.CORRECT); self.assertEqual(result.score,1.0)
    def test_ot_nt_link_uses_canonical_structured_answer_without_adapter_grading(self):
        accepted={"ot_passage":"Isaiah 40:3","nt_passage":"Mark 1:2-3","relation_category":"citation/application","confidence":"T2","evidence_id":"EV-OTNT-1"}
        task=self.task(task_type="OT_NT_LINK",response_mode="ot nt link",accepted_answer=accepted,accepted_variants=[],required_evidence=[],grading={})
        result=self.registry.grade(task,dict(accepted)); self.assertEqual(result.correctness,Correctness.CORRECT); self.assertEqual(result.score,1.0); self.assertEqual(result.evidence,("EV-OTNT-1",))
    def test_composite_aggregates_steps(self):
        task=self.task(task_type="COMPOSITE_MULTI_STEP",response_mode="composite",grading={"steps":[{"id":"a","weight":1,"task":{"task_type":"SINGLE_CHOICE","response_mode":"single choice","accepted_answer":"Luke","accepted_variants":[]}},{"id":"b","weight":1,"task":{"task_type":"ORDERING","response_mode":"ordering","accepted_answer":["light","fall"],"accepted_variants":[],"grading":{"accepted_order":["light","fall"]}}}]})
        result=self.registry.grade(task,{"a":"Luke","b":["light","fall"]}); self.assertEqual(result.correctness,Correctness.CORRECT); self.assertEqual(result.score,1.0)

if __name__ == "__main__": unittest.main()
