import unittest

from scripture_archive_runtime.dossiers import DossierAssembler, DossierKind, DossierSubject
from scripture_archive_runtime.evidence import Claim, EvidenceRecord, EvidenceRuntime, Relation
from scripture_archive_runtime.models import Confidence


class DossierWitnessRegressionTests(unittest.TestCase):
    def test_declared_claim_and_relation_witness_require_positive_visible_support(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                evidence_id="EV-WITNESSLESS",
                passage_refs=(),
                proposition="Canonical proposition with no witness attribution.",
                confidence=Confidence.T1,
                entity_ids=("PERSON-X",),
                relation_ids=("REL-WITNESSLESS",),
            )
        )
        runtime.add_claim(
            Claim(
                claim_id="CLAIM-WITNESSLESS",
                proposition="A declared witness must not be borrowed from metadata alone.",
                confidence=Confidence.T2,
                required_evidence_ids=("EV-WITNESSLESS",),
                witness="Luke",
            )
        )
        runtime.add_relation(
            Relation(
                relation_id="REL-WITNESSLESS",
                source_id="PERSON-X",
                relation_type="appears_in",
                target_id="EVENT-X",
                witness="Luke",
            )
        )
        runtime.unlock("EV-WITNESSLESS")

        view = DossierAssembler(runtime).build(
            DossierSubject("PERSON-X", DossierKind.PERSON, "X")
        )
        ids = [row.row_id for row in view.rows]
        self.assertIn("EV-WITNESSLESS", ids)
        self.assertNotIn("CLAIM-WITNESSLESS", ids)
        self.assertNotIn("REL-WITNESSLESS", ids)
        rendered = "\n".join(view.linearize())
        self.assertNotIn("witness=Luke", rendered)


if __name__ == "__main__":
    unittest.main()
