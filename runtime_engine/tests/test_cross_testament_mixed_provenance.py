import unittest

from scripture_archive_runtime.cross_testament import project_cross_testament
from scripture_archive_runtime.evidence import EvidenceRecord, EvidenceRuntime, PassageRef, Relation
from scripture_archive_runtime.models import Confidence


class MixedWitnessProvenanceTests(unittest.TestCase):
    def test_witness_null_mixed_record_preserves_passage_local_witnesses(self):
        runtime = EvidenceRuntime()
        ot = PassageRef("ISA7:14", "Isaiah", 7, 14, witness="Isaiah unit")
        nt = PassageRef("MT1:23", "Matthew", 1, 23, witness="Matthew unit")

        runtime.add_evidence(
            EvidenceRecord(
                "EV-MIXED",
                (ot, nt),
                "One technical evidence record intentionally spans distinct source-local witnesses.",
                Confidence.T1,
                witness=None,
            )
        )
        runtime.add_evidence(
            EvidenceRecord("EV-OT", (ot,), "OT support", Confidence.T1, witness="Isaiah unit")
        )
        runtime.add_evidence(
            EvidenceRecord("EV-NT", (nt,), "NT support", Confidence.T1, witness="Matthew unit")
        )
        runtime.add_relation(
            Relation(
                "REL-X",
                "EV-OT",
                "explicit_cross_reference",
                "EV-NT",
                passage_ids=("ISA7:14", "MT1:23"),
            )
        )
        for evidence_id in ("EV-MIXED", "EV-OT", "EV-NT"):
            runtime.unlock(evidence_id)

        projection = project_cross_testament(
            runtime,
            book_testaments={"Isaiah": "OT", "Matthew": "NT"},
        )

        self.assertEqual(len(projection.links), 1)
        link = projection.links[0]
        ot_provenance = {item.evidence_id: item.witness for item in link.ot.evidence}
        nt_provenance = {item.evidence_id: item.witness for item in link.nt.evidence}
        self.assertEqual(ot_provenance["EV-MIXED"], "Isaiah unit")
        self.assertEqual(nt_provenance["EV-MIXED"], "Matthew unit")
        self.assertNotEqual(ot_provenance["EV-MIXED"], nt_provenance["EV-MIXED"])


if __name__ == "__main__":
    unittest.main()
