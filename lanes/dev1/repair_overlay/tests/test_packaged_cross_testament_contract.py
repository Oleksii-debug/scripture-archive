import ast
import unittest
from pathlib import Path

from scripture_archive_platform.application.cross_testament_projection import project_packaged_cross_testament
from scripture_archive_platform.application.service import PlatformApplication
from scripture_archive_platform.transport.contracts import validate_request_shape
from runtime_engine.scripture_archive_runtime.evidence import EvidenceRecord, EvidenceRuntime, PassageRef, Relation
from runtime_engine.scripture_archive_runtime.models import Confidence


class _CrossTestamentGateway:
    def __init__(self):
        self.calls = 0

    def get_cross_testament(self):
        self.calls += 1
        return {
            "schema": "scripture.research.cross-testament.v1",
            "projection_schema": "CROSS_TESTAMENT_v1",
            "status": "NOT_STATED_IN_CITED_TEXT",
            "links": [],
            "linear": ["Not stated in cited text"],
            "read_only": True,
            "evidence_scope": "unlocked_only",
            "truth_owner": "D5/runtime",
        }


class PackagedCrossTestamentContractTests(unittest.TestCase):
    @staticmethod
    def _request(payload):
        return {
            "api_version": "scripture.transport.v1",
            "request_id": "cross-testament-contract",
            "command": "research.get_cross_testament",
            "payload": payload,
        }

    @staticmethod
    def _runtime(*, unlock_nt=True, witness="Matthew"):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-OT",
                (PassageRef("ISA7:14", "Isaiah", 7, 14, witness="Isaiah"),),
                "OT proposition",
                Confidence.T1,
                witness="Isaiah",
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-NT",
                (PassageRef("MT1:23", "Matthew", 1, 23, witness=witness),),
                "NT proposition",
                Confidence.T2,
                tx1=True,
                witness=witness,
            )
        )
        runtime.add_relation(
            Relation(
                "REL-X",
                "EV-OT",
                "explicit_cross_reference",
                "EV-NT",
                passage_ids=("ISA7:14", "MT1:23"),
            )
        )
        runtime.unlock("EV-OT")
        if unlock_nt:
            runtime.unlock("EV-NT")
        return runtime

    def test_transport_is_allowlisted_but_accepts_only_empty_scope(self):
        rid, command, payload = validate_request_shape(self._request({}))
        self.assertEqual((rid, command, payload), ("cross-testament-contract", "research.get_cross_testament", {}))
        for forbidden in (
            {"include_locked_evidence": True},
            {"infer_from_topics": True},
            {"book_testaments": {"Isaiah": "NT"}},
        ):
            with self.subTest(payload=forbidden):
                with self.assertRaises(ValueError):
                    validate_request_shape(self._request(forbidden))

    def test_platform_dispatch_routes_only_to_canonical_gateway(self):
        gateway = _CrossTestamentGateway()
        app = object.__new__(PlatformApplication)
        app.player_gateway = gateway
        response = app.handle(self._request({}))
        self.assertTrue(response["ok"])
        self.assertEqual(response["data"]["schema"], "scripture.research.cross-testament.v1")
        self.assertEqual(response["data"]["truth_owner"], "D5/runtime")
        self.assertEqual(gateway.calls, 1)

        rejected = app.handle(self._request({"include_locked_evidence": True}))
        self.assertFalse(rejected["ok"])
        self.assertEqual(rejected["error"]["code"], "VALIDATION_ERROR")
        self.assertEqual(gateway.calls, 1)

    def test_packaged_projection_preserves_explicit_relation_provenance(self):
        data = project_packaged_cross_testament(self._runtime())
        self.assertEqual(data["schema"], "scripture.research.cross-testament.v1")
        self.assertEqual(data["projection_schema"], "CROSS_TESTAMENT_v1")
        self.assertEqual(data["status"], "LINKS")
        self.assertTrue(data["read_only"])
        self.assertEqual(data["evidence_scope"], "unlocked_only")
        self.assertEqual(data["truth_owner"], "D5/runtime")
        self.assertEqual(len(data["links"]), 1)
        link = data["links"][0]
        self.assertEqual(link["relation_id"], "REL-X")
        self.assertEqual(link["ot"]["passage_id"], "ISA7:14")
        self.assertEqual(link["nt"]["passage_id"], "MT1:23")
        self.assertEqual(link["ot"]["evidence"][0]["confidence"], "T1")
        self.assertEqual(link["nt"]["evidence"][0]["confidence"], "T2")
        self.assertTrue(link["nt"]["evidence"][0]["tx1"])
        linear = "\n".join(data["linear"])
        for expected in ("REL-X", "ISA7:14", "MT1:23", "witness=Isaiah", "witness=Matthew"):
            self.assertIn(expected, linear)

    def test_locked_endpoint_remains_honest_not_stated_empty_state(self):
        data = project_packaged_cross_testament(self._runtime(unlock_nt=False))
        self.assertEqual(data["status"], "NOT_STATED_IN_CITED_TEXT")
        self.assertEqual(data["links"], [])
        self.assertEqual(data["linear"], ["Not stated in cited text"])
        serialized = repr(data)
        self.assertNotIn("MT1:23", serialized)
        self.assertNotIn("EV-NT", serialized)

    def test_packaged_boundary_rejects_invisible_unicode_in_provenance(self):
        with self.assertRaisesRegex(ValueError, "unsafe Unicode"):
            project_packaged_cross_testament(self._runtime(witness="Matthew\u200bhidden"))

    def test_runtime_gateway_holds_projection_under_runtime_lock(self):
        gateway_path = (
            Path(__file__).resolve().parents[1]
            / "scripture_archive_platform"
            / "application"
            / "runtime_gateway.py"
        )
        source = gateway_path.read_text(encoding="utf-8")
        module = ast.parse(source)
        gateway = next(node for node in module.body if isinstance(node, ast.ClassDef) and node.name == "RuntimeBackedPlayerGateway")
        method = next(node for node in gateway.body if isinstance(node, ast.FunctionDef) and node.name == "get_cross_testament")
        locks = [
            node for node in method.body
            if isinstance(node, ast.With)
            and any(ast.unparse(item.context_expr) == "self._runtime_lock" for item in node.items)
        ]
        self.assertEqual(len(locks), 1)
        locked_source = ast.get_source_segment(source, locks[0]) or ""
        self.assertIn("project_packaged_cross_testament(self._runtime_application.evidence)", locked_source)
        self.assertNotIn("include_locked", locked_source)

    def test_frontend_is_semantic_text_first_and_linear_equivalent(self):
        frontend = Path(__file__).resolve().parents[1] / "frontend"
        ui = (frontend / "cross-testament-ui.js").read_text(encoding="utf-8")
        transport = (frontend / "transport.js").read_text(encoding="utf-8")
        self.assertIn("research.get_cross_testament", ui)
        self.assertIn("document.createElement('table')", ui)
        self.assertIn("Повний лінійний еквівалент", ui)
        self.assertIn("Not stated in cited text", ui)
        self.assertIn("aria-live", ui)
        self.assertNotIn("innerHTML", ui)
        self.assertIn("cross-testament-ui.js", transport)


if __name__ == "__main__":
    unittest.main()
