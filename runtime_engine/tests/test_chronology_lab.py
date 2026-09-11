import unittest

from scripture_archive_runtime.chronology import (
    NOT_STATED,
    ChronologyAssertion,
    ChronologyLab,
    TemporalKind,
    TemporalRelation,
)
from scripture_archive_runtime.models import Confidence


class ChronologyLabTests(unittest.TestCase):
    def assertion(self, assertion_id, event_id, *, kind=TemporalKind.EXACT, **overrides):
        payload = {
            "assertion_id": assertion_id,
            "event_id": event_id,
            "event_label": overrides.pop("event_label", event_id),
            "kind": kind,
            "confidence": overrides.pop("confidence", Confidence.T1),
            "source_scope": overrides.pop("source_scope", "Fixture witness statement"),
            "temporal_label": overrides.pop("temporal_label", "source supplied time"),
            "passage_ids": overrides.pop("passage_ids", ("P1",)),
        }
        payload.update(overrides)
        return ChronologyAssertion(**payload)

    def test_unknown_is_not_fabricated_from_passage_or_event_text(self):
        lab = ChronologyLab()
        item = self.assertion(
            "A-UNKNOWN",
            "EVENT-70CE",
            kind=TemporalKind.UNKNOWN,
            event_label="An event whose label contains 70 CE",
            temporal_label="",
            passage_ids=("Acts-9-1",),
            uncertainty="The cited witness does not state a calendar date.",
        )
        lab.add(item)

        row = lab.semantic_rows()[0]
        self.assertEqual(NOT_STATED, row["temporal"])
        self.assertIsNone(item.explicit_interval)
        self.assertEqual(
            TemporalRelation.INDETERMINATE,
            lab.relation("A-UNKNOWN", "A-UNKNOWN"),
        )
        self.assertNotIn("70 CE", row["temporal"])

    def test_explicit_source_order_is_deterministic_and_unknown_sorts_last(self):
        lab = ChronologyLab(
            [
                self.assertion("A-LATE", "E2", order_start=20, temporal_label="later"),
                self.assertion(
                    "A-UNKNOWN",
                    "E3",
                    kind=TemporalKind.UNKNOWN,
                    temporal_label="",
                ),
                self.assertion("A-EARLY", "E1", order_start=10, temporal_label="earlier"),
            ]
        )
        self.assertEqual(
            ["A-EARLY", "A-LATE", "A-UNKNOWN"],
            [item.assertion_id for item in lab.ordered_assertions()],
        )
        self.assertEqual(
            TemporalRelation.BEFORE,
            lab.relation("A-EARLY", "A-LATE"),
        )
        self.assertEqual(
            TemporalRelation.AFTER,
            lab.relation("A-LATE", "A-EARLY"),
        )

    def test_range_overlap_is_reported_without_resolving_truth(self):
        lab = ChronologyLab(
            [
                self.assertion(
                    "A-RANGE-1",
                    "E1",
                    kind=TemporalKind.RANGE,
                    temporal_label="source range one",
                    order_start=10,
                    order_end=20,
                    witness="Witness-A",
                ),
                self.assertion(
                    "A-RANGE-2",
                    "E2",
                    kind=TemporalKind.RANGE,
                    temporal_label="source range two",
                    order_start=15,
                    order_end=25,
                    witness="Witness-B",
                ),
            ]
        )
        self.assertEqual(
            TemporalRelation.OVERLAPS,
            lab.relation("A-RANGE-1", "A-RANGE-2"),
        )

    def test_non_overlapping_same_event_preserves_witness_separation(self):
        lab = ChronologyLab(
            [
                self.assertion(
                    "A-W1",
                    "E1",
                    temporal_label="Witness A chronology",
                    order_start=10,
                    witness="Witness-A",
                ),
                self.assertion(
                    "A-W2",
                    "E1",
                    temporal_label="Witness B chronology",
                    order_start=30,
                    witness="Witness-B",
                    confidence=Confidence.T2,
                ),
            ]
        )
        findings = lab.non_overlapping_assertions("E1")
        self.assertEqual(1, len(findings))
        self.assertEqual(
            ("Witness-A", "Witness-B"), findings[0].witness_values
        )
        self.assertEqual(
            "NON_OVERLAPPING_SOURCE_ASSERTIONS", findings[0].finding_type
        )
        self.assertIn("do not harmonize automatically", findings[0].message)
        self.assertEqual(2, len(lab.assertions_for_event("E1")))

    def test_relative_relation_is_used_only_when_explicitly_authored(self):
        target = self.assertion("A-TARGET", "E-TARGET", order_start=50)
        relative = self.assertion(
            "A-REL",
            "E-REL",
            kind=TemporalKind.RELATIVE,
            temporal_label="The source places this before the target event.",
            relative_to_event_id="E-TARGET",
            relative_relation=TemporalRelation.BEFORE,
            witness="Witness-A",
        )
        unrelated = self.assertion(
            "A-UNRELATED",
            "E-OTHER",
            kind=TemporalKind.UNKNOWN,
            temporal_label="",
        )
        lab = ChronologyLab([target, relative, unrelated])

        self.assertEqual(
            TemporalRelation.BEFORE, lab.relation("A-REL", "A-TARGET")
        )
        self.assertEqual(
            TemporalRelation.AFTER, lab.relation("A-TARGET", "A-REL")
        )
        self.assertEqual(
            TemporalRelation.INDETERMINATE,
            lab.relation("A-REL", "A-UNRELATED"),
        )

    def test_validation_requires_provenance_and_keeps_tx1_separate(self):
        with self.assertRaisesRegex(ValueError, "passage or evidence provenance"):
            ChronologyLab(
                [
                    self.assertion(
                        "A-NOPROV",
                        "E1",
                        passage_ids=(),
                        evidence_ids=(),
                    )
                ]
            )

        with self.assertRaisesRegex(ValueError, "confidence must"):
            ChronologyLab(
                [
                    self.assertion(
                        "A-BADCONF",
                        "E1",
                        confidence="TX1",
                    )
                ]
            )

        good = self.assertion(
            "A-TX1",
            "E1",
            confidence=Confidence.T1,
            tx1=True,
            evidence_ids=("EV1",),
        )
        row = ChronologyLab([good]).semantic_rows()[0]
        self.assertEqual("T1", row["confidence"])
        self.assertTrue(row["tx1"])

    def test_malformed_range_and_relative_assertions_fail_closed(self):
        with self.assertRaisesRegex(ValueError, "supplied together"):
            ChronologyLab(
                [
                    self.assertion(
                        "A-RANGE",
                        "E1",
                        kind=TemporalKind.RANGE,
                        temporal_label="range",
                        order_start=10,
                    )
                ]
            )
        with self.assertRaisesRegex(ValueError, "relative_to_event_id"):
            ChronologyLab(
                [
                    self.assertion(
                        "A-REL",
                        "E1",
                        kind=TemporalKind.RELATIVE,
                        temporal_label="before an unstated target",
                        relative_relation=TemporalRelation.BEFORE,
                    )
                ]
            )

    def test_semantic_rows_and_linearize_have_feature_parity(self):
        lab = ChronologyLab(
            [
                self.assertion(
                    "A1",
                    "E1",
                    event_label="Event One",
                    temporal_label="source supplied point",
                    order_start=1,
                    witness="Witness-A",
                    confidence=Confidence.C1,
                    tx1=True,
                    passage_ids=("P1", "P2"),
                    evidence_ids=("EV1",),
                    uncertainty="bounded uncertainty",
                )
            ]
        )
        row = lab.semantic_rows()[0]
        line = lab.linearize()[0]
        self.assertEqual("Event One", row["event"])
        self.assertEqual(["P1", "P2"], row["passage_ids"])
        self.assertEqual(["EV1"], row["evidence_ids"])
        self.assertIn("Event One", line)
        self.assertIn("source supplied point", line)
        self.assertIn("C1 TX1", line)
        self.assertIn("Witness-A", line)
        self.assertIn("bounded uncertainty", line)

    def test_duplicate_ids_rejected(self):
        first = self.assertion("A1", "E1")
        lab = ChronologyLab([first])
        with self.assertRaisesRegex(ValueError, "Duplicate assertion_id"):
            lab.add(first)


if __name__ == "__main__":
    unittest.main()
