import copy
from datetime import datetime, timedelta, timezone
import json
import unittest

from scripture_archive_runtime.daily_case import DAILY_CASE_SCHEMA, DailyCaseComposer
from scripture_archive_runtime.models import (
    PlayerMemory,
    QueueKind,
    RetrievalRelation,
    SchedulerCandidate,
    Session,
)


NOW = datetime(2026, 9, 11, 18, 0, tzinfo=timezone.utc)


def candidate(
    node_id: str,
    *,
    queue: QueueKind = QueueKind.NEW,
    relation: RetrievalRelation = RetrievalRelation.NONE,
    source_audited: bool = True,
    prerequisite_ready: bool = True,
    due_at: datetime | None = None,
    task_family: str = "short_text",
    concept_ids: tuple[str, ...] = ("concept-a",),
    passage_keys: tuple[str, ...] = ("John 1:1",),
    book_key: str | None = "John",
    paired_exact_node_id: str | None = None,
) -> SchedulerCandidate:
    return SchedulerCandidate(
        node_id=node_id,
        task_family=task_family,
        queue=queue,
        concept_ids=concept_ids,
        relation=relation,
        source_audited=source_audited,
        due_at=due_at,
        passage_keys=passage_keys,
        book_key=book_key,
        prerequisite_ready=prerequisite_ready,
        paired_exact_node_id=paired_exact_node_id,
    )


class DailyCaseComposerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.composer = DailyCaseComposer()
        self.memory = PlayerMemory(profile_id="player-1")
        self.session = Session(session_id="session-1", started_at=NOW - timedelta(minutes=5))

    def test_plan_is_deterministic_and_input_order_invariant(self):
        a = candidate("NODE-A", queue=QueueKind.WEAK, task_family="matching", concept_ids=("c-a",), passage_keys=("Mark 1:1",), book_key="Mark")
        b = candidate("NODE-B", queue=QueueKind.DUE, due_at=NOW - timedelta(days=2), task_family="ordering", concept_ids=("c-b",), passage_keys=("Luke 1:1",), book_key="Luke")
        c = candidate("NODE-C", queue=QueueKind.NEW, task_family="short_text", concept_ids=("c-c",), passage_keys=("John 1:1",), book_key="John")

        first = self.composer.compose([c, a, b], self.memory, self.session, case_id="daily-2026-09-11", title="Daily Case", now=NOW)
        second = self.composer.compose([b, c, a], self.memory, self.session, case_id="daily-2026-09-11", title="Daily Case", now=NOW)

        self.assertEqual(first.to_dict(), second.to_dict())
        self.assertEqual(first.schema, DAILY_CASE_SCHEMA)
        self.assertEqual([item.node_id for item in first.items], ["NODE-A", "NODE-B", "NODE-C"])
        json.dumps(first.to_dict())

    def test_ineligible_candidates_fail_closed_out_of_plan(self):
        future = candidate("FUTURE", queue=QueueKind.DUE, due_at=NOW + timedelta(days=1))
        unaudited = candidate("UNAUDITED", source_audited=False)
        blocked = candidate("BLOCKED", prerequisite_ready=False)
        eligible = candidate("ELIGIBLE", queue=QueueKind.NEW)

        plan = self.composer.compose(
            [future, unaudited, blocked, eligible],
            self.memory,
            self.session,
            case_id="case-1",
            title="Case 1",
            now=NOW,
        )

        self.assertEqual([item.node_id for item in plan.items], ["ELIGIBLE"])
        rendered = "\n".join(plan.linearize())
        self.assertNotIn("FUTURE", rendered)
        self.assertNotIn("UNAUDITED", rendered)
        self.assertNotIn("BLOCKED", rendered)

    def test_scheduler_cooldowns_and_shown_state_are_preserved(self):
        self.session.shown_node_ids.append("ALREADY-SHOWN")
        shown = candidate("ALREADY-SHOWN")
        cooldown = candidate("COOLDOWN", relation=RetrievalRelation.EXACT)
        paired = candidate("VARIANT-PAIR", relation=RetrievalRelation.EXACT, paired_exact_node_id="RECENT-EXACT")
        safe_variant = candidate("SAFE-VARIANT", relation=RetrievalRelation.VARIANT)

        plan = self.composer.compose(
            [shown, cooldown, paired, safe_variant],
            self.memory,
            self.session,
            case_id="case-2",
            title="Case 2",
            adjacent_successful_exact_ids={"COOLDOWN", "RECENT-EXACT"},
            now=NOW,
        )

        self.assertEqual([item.node_id for item in plan.items], ["SAFE-VARIANT"])

    def test_caller_memory_and_session_are_not_mutated(self):
        self.memory.recent_fatigue["task_family:matching"] = 2
        self.session.recent_task_families.append("matching")
        before_memory = copy.deepcopy(self.memory)
        before_session = copy.deepcopy(self.session)

        self.composer.compose(
            [candidate("A", task_family="matching"), candidate("B", task_family="ordering")],
            self.memory,
            self.session,
            case_id="case-3",
            title="Case 3",
            now=NOW,
        )

        self.assertEqual(self.memory, before_memory)
        self.assertEqual(self.session, before_session)

    def test_linear_output_preserves_all_player_visible_semantic_row_fields(self):
        plan = self.composer.compose(
            [candidate(
                "NODE-LINEAR",
                queue=QueueKind.CROSS_CONTEXT,
                relation=RetrievalRelation.CROSS_CONTEXT,
                task_family="evidence_select",
                concept_ids=("concept-one", "concept-two"),
                passage_keys=("Mark 1:1", "Luke 1:1"),
                book_key="Gospels",
            )],
            self.memory,
            self.session,
            case_id="linear-case",
            title="Linear Case",
            now=NOW,
        )
        row = plan.semantic_rows()[0]
        line = plan.linearize()[1]

        self.assertIn(str(row["position"]), line)
        for key in ("node_id", "task_family", "queue", "relation", "book_key"):
            self.assertIn(str(row[key]), line)
        for value in row["concept_ids"] + row["passage_keys"]:
            self.assertIn(value, line)

    def test_empty_plan_has_explicit_nonvisual_result(self):
        plan = self.composer.compose(
            [candidate("LOCKED", source_audited=False)],
            self.memory,
            self.session,
            case_id="empty-case",
            title="Empty Case",
            now=NOW,
        )
        self.assertEqual(plan.semantic_rows(), [])
        self.assertEqual(plan.linearize()[-1], "No eligible source-audited tasks.")

    def test_duplicate_and_malformed_candidates_fail_closed(self):
        with self.assertRaises(ValueError):
            self.composer.compose(
                [candidate("DUP"), candidate("DUP")],
                self.memory,
                self.session,
                case_id="case",
                title="Case",
                now=NOW,
            )

        malformed = candidate("MALFORMED")
        object.__setattr__(malformed, "source_audited", "yes")
        with self.assertRaises(TypeError):
            self.composer.compose(
                [malformed],
                self.memory,
                self.session,
                case_id="case",
                title="Case",
                now=NOW,
            )

        naive_due = candidate("NAIVE", queue=QueueKind.DUE, due_at=datetime(2026, 9, 10, 18, 0))
        with self.assertRaises(ValueError):
            self.composer.compose(
                [naive_due],
                self.memory,
                self.session,
                case_id="case",
                title="Case",
                now=NOW,
            )

    def test_plan_metadata_limit_and_clock_are_bounded(self):
        with self.assertRaises(ValueError):
            self.composer.compose([], self.memory, self.session, case_id=" ", title="Case", now=NOW)
        with self.assertRaises(ValueError):
            self.composer.compose([], self.memory, self.session, case_id="case", title=" ", now=NOW)
        with self.assertRaises(ValueError):
            self.composer.compose([], self.memory, self.session, case_id="case", title="Case\nInjected", now=NOW)
        with self.assertRaises(ValueError):
            self.composer.compose([], self.memory, self.session, case_id="case", title="Case", limit=0, now=NOW)
        with self.assertRaises(ValueError):
            self.composer.compose([], self.memory, self.session, case_id="case", title="Case", limit=51, now=NOW)
        with self.assertRaises(ValueError):
            self.composer.compose([], self.memory, self.session, case_id="case", title="Case", limit=True, now=NOW)
        with self.assertRaises(ValueError):
            self.composer.compose([], self.memory, self.session, case_id="case", title="Case", now=datetime(2026, 9, 11, 18, 0))


if __name__ == "__main__":
    unittest.main()
