import json
import tempfile
import unittest
from pathlib import Path

from scripture_archive_runtime.application import RuntimeApplication
from scripture_archive_runtime.content import ContentRepository
from scripture_archive_runtime.grading import GraderRegistry
from scripture_archive_runtime.models import Correctness, TaskDefinition
from scripture_archive_runtime.package_adapters import adapt_node_for_runtime, derive_answer_dto, load_package_nodes
from scripture_archive_runtime.security import ValidationError

BASE = {
    "difficulty":2,"required":True,"skill_target":"source boundary","knowledge_target":"fixture","why_this_node_exists":"cross-lane contract fixture",
    "player_prompt":"fixture","source_scope_visible_to_player":"fixture scope","accepted_variants":[],"rejected_answers":[],"rejection_reason":"fixture",
    "confidence_code":"T2","textual_variant_flag":"none","success_feedback":"ok","partial_feedback":"partial","failure_feedback":"fail",
    "hints":{"H1":"h1"},"on_hint_threshold":"return_to_current_node","on_correct":"RESOLVED_NODE","on_partial":"return_to_current_node","on_incorrect":"return_to_current_node",
    "optional_evidence_unlock":"none","later_retrieval_effect":"RETIRED","mastery_domains":["fixture"],"evidence_strength":["application"],"mastery_mode":"independent",
    "spaced_retrieval":"yes","review_queue_rule":"FIXTURE","functional_nonvisual_equivalent":"Keyboard-linear labelled text equivalent."
}

def node(node_id, mission_id, task_type, accepted, required_evidence, **extra):
    n=dict(BASE); n.update({"node_id":node_id,"mission_id":mission_id,"task_family":task_type,"task_type":task_type,"response_mode":task_type,"accepted_answer":accepted,"required_evidence":required_evidence}); n.update(extra); return n

class CrossLaneContractTests(unittest.TestCase):
    def test_nested_missions_loader(self):
        n=node("GW01-N01","GW-01","SINGLE_CHOICE","Matthew",["GW-EV-1"],task_contract={"options":["Matthew","Mark"]})
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/"d3.json"; p.write_text(json.dumps({"missions":[{"nodes":[n]}]}),encoding="utf-8")
            self.assertEqual(load_package_nodes([p])[0]["node_id"], "GW01-N01")

    def test_speaker_recipient_real_shape(self):
        n=node("GW01-N03","GW-01","SPEAKER_RECIPIENT",{"speaker":"Narrator","recipient":"Reader"},["GW-EV-3"])
        a=adapt_node_for_runtime(n,lane="D3"); t=TaskDefinition.from_canonical(a)
        self.assertEqual(GraderRegistry().grade(t,derive_answer_dto(a)).correctness, Correctness.CORRECT)

    def test_parallel_witness_compare_real_shape(self):
        n=node("GW01-N19","GW-01","PARALLEL_WITNESS_COMPARE","Luke",["GW-EV-19"],task_contract={"answer_shape":"witness_name","options":["Matthew","Mark","Luke","John"]})
        a=adapt_node_for_runtime(n,lane="D3"); self.assertEqual(GraderRegistry().grade(TaskDefinition.from_canonical(a),derive_answer_dto(a)).correctness, Correctness.CORRECT)

    def test_ot_nt_link_real_shape(self):
        payload={"ot_passage":"2 Samuel 7:14","nt_passage":"Hebrews 1:5","relation_category":"DIRECT_QUOTATION","confidence":"T2","evidence_id":"EV-OT-1"}
        n=node("OTNTROYAL01-N019","OTNT-ROYAL-01","OT_NT_LINK","2 Samuel 7:14 ↔ Hebrews 1:5 | DIRECT_QUOTATION | T2 | EV-OT-1.","EV-OT-1",task_payload=payload)
        a=adapt_node_for_runtime(n,lane="D4"); result=GraderRegistry().grade(TaskDefinition.from_canonical(a),derive_answer_dto(a))
        self.assertEqual(result.correctness, Correctness.CORRECT); self.assertEqual(result.confidence.value,"T2")

    def test_d4_evidence_select_uses_explicit_correct_evidence(self):
        payload={"pairs":[{"left":"OT","right":"Psalm 2:7"},{"left":"NT","right":"Hebrews 1:5"}],"correct_evidence":["EV-OT-2"]}
        n=node("OTNTROYAL01-N007","OTNT-ROYAL-01","EVIDENCE_SELECT","OT: Psalm 2:7; NT: Hebrews 1:5.","EV-OT-2",task_payload=payload)
        a=adapt_node_for_runtime(n,lane="D4"); self.assertEqual(derive_answer_dto(a)["evidence_ids"],["EV-OT-2"])

    def test_d4_mislabeled_matching_fails_closed(self):
        n=node("OTNTROYAL01-N015","OTNT-ROYAL-01","MATCHING","Allowed proposition","EV-OT-3",task_payload={"claims":[{"text":"x","supported":True}],"evidence":["EV-OT-3"]})
        with self.assertRaises(ValidationError): adapt_node_for_runtime(n,lane="D4")

    def test_d3_composite_confidence_explanation(self):
        accepted={"confidence":"D1","conclusion":"Preserve each witness wording; detailed reconciliation is reconstruction."}
        n=node("GW01-N24","GW-01","COMPOSITE_MULTI_STEP",accepted,["GW-EV-24"])
        a=adapt_node_for_runtime(n,lane="D3"); result=GraderRegistry().grade(TaskDefinition.from_canonical(a),derive_answer_dto(a))
        self.assertEqual(result.correctness, Correctness.CORRECT)

    def test_application_exposes_answer_contract(self):
        n=node("GW01-N01","GW-01","SINGLE_CHOICE","Matthew",["GW-EV-1"],task_contract={"options":["Matthew","Mark"]})
        repo=ContentRepository([adapt_node_for_runtime(n,lane="D3")]); app=RuntimeApplication(repo)
        task=app.load_task("GW01-N01")["task"]
        self.assertEqual(task["answer_contract"]["schema"],"ANSWER_DTO_v1")

if __name__ == '__main__': unittest.main()
