import unittest

from scripture_archive_runtime.models import Attempt, Correctness, TaskState
from scripture_archive_runtime.state_codec import deserialize_task_state, serialize_task_state


class AttemptNormalizationTests(unittest.TestCase):
    def test_h0_h1_h5_h6_h7_persist_one_independence_semantic(self):
        for used_hints in (0, 1, 5, 6, 7):
            with self.subTest(used_hints=used_hints):
                state = TaskState(node_id="N")
                state.attempts.append(
                    Attempt(
                        node_id="N",
                        correctness=Correctness.CORRECT,
                        score=1.0,
                        used_hints=used_hints,
                        independent=True,
                    )
                )
                raw = serialize_task_state(state)
                self.assertEqual(raw["attempts"][0]["used_hints"], used_hints)
                self.assertEqual(raw["attempts"][0]["independent"], used_hints == 0)

                restored = deserialize_task_state(raw)
                self.assertEqual(restored.attempts[0].used_hints, used_hints)
                self.assertEqual(restored.attempts[0].independent, used_hints == 0)

    def test_legacy_contradictory_attempt_is_normalized_without_erasing_hint_count(self):
        raw = {
            "node_id": "N",
            "attempts": [
                {
                    "node_id": "N",
                    "correctness": "CORRECT",
                    "score": 1.0,
                    "used_hints": 5,
                    "independent": True,
                }
            ],
        }
        restored = deserialize_task_state(raw)
        self.assertEqual(restored.attempts[0].used_hints, 5)
        self.assertFalse(restored.attempts[0].independent)


if __name__ == "__main__":
    unittest.main()
