import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from scripture_archive_runtime.integration_materializer import MaterializationError, PackageSpec, materialize_packages, sha256_file
from scripture_archive_runtime.package_adapters import derive_answer_dto
from scripture_archive_runtime.provenance import ProvenanceClass, classify_provenance, provenance_contract_descriptor
from scripture_archive_runtime.security import ValidationError
from scripture_archive_runtime.strict_conformance import TruthClass, _authored_truth_status
from scripture_archive_runtime.transport_contract import CANONICAL_TASK_TYPES, transport_contract_descriptor


def node(task_type, grading=None, accepted='x', payload=None, required=None, variants=None):
    return {
        'node_id':'T-N1','task_type':task_type,'grading':grading or {},
        'accepted_answer':accepted,'accepted_variants':variants or [],
        'required_evidence':required or [],'task_payload':payload or {}
    }


class StrictTruthTests(unittest.TestCase):
    def test_direct_choice(self):
        self.assertEqual(_authored_truth_status(node('SINGLE_CHOICE', {'accepted_choice':'A'}, 'A'))[0], TruthClass.AUTHORED_DIRECT_PASS.value)

    def test_canonical_choice_without_grader_is_lossless(self):
        self.assertEqual(_authored_truth_status(node('SINGLE_CHOICE', {}, 'A'))[0], TruthClass.CANONICAL_LOSSLESS_NORMALIZATION_PASS.value)

    def test_legacy_accepted_value_is_explicit_pass(self):
        self.assertEqual(_authored_truth_status(node('COMBOBOX_SELECT', {'accepted_value':'A'}, 'A'))[0], TruthClass.LEGACY_EXPLICIT_NORMALIZATION_PASS.value)

    def test_choice_mismatch_fails(self):
        self.assertEqual(_authored_truth_status(node('SINGLE_CHOICE', {'accepted_choice':'B'}, 'A'))[0], TruthClass.MISMATCH_FAIL.value)

    def test_payload_correct_cannot_supply_missing_canonical_truth(self):
        d=classify_provenance(node('SINGLE_CHOICE', {}, '', payload={'correct':['A']}))
        self.assertEqual(d.provenance_class, ProvenanceClass.ADAPTER_INFERENCE_FAIL.value)
        with self.assertRaises(ValidationError): derive_answer_dto(node('SINGLE_CHOICE', {}, '', payload={'correct':['A']}))

    def test_option_order_cannot_supply_truth(self):
        d=classify_provenance(node('SINGLE_CHOICE', {}, '', payload={'options':['A','B'], 'correct_index':0}))
        self.assertEqual(d.provenance_class, ProvenanceClass.ADAPTER_INFERENCE_FAIL.value)

    def test_multiselect_direct_equivalence(self):
        d=classify_provenance(node('MULTI_SELECT', {'accepted_set':['B','A']}, ['A','B']))
        self.assertEqual(d.provenance_class, ProvenanceClass.AUTHORED_DIRECT_PASS.value)

    def test_multiselect_mismatch(self):
        d=classify_provenance(node('MULTI_SELECT', {'accepted_set':['A']}, ['A','B']))
        self.assertEqual(d.provenance_class, ProvenanceClass.MISMATCH_FAIL.value)

    def test_text_propositions_direct(self):
        d=classify_provenance(node('LONG_TEXT', {'accepted_propositions':[{'id':'p','required':True,'aliases':['alpha beta']}]} , 'alpha beta gamma'))
        self.assertEqual(d.provenance_class, ProvenanceClass.AUTHORED_DIRECT_PASS.value)

    def test_text_propositions_conflict(self):
        d=classify_provenance(node('LONG_TEXT', {'accepted_propositions':[{'id':'p','required':True,'aliases':['delta']}]} , 'alpha beta gamma'))
        self.assertEqual(d.provenance_class, ProvenanceClass.MISMATCH_FAIL.value)

    def test_ordering_direct(self):
        self.assertEqual(classify_provenance(node('ORDERING', {'accepted_order':['a','b']}, ['a','b'])).provenance_class, ProvenanceClass.AUTHORED_DIRECT_PASS.value)

    def test_matching_direct(self):
        self.assertEqual(classify_provenance(node('MATCHING', {'accepted_pairs':{'a':'b'}}, {'a':'b'})).provenance_class, ProvenanceClass.AUTHORED_DIRECT_PASS.value)

    def test_evidence_uses_canonical_required_evidence_without_payload(self):
        d=classify_provenance(node('EVIDENCE_SELECT', {}, [], payload={'correct_evidence':['WRONG']}, required=['E1']))
        self.assertEqual(d.provenance_class, ProvenanceClass.CANONICAL_LOSSLESS_NORMALIZATION_PASS.value)
        self.assertEqual(d.canonical_dto['evidence_ids'], ['E1'])

    def test_evidence_canonical_conflict_is_ambiguous_fail(self):
        d=classify_provenance(node('EVIDENCE_SELECT', {}, ['E2'], required=['E1']))
        self.assertEqual(d.provenance_class, ProvenanceClass.AMBIGUOUS_FAIL.value)

    def test_claim_evidence_direct(self):
        accepted={'claim':'claim alpha','evidence':['E1']}
        grading={'accepted_propositions':[{'id':'c','required':True,'aliases':['claim alpha']}], 'required_evidence_ids':['E1']}
        self.assertEqual(classify_provenance(node('CLAIM_EVIDENCE', grading, accepted, required=['E1'])).provenance_class, ProvenanceClass.AUTHORED_DIRECT_PASS.value)

    def test_speaker_recipient_legacy_pairs(self):
        accepted={'speaker':'Narrator','recipient':'Reader'}
        grading={'accepted_pairs':{'speaker':'Narrator','recipient':'Reader'}}
        self.assertEqual(classify_provenance(node('SPEAKER_RECIPIENT', grading, accepted)).provenance_class, ProvenanceClass.LEGACY_EXPLICIT_NORMALIZATION_PASS.value)

    def test_speaker_recipient_payload_cannot_infer(self):
        d=classify_provenance(node('SPEAKER_RECIPIENT', {}, {}, payload={'speaker':'Narrator','recipient':'Reader'}))
        self.assertEqual(d.provenance_class, ProvenanceClass.ADAPTER_INFERENCE_FAIL.value)

    def test_otnt_direct(self):
        accepted={'ot_passage':'a','nt_passage':'b','relation_category':'DIRECT_QUOTATION','confidence':'T2','evidence_id':'E1'}
        grading={'ot_nt_link':dict(accepted)}
        self.assertEqual(classify_provenance(node('OT_NT_LINK', grading, accepted)).provenance_class, ProvenanceClass.AUTHORED_DIRECT_PASS.value)

    def test_otnt_legacy_explicit(self):
        accepted={'ot_passage':'a','nt_passage':'b','relation_category':'DIRECT_QUOTATION','confidence':'T2','evidence_id':'E1'}
        grading={'accepted_link':dict(accepted)}
        self.assertEqual(classify_provenance(node('OT_NT_LINK', grading, accepted)).provenance_class, ProvenanceClass.LEGACY_EXPLICIT_NORMALIZATION_PASS.value)

    def test_otnt_payload_cannot_be_truth(self):
        payload={'ot_passage':'a','nt_passage':'b','relation_category':'DIRECT_QUOTATION','confidence':'T2','evidence_id':'E1', 'correct':'x'}
        d=classify_provenance(node('OT_NT_LINK', {}, '', payload=payload))
        self.assertEqual(d.provenance_class, ProvenanceClass.ADAPTER_INFERENCE_FAIL.value)

    def test_composite_direct_steps(self):
        accepted={'confidence':'D1','conclusion':'keep witnesses separate'}
        grading={'steps':[
            {'id':'confidence','task':{'task_type':'SINGLE_CHOICE','accepted_answer':'D1','required_evidence':[]}},
            {'id':'conclusion','task':{'task_type':'SHORT_TEXT','accepted_answer':'keep witnesses separate','required_evidence':[]}},
        ]}
        d=classify_provenance(node('COMPOSITE_MULTI_STEP', grading, accepted))
        self.assertEqual(d.provenance_class, ProvenanceClass.AUTHORED_DIRECT_PASS.value)
        self.assertEqual([s['step_id'] for s in d.canonical_dto['steps']], ['confidence','conclusion'])

    def test_composite_missing_step_structure_is_ambiguous(self):
        accepted={'confidence':'D1','conclusion':'x'}
        self.assertEqual(classify_provenance(node('COMPOSITE_MULTI_STEP', {}, accepted)).provenance_class, ProvenanceClass.AMBIGUOUS_FAIL.value)

    def test_composite_nested_mismatch_fails(self):
        accepted={'confidence':'D1'}
        grading={'steps':[{'id':'confidence','task':{'task_type':'SINGLE_CHOICE','accepted_answer':'T1','required_evidence':[]}}]}
        self.assertEqual(classify_provenance(node('COMPOSITE_MULTI_STEP', grading, accepted)).provenance_class, ProvenanceClass.MISMATCH_FAIL.value)

    def test_provenance_contract_marks_payload_as_nontruth(self):
        c=provenance_contract_descriptor()
        self.assertIn('task_payload.correct', c['presentation_fields_never_truth'])
        self.assertEqual(c['schema'], 'GROUND_TRUTH_PROVENANCE_v1')


