import json
import tempfile
import unittest
from pathlib import Path

from scripture_archive_runtime.materialization_manifest import (
    CANONICAL_JSON_METHOD, READABLE_MATERIALIZATION_SCHEMA,
    MaterializationManifestError, aggregate_record_hash,
    canonical_record_sha256, validate_materialization_manifest,
)


def _write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


class MaterializationManifestTests(unittest.TestCase):
    def _fixture(self, root):
        nodes=[{"node_id":"N1","mission_id":"M1","text":"Кирилиця"},{"node_id":"N2","mission_id":"M1","text":"second"}]
        evidence={"evidence_id":"E1","source":"Luke 1:1"}
        _write(root/'parts/n1.json', {'nodes':[nodes[0]]}); _write(root/'parts/n2.json', {'nodes':[nodes[1]]}); _write(root/'parts/e.json', {'records':[evidence]})
        nh={n['node_id']:canonical_record_sha256(n) for n in nodes}; eh={'E1':canonical_record_sha256(evidence)}
        manifest={
          'schema':READABLE_MATERIALIZATION_SCHEMA,'canonical_json_method':CANONICAL_JSON_METHOD,'lane':'TEST','campaign_id':'T',
          'content_schema':'CONTENT_NODE_SCHEMA_v1.2','provenance_contract':'GROUND_TRUTH_PROVENANCE_v1',
          'source_package':{'filename':'source.zip','drive_id':'drive','sha256':'1'*64},'github':{'branch':'b','head':'h'},
          'counts':{'nodes':2,'evidence':1},'collections':{
            'nodes':{'container_key':'nodes','id_fields':['node_id'],'count':2,'parts':[{'path':'parts/n1.json','record_ids':['N1']},{'path':'parts/n2.json','record_ids':['N2']}],'record_hashes':nh,'aggregate_sha256':aggregate_record_hash(nh)},
            'evidence':{'container_key':'records','id_fields':['evidence_id','id'],'count':1,'parts':[{'path':'parts/e.json','record_ids':['E1']}],'record_hashes':eh,'aggregate_sha256':aggregate_record_hash(eh)}}}
        _write(root/'manifest.json',manifest); return manifest

    def test_valid_split_materialization(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); self._fixture(root); snap=validate_materialization_manifest(root,'manifest.json'); self.assertEqual(len(snap.collection('nodes').records),2)

    def test_tamper_hash_mismatch_fails(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); self._fixture(root); _write(root/'parts/n2.json',{'nodes':[{'node_id':'N2','mission_id':'M1','text':'mutated'}]})
            with self.assertRaises(MaterializationManifestError): validate_materialization_manifest(root,'manifest.json')

    def test_missing_extra_or_duplicate_id_fails(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); manifest=self._fixture(root); manifest['collections']['nodes']['record_hashes']['N3']='2'*64; _write(root/'manifest.json',manifest)
            with self.assertRaises(MaterializationManifestError): validate_materialization_manifest(root,'manifest.json')
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); self._fixture(root); _write(root/'parts/n2.json',{'nodes':[{'node_id':'N1','mission_id':'M1','text':'Кирилиця'}]})
            with self.assertRaises(MaterializationManifestError): validate_materialization_manifest(root,'manifest.json')

    def test_path_utf8_and_size_guards(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); manifest=self._fixture(root); manifest['collections']['nodes']['parts'][0]['path']='../outside.json'; _write(root/'manifest.json',manifest)
            with self.assertRaises(MaterializationManifestError): validate_materialization_manifest(root,'manifest.json')
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); self._fixture(root); (root/'parts/n1.json').write_bytes(b'\xff\xfe')
            with self.assertRaises(MaterializationManifestError): validate_materialization_manifest(root,'manifest.json')
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); self._fixture(root)
            with self.assertRaises(MaterializationManifestError): validate_materialization_manifest(root,'manifest.json',max_part_bytes=10)

if __name__=='__main__': unittest.main()
