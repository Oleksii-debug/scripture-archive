import unittest
from pathlib import Path

from scripture_archive_platform.application.witness_matrix_application import WitnessMatrixPlatformApplication
from scripture_archive_platform.transport.contracts import validate_request_shape


class _WitnessMatrixGateway:
    def __init__(self):
        self.calls = 0

    def get_witness_matrix(self):
        self.calls += 1
        return {
            "schema": "scripture.research.witness-matrix.v1",
            "read_only": True,
            "available_witnesses": ["Luke", "Mark"],
            "matrix": {
                "schema": "witness-matrix.v1",
                "evidence_scope": "unlocked_only",
                "selection_scope": "requested_witnesses",
                "witnesses": ["Luke", "Mark"],
                "absence_semantics": "not stated is not denial",
                "contradiction_semantics": "not_inferred",
                "rows": [],
            },
            "linear": ["Witness Matrix"],
            "truth_owner": "D5/runtime",
        }


class PackagedWitnessMatrixContractTests(unittest.TestCase):
    @staticmethod
    def _request(payload):
        return {
            "api_version": "scripture.transport.v1",
            "request_id": "witness-matrix-contract",
            "command": "research.get_witness_matrix",
            "payload": payload,
        }

    def test_transport_allows_only_empty_read_only_projection_request(self):
        rid, command, payload = validate_request_shape(self._request({}))
        self.assertEqual(rid, "witness-matrix-contract")
        self.assertEqual(command, "research.get_witness_matrix")
        self.assertEqual(payload, {})
        for forbidden in (
            {"witnesses": ["Mark", "Luke"]},
            {"evidence_ids": ["EV-1"]},
            {"include_locked_evidence": True},
        ):
            with self.subTest(payload=forbidden):
                with self.assertRaises(ValueError):
                    validate_request_shape(self._request(forbidden))

    def test_packaged_application_routes_to_read_only_gateway(self):
        gateway = _WitnessMatrixGateway()
        app = object.__new__(WitnessMatrixPlatformApplication)
        app.player_gateway = gateway

        response = app.handle(self._request({}))
        self.assertTrue(response["ok"])
        self.assertEqual(response["data"]["schema"], "scripture.research.witness-matrix.v1")
        self.assertTrue(response["data"]["read_only"])
        self.assertEqual(response["data"]["truth_owner"], "D5/runtime")
        self.assertEqual(gateway.calls, 1)

        rejected = app.handle(self._request({"include_locked_evidence": True}))
        self.assertFalse(rejected["ok"])
        self.assertEqual(rejected["error"]["code"], "VALIDATION_ERROR")
        self.assertEqual(gateway.calls, 1)

    def test_frontend_is_semantic_text_first_and_has_complete_linear_surface(self):
        frontend = Path(__file__).resolve().parents[1] / "frontend"
        ui = (frontend / "witness-matrix-ui.js").read_text(encoding="utf-8")
        transport = (frontend / "transport.js").read_text(encoding="utf-8")

        self.assertIn("research.get_witness_matrix", ui)
        self.assertIn("make('table')", ui)
        self.assertIn("Повний лінійний еквівалент", ui)
        self.assertIn("not_inferred", ui)
        self.assertNotIn("innerHTML", ui)
        self.assertIn("witness-matrix-ui.js", transport)


if __name__ == "__main__":
    unittest.main()
