import unittest

from scripture_archive_runtime.chronology import (
    ChronologyAssertion,
    ChronologyLab,
    TemporalKind,
)
from scripture_archive_runtime.models import Confidence


class ChronologyTextSafetyTests(unittest.TestCase):
    def assertion(self, **overrides):
        payload = {
            "assertion_id": "A-CONTROL",
            "event_id": "EVENT-CONTROL",
            "event_label": "Подія",
            "kind": TemporalKind.EXACT,
            "confidence": Confidence.T1,
            "source_scope": "Джерельний контекст",
            "temporal_label": "джерельний час",
            "passage_ids": ("P1",),
            "witness": "Лука",
            "uncertainty": "Невизначеність",
        }
        payload.update(overrides)
        return ChronologyAssertion(**payload)

    def test_player_visible_and_linear_text_rejects_controls_and_line_separators(self):
        unsafe_values = {
            "event_label": "Подія\nрозрив",
            "source_scope": "scope\x1bescape",
            "witness": "wit\x7fness",
            "temporal_label": "time\u2028split",
            "uncertainty": "uncertain\u2029split",
        }

        for field, value in unsafe_values.items():
            with self.subTest(field=field):
                with self.assertRaises(ValueError):
                    ChronologyLab([self.assertion(**{field: value})])

    def test_ordinary_unicode_cyrillic_is_preserved_in_linear_output(self):
        lab = ChronologyLab([self.assertion()])

        row = lab.semantic_rows()[0]
        self.assertEqual("Подія", row["event"])
        self.assertEqual("Джерельний контекст", row["source_scope"])
        self.assertEqual("Лука", row["witness"])

        line = lab.linearize()[0]
        self.assertIn("Подія", line)
        self.assertIn("Джерельний контекст", line)
        self.assertIn("Лука", line)
        self.assertNotIn("\n", line)
        self.assertNotIn("\u2028", line)
        self.assertNotIn("\u2029", line)


if __name__ == "__main__":
    unittest.main()
