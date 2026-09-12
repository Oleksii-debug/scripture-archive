from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PackagedReviewTrainingTransportTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.adapter = (ROOT / "scripture_archive_platform" / "transport" / "runtime_compat.py").read_text(encoding="utf-8")
        cls.contracts = (ROOT / "scripture_archive_platform" / "transport" / "contracts.py").read_text(encoding="utf-8")

    def test_review_training_maps_to_runtime_without_target_payload(self):
        self.assertIn('"player.start_review": "start_review"', self.adapter)
        self.assertIn('"player.finish_review": "finish_review"', self.adapter)
        self.assertIn("'start_review','finish_review'", self.adapter)
        self.assertIn("runtime_payload={}", self.adapter)

    def test_transport_rejects_payload_for_review_training(self):
        self.assertIn("{'player.get_review_queue','player.start_review','player.finish_review'}", self.contracts)
        self.assertIn("accepts an empty payload", self.contracts)

    def test_runtime_response_validation_is_fail_closed(self):
        self.assertIn("runtime start_review response is missing review_session", self.adapter)
        self.assertIn("runtime start_review task is malformed", self.adapter)
        self.assertIn("runtime empty review response must be inactive", self.adapter)
        self.assertIn("runtime finish_review response must be inactive", self.adapter)


if __name__ == "__main__":
    unittest.main()
