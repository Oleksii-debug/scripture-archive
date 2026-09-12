import json
import unittest

from scripture_archive_platform.application.runtime_gateway import (
    RuntimeBackedPlayerGateway,
    RuntimeGatewayError,
    build_unlocked_research_export,
)
from scripture_archive_platform.application.service import PlatformApplication
from scripture_archive_platform.transport.contracts import validate_request_shape
from scripture_archive_runtime.evidence import Claim, EvidenceRecord, EvidenceRuntime, PassageRef, Relation
from scripture_archive_runtime.models import Confidence


def safe_export():
    return {
        "export": {
            "schema": "research-export.v1",
            "workspace_id": "runtime-unlocked",
            "title": "Експорт дослідження",
            "evidence_scope": "unlocked_only",
            "counts": {"claims": 0, "evidence": 1, "relations": 0},
            "json": "{}\n",
            "markdown": "# Export\n",
            "html": "<!doctype html><p>Export</p>\n",
        }
    }


class FakeGateway:
    def __init__(self, data=None):
        self.data = data if data is not None else safe_export()

    def export_research(self):
        return self.data


class ResearchExportCompositionTests(unittest.TestCase):
    def test_transport_allows_only_empty_research_export_payload(self):
        rid, command, payload = validate_request_shape({
            "api_version": "scripture.transport.v1",
            "request_id": "export-1",
            "command": "research.export",
            "payload": {},
        })
        self.assertEqual((rid, command, payload), ("export-1", "research.export", {}))
        for leaked_scope in (
            {"include_locked_evidence": True},
            {"evidence_ids": ["EV-LOCKED"]},
            {"workspace_id": "../outside"},
        ):
            with self.assertRaises(ValueError):
                validate_request_shape({
                    "api_version": "scripture.transport.v1",
                    "request_id": "export-bad",
                    "command": "research.export",
                    "payload": leaked_scope,
                })

    def test_platform_rejects_scope_widening_or_malformed_runtime_export(self):
        app = object.__new__(PlatformApplication)
        app.player_gateway = FakeGateway()
        result = app._research_export()
        self.assertEqual(result["truth_owner"], "D5/runtime")
        self.assertEqual(result["export"]["evidence_scope"], "unlocked_only")

        widened = safe_export()
        widened["export"]["evidence_scope"] = "all_runtime_evidence"
        app.player_gateway = FakeGateway(widened)
        with self.assertRaises(ValueError):
            app._research_export()

        malformed = safe_export()
        del malformed["export"]["html"]
        app.player_gateway = FakeGateway(malformed)
        with self.assertRaises(ValueError):
            app._research_export()

    def test_gateway_export_callback_is_read_only_and_mapping_checked(self):
        gateway = RuntimeBackedPlayerGateway(
            lambda request: {
                "api_version": "runtime.v1",
                "request_id": request["request_id"],
            },
            research_export_invoke=safe_export,
        )
        self.assertEqual(gateway.export_research()["export"]["schema"], "research-export.v1")

        bad = RuntimeBackedPlayerGateway(lambda request: {}, research_export_invoke=lambda: "bad")
        with self.assertRaises(RuntimeGatewayError):
            bad.export_research()

    def test_packaged_helper_preserves_locked_evidence_nonleakage(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(EvidenceRecord(
            "EV-A",
            (PassageRef("MK14:13", "Mark", 14, 13, witness="Mark"),),
            "Mark says two disciples",
            Confidence.T1,
            witness="Mark",
        ))
        runtime.add_evidence(EvidenceRecord(
            "EV-B",
            (PassageRef("LK22:8", "Luke", 22, 8, witness="Luke"),),
            "Luke names Peter and John",
            Confidence.T1,
            witness="Luke",
        ))
        runtime.add_claim(Claim(
            "CL-LOCKED",
            "Comparison requires both witnesses",
            Confidence.T2,
            required_evidence_ids=("EV-A", "EV-B"),
            witness="Mark/Luke comparison",
        ))
        runtime.add_relation(Relation("REL-LOCKED", "EV-A", "parallel_witness", "EV-B"))
        runtime.unlock("EV-A")

        packaged = build_unlocked_research_export(type("Runtime", (), {"evidence": runtime})())
        export = packaged["export"]
        self.assertEqual(export["evidence_scope"], "unlocked_only")
        self.assertEqual(export["counts"], {"claims": 0, "evidence": 1, "relations": 0})
        for rendered in (export["json"], export["markdown"], export["html"]):
            self.assertIn("EV-A", rendered)
            self.assertNotIn("EV-B", rendered)
            self.assertNotIn("CL-LOCKED", rendered)
            self.assertNotIn("REL-LOCKED", rendered)

        parsed = json.loads(export["json"])
        self.assertEqual([row["evidence_id"] for row in parsed["evidence"]], ["EV-A"])

    def test_packaged_helper_gates_locked_only_relation_id_used_as_endpoint(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(EvidenceRecord(
            "EV-A",
            (PassageRef("MK14:13", "Mark", 14, 13, witness="Mark"),),
            "Visible evidence",
            Confidence.T1,
            witness="Mark",
            entity_ids=("VISIBLE-ENTITY",),
        ))
        runtime.add_evidence(EvidenceRecord(
            "EV-B",
            (PassageRef("LK22:8", "Luke", 22, 8, witness="Luke"),),
            "Locked evidence",
            Confidence.T1,
            witness="Luke",
            relation_ids=("REL-LOCKED-META",),
        ))
        runtime.add_relation(
            Relation("REL-PROBE", "VISIBLE-ENTITY", "references", "REL-LOCKED-META")
        )
        runtime.unlock("EV-A")

        packaged = build_unlocked_research_export(type("Runtime", (), {"evidence": runtime})())
        export = packaged["export"]
        self.assertEqual(export["evidence_scope"], "unlocked_only")
        self.assertEqual(export["counts"], {"claims": 0, "evidence": 1, "relations": 0})
        parsed = json.loads(export["json"])
        self.assertEqual(parsed["relations"], [])
        for rendered in (export["json"], export["markdown"], export["html"]):
            self.assertNotIn("REL-PROBE", rendered)
            self.assertNotIn("REL-LOCKED-META", rendered)


if __name__ == "__main__":
    unittest.main()
