import unittest

from scripture_archive_runtime.evidence import (
    Claim,
    EvidenceRecord,
    EvidenceRuntime,
    PassageRef,
    Relation,
)
from scripture_archive_runtime.models import Confidence
from scripture_archive_runtime.research_export import build_research_export


class ResearchExportGatedRelationRegressionTests(unittest.TestCase):
    def runtime(self) -> EvidenceRuntime:
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-A",
                (PassageRef("MK14:13", "Mark", 14, 13, witness="Mark"),),
                "Visible evidence",
                Confidence.T1,
                witness="Mark",
                entity_ids=("VISIBLE-ENTITY",),
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-B",
                (PassageRef("LK22:8", "Luke", 22, 8, witness="Luke"),),
                "Locked evidence",
                Confidence.T1,
                witness="Luke",
                entity_ids=("LOCKED-ENTITY",),
                relation_ids=("REL-LOCKED-META",),
            )
        )
        runtime.add_claim(
            Claim(
                "CL-GATED",
                "Requires visible and locked support",
                Confidence.T2,
                required_evidence_ids=("EV-A", "EV-B"),
            )
        )
        runtime.unlock("EV-A")
        return runtime

    def test_relation_cannot_reexpose_gated_claim_identity(self):
        runtime = self.runtime()
        runtime.add_relation(Relation("REL-CLAIM", "CL-GATED", "supported_by", "EV-A"))

        export = build_research_export(runtime, workspace_id="case", title="Case")

        self.assertEqual(export.payload["claims"], [])
        self.assertEqual(export.payload["relations"], [])
        for serialized in (export.to_json(), export.to_markdown(), export.to_html()):
            self.assertNotIn("CL-GATED", serialized)
            self.assertNotIn("REL-CLAIM", serialized)

    def test_relation_cannot_reexpose_locked_only_passage_or_entity(self):
        runtime = self.runtime()
        runtime.add_relation(
            Relation(
                "REL-PASSAGE",
                "EV-A",
                "references",
                "VISIBLE-ENTITY",
                passage_ids=("LK22:8",),
            )
        )
        runtime.add_relation(Relation("REL-ENTITY", "EV-A", "references", "LOCKED-ENTITY"))

        export = build_research_export(runtime, workspace_id="case", title="Case")

        self.assertEqual(export.payload["relations"], [])
        serialized = export.to_json() + export.to_markdown() + export.to_html()
        self.assertNotIn("LK22:8", serialized)
        self.assertNotIn("LOCKED-ENTITY", serialized)

    def test_relation_id_known_only_through_locked_evidence_is_gated(self):
        runtime = self.runtime()
        runtime.add_relation(Relation("REL-LOCKED-META", "VISIBLE-ENTITY", "related_to", "OTHER"))

        export = build_research_export(runtime, workspace_id="case", title="Case")

        self.assertEqual(export.payload["relations"], [])
        self.assertNotIn("REL-LOCKED-META", export.to_json())

    def test_locked_only_relation_id_cannot_be_reexposed_as_relation_endpoint(self):
        runtime = self.runtime()
        runtime.add_relation(
            Relation("REL-PROBE", "VISIBLE-ENTITY", "references", "REL-LOCKED-META")
        )

        export = build_research_export(runtime, workspace_id="case", title="Case")

        self.assertEqual(export.payload["relations"], [])
        for serialized in (export.to_json(), export.to_markdown(), export.to_html()):
            self.assertNotIn("REL-PROBE", serialized)
            self.assertNotIn("REL-LOCKED-META", serialized)

        full_export = build_research_export(
            runtime,
            workspace_id="case",
            title="Case",
            include_locked_evidence=True,
        )
        self.assertEqual(
            [row["relation_id"] for row in full_export.payload["relations"]],
            ["REL-PROBE"],
        )
        self.assertEqual(full_export.payload["relations"][0]["target_id"], "REL-LOCKED-META")
        for serialized in (
            full_export.to_json(),
            full_export.to_markdown(),
            full_export.to_html(),
        ):
            self.assertIn("REL-PROBE", serialized)
            self.assertIn("REL-LOCKED-META", serialized)

    def test_full_scope_preserves_gated_relation_metadata_explicitly(self):
        runtime = self.runtime()
        runtime.add_relation(Relation("REL-CLAIM", "CL-GATED", "supported_by", "EV-A"))
        runtime.add_relation(
            Relation(
                "REL-PASSAGE",
                "EV-A",
                "references",
                "LOCKED-ENTITY",
                passage_ids=("LK22:8",),
            )
        )
        runtime.add_relation(Relation("REL-LOCKED-META", "VISIBLE-ENTITY", "related_to", "OTHER"))

        export = build_research_export(
            runtime,
            workspace_id="case",
            title="Case",
            include_locked_evidence=True,
        )

        self.assertEqual([row["claim_id"] for row in export.payload["claims"]], ["CL-GATED"])
        self.assertEqual(
            [row["relation_id"] for row in export.payload["relations"]],
            ["REL-CLAIM", "REL-LOCKED-META", "REL-PASSAGE"],
        )


if __name__ == "__main__":
    unittest.main()
