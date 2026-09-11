import json
import unittest

from scripture_archive_runtime.evidence import Claim, EvidenceRecord, EvidenceRuntime, PassageRef, Relation
from scripture_archive_runtime.models import Confidence
from scripture_archive_runtime.witness_matrix import (
    NOT_STATED,
    STATED,
    build_witness_matrix,
)


class WitnessMatrixTests(unittest.TestCase):
    def runtime(self) -> EvidenceRuntime:
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-MARK",
                (PassageRef("MK14:13", "Mark", 14, 13, witness="Mark"),),
                "Mark says two disciples.",
                Confidence.T1,
                witness="Mark",
                relation_ids=("REL-PARALLEL",),
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-LUKE",
                (PassageRef("LK22:8", "Luke", 22, 8, witness="Luke"),),
                "Luke names Peter and John.",
                Confidence.T1,
                witness="Luke",
                relation_ids=("REL-PARALLEL",),
            )
        )
        runtime.add_relation(
            Relation(
                "REL-PARALLEL",
                "EV-MARK",
                "parallel_witness",
                "EV-LUKE",
                passage_ids=("MK14:13", "LK22:8"),
            )
        )
        runtime.add_claim(
            Claim(
                "CL-COMPARE",
                "Luke names the two disciples while Mark does not name them in the cited verse.",
                Confidence.T2,
                tx1=False,
                source_scope="Mark 14:13; Luke 22:8",
                uncertainty="Omission in the cited Mark verse is not denial.",
                required_evidence_ids=("EV-MARK", "EV-LUKE"),
                witness="Mark/Luke comparison",
            )
        )
        return runtime

    def test_parallel_witness_records_form_one_deterministic_row(self):
        runtime = self.runtime()
        runtime.unlock("EV-MARK")
        runtime.unlock("EV-LUKE")

        matrix = build_witness_matrix(runtime, witnesses=("Mark", "Luke"))
        payload = matrix.to_dict()

        self.assertEqual(payload["schema"], "witness-matrix.v1")
        self.assertEqual(payload["evidence_scope"], "unlocked_only")
        self.assertEqual(len(payload["rows"]), 1)
        row = payload["rows"][0]
        self.assertEqual(row["evidence_ids"], ["EV-LUKE", "EV-MARK"])
        cells = {cell["witness"]: cell for cell in row["cells"]}
        self.assertEqual(cells["Mark"]["status"], STATED)
        self.assertEqual(cells["Luke"]["status"], STATED)
        self.assertEqual(cells["Mark"]["evidence"][0]["proposition"], "Mark says two disciples.")
        self.assertEqual(cells["Luke"]["evidence"][0]["proposition"], "Luke names Peter and John.")
        self.assertEqual(row["relations"][0]["relation_id"], "REL-PARALLEL")
        self.assertEqual(row["claims"][0]["confidence"], "T2")
        self.assertEqual(row["claims"][0]["source_scope"], "Mark 14:13; Luke 22:8")
        self.assertEqual(row["claims"][0]["uncertainty"], "Omission in the cited Mark verse is not denial.")

    def test_locked_evidence_and_claim_truth_do_not_leak_from_default_matrix(self):
        runtime = self.runtime()
        runtime.unlock("EV-MARK")

        matrix = build_witness_matrix(runtime, witnesses=("Mark", "Luke"))
        serialized = json.dumps(matrix.to_dict(), ensure_ascii=False, sort_keys=True)
        linear = "\n".join(matrix.linearize())

        self.assertIn("EV-MARK", serialized)
        self.assertNotIn("EV-LUKE", serialized)
        self.assertNotIn("Luke names Peter and John.", serialized)
        self.assertNotIn("CL-COMPARE", serialized)
        self.assertNotIn("EV-LUKE", linear)
        self.assertNotIn("Luke names Peter and John.", linear)

        row = matrix.to_dict()["rows"][0]
        cells = {cell["witness"]: cell for cell in row["cells"]}
        self.assertEqual(cells["Mark"]["status"], STATED)
        self.assertEqual(cells["Luke"]["status"], NOT_STATED)
        self.assertEqual(row["relations"], [])
        self.assertEqual(row["claims"], [])

    def test_absence_is_not_upgraded_to_denial_or_contradiction(self):
        runtime = self.runtime()
        runtime.unlock("EV-MARK")
        payload = build_witness_matrix(runtime, witnesses=("Mark", "Luke")).to_dict()

        luke = {cell["witness"]: cell for cell in payload["rows"][0]["cells"]}["Luke"]
        self.assertEqual(luke["status"], "not_stated_in_visible_scope")
        self.assertEqual(payload["contradiction_semantics"], "not_inferred")
        self.assertIn("not denial", payload["absence_semantics"])
        self.assertIn("not proof", payload["absence_semantics"])

    def test_explicit_full_scope_may_include_locked_parallel_record_and_claim(self):
        runtime = self.runtime()
        runtime.unlock("EV-MARK")

        payload = build_witness_matrix(
            runtime,
            witnesses=("Mark", "Luke"),
            include_locked_evidence=True,
        ).to_dict()

        self.assertEqual(payload["evidence_scope"], "all_runtime_evidence")
        self.assertEqual(len(payload["rows"]), 1)
        row = payload["rows"][0]
        self.assertEqual(row["evidence_ids"], ["EV-LUKE", "EV-MARK"])
        self.assertEqual([claim["claim_id"] for claim in row["claims"]], ["CL-COMPARE"])

    def test_explicit_selection_fails_closed_for_locked_or_unknown_evidence(self):
        runtime = self.runtime()
        runtime.unlock("EV-MARK")

        with self.assertRaises(PermissionError):
            build_witness_matrix(
                runtime,
                witnesses=("Mark", "Luke"),
                evidence_ids=("EV-MARK", "EV-LUKE"),
            )
        with self.assertRaises(KeyError):
            build_witness_matrix(
                runtime,
                witnesses=("Mark", "Luke"),
                evidence_ids=("EV-MISSING",),
            )

    def test_passage_witness_can_assign_record_when_record_witness_is_absent(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-JOHN",
                (PassageRef("JN20:30", "John", 20, 30, witness="John"),),
                "John states that Jesus did many other signs.",
                Confidence.T1,
            )
        )
        runtime.unlock("EV-JOHN")

        row = build_witness_matrix(runtime, witnesses=("John", "Luke")).to_dict()["rows"][0]
        cells = {cell["witness"]: cell for cell in row["cells"]}
        self.assertEqual(cells["John"]["status"], STATED)
        self.assertEqual(cells["Luke"]["status"], NOT_STATED)
        self.assertEqual(row["unassigned_evidence"], [])

    def test_conflicting_passage_witnesses_are_not_falsely_attributed(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-MIXED",
                (
                    PassageRef("MK1:1", "Mark", 1, 1, witness="Mark"),
                    PassageRef("LK1:1", "Luke", 1, 1, witness="Luke"),
                ),
                "A cross-witness synthesis record.",
                Confidence.T2,
            )
        )
        runtime.unlock("EV-MIXED")

        row = build_witness_matrix(runtime, witnesses=("Mark", "Luke")).to_dict()["rows"][0]
        self.assertTrue(all(cell["status"] == NOT_STATED for cell in row["cells"]))
        self.assertEqual(row["unassigned_evidence"][0]["evidence_id"], "EV-MIXED")
        self.assertIsNone(row["unassigned_evidence"][0]["resolved_witness"])

    def test_output_is_deterministic_across_runtime_insertion_order(self):
        first = self.runtime()
        first.unlock("EV-LUKE")
        first.unlock("EV-MARK")

        second = EvidenceRuntime()
        second.add_evidence(first.evidence["EV-LUKE"])
        second.add_evidence(first.evidence["EV-MARK"])
        second.add_claim(first.claims["CL-COMPARE"])
        second.add_relation(first.relations["REL-PARALLEL"])
        second.unlock("EV-MARK")
        second.unlock("EV-LUKE")

        first_json = json.dumps(
            build_witness_matrix(first, witnesses=("Mark", "Luke")).to_dict(),
            ensure_ascii=False,
            sort_keys=True,
        )
        second_json = json.dumps(
            build_witness_matrix(second, witnesses=("Mark", "Luke")).to_dict(),
            ensure_ascii=False,
            sort_keys=True,
        )
        self.assertEqual(first_json, second_json)

    def test_witness_list_is_strict_and_stable(self):
        runtime = EvidenceRuntime()
        with self.assertRaises(ValueError):
            build_witness_matrix(runtime, witnesses=("Mark",))
        with self.assertRaises(ValueError):
            build_witness_matrix(runtime, witnesses=("Mark", "Mark"))
        with self.assertRaises(ValueError):
            build_witness_matrix(runtime, witnesses=("Mark", " "))


if __name__ == "__main__":
    unittest.main()
