from datetime import datetime, timezone
import unittest

from scripture_archive_runtime.daily_case import DailyCaseComposer, DailyCaseItem
from scripture_archive_runtime.models import (
    PlayerMemory,
    QueueKind,
    RetrievalRelation,
    SchedulerCandidate,
    Session,
)


NOW = datetime(2026, 9, 12, 0, 0, tzinfo=timezone.utc)


def candidate(
    node_id: str,
    *,
    concept_ids: tuple[str, ...] = ("concept-a",),
    passage_keys: tuple[str, ...] = ("John 1:1",),
    source_audited: bool = True,
) -> SchedulerCandidate:
    return SchedulerCandidate(
        node_id=node_id,
        task_family="short_text",
        queue=QueueKind.NEW,
        concept_ids=concept_ids,
        relation=RetrievalRelation.NONE,
        source_audited=source_audited,
        passage_keys=passage_keys,
        book_key="John",
        prerequisite_ready=True,
    )


class DailyCaseQaBlockerRegressionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.memory = PlayerMemory(profile_id="player-qa")
        self.session = Session(session_id="session-qa", started_at=NOW)
        self.composer = DailyCaseComposer()

    def test_duck_typed_scheduler_cannot_bypass_canonical_policy(self):
        class UnsafeScheduler:
            def compose(self, candidates, memory, session, **kwargs):
                return [candidate("UNAUDITED", source_audited=False)]

        with self.assertRaises(TypeError):
            DailyCaseComposer(scheduler=UnsafeScheduler())

    def test_c0_c1_and_del_controls_fail_closed_before_linear_output(self):
        for control in ("\x01", "\x1b", "\x7f", "\x85"):
            with self.subTest(control=ord(control)):
                with self.assertRaises(ValueError):
                    self.composer.compose(
                        [candidate(f"NODE-{control}-BAD")],
                        self.memory,
                        self.session,
                        case_id="case-controls",
                        title="Daily Case",
                        now=NOW,
                    )
                with self.assertRaises(ValueError):
                    DailyCaseItem(
                        position=1,
                        node_id=f"NODE-{control}-BAD",
                        task_family="short_text",
                        queue=QueueKind.NEW.value,
                        relation=RetrievalRelation.NONE.value,
                        concept_ids=("concept-a",),
                        passage_keys=("John 1:1",),
                        book_key="John",
                    )

    def test_line_and_paragraph_separators_remain_rejected(self):
        for separator in ("\u2028", "\u2029"):
            with self.subTest(separator=ord(separator)):
                with self.assertRaises(ValueError):
                    self.composer.compose(
                        [candidate(f"NODE-{separator}-BAD")],
                        self.memory,
                        self.session,
                        case_id="case-separators",
                        title="Daily Case",
                        now=NOW,
                    )

    def test_candidate_metadata_cardinality_is_bounded(self):
        too_many = tuple(f"concept-{index}" for index in range(65))
        with self.assertRaises(ValueError):
            self.composer.compose(
                [candidate("TOO-MANY-CONCEPTS", concept_ids=too_many)],
                self.memory,
                self.session,
                case_id="case-cardinality",
                title="Daily Case",
                now=NOW,
            )

        too_many_passages = tuple(f"John 1:{index + 1}" for index in range(65))
        with self.assertRaises(ValueError):
            self.composer.compose(
                [candidate("TOO-MANY-PASSAGES", passage_keys=too_many_passages)],
                self.memory,
                self.session,
                case_id="case-cardinality",
                title="Daily Case",
                now=NOW,
            )

    def test_direct_item_metadata_cardinality_cannot_bypass_bound(self):
        too_many = tuple(f"concept-{index}" for index in range(65))
        with self.assertRaises(ValueError):
            DailyCaseItem(
                position=1,
                node_id="DIRECT-TOO-MANY",
                task_family="short_text",
                queue=QueueKind.NEW.value,
                relation=RetrievalRelation.NONE.value,
                concept_ids=too_many,
                passage_keys=("John 1:1",),
                book_key="John",
            )

    def test_boundary_sized_metadata_remains_valid_and_linearizable(self):
        concepts = tuple(f"concept-{index}" for index in range(64))
        passages = tuple(f"P-{index}" for index in range(64))
        plan = self.composer.compose(
            [candidate("BOUNDARY-VALID", concept_ids=concepts, passage_keys=passages)],
            self.memory,
            self.session,
            case_id="case-boundary",
            title="Daily Case",
            now=NOW,
        )
        self.assertEqual(len(plan.items), 1)
        self.assertEqual(plan.items[0].concept_ids, concepts)
        self.assertEqual(plan.items[0].passage_keys, passages)
        self.assertIn("concept-63", plan.linearize()[1])
        self.assertIn("P-63", plan.linearize()[1])


if __name__ == "__main__":
    unittest.main()
