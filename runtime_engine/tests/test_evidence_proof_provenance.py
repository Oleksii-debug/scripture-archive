import unittest

from scripture_archive_runtime.evidence import Claim, EvidenceRecord, EvidenceRuntime, PassageRef
from scripture_archive_runtime.models import Confidence


class EvidenceProofProvenanceTests(unittest.TestCase):
    @staticmethod
    def _record(evidence_id: str, record_witness: str | None, passage_witness: str | None) -> EvidenceRecord:
        return EvidenceRecord(
            evidence_id,
            (PassageRef(f"{evidence_id}-P", "Mark", 1, 1, witness=passage_witness),),
            f"Evidence {evidence_id}",
            Confidence.T1,
            witness=record_witness,
        )

    def _runtime_with_claim(
        self,
        record: EvidenceRecord,
        *,
        claim_witness: str | None,
    ) -> EvidenceRuntime:
        runtime = EvidenceRuntime()
        runtime.add_evidence(record)
        runtime.unlock(record.evidence_id)
        runtime.add_claim(
            Claim(
                "CL-1",
                "Claim under test",
                Confidence.T1,
                required_evidence_ids=(record.evidence_id,),
                witness=claim_witness,
            )
        )
        return runtime

    def test_prove_claim_accepts_consistent_source_local_witness(self):
        runtime = self._runtime_with_claim(
            self._record("EV-MARK", "Mark", "Mark"),
            claim_witness="Mark",
        )

        result = runtime.prove_claim("CL-1", ("EV-MARK",))

        self.assertTrue(result.proven)
        self.assertEqual(result.accepted_evidence_ids, ("EV-MARK",))
        self.assertEqual(result.missing_evidence_ids, ())

    def test_prove_claim_rejects_passage_only_other_witness(self):
        runtime = self._runtime_with_claim(
            self._record("EV-LUKE", None, "Luke"),
            claim_witness="Mark",
        )

        result = runtime.prove_claim("CL-1", ("EV-LUKE",))

        self.assertFalse(result.proven)
        self.assertEqual(result.accepted_evidence_ids, ())
        self.assertEqual(result.missing_evidence_ids, ("EV-LUKE",))

    def test_prove_claim_rejects_record_passage_witness_conflict(self):
        runtime = self._runtime_with_claim(
            self._record("EV-CONFLICT", "Mark", "Luke"),
            claim_witness="Mark",
        )

        result = runtime.prove_claim("CL-1", ("EV-CONFLICT",))

        self.assertFalse(result.proven)
        self.assertEqual(result.accepted_evidence_ids, ())
        self.assertEqual(result.missing_evidence_ids, ("EV-CONFLICT",))

    def test_witnessless_cross_witness_claim_remains_permitted_without_fabricated_attribution(self):
        runtime = EvidenceRuntime()
        mark = self._record("EV-MARK", "Mark", "Mark")
        luke = self._record("EV-LUKE", "Luke", "Luke")
        for record in (mark, luke):
            runtime.add_evidence(record)
            runtime.unlock(record.evidence_id)
        runtime.add_claim(
            Claim(
                "CL-COMPARE",
                "Comparison claim without source-local witness attribution",
                Confidence.T2,
                required_evidence_ids=("EV-MARK", "EV-LUKE"),
                witness=None,
            )
        )

        result = runtime.prove_claim("CL-COMPARE", ("EV-MARK", "EV-LUKE"))

        self.assertTrue(result.proven)
        self.assertEqual(result.accepted_evidence_ids, ("EV-LUKE", "EV-MARK"))
        self.assertEqual(result.missing_evidence_ids, ())


if __name__ == "__main__":
    unittest.main()
