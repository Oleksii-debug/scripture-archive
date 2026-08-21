import unittest
from datetime import datetime, timedelta, timezone

from scripture_archive_runtime.models import PlayerMemory, QueueKind, RetrievalRelation, SchedulerCandidate, Session, MasteryState, KnowledgeState
from scripture_archive_runtime.scheduler import Scheduler


class SchedulerTests(unittest.TestCase):
    def setUp(self):
        self.scheduler=Scheduler(); self.memory=PlayerMemory("p1"); self.session=Session("s1"); self.now=datetime(2026,8,21,10,tzinfo=timezone.utc)
    def c(self,node_id,queue,relation,**kw):
        return SchedulerCandidate(node_id=node_id,task_family=kw.pop("task_family","compare"),queue=queue,concept_ids=tuple(kw.pop("concept_ids",("c",))),relation=relation,**kw)
    def test_adjacent_daily_success_blocks_exact_but_not_variant(self):
        exact=self.c("LN01-N01",QueueKind.DUE,RetrievalRelation.EXACT); variant=self.c("LN12-N03",QueueKind.DUE,RetrievalRelation.VARIANT,paired_exact_node_id="LN01-N01")
        chosen=self.scheduler.choose_next([exact,variant],self.memory,self.session,adjacent_successful_exact_ids={"LN01-N01"},now=self.now); self.assertEqual(chosen.candidate.node_id,"LN12-N03")
    def test_weak_lapsed_returns_early(self):
        self.memory.concept_mastery["weak"]=MasteryState("weak",state=KnowledgeState.LAPSED)
        weak=self.c("PA02-N04",QueueKind.WEAK,RetrievalRelation.CROSS_CONTEXT,concept_ids=("weak",),weak_signal=1.0); new=self.c("LN01-N03",QueueKind.NEW,RetrievalRelation.NONE,concept_ids=("new",))
        self.assertEqual(self.scheduler.choose_next([new,weak],self.memory,self.session,now=self.now).candidate.node_id,"PA02-N04")
    def test_due_urgency_and_stable_tiebreak_are_deterministic(self):
        a=self.c("LN01-N02",QueueKind.DUE,RetrievalRelation.VARIANT,due_at=self.now-timedelta(days=3)); b=self.c("LN01-N01",QueueKind.DUE,RetrievalRelation.VARIANT,due_at=self.now-timedelta(days=3))
        self.assertEqual(self.scheduler.choose_next([a,b],self.memory,self.session,now=self.now).candidate.node_id,"LN01-N01")
    def test_fatigue_penalizes_repeated_family(self):
        self.session.recent_task_families=["compare"]*4; compare=self.c("A01-N01",QueueKind.NEW,RetrievalRelation.NONE,task_family="compare"); evidence=self.c("A01-N02",QueueKind.NEW,RetrievalRelation.NONE,task_family="evidence")
        self.assertEqual(self.scheduler.choose_next([compare,evidence],self.memory,self.session,now=self.now).candidate.node_id,"A01-N02")
    def test_compose_never_duplicates_node(self):
        candidates=[self.c(f"LN01-N0{i}",QueueKind.NEW,RetrievalRelation.NONE,task_family=f"f{i%2}") for i in range(1,6)]; out=self.scheduler.compose(candidates,self.memory,self.session,limit=5,now=self.now)
        self.assertEqual(len({x.node_id for x in out}),len(out))

if __name__ == "__main__": unittest.main()
