import json
import unittest

from scripture_archive_runtime.evidence import Claim, EvidenceRecord, EvidenceRuntime, PassageRef, Relation
from scripture_archive_runtime.models import Confidence
from scripture_archive_runtime.research_export import build_research_export


class HiddenClaimRelationExportTests(unittest.TestCase):
    def test_unlocked_only_omits_relation_touching_claim_hidden_by_locked_evidence(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(EvidenceRecord(
            "EV-VISIBLE",
            (PassageRef("MK14:13", "Mark", 14, 13, witness="Mark"),),
            "Visible evidence",
            Confidence.T1,
            witness="Mark",
        ))
        runtime.add_evidence(EvidenceRecord(
            "EV-LOCKED",
            (PassageRef("LK22:8", "Luke", 22, 8, witness="Luke"),),
            "Locked evidence",
            Confidence.T1,
            witness="Luke",
        ))
        runtime.add_claim(Claim(
            "CL-HIDDEN",
            "Hidden claim requires locked evidence",
            Confidence.T2,
            source_scope="Luke 22:8",
            required_evidence_ids=("EV-LOCKED",),
            witness="Luke",
        ))
        runtime.add_relation(Relation(
            "REL-HIDDEN",
            "CL-HIDDEN",
            "identifies",
            "PERSON-X",
            witness="Luke",
            passage_ids=("LK22:8",),
        ))
        runtime.unlock("EV-VISIBLE")

        export = build_research_export(runtime, workspace_id="case-hidden", title="Hidden relation case")
        self.assertEqual(export.payload["evidence_scope"], "unlocked_only")
        self.assertEqual([row["evidence_id"] for row in export.payload["evidence"]], ["EV-VISIBLE"])
        self.assertEqual(export.payload["claims"], [])
        self.assertEqual(export.payload["relations"], [])

        json_text = export.to_json()
        markdown = export.to_markdown()
        html = export.to_html()
        for rendered in (json_text, markdown, html):
            self.assertNotIn("CL-HIDDEN", rendered)
            self.assertNotIn("REL-HIDDEN", rendered)
            self.assertNotIn("PERSON-X", rendered)
            self.assertNotIn("LK22:8", rendered)
            self.assertNotIn("identifies", rendered)

        parsed = json.loads(json_text)
        self.assertEqual(parsed["claims"], [])
        self.assertEqual(parsed["relations"], [])

    def test_full_scope_still_includes_claim_and_relation_when_evidence_is_visible(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(EvidenceRecord(
            "EV-LOCKED",
            (PassageRef("LK22:8", "Luke", 22, 8, witness="Luke"),),
            "Evidence",
            Confidence.T1,
            witness="Luke",
        ))
        runtime.add_claim(Claim(
            "CL-VISIBLE-FULL",
            "Full-scope claim",
            Confidence.T2,
            required_evidence_ids=("EV-LOCKED",),
            witness="Luke",
        ))
        runtime.add_relation(Relation(
            "REL-VISIBLE-FULL",
            "CL-VISIBLE-FULL",
            "identifies",
            "PERSON-X",
            witness="Luke",
        ))

        export = build_research_export(
            runtime,
            workspace_id="case-full",
            title="Full scope",
            include_locked_evidence=True,
        )
        self.assertEqual(export.payload["evidence_scope"], "all_runtime_evidence")
        self.assertEqual([row["claim_id"] for row in export.payload["claims"]], ["CL-VISIBLE-FULL"])
        self.assertEqual([row["relation_id"] for row in export.payload["relations"]], ["REL-VISIBLE-FULL"])


if __name__ == "__main__":
    unittest.main()
