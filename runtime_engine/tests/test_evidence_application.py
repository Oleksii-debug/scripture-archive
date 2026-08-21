import tempfile
import unittest

from scripture_archive_runtime.application import RuntimeApplication
from scripture_archive_runtime.content import ContentRepository
from scripture_archive_runtime.evidence import Claim, EvidenceRecord, EvidenceRuntime, PassageRef, Relation
from scripture_archive_runtime.models import Confidence
from scripture_archive_runtime.persistence import PersistenceStore
from scripture_archive_runtime.security import ValidationError
from tests.fixtures import LN01_N03, PA02_N04, node_from


class EvidenceApplicationTests(unittest.TestCase):
    def evidence_runtime(self):
        runtime=EvidenceRuntime(); runtime.add_evidence(EvidenceRecord("EV-MARK",(PassageRef("MK14:13","Mark",14,13,witness="Mark"),),"Mark says two disciples",Confidence.T1,witness="Mark")); runtime.add_evidence(EvidenceRecord("EV-LUKE",(PassageRef("LK22:8","Luke",22,8,witness="Luke"),),"Luke names Peter and John",Confidence.T1,witness="Luke")); runtime.add_claim(Claim("CL-MARK","Mark alone does not name Peter and John",Confidence.T2,source_scope="Mark 14:13; Luke 22:8",required_evidence_ids=("EV-MARK","EV-LUKE"))); runtime.add_relation(Relation("REL-1","EV-MARK","parallel_witness","EV-LUKE",passage_ids=("MK14:13","LK22:8"))); return runtime
    def test_evidence_unlock_prove_and_linear_nonspatial(self):
        runtime=self.evidence_runtime(); runtime.unlock("EV-MARK"); runtime.unlock("EV-LUKE"); self.assertTrue(runtime.prove_claim("CL-MARK",["EV-MARK","EV-LUKE"]).proven); lines=runtime.linearize(claim_id="CL-MARK"); self.assertTrue(any("Claim CL-MARK" in x for x in lines)); self.assertTrue(any("Evidence EV-MARK" in x for x in lines))
    def test_locked_evidence_fails_closed(self):
        runtime=self.evidence_runtime(); runtime.unlock("EV-MARK")
        with self.assertRaises(PermissionError): runtime.prove_claim("CL-MARK",["EV-MARK","EV-LUKE"])
    def test_application_runtime_api_with_real_ln_fixture(self):
        next_node=node_from(PA02_N04,node_id="LN01-N04",mission_id="LN-01",on_correct="REVIEW_QUEUE DONE",later_retrieval_effect="REVIEW_QUEUE DONE"); app=RuntimeApplication(ContentRepository([LN01_N03,next_node])); loaded=app.handle({"api_version":"runtime.v1","command":"load_task","request_id":"1","payload":{"node_id":"LN01-N03"}}); self.assertEqual(loaded["task"]["confidence"],"T2")
        out=app.handle({"api_version":"runtime.v1","command":"submit_answer","request_id":"2","payload":{"node_id":"LN01-N03","answer":LN01_N03["accepted_answer"]}}); self.assertEqual(out["grade"]["correctness"],"CORRECT"); self.assertEqual(out["branch"]["next_node_id"],"LN01-N04"); self.assertEqual(out["accessibility"][0]["event_type"],"grade"); self.assertTrue(any("Confidence: T2" in x for x in out["accessibility"][0]["details"]))
    def test_hint_progression_and_guided_mastery(self):
        app=RuntimeApplication(ContentRepository([LN01_N03])); app.load_task("LN01-N03")
        for i in range(1,7): self.assertEqual(app.request_hint("LN01-N03")["hint"]["level"],i)
        self.assertTrue(all(c["reason"]=="guided_correct" for c in app.submit_answer("LN01-N03",LN01_N03["accepted_answer"])["mastery_consequence"]))
    def test_save_restore_foundation(self):
        with tempfile.TemporaryDirectory() as td:
            repo=ContentRepository([LN01_N03]); store=PersistenceStore(td); app=RuntimeApplication(repo,persistence=store); app.load_task("LN01-N03"); app.save(); app2=RuntimeApplication(repo,persistence=store); self.assertEqual(app2.restore()["current_node_id"],"LN01-N03")
    def test_save_restore_rehydrates_history_and_mastery(self):
        with tempfile.TemporaryDirectory() as td:
            repo=ContentRepository([LN01_N03]); store=PersistenceStore(td); app=RuntimeApplication(repo,persistence=store); app.load_task("LN01-N03"); app.submit_answer("LN01-N03",LN01_N03["accepted_answer"]); app.memory.campaign_checkpoints["LN"]="LN01-N03"; app.memory.passage_exposure["Mark 14:13"]=2; app.save(); app2=RuntimeApplication(repo,persistence=store); app2.restore(); self.assertTrue(app2.memory.node_history["LN01-N03"].completed); self.assertIn("TEXT_VS_INFERENCE",app2.memory.concept_mastery); self.assertEqual(app2.memory.campaign_checkpoints["LN"],"LN01-N03"); self.assertEqual(app2.memory.passage_exposure["Mark 14:13"],2)
    def test_submit_wrong_current_node_rejected(self):
        app=RuntimeApplication(ContentRepository([LN01_N03,PA02_N04])); app.load_task("LN01-N03")
        with self.assertRaises(ValidationError): app.submit_answer("PA02-N04","x")

if __name__ == "__main__": unittest.main()