class TransportTests(unittest.TestCase):
    def test_all_14_task_types(self): self.assertEqual(len(CANONICAL_TASK_TYPES), 14)
    def test_contract_schema(self): self.assertEqual(transport_contract_descriptor()['answer_contract'], 'ANSWER_DTO_v1')
    def test_contract_has_all_types(self): self.assertEqual(set(transport_contract_descriptor()['task_types']), set(CANONICAL_TASK_TYPES))
    def test_transport_exposes_provenance_contract(self): self.assertEqual(transport_contract_descriptor()['provenance']['schema'], 'GROUND_TRUTH_PROVENANCE_v1')


class MaterializerTests(unittest.TestCase):
    def _canonical(self, node_id='N1', evidence_id='E1', accepted='a', payload=None):
        return {
            'node_id':node_id,'mission_id':'N-1','task_family':'SINGLE_CHOICE','task_type':'SINGLE_CHOICE',
            'difficulty':1,'required':True,'skill_target':'x','knowledge_target':'x','why_this_node_exists':'x',
            'player_prompt':'x','source_scope_visible_to_player':'x','response_mode':'SINGLE_CHOICE',
            'accepted_answer':accepted,'accepted_variants':[],'required_evidence':[evidence_id],
            'rejected_answers':[],'rejection_reason':'x','confidence_code':'T1','textual_variant_flag':'none',
            'success_feedback':'x','partial_feedback':'x','failure_feedback':'x','hints':{'H1':'x'},
            'on_hint_threshold':'return_to_current_node','on_correct':'RESOLVED_NODE','on_partial':'return_to_current_node','on_incorrect':'return_to_current_node',
            'optional_evidence_unlock':'none','later_retrieval_effect':'RETIRED','mastery_domains':['x'],'evidence_strength':['x'],
            'mastery_mode':'independent','spaced_retrieval':'yes','review_queue_rule':'x','functional_nonvisual_equivalent':'text',
            'grading':{},'task_payload':payload or {}
        }

    def _zip(self, root, node_id='N1', evidence_id='E1', accepted='a', payload=None):
        z = Path(root)/'p.zip'
        with zipfile.ZipFile(z,'w') as f:
            f.writestr('nodes.json', json.dumps({'nodes':[self._canonical(node_id,evidence_id,accepted,payload)]}))
            f.writestr('evidence.json', json.dumps({'records':[{'evidence_id':evidence_id}]}))
        return z

    def _spec(self,z,sha=None): return PackageSpec('X',str(z),sha or sha256_file(z),'D','H',('nodes.json',),('evidence.json',),1,1)

    def test_materializes_valid_package(self):
        with tempfile.TemporaryDirectory() as d:
            z=self._zip(d); m=materialize_packages([self._spec(z)],Path(d)/'out')
            self.assertEqual(m['total_nodes'],1)
            self.assertEqual(m['schema'],'R06_INTEGRATION_MATERIALIZER_MANIFEST_v2')
            self.assertTrue((Path(d)/'out'/'x'/'ground_truth_index.json').exists())

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
                f.writestr('nodes.json', json.dumps({'nodes':[self._canonical()]}))
                f.writestr('evidence.json', json.dumps({'records':[{'evidence_id':'E1'}]}))
            with self.assertRaises(MaterializationError): materialize_packages([self._spec(z)],Path(d)/'out')

    def test_rejects_unresolved_evidence(self):
        with tempfile.TemporaryDirectory() as d:
            z=self._zip(d,evidence_id='MISSING')
            with zipfile.ZipFile(z,'w') as f:
                f.writestr('nodes.json', json.dumps({'nodes':[self._canonical(evidence_id='MISSING')]}))
                f.writestr('evidence.json', json.dumps({'records':[{'evidence_id':'E1'}]}))
            with self.assertRaises(MaterializationError): materialize_packages([self._spec(z)],Path(d)/'out')

    def test_rejects_schema_incompatibility(self):
        with tempfile.TemporaryDirectory() as d:
            z=Path(d)/'p.zip'; bad=self._canonical(); bad.pop('functional_nonvisual_equivalent')
            with zipfile.ZipFile(z,'w') as f:
                f.writestr('nodes.json', json.dumps({'nodes':[bad]})); f.writestr('evidence.json', json.dumps({'records':[{'evidence_id':'E1'}]}))
            with self.assertRaises(MaterializationError): materialize_packages([self._spec(z)],Path(d)/'out')

    def test_rejects_payload_only_truth(self):
        with tempfile.TemporaryDirectory() as d:
            z=self._zip(d, accepted='', payload={'correct':['a']})
            with self.assertRaises(MaterializationError): materialize_packages([self._spec(z)],Path(d)/'out')


if __name__ == '__main__': unittest.main()
