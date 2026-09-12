import unittest

from scripture_archive_runtime.evidence import (
    Claim,
    EvidenceRecord,
    EvidenceRuntime,
    PassageRef,
)
from scripture_archive_runtime.evidence_provenance import (
    resolve_evidence_witness,
    validated_claim_witness,
)
from scripture_archive_runtime.models import Confidence


class EvidenceProvenanceWitnessControlTests(unittest.TestCase):
    @staticmethod
    def _record(evidence_id: str, witness: str) -> EvidenceRecord:
        return EvidenceRecord(
            evidence_id,
            (
                PassageRef(
                    f"{evidence_id}-P1",
                    "Mark",
                    1,
                    1,
                    witness=witness,
                ),
            ),
            f"Proposition for {evidence_id}",
            Confidence.T1,
            witness=witness,
        )

    def test_control_bearing_record_and_passage_witnesses_fail_closed(self):
        controls = ("\x00", "\x1f", "\x7f", "\x85", "\u2028", "\u2029")
        for index, control in enumerate(controls):
            with self.subTest(codepoint=hex(ord(control))):
                token = f"Mark{control}"
                record = self._record(f"EV-CONTROL-{index}", token)
                self.assertIsNone(resolve_evidence_witness(record))

    def test_control_bearing_declared_witness_cannot_prove_claim(self):
        controls = ("\x00", "\x1f", "\x7f", "\x85", "\u2028", "\u2029")
        for index, control in enumerate(controls):
            with self.subTest(codepoint=hex(ord(control))):
                token = f"Mark{control}"
                evidence_id = f"EV-CONTROL-PROOF-{index}"
                claim_id = f"CL-CONTROL-{index}"
                runtime = EvidenceRuntime()
                runtime.add_evidence(self._record(evidence_id, token))
                runtime.unlock(evidence_id)
                claim = Claim(
                    claim_id,
                    "Malformed witness identity must fail closed.",
                    Confidence.T1,
                    required_evidence_ids=(evidence_id,),
                    witness=token,
                )
                runtime.add_claim(claim)

                self.assertIsNone(validated_claim_witness(runtime, claim))
                result = runtime.prove_claim(claim_id, (evidence_id,))
                self.assertFalse(result.proven)
                self.assertEqual((), result.accepted_evidence_ids)
                self.assertEqual((evidence_id,), result.missing_evidence_ids)

    def test_ordinary_unicode_witness_remains_valid(self):
        witness = "Марко"
        evidence_id = "EV-UNICODE-WITNESS"
        claim_id = "CL-UNICODE-WITNESS"
        runtime = EvidenceRuntime()
        record = self._record(evidence_id, witness)
        runtime.add_evidence(record)
        runtime.unlock(evidence_id)
        claim = Claim(
            claim_id,
            "Ordinary Unicode witness identity remains valid.",
            Confidence.T1,
            required_evidence_ids=(evidence_id,),
            witness=witness,
        )
        runtime.add_claim(claim)

        self.assertEqual(witness, resolve_evidence_witness(record))
        self.assertEqual(witness, validated_claim_witness(runtime, claim))
        result = runtime.prove_claim(claim_id, (evidence_id,))
        self.assertTrue(result.proven)
        self.assertEqual((evidence_id,), result.accepted_evidence_ids)
        self.assertEqual((), result.missing_evidence_ids)


if __name__ == "__main__":
    unittest.main()
