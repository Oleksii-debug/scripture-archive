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
        self.assertEqual(payload["selection_scope"], "requested_witnesses")
        self.assertEqual(len(payload["rows"]), 1)
        row = payload["rows"][0]
        self.assertEqual(row["evidence_ids"], ["EV-LUKE", "EV-MARK"])
        cells = {cell["witness"]: cell for cell in row["cells"]}
        self.assertEqual(cells["Mark"]["status"], STATED)
        self.assertEqual(cells["Luke"]["status"], STATED)
        self.assertEqual(cells["Mark"]["evidence"][0]["proposition"], "Mark says two disciples.")
        self.assertEqual(cells["Luke"]["evidence"][0]["proposition"], "Luke names Peter and John.")
        self.assertEqual(cells["Mark"]["evidence"][0]["relation_ids"], ["REL-PARALLEL"])
        self.assertEqual(row["relations"][0]["relation_id"], "REL-PARALLEL")
        self.assertEqual(row["claims"][0]["confidence"], "T2")
        self.assertEqual(row["claims"][0]["source_scope"], "Mark 14:13; Luke 22:8")
        self.assertEqual(row["claims"][0]["uncertainty"], "Omission in the cited Mark verse is not denial.")

        linear = "\n".join(matrix.linearize())
        self.assertIn("Selection scope: requested_witnesses", linear)
        self.assertIn("Relation REL-PARALLEL: EV-MARK --parallel_witness--> EV-LUKE", linear)
        self.assertIn("Passage IDs: MK14:13, LK22:8", linear)
        self.assertIn("Witness: Mark/Luke comparison", linear)
        self.assertIn("Required evidence IDs: EV-MARK, EV-LUKE", linear)
        self.assertIn("Passage MK14:13: Mark 14:13; witness=Mark", linear)

    def test_locked_evidence_claim_and_relation_identity_do_not_leak_from_default_matrix(self):
        runtime = self.runtime()
        runtime.unlock("EV-MARK")

        matrix = build_witness_matrix(runtime, witnesses=("Mark", "Luke"))
        serialized = json.dumps(matrix.to_dict(), ensure_ascii=False, sort_keys=True)
        linear = "\n".join(matrix.linearize())

        self.assertIn("EV-MARK", serialized)
        self.assertNotIn("EV-LUKE", serialized)
        self.assertNotIn("REL-PARALLEL", serialized)
        self.assertNotIn("Luke names Peter and John.", serialized)
        self.assertNotIn("CL-COMPARE", serialized)
        self.assertNotIn("EV-LUKE", linear)
        self.assertNotIn("REL-PARALLEL", linear)
        self.assertNotIn("Luke names Peter and John.", linear)

        row = matrix.to_dict()["rows"][0]
        cells = {cell["witness"]: cell for cell in row["cells"]}
        self.assertEqual(cells["Mark"]["status"], STATED)
        self.assertEqual(cells["Mark"]["evidence"][0]["relation_ids"], [])
        self.assertEqual(cells["Luke"]["status"], NOT_STATED)
        self.assertEqual(row["relations"], [])
        self.assertEqual(row["claims"], [])

    def test_default_matrix_excludes_unrelated_unlocked_witness_records(self):
        runtime = self.runtime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-JOHN",
                (PassageRef("JN20:30", "John", 20, 30, witness="John"),),
                "John states that Jesus did many other signs.",
                Confidence.T1,
                witness="John",
            )
        )
        runtime.unlock("EV-MARK")
        runtime.unlock("EV-LUKE")
        runtime.unlock("EV-JOHN")

        matrix = build_witness_matrix(runtime, witnesses=("Mark", "Luke"))
        serialized = json.dumps(matrix.to_dict(), ensure_ascii=False, sort_keys=True)
        self.assertNotIn("EV-JOHN", serialized)
        self.assertNotIn("John states that Jesus did many other signs.", serialized)
        self.assertEqual(len(matrix.rows), 1)

        explicit = build_witness_matrix(
            runtime,
            witnesses=("Mark", "Luke"),
            evidence_ids=("EV-JOHN",),
        ).to_dict()
        self.assertEqual(explicit["selection_scope"], "explicit_evidence_ids")
        self.assertEqual(explicit["rows"][0]["evidence_ids"], ["EV-JOHN"])
        self.assertEqual(explicit["rows"][0]["unassigned_evidence"][0]["evidence_id"], "EV-JOHN")
        self.assertTrue(
            all(cell["status"] == NOT_STATED for cell in explicit["rows"][0]["cells"])
        )

    def test_evidence_relation_ids_are_bound_to_actual_visible_endpoints(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-MARK-1",
                (PassageRef("MK1:1", "Mark", 1, 1, witness="Mark"),),
                "First Mark record.",
                Confidence.T1,
                witness="Mark",
                relation_ids=("REL-OTHER",),
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-MARK-2",
                (PassageRef("MK1:2", "Mark", 1, 2, witness="Mark"),),
                "Second Mark record.",
                Confidence.T1,
                witness="Mark",
                relation_ids=("REL-OTHER",),
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-LUKE",
                (PassageRef("LK1:1", "Luke", 1, 1, witness="Luke"),),
                "Luke record.",
                Confidence.T1,
                witness="Luke",
                relation_ids=("REL-OTHER",),
            )
        )
        runtime.add_relation(
            Relation("REL-OTHER", "EV-MARK-2", "parallel_witness", "EV-LUKE")
        )
        for evidence_id in ("EV-MARK-1", "EV-MARK-2", "EV-LUKE"):
            runtime.unlock(evidence_id)

        payload = build_witness_matrix(runtime, witnesses=("Mark", "Luke")).to_dict()
        singleton = next(row for row in payload["rows"] if row["evidence_ids"] == ["EV-MARK-1"])
        mark_cell = next(cell for cell in singleton["cells"] if cell["witness"] == "Mark")
        self.assertEqual(mark_cell["evidence"][0]["relation_ids"], [])
        related = next(row for row in payload["rows"] if "EV-MARK-2" in row["evidence_ids"])
        related_mark = next(cell for cell in related["cells"] if cell["witness"] == "Mark")
        self.assertEqual(related_mark["evidence"][0]["relation_ids"], ["REL-OTHER"])

    def test_claim_spanning_unrelated_components_is_not_duplicated_into_rows(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-MARK",
                (PassageRef("MK1:1", "Mark", 1, 1, witness="Mark"),),
                "Mark record.",
                Confidence.T1,
                witness="Mark",
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-LUKE",
                (PassageRef("LK1:1", "Luke", 1, 1, witness="Luke"),),
                "Luke record.",
                Confidence.T1,
                witness="Luke",
            )
        )
        runtime.add_claim(
            Claim(
                "CL-CROSS",
                "Cross-record synthesis.",
                Confidence.T2,
                required_evidence_ids=("EV-MARK", "EV-LUKE"),
                source_scope="Mark 1:1; Luke 1:1",
            )
        )
        runtime.unlock("EV-MARK")
        runtime.unlock("EV-LUKE")

        payload = build_witness_matrix(runtime, witnesses=("Mark", "Luke")).to_dict()
        self.assertEqual(len(payload["rows"]), 2)
        self.assertTrue(all(row["claims"] == [] for row in payload["rows"]))
        self.assertNotIn("CL-CROSS", json.dumps(payload, sort_keys=True))

    def test_absence_is_not_upgraded_to_denial_or_contradiction(self):
        runtime = self.runtime()
        runtime.unlock("EV-MARK")
        payload = build_witness_matrix(runtime, witnesses=("Mark", "Luke")).to_dict()

        luke = {cell["witness"]: cell for cell in payload["rows"][0]["cells"]}["Luke"]
        self.assertEqual(luke["status"], "not_stated_in_visible_scope")
        self.assertEqual(payload["contradiction_semantics"], "not_inferred")
        self.assertIn("not denial", payload["absence_semantics"])
        self.assertIn("or proof", payload["absence_semantics"])

    def test_explicit_full_scope_may_include_locked_parallel_record_claim_and_relation(self):
        runtime = self.runtime()
        runtime.unlock("EV-MARK")

        matrix = build_witness_matrix(
            runtime,
            witnesses=("Mark", "Luke"),
            include_locked_evidence=True,
        )
        payload = matrix.to_dict()

        self.assertEqual(payload["evidence_scope"], "all_runtime_evidence")
        self.assertEqual(payload["selection_scope"], "requested_witnesses")
        self.assertEqual(len(payload["rows"]), 1)
        row = payload["rows"][0]
        self.assertEqual(row["evidence_ids"], ["EV-LUKE", "EV-MARK"])
        self.assertEqual([claim["claim_id"] for claim in row["claims"]], ["CL-COMPARE"])
        self.assertEqual([relation["relation_id"] for relation in row["relations"]], ["REL-PARALLEL"])
        cells = {cell["witness"]: cell for cell in row["cells"]}
        self.assertEqual(cells["Mark"]["evidence"][0]["relation_ids"], ["REL-PARALLEL"])
        self.assertIn("REL-PARALLEL", "\n".join(matrix.linearize()))

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

        matrix = build_witness_matrix(runtime, witnesses=("Mark", "Luke"))
        row = matrix.to_dict()["rows"][0]
        self.assertTrue(all(cell["status"] == NOT_STATED for cell in row["cells"]))
        self.assertEqual(row["unassigned_evidence"][0]["evidence_id"], "EV-MIXED")
        self.assertIsNone(row["unassigned_evidence"][0]["resolved_witness"])
        linear = "\n".join(matrix.linearize())
        self.assertIn("Unassigned witness evidence EV-MIXED", linear)
        self.assertIn("Passage MK1:1: Mark 1:1; witness=Mark", linear)
        self.assertIn("Passage LK1:1: Luke 1:1; witness=Luke", linear)

    def test_record_witness_conflicting_with_passage_witness_fails_closed(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-CONFLICT",
                (PassageRef("LK1:1", "Luke", 1, 1, witness="Luke"),),
                "This proposition must not be attributed to Mark or Luke locally.",
                Confidence.T1,
                witness="Mark",
            )
        )
        runtime.unlock("EV-CONFLICT")

        matrix = build_witness_matrix(runtime, witnesses=("Mark", "Luke"))
        row = matrix.to_dict()["rows"][0]
        self.assertTrue(all(cell["status"] == NOT_STATED for cell in row["cells"]))
        self.assertTrue(all(cell["evidence"] == [] for cell in row["cells"]))
        self.assertEqual(row["unassigned_evidence"][0]["evidence_id"], "EV-CONFLICT")
        self.assertIsNone(row["unassigned_evidence"][0]["resolved_witness"])
        linear = "\n".join(matrix.linearize())
        self.assertNotIn("Mark: stated", linear)
        self.assertNotIn("Luke: stated", linear)
        self.assertIn("Unassigned witness evidence EV-CONFLICT", linear)
        self.assertIn("Record witness: Mark", linear)
        self.assertIn("Passage LK1:1: Luke 1:1; witness=Luke", linear)

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
