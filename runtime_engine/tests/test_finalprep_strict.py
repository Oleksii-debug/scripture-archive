import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from scripture_archive_runtime.integration_materializer import MaterializationError, PackageSpec, materialize_packages, sha256_file
from scripture_archive_runtime.strict_conformance import TruthClass, _authored_truth_status
from scripture_archive_runtime.transport_contract import CANONICAL_TASK_TYPES, transport_contract_descriptor


def node(task_type, grading=None, accepted='x', payload=None):
    return {'node_id':'T-N1','task_type':task_type,'grading':grading or {},'accepted_answer':accepted,'task_payload':payload or {}}

class StrictTruthTests(unittest.TestCase):
    def test_authored_choice(self): self.assertEqual(_authored_truth_status(node('SINGLE_CHOICE', {'accepted_choice':'A'}))[0], TruthClass.AUTHORED_GROUND_TRUTH_PASS.value)
    def test_authored_text(self): self.assertEqual(_authored_truth_status(node('SHORT_TEXT', {'accepted_text':'x'}))[0], TruthClass.AUTHORED_GROUND_TRUTH_PASS.value)
    def test_authored_propositions(self): self.assertEqual(_authored_truth_status(node('LONG_TEXT', {'accepted_propositions':[{'aliases':['x']}]}))[0], TruthClass.AUTHORED_GROUND_TRUTH_PASS.value)
    def test_authored_ordering(self): self.assertEqual(_authored_truth_status(node('ORDERING', {'accepted_order':['a']}))[0], TruthClass.AUTHORED_GROUND_TRUTH_PASS.value)
    def test_authored_matching(self): self.assertEqual(_authored_truth_status(node('MATCHING', {'accepted_pairs':{'a':'b'}}))[0], TruthClass.AUTHORED_GROUND_TRUTH_PASS.value)
    def test_authored_evidence(self): self.assertEqual(_authored_truth_status(node('EVIDENCE_SELECT', {'required_evidence_ids':['E1']}))[0], TruthClass.AUTHORED_GROUND_TRUTH_PASS.value)
    def test_authored_claim_evidence_requires_both(self): self.assertEqual(_authored_truth_status(node('CLAIM_EVIDENCE', {'accepted_text':'x','required_evidence_ids':['E1']}))[0], TruthClass.AUTHORED_GROUND_TRUTH_PASS.value)
    def test_authored_speaker_recipient(self): self.assertEqual(_authored_truth_status(node('SPEAKER_RECIPIENT', {'speaker':'s','recipient':'r'}, {'speaker':'s','recipient':'r'}))[0], TruthClass.AUTHORED_GROUND_TRUTH_PASS.value)
    def test_authored_otnt(self): self.assertEqual(_authored_truth_status(node('OT_NT_LINK', {'ot_nt_link':{'ot_passage':'a'}}, {'ot_passage':'a'}))[0], TruthClass.AUTHORED_GROUND_TRUTH_PASS.value)
    def test_legacy_otnt_is_not_authored(self): self.assertEqual(_authored_truth_status(node('OT_NT_LINK', {'accepted_link':{'ot_passage':'a'}}, {'ot_passage':'a','nt_passage':'b','relation_category':'DIRECT_QUOTATION','confidence':'T2','evidence_id':'E1'}))[0], TruthClass.LEGACY_NORMALIZED_PASS.value)
    def test_adapter_derived_is_release_fail(self): self.assertEqual(_authored_truth_status(node('SINGLE_CHOICE', {}, 'A'))[0], TruthClass.ADAPTER_DERIVED_GROUND_TRUTH_FAIL_FOR_RELEASE.value)
    def test_composite_authored_steps(self): self.assertEqual(_authored_truth_status(node('COMPOSITE_MULTI_STEP', {'steps':[{'id':'a'}]}))[0], TruthClass.AUTHORED_GROUND_TRUTH_PASS.value)

class TransportTests(unittest.TestCase):
    def test_all_14_task_types(self): self.assertEqual(len(CANONICAL_TASK_TYPES), 14)
    def test_contract_schema(self): self.assertEqual(transport_contract_descriptor()['answer_contract'], 'ANSWER_DTO_v1')
    def test_contract_has_all_types(self): self.assertEqual(set(transport_contract_descriptor()['task_types']), set(CANONICAL_TASK_TYPES))

class MaterializerTests(unittest.TestCase):
    def _zip(self, root, node_id='N1', evidence_id='E1'):
        z = Path(root)/'p.zip'
        with zipfile.ZipFile(z,'w') as f:
            f.writestr('nodes.json', json.dumps({'nodes':[{'node_id':node_id,'task_type':'SINGLE_CHOICE','grading':{'accepted_choice':'a'},'accepted_answer':'a','required_evidence':[evidence_id]}]}))
            f.writestr('evidence.json', json.dumps({'records':[{'evidence_id':evidence_id}]}))
        return z
    def _spec(self,z,sha=None): return PackageSpec('X',str(z),sha or sha256_file(z),'D','H',('nodes.json',),('evidence.json',),1,1)
    def test_materializes_valid_package(self):
        with tempfile.TemporaryDirectory() as d:
            z=self._zip(d); m=materialize_packages([self._spec(z)],Path(d)/'out'); self.assertEqual(m['total_nodes'],1)
    def test_rejects_hash_mismatch(self):
        with tempfile.TemporaryDirectory() as d:
            z=self._zip(d)
            with self.assertRaises(MaterializationError): materialize_packages([self._spec(z,'0'*64)],Path(d)/'out')
    def test_rejects_duplicate_node_ids_across_packages(self):
        with tempfile.TemporaryDirectory() as d:
            d=Path(d); a=d/'a';b=d/'b';a.mkdir();b.mkdir(); z1=self._zip(a);z2=self._zip(b)
            s1=self._spec(z1);s2=PackageSpec('Y',str(z2),sha256_file(z2),'D2','H2',('nodes.json',),('evidence.json',),1,1)
            with self.assertRaises(MaterializationError): materialize_packages([s1,s2],d/'out')
    def test_rejects_unsafe_zip_member(self):
        with tempfile.TemporaryDirectory() as d:
            z=Path(d)/'p.zip'
            with zipfile.ZipFile(z,'w') as f:
                f.writestr('../evil.json', '{}')
                f.writestr('nodes.json', json.dumps({'nodes':[{'node_id':'N1','task_type':'SINGLE_CHOICE','grading':{'accepted_choice':'a'},'accepted_answer':'a','required_evidence':['E1']}]}))
                f.writestr('evidence.json', json.dumps({'records':[{'evidence_id':'E1'}]}))
            with self.assertRaises(MaterializationError): materialize_packages([self._spec(z)],Path(d)/'out')

    def test_rejects_unresolved_evidence(self):
        with tempfile.TemporaryDirectory() as d:
            z=self._zip(d,evidence_id='E1')
            # rewrite node required ref without evidence record
            with zipfile.ZipFile(z,'w') as f:
                f.writestr('nodes.json', json.dumps({'nodes':[{'node_id':'N1','task_type':'SINGLE_CHOICE','grading':{'accepted_choice':'a'},'accepted_answer':'a','required_evidence':['MISSING']}]}))
                f.writestr('evidence.json', json.dumps({'records':[{'evidence_id':'E1'}]}))
            with self.assertRaises(MaterializationError): materialize_packages([self._spec(z)],Path(d)/'out')

if __name__ == '__main__': unittest.main()
