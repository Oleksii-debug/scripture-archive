import copy
import unittest

from scripture_archive_runtime.chronology import ChronologyLab, TemporalRelation
from scripture_archive_runtime.chronology_sources import (
    AUDITOR_ACCEPTED,
    PA02_PACK_FILENAME,
    load_pa02_chronology_document,
    materialize_audited_chronology,
    validate_chronology_source_pack,
)


class ChronologySourcePackTests(unittest.TestCase):
    def test_bundled_pa02_pack_is_independently_audited_and_accepted(self):
        document = load_pa02_chronology_document()

        self.assertEqual("CHR-PA02-DAMASCUS-ROAD-0.1", document["pack_id"])
        self.assertEqual("AUTHORED", document["authoring_status"])
        self.assertEqual(AUDITOR_ACCEPTED, document["source_audit_status"])
        self.assertEqual(
            "docs/evidence/PA02_DAMASCUS_ROAD_WITNESS_PACK_v0.1.md",
            document["upstream_source"]["path"],
        )
        self.assertEqual(
            "8ab52fd4c86d6cd4c766769d514ad26d5f599efd",
            document["upstream_source"]["blob_sha"],
        )

        assertions = validate_chronology_source_pack(document)
        self.assertEqual(7, len(assertions))
        self.assertEqual(7, len({item.assertion_id for item in assertions}))
        self.assertTrue(all(item.evidence_ids for item in assertions))
        self.assertTrue(all(item.passage_ids for item in assertions))
        self.assertTrue(all(not item.tx1 for item in assertions))
        self.assertTrue(all(item.order_start is None for item in assertions))
        self.assertTrue(all(item.order_end is None for item in assertions))
        self.assertTrue(all(item.order_scale_id is None for item in assertions))

    def test_accepted_bundled_pack_materializes_into_production_lab(self):
        lab = materialize_audited_chronology()
        rows = lab.semantic_rows()

        self.assertEqual(7, len(rows))
        self.assertEqual(
            {
                "CHR-PA02-A9-0008-BEFORE-AFTERMATH",
                "CHR-PA02-A9-0009-AFTER-VOICE",
                "CHR-PA02-A9-0010-AFTER-ENCOUNTER",
                "CHR-PA02-A9-0010-BEFORE-ANANIAS",
                "CHR-PA02-A22-0011-ABOUT-NOON",
                "CHR-PA02-A22-0013-AFTER-ENCOUNTER",
                "CHR-PA02-A26-0014-MIDDAY",
            },
            {row["assertion_id"] for row in rows},
        )

    def test_caller_cannot_inject_a_self_accepted_production_document(self):
        accepted = load_pa02_chronology_document()
        accepted_fixture = copy.deepcopy(accepted)
        accepted_fixture["assertions"][0]["temporal_label"] = "caller supplied override"

        # Structurally valid data is still not a production-trust input. Production
        # materialization has no caller document/path parameter and always re-reads
        # the fixed reviewed bundled resource.
        assertions = validate_chronology_source_pack(accepted_fixture)
        self.assertEqual(7, len(assertions))
        with self.assertRaises(TypeError):
            materialize_audited_chronology(accepted_fixture)  # type: ignore[call-arg]

    def test_source_audited_temporal_labels_and_local_relations_are_preserved(self):
        assertions = validate_chronology_source_pack(load_pa02_chronology_document())
        lab = ChronologyLab(assertions)
        rows = lab.semantic_rows()

        self.assertEqual(
            "about noon",
            next(
                row["temporal"]
                for row in rows
                if row["assertion_id"] == "CHR-PA02-A22-0011-ABOUT-NOON"
            ),
        )
        self.assertEqual(
            "at midday",
            next(
                row["temporal"]
                for row in rows
                if row["assertion_id"] == "CHR-PA02-A26-0014-MIDDAY"
            ),
        )

        encounter = "CHR-PA02-A9-0008-BEFORE-AFTERMATH"
        aftermath_after = "CHR-PA02-A9-0010-AFTER-ENCOUNTER"
        self.assertEqual(TemporalRelation.BEFORE, lab.relation(encounter, aftermath_after))
        self.assertEqual(TemporalRelation.AFTER, lab.relation(aftermath_after, encounter))

        acts22 = "CHR-PA02-A22-0011-ABOUT-NOON"
        acts26 = "CHR-PA02-A26-0014-MIDDAY"
        self.assertEqual(TemporalRelation.INDETERMINATE, lab.relation(acts22, acts26))

    def test_exact_upstream_provenance_is_pinned(self):
        document = load_pa02_chronology_document()

        pack_tamper = copy.deepcopy(document)
        pack_tamper["pack_id"] = "CHR-OTHER"
        with self.assertRaisesRegex(ValueError, "source-pack id"):
            validate_chronology_source_pack(pack_tamper)

        path_tamper = copy.deepcopy(document)
        path_tamper["upstream_source"]["path"] = "docs/evidence/other.md"
        with self.assertRaisesRegex(ValueError, "path does not match pinned"):
            validate_chronology_source_pack(path_tamper)

        blob_tamper = copy.deepcopy(document)
        blob_tamper["upstream_source"]["blob_sha"] = "0" * 40
        with self.assertRaisesRegex(ValueError, "blob_sha does not match pinned"):
            validate_chronology_source_pack(blob_tamper)

        status_tamper = copy.deepcopy(document)
        status_tamper["upstream_source"]["status"] = "SOURCE_AUDITED"
        with self.assertRaisesRegex(ValueError, "status does not match pinned"):
            validate_chronology_source_pack(status_tamper)

    def test_metadata_extensions_and_policy_weakening_fail_closed(self):
        document = load_pa02_chronology_document()

        root_extension = copy.deepcopy(document)
        root_extension["trust_override"] = True
        with self.assertRaisesRegex(ValueError, "chronology source pack has unsupported fields"):
            validate_chronology_source_pack(root_extension)

        upstream_extension = copy.deepcopy(document)
        upstream_extension["upstream_source"]["mirror"] = "unreviewed"
        with self.assertRaisesRegex(ValueError, "upstream_source has unsupported fields"):
            validate_chronology_source_pack(upstream_extension)

        policy_extension = copy.deepcopy(document)
        policy_extension["normalization_policy"]["allow_inference"] = True
        with self.assertRaisesRegex(ValueError, "normalization_policy has unsupported fields"):
            validate_chronology_source_pack(policy_extension)

        policy_tamper = copy.deepcopy(document)
        policy_tamper["normalization_policy"]["no_cross_witness_harmonization"] = False
        with self.assertRaisesRegex(ValueError, "must be true"):
            validate_chronology_source_pack(policy_tamper)

        field_tamper = copy.deepcopy(document)
        field_tamper["assertions"][0]["calendar_year"] = 35
        with self.assertRaisesRegex(ValueError, "unsupported fields"):
            validate_chronology_source_pack(field_tamper)

        audit_tamper = copy.deepcopy(document)
        audit_tamper["source_audit_status"] = "TRUST_ME"
        with self.assertRaisesRegex(ValueError, "Unsupported source_audit_status"):
            validate_chronology_source_pack(audit_tamper)

        temporal_tamper = copy.deepcopy(document)
        temporal_tamper["assertions"][0]["temporal_label"] = 123
        with self.assertRaisesRegex(ValueError, "temporal_label must be a string"):
            validate_chronology_source_pack(temporal_tamper)

    def test_loader_is_fixed_to_one_allowlisted_resource(self):
        self.assertEqual("chronology_pa02_damascus_road_v0_1.json", PA02_PACK_FILENAME)
        document = load_pa02_chronology_document()
        self.assertNotIn("path", document.get("normalization_policy", {}))


if __name__ == "__main__":
    unittest.main()
