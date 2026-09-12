import unittest

from scripture_archive_runtime.cross_testament import project_cross_testament
from scripture_archive_runtime.evidence import EvidenceRecord, EvidenceRuntime, PassageRef, Relation
from scripture_archive_runtime.models import Confidence


BOOK_TESTAMENTS = {"Isaiah": "OT", "Matthew": "NT"}


def _runtime(*, witness: str | None = "Corpus-A") -> EvidenceRuntime:
    runtime = EvidenceRuntime()
    runtime.add_evidence(
        EvidenceRecord(
            "EV-OT",
            (PassageRef("P-OT", "Isaiah", 7, 14, witness=witness),),
            "OT",
            Confidence.T1,
            witness=witness,
        )
    )
    runtime.add_evidence(
        EvidenceRecord(
            "EV-NT",
            (PassageRef("P-NT", "Matthew", 1, 23, witness=witness),),
            "NT",
            Confidence.T1,
            witness=witness,
        )
    )
    runtime.add_relation(
        Relation(
            "REL-X",
            "EV-OT",
            "explicit_cross_reference",
            "EV-NT",
            witness=witness,
            passage_ids=("P-OT", "P-NT"),
        )
    )
    runtime.unlock("EV-OT")
    runtime.unlock("EV-NT")
    return runtime


class CrossTestamentCanonicalProvenanceTests(unittest.TestCase):
    def test_control_character_evidence_witness_fails_closed(self):
        runtime = _runtime(witness=None)
        runtime.evidence["EV-NT"] = EvidenceRecord(
            "EV-NT",
            (PassageRef("P-NT", "Matthew", 1, 23),),
            "NT",
            Confidence.T1,
            witness="Matthew\u0085tampered",
        )
        with self.assertRaisesRegex(ValueError, "forbidden control|malformed"):
            project_cross_testament(runtime, book_testaments=BOOK_TESTAMENTS)

    def test_line_separator_passage_witness_fails_closed(self):
        runtime = _runtime(witness=None)
        runtime.evidence["EV-NT"] = EvidenceRecord(
            "EV-NT",
            (PassageRef("P-NT", "Matthew", 1, 23, witness="Matthew\u2028tampered"),),
            "NT",
            Confidence.T1,
        )
        with self.assertRaisesRegex(ValueError, "forbidden control|malformed"):
            project_cross_testament(runtime, book_testaments=BOOK_TESTAMENTS)

    def test_control_character_relation_witness_fails_closed(self):
        runtime = _runtime(witness=None)
        runtime.relations["REL-X"] = Relation(
            "REL-X",
            "EV-OT",
            "explicit_cross_reference",
            "EV-NT",
            witness="Corpus\u2029tampered",
            passage_ids=("P-OT", "P-NT"),
        )
        with self.assertRaisesRegex(ValueError, "forbidden control"):
            project_cross_testament(runtime, book_testaments=BOOK_TESTAMENTS)

    def test_unproven_optional_relation_witness_is_not_published(self):
        runtime = _runtime(witness=None)
        runtime.relations["REL-X"] = Relation(
            "REL-X",
            "EV-OT",
            "explicit_cross_reference",
            "EV-NT",
            witness="Unproven-label",
            passage_ids=("P-OT", "P-NT"),
        )
        projection = project_cross_testament(runtime, book_testaments=BOOK_TESTAMENTS)
        self.assertEqual(len(projection.links), 1)
        self.assertIsNone(projection.links[0].relation_witness)
        self.assertNotIn("Unproven-label", projection.stable_json())
        self.assertNotIn("Unproven-label", "\n".join(projection.linearize()))

    def test_hidden_evidence_endpoint_cannot_be_replaced_by_visible_alias(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-HIDDEN",
                (PassageRef("P-OT", "Isaiah", 7, 14),),
                "hidden endpoint",
                Confidence.T1,
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-OT-VISIBLE",
                (PassageRef("P-OT", "Isaiah", 7, 14),),
                "visible alias",
                Confidence.T1,
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-NT",
                (PassageRef("P-NT", "Matthew", 1, 23),),
                "visible endpoint",
                Confidence.T1,
            )
        )
        runtime.add_relation(
            Relation(
                "REL-HIDDEN",
                "EV-HIDDEN",
                "explicit_cross_reference",
                "EV-NT",
                passage_ids=("P-OT", "P-NT"),
            )
        )
        runtime.unlock("EV-OT-VISIBLE")
        runtime.unlock("EV-NT")
        projection = project_cross_testament(runtime, book_testaments=BOOK_TESTAMENTS)
        self.assertEqual(projection.links, ())
        serialized = projection.stable_json()
        self.assertNotIn("REL-HIDDEN", serialized)
        self.assertNotIn("EV-HIDDEN", serialized)


if __name__ == "__main__":
    unittest.main()
