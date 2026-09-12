import unittest

from scripture_archive_runtime.evidence import EvidenceRecord, EvidenceRuntime, PassageRef
from scripture_archive_runtime.models import Confidence
from scripture_archive_runtime.witness_matrix import NOT_STATED, build_witness_matrix


class WitnessMatrixWitnessTokenSafetyTests(unittest.TestCase):
    def test_requested_witness_tokens_reject_noncanonical_text(self):
        runtime = EvidenceRuntime()
        malformed_tokens = (
            " Mark",
            "Mark ",
            "Mark" + chr(0),
            "Mark" + chr(31),
            "Mark" + chr(127),
            "Mark" + chr(133),
            "Mark" + chr(8232),
            "Mark" + chr(8233),
        )
        for malformed in malformed_tokens:
            with self.subTest(token=repr(malformed)):
                with self.assertRaises(ValueError):
                    build_witness_matrix(runtime, witnesses=(malformed, "Luke"))

    def test_malformed_record_witness_with_valid_passage_signal_is_unassigned(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-MALFORMED-RECORD",
                (PassageRef("MK1:1", "Mark", 1, 1, witness="Mark"),),
                "Visible evidence must not inherit a malformed record witness.",
                Confidence.T1,
                witness="Mark ",
            )
        )
        runtime.unlock("EV-MALFORMED-RECORD")

        row = build_witness_matrix(runtime, witnesses=("Mark", "Luke")).to_dict()["rows"][0]
        cells = {cell["witness"]: cell for cell in row["cells"]}
        self.assertEqual(cells["Mark"]["status"], NOT_STATED)
        self.assertEqual(cells["Luke"]["status"], NOT_STATED)
        self.assertEqual(row["unassigned_evidence"][0]["evidence_id"], "EV-MALFORMED-RECORD")
        self.assertIsNone(row["unassigned_evidence"][0]["resolved_witness"])

    def test_malformed_passage_witness_is_unassigned_when_explicitly_selected(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-MALFORMED-PASSAGE",
                (PassageRef("MK1:2", "Mark", 1, 2, witness="Mark" + chr(8232)),),
                "Malformed passage attribution remains visible but unassigned.",
                Confidence.T1,
            )
        )
        runtime.unlock("EV-MALFORMED-PASSAGE")

        row = build_witness_matrix(
            runtime,
            witnesses=("Mark", "Luke"),
            evidence_ids=("EV-MALFORMED-PASSAGE",),
        ).to_dict()["rows"][0]
        cells = {cell["witness"]: cell for cell in row["cells"]}
        self.assertEqual(cells["Mark"]["status"], NOT_STATED)
        self.assertEqual(cells["Luke"]["status"], NOT_STATED)
        self.assertIsNone(row["unassigned_evidence"][0]["resolved_witness"])

    def test_conflicting_valid_record_and_passage_witnesses_are_unassigned(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-CONFLICT",
                (PassageRef("LK1:1", "Luke", 1, 1, witness="Luke"),),
                "Conflicting explicit attribution must fail closed.",
                Confidence.T1,
                witness="Mark",
            )
        )
        runtime.unlock("EV-CONFLICT")

        row = build_witness_matrix(
            runtime,
            witnesses=("Mark", "Luke"),
            evidence_ids=("EV-CONFLICT",),
        ).to_dict()["rows"][0]
        self.assertTrue(all(cell["status"] == NOT_STATED for cell in row["cells"]))
        self.assertIsNone(row["unassigned_evidence"][0]["resolved_witness"])

    def test_malformed_only_default_signal_does_not_select_record(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-MALFORMED-ONLY",
                (PassageRef("MK1:3", "Mark", 1, 3),),
                "Malformed-only witness signal must not select a default row.",
                Confidence.T1,
                witness=" Mark ",
            )
        )
        runtime.unlock("EV-MALFORMED-ONLY")

        matrix = build_witness_matrix(runtime, witnesses=("Mark", "Luke"))
        self.assertEqual(matrix.rows, ())


if __name__ == "__main__":
    unittest.main()
