import unittest

from scripture_archive_runtime.evidence import (
    Claim,
    EvidenceRecord,
    EvidenceRuntime,
    PassageRef,
    Relation,
)
from scripture_archive_runtime.evidence_provenance import (
    resolve_evidence_witness,
    resolve_support_witness,
    validated_claim_witness,
    validated_relation_witness,
    visible_relation_passage_ids,
)
from scripture_archive_runtime.models import Confidence


class EvidenceProvenanceTests(unittest.TestCase):
    def _record(
        self,
        evidence_id: str,
        *,
        record_witness: str | None,
        passage_witnesses: tuple[str | None, ...],
    ) -> EvidenceRecord:
        passages = tuple(
            PassageRef(
                f"{evidence_id}-P{index}",
                "Mark" if witness == "Mark" else "Luke" if witness == "Luke" else "John",
                1,
                index,
                witness=witness,
            )
            for index, witness in enumerate(passage_witnesses, start=1)
        )
        return EvidenceRecord(
            evidence_id,
            passages,
            f"Proposition for {evidence_id}",
            Confidence.T1,
            witness=record_witness,
        )

    def test_record_witness_requires_record_and_passages_to_agree(self):
        consistent = self._record(
            "EV-MARK",
            record_witness="Mark",
            passage_witnesses=("Mark", "Mark"),
        )
        conflicting = self._record(
            "EV-CONFLICT",
            record_witness="Mark",
            passage_witnesses=("Luke",),
        )
        passage_only = self._record(
            "EV-PASSAGE",
            record_witness=None,
            passage_witnesses=("Luke", "Luke"),
        )
        mixed = self._record(
            "EV-MIXED",
            record_witness=None,
            passage_witnesses=("Mark", "Luke"),
        )

        self.assertEqual(resolve_evidence_witness(consistent), "Mark")
        self.assertIsNone(resolve_evidence_witness(conflicting))
        self.assertEqual(resolve_evidence_witness(passage_only), "Luke")
        self.assertIsNone(resolve_evidence_witness(mixed))

    def test_padded_witness_tokens_fail_closed_instead_of_normalizing(self):
        padded_record = self._record(
            "EV-PADDED-RECORD",
            record_witness=" Mark ",
            passage_witnesses=("Mark",),
        )
        padded_passage = self._record(
            "EV-PADDED-PASSAGE",
            record_witness="Mark",
            passage_witnesses=(" Mark ",),
        )

        self.assertIsNone(resolve_evidence_witness(padded_record))
        self.assertIsNone(resolve_evidence_witness(padded_passage))

    def test_support_witness_fails_closed_for_mixed_hidden_unknown_or_conflicting_support(self):
        runtime = EvidenceRuntime()
        mark_a = self._record("EV-MARK-A", record_witness="Mark", passage_witnesses=("Mark",))
        mark_b = self._record("EV-MARK-B", record_witness=None, passage_witnesses=("Mark",))
        luke = self._record("EV-LUKE", record_witness="Luke", passage_witnesses=("Luke",))
        conflict = self._record("EV-CONFLICT", record_witness="Mark", passage_witnesses=("Luke",))
        for record in (mark_a, mark_b, luke, conflict):
            runtime.add_evidence(record)
        for evidence_id in ("EV-MARK-A", "EV-MARK-B", "EV-LUKE", "EV-CONFLICT"):
            runtime.unlock(evidence_id)

        self.assertEqual(resolve_support_witness(runtime, ("EV-MARK-A", "EV-MARK-B")), "Mark")
        self.assertIsNone(resolve_support_witness(runtime, ("EV-MARK-A", "EV-LUKE")))
        self.assertIsNone(resolve_support_witness(runtime, ("EV-CONFLICT",)))
        self.assertIsNone(resolve_support_witness(runtime, ("EV-MISSING",)))
        self.assertIsNone(resolve_support_witness(runtime, "EV-MARK-A"))

        runtime.unlocked.remove("EV-MARK-B")
        self.assertIsNone(resolve_support_witness(runtime, ("EV-MARK-A", "EV-MARK-B")))
        self.assertEqual(
            resolve_support_witness(
                runtime,
                ("EV-MARK-A", "EV-MARK-B"),
                visible_evidence_ids=runtime.evidence,
            ),
            "Mark",
        )

    def test_claim_witness_accepts_source_local_support_but_not_comparison_or_third_witness(self):
        runtime = EvidenceRuntime()
        mark_a = self._record("EV-MARK-A", record_witness="Mark", passage_witnesses=("Mark",))
        mark_b = self._record("EV-MARK-B", record_witness="Mark", passage_witnesses=("Mark",))
        luke = self._record("EV-LUKE", record_witness="Luke", passage_witnesses=("Luke",))
        for record in (mark_a, mark_b, luke):
            runtime.add_evidence(record)
            runtime.unlock(record.evidence_id)

        valid = Claim(
            "CL-MARK",
            "Mark-local claim.",
            Confidence.T1,
            required_evidence_ids=("EV-MARK-A", "EV-MARK-B"),
            witness="Mark",
        )
        comparison = Claim(
            "CL-COMPARE",
            "Cross-witness comparison.",
            Confidence.T2,
            required_evidence_ids=("EV-MARK-A", "EV-LUKE"),
            witness="Mark/Luke comparison",
        )
        third_witness = Claim(
            "CL-JOHN",
            "Unsupported John attribution.",
            Confidence.T2,
            required_evidence_ids=("EV-MARK-A", "EV-MARK-B"),
            witness="John",
        )
        padded = Claim(
            "CL-PADDED",
            "Malformed witness token.",
            Confidence.T1,
            required_evidence_ids=("EV-MARK-A",),
            witness=" Mark ",
        )

        self.assertEqual(validated_claim_witness(runtime, valid), "Mark")
        self.assertIsNone(validated_claim_witness(runtime, comparison))
        self.assertIsNone(validated_claim_witness(runtime, third_witness))
        self.assertIsNone(validated_claim_witness(runtime, padded))

    def test_relation_witness_requires_all_evidence_endpoints(self):
        runtime = EvidenceRuntime()
        mark = self._record("EV-MARK", record_witness="Mark", passage_witnesses=("Mark",))
        luke = self._record("EV-LUKE", record_witness="Luke", passage_witnesses=("Luke",))
        for record in (mark, luke):
            runtime.add_evidence(record)
            runtime.unlock(record.evidence_id)

        relation = Relation(
            "REL-MIXED",
            "EV-MARK",
            "parallel_witness",
            "EV-LUKE",
            witness="Mark",
        )

        self.assertIsNone(validated_relation_witness(runtime, relation, ("EV-MARK",)))
        self.assertIsNone(validated_relation_witness(runtime, relation, ("EV-MARK", "EV-LUKE")))

    def test_relation_witness_rejects_hidden_endpoint(self):
        runtime = EvidenceRuntime()
        mark_a = self._record("EV-MARK-A", record_witness="Mark", passage_witnesses=("Mark",))
        mark_b = self._record("EV-MARK-B", record_witness="Mark", passage_witnesses=("Mark",))
        for record in (mark_a, mark_b):
            runtime.add_evidence(record)
        runtime.unlock("EV-MARK-A")

        relation = Relation(
            "REL-HIDDEN",
            "EV-MARK-A",
            "supports",
            "EV-MARK-B",
            witness="Mark",
        )

        self.assertIsNone(
            validated_relation_witness(runtime, relation, ("EV-MARK-A", "EV-MARK-B"))
        )
        self.assertEqual(
            validated_relation_witness(
                runtime,
                relation,
                ("EV-MARK-A", "EV-MARK-B"),
                visible_evidence_ids=runtime.evidence,
            ),
            "Mark",
        )

    def test_relation_witness_accepts_complete_same_witness_endpoints(self):
        runtime = EvidenceRuntime()
        mark_a = self._record("EV-MARK-A", record_witness="Mark", passage_witnesses=("Mark",))
        mark_b = self._record("EV-MARK-B", record_witness="Mark", passage_witnesses=("Mark",))
        for record in (mark_a, mark_b):
            runtime.add_evidence(record)
            runtime.unlock(record.evidence_id)

        relation = Relation(
            "REL-MARK",
            "EV-MARK-A",
            "supports",
            "EV-MARK-B",
            witness="Mark",
        )

        self.assertEqual(
            validated_relation_witness(runtime, relation, ("EV-MARK-A", "EV-MARK-B")),
            "Mark",
        )

    def test_relation_non_evidence_endpoints_preserve_explicit_support(self):
        runtime = EvidenceRuntime()
        mark = self._record("EV-MARK", record_witness="Mark", passage_witnesses=("Mark",))
        runtime.add_evidence(mark)
        runtime.unlock(mark.evidence_id)
        relation = Relation(
            "REL-PERSON-PLACE",
            "PERSON-PETER",
            "mentioned_at",
            "PLACE-GALILEE",
            witness="Mark",
            passage_ids=(mark.passage_refs[0].passage_id,),
        )

        self.assertEqual(validated_relation_witness(runtime, relation, ("EV-MARK",)), "Mark")
        self.assertEqual(
            visible_relation_passage_ids(runtime, relation, ("EV-MARK",)),
            (mark.passage_refs[0].passage_id,),
        )

    def test_relation_passage_ids_require_complete_visible_canonical_support(self):
        runtime = EvidenceRuntime()
        mark = self._record("EV-MARK", record_witness="Mark", passage_witnesses=("Mark",))
        luke = self._record("EV-LUKE", record_witness="Luke", passage_witnesses=("Luke",))
        runtime.add_evidence(mark)
        runtime.add_evidence(luke)
        runtime.unlock("EV-MARK")

        mark_pid = mark.passage_refs[0].passage_id
        luke_pid = luke.passage_refs[0].passage_id
        relation = Relation(
            "REL-PASSAGES",
            "EV-MARK",
            "parallel_witness",
            "EV-LUKE",
            passage_ids=(luke_pid, "P-UNSUPPORTED", mark_pid, mark_pid),
        )

        self.assertEqual(
            visible_relation_passage_ids(
                runtime,
                relation,
                ("EV-MARK", "EV-LUKE"),
            ),
            (),
        )
        self.assertEqual(
            visible_relation_passage_ids(
                runtime,
                relation,
                ("EV-MARK",),
            ),
            (),
        )
        self.assertEqual(
            visible_relation_passage_ids(
                runtime,
                relation,
                ("EV-MARK", "EV-LUKE"),
                visible_evidence_ids=runtime.evidence,
            ),
            (luke_pid, mark_pid),
        )

    def test_resolution_is_deterministic_under_support_order(self):
        runtime = EvidenceRuntime()
        for evidence_id in ("EV-A", "EV-B"):
            record = self._record(evidence_id, record_witness="Mark", passage_witnesses=("Mark",))
            runtime.add_evidence(record)
            runtime.unlock(evidence_id)

        self.assertEqual(resolve_support_witness(runtime, ("EV-A", "EV-B")), "Mark")
        self.assertEqual(resolve_support_witness(runtime, ("EV-B", "EV-A")), "Mark")


if __name__ == "__main__":
    unittest.main()
