import unittest
from copy import deepcopy

from scripture_archive_runtime.content import ContentRepository, validate_canonical_node
from scripture_archive_runtime.security import ValidationError
from tests.fixtures import LN01_N03, PA02_N04


class ContentValidationTests(unittest.TestCase):
    def test_real_ln_and_pa_validate(self):
        validate_canonical_node(LN01_N03); validate_canonical_node(PA02_N04)
        repo=ContentRepository([LN01_N03,PA02_N04]); self.assertEqual(set(repo.all()),{"LN01-N03","PA02-N04"})
    def test_tx1_is_separate_from_confidence(self):
        node=deepcopy(LN01_N03); node["textual_variant_flag"]="TX1"; node["confidence_code"]="T2"; validate_canonical_node(node)
        bad=deepcopy(node); bad["confidence_code"]="TX1"
        with self.assertRaises(ValidationError): validate_canonical_node(bad)
    def test_missing_nonvisual_equivalent_fails_closed(self):
        bad=deepcopy(LN01_N03); bad["functional_nonvisual_equivalent"]=""
        with self.assertRaises(ValidationError): validate_canonical_node(bad)
    def test_duplicate_stable_id_rejected(self):
        repo=ContentRepository([LN01_N03])
        with self.assertRaises(ValidationError): repo.add(LN01_N03)

if __name__ == "__main__": unittest.main()
