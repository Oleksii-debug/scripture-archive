from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1] / "frontend"


class PackagedReviewTrainingPlayerUiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = (ROOT / "app.js").read_text(encoding="utf-8")
        cls.queue = (ROOT / "review-queue-ui.js").read_text(encoding="utf-8")

    def test_review_queue_handoff_uses_full_runtime_selected_task_response(self):
        self.assertIn("new CustomEvent('scripture-review-training-started', {detail: data})", self.queue)
        self.assertIn("document.addEventListener('scripture-review-training-started'", self.app)
        self.assertIn("reviewTraining=data.review_session;presentNode(data)", self.app)
        self.assertNotIn("loadNode(data.task.node_id", self.app)

    def test_review_answer_never_uses_story_branch_as_review_target(self):
        self.assertIn("nextNodeId=reviewMode?null:(r.next_node_id||null)", self.app)
        self.assertIn("Canonical runtime Scheduler after", self.app)
        self.assertIn("await api('player.start_review')", self.app)
        self.assertNotIn("player.start_review',{node_id", self.app)
        self.assertNotIn("player.start_review',{target", self.app)

    def test_review_next_is_disabled_until_grade(self):
        self.assertIn("reviewAnswerSubmitted=false", self.app)
        self.assertIn("reviewAnswerSubmitted=reviewMode", self.app)
        self.assertIn("button.disabled=nextBusy||!reviewAnswerSubmitted", self.app)
        self.assertIn("!isReviewTraining()||!reviewAnswerSubmitted||nextBusy", self.app)

    def test_review_has_keyboard_reachable_finish_control_and_live_announcements(self):
        self.assertIn("reviewFinishButton=document.createElement('button')", self.app)
        self.assertIn("reviewFinishButton.type='button'", self.app)
        self.assertIn("reviewFinishButton.textContent='Завершити тренування'", self.app)
        self.assertIn("reviewFinishButton.addEventListener('click'", self.app)
        self.assertIn("announce(`Тренування завершено.", self.app)
        self.assertIn("Наступне повторення", self.app)

    def test_leaving_review_before_normal_node_load_closes_runtime_review_mode(self):
        self.assertIn("if(!preview&&isReviewTraining())await finishReview({returnHome:false,announceResult:false})", self.app)
        self.assertIn("if(isReviewTraining()){await finishReview({returnHome:true});return}", self.app)


if __name__ == "__main__":
    unittest.main()
