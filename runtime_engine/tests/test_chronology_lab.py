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
                self.assertion(
                    "A-LATE",
                    "E2",
                    order_start=20,
                    order_scale_id="SOURCE-SCALE-1",
                    temporal_label="later",
                ),
                self.assertion(
                    "A-UNKNOWN",
                    "E3",
                    kind=TemporalKind.UNKNOWN,
                    temporal_label="",
                ),
                self.assertion(
                    "A-EARLY",
                    "E1",
                    order_start=10,
                    order_scale_id="SOURCE-SCALE-1",
                    temporal_label="earlier",
                ),
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

    def test_different_order_scales_never_create_chronology_relation(self):
        scale_a_late_number = self.assertion(
            "A-SCALE-A",
            "E1",
            temporal_label="local source A order",
            order_start=100,
            order_scale_id="SCALE-A",
            witness="Witness-A",
        )
        scale_b_early_number = self.assertion(
            "A-SCALE-B",
            "E1",
            temporal_label="local source B order",
            order_start=1,
            order_scale_id="SCALE-B",
            witness="Witness-B",
        )
        lab = ChronologyLab([scale_b_early_number, scale_a_late_number])

        self.assertEqual(
            TemporalRelation.INDETERMINATE,
            lab.relation("A-SCALE-A", "A-SCALE-B"),
        )
        self.assertEqual((), lab.non_overlapping_assertions("E1"))
        # Deterministic cross-scale fallback groups by declared scale token rather
        # than pretending raw 1/100 values share chronology.
        self.assertEqual(
            ["A-SCALE-A", "A-SCALE-B"],
            [item.assertion_id for item in lab.ordered_assertions()],
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
                    order_scale_id="SHARED-SOURCE-SCALE",
                    witness="Witness-A",
                ),
                self.assertion(
                    "A-RANGE-2",
                    "E2",
                    kind=TemporalKind.RANGE,
                    temporal_label="source range two",
                    order_start=15,
                    order_end=25,
                    order_scale_id="SHARED-SOURCE-SCALE",
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
                    order_scale_id="SHARED-SOURCE-SCALE",
                    witness="Witness-A",
                ),
                self.assertion(
                    "A-W2",
                    "E1",
                    temporal_label="Witness B chronology",
                    order_start=30,
                    order_scale_id="SHARED-SOURCE-SCALE",
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
        target = self.assertion(
            "A-TARGET",
            "E-TARGET",
            order_start=50,
            order_scale_id="TARGET-SCALE",
        )
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

    def test_order_keys_require_explicit_comparability_scale(self):
        with self.assertRaisesRegex(ValueError, "requires explicit order_scale_id"):
            ChronologyLab(
                [
                    self.assertion(
                        "A-UNSCALED",
                        "E1",
                        order_start=10,
                    )
                ]
            )
        with self.assertRaisesRegex(
            ValueError, "order_scale_id requires source-provided order keys"
        ):
            ChronologyLab(
                [
                    self.assertion(
                        "A-SCALE-ONLY",
                        "E1",
                        order_scale_id="SCALE-A",
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
                    order_scale_id="SOURCE-SCALE-1",
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
        self.assertEqual("SOURCE-SCALE-1", row["order_scale_id"])
        self.assertEqual(["P1", "P2"], row["passage_ids"])
        self.assertEqual(["EV1"], row["evidence_ids"])
        self.assertIn("Event One", line)
        self.assertIn("source supplied point", line)
        self.assertIn("C1 TX1", line)
        self.assertIn("Witness-A", line)
        self.assertIn("passages=P1, P2", line)
        self.assertIn("evidence=EV1", line)
        self.assertIn("order-scale=SOURCE-SCALE-1", line)
        self.assertIn("bounded uncertainty", line)

    def test_duplicate_ids_rejected(self):
        first = self.assertion("A1", "E1")
        lab = ChronologyLab([first])
        with self.assertRaisesRegex(ValueError, "Duplicate assertion_id"):
            lab.add(first)

    def test_unknown_nonempty_temporal_label_fails_closed(self):
        item = self.assertion(
            "A-UNKNOWN-DATE",
            "E-DATE",
            kind=TemporalKind.UNKNOWN,
            event_label="Event labelled 70 CE",
            temporal_label="70 CE",
        )
        self.assertEqual(NOT_STATED, item.display_temporal)
        with self.assertRaisesRegex(
            ValueError, "UNKNOWN chronology cannot carry temporal_label"
        ):
            ChronologyLab([item])

    def test_non_string_identity_source_and_provenance_ids_fail_closed(self):
        cases = (
            {"assertion_id": 7},
            {"event_id": None},
            {"source_scope": 99},
            {"passage_ids": (123,)},
            {"evidence_ids": (None,)},
            {"order_start": 1, "order_scale_id": 9},
        )
        for overrides in cases:
            with self.subTest(overrides=overrides):
                payload = {"assertion_id": "A1", "event_id": "E1"}
                payload.update(overrides)
                with self.assertRaises(ValueError):
                    ChronologyLab([self.assertion(**payload)])

    def test_provenance_ids_are_not_trimmed_or_control_normalized(self):
        for passage_id in (" P1", "P1 ", "P\n1"):
            with self.subTest(passage_id=passage_id):
                with self.assertRaises(ValueError):
                    ChronologyLab(
                        [self.assertion("A1", "E1", passage_ids=(passage_id,))]
                    )

    def test_ordinal_keys_require_real_ints_and_reject_bool(self):
        for bad in ("10", 10.0, True, False):
            with self.subTest(bad=bad):
                with self.assertRaisesRegex(
                    ValueError, "order_start must be an integer"
                ):
                    ChronologyLab(
                        [
                            self.assertion(
                                "A1",
                                "E1",
                                order_start=bad,
                                order_scale_id="SOURCE-SCALE-1",
                            )
                        ]
                    )

        with self.assertRaisesRegex(ValueError, "order_end must be an integer"):
            ChronologyLab(
                [
                    self.assertion(
                        "R",
                        "E",
                        kind=TemporalKind.RANGE,
                        temporal_label="range",
                        order_start=1,
                        order_end=2.0,
                        order_scale_id="SOURCE-SCALE-1",
                    )
                ]
            )

    def test_relative_target_must_be_a_string_id(self):
        with self.assertRaisesRegex(
            ValueError, "relative_to_event_id must be a string"
        ):
            ChronologyLab(
                [
                    self.assertion(
                        "A",
                        "E",
                        kind=TemporalKind.RELATIVE,
                        temporal_label="before target",
                        relative_to_event_id=42,
                        relative_relation=TemporalRelation.BEFORE,
                    )
                ]
            )


if __name__ == "__main__":
    unittest.main()
