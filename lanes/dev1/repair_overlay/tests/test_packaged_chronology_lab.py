import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

# This test runs both directly from the repair overlay and after DEV1 reconstruction.
# Discover the real repository root instead of depending on one copied-path depth.
HERE = Path(__file__).resolve()
REPO_ROOT = next(
    (candidate for candidate in HERE.parents if (candidate / "runtime_engine" / "scripture_archive_runtime").is_dir()),
    None,
)
if REPO_ROOT is None:
    raise RuntimeError("Unable to locate canonical runtime_engine from packaged Chronology test")
PLATFORM_ROOT = HERE.parents[1]
for candidate in (REPO_ROOT, PLATFORM_ROOT):
    if str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

from runtime_engine.scripture_archive_runtime.chronology import (
    ChronologyAssertion,
    ChronologyLab,
    TemporalKind,
    TemporalRelation,
)
from runtime_engine.scripture_archive_runtime.models import Confidence
from scripture_archive_platform.application.chronology_projection import (
    CHRONOLOGY_RESPONSE_SCHEMA,
    EMPTY_MESSAGE,
    ChronologyProjection,
)
from scripture_archive_platform.application.runtime_gateway import (
    RuntimeBackedPlayerGateway,
    RuntimeGatewayError,
)
from scripture_archive_platform.transport.contracts import validate_request_shape


class PackagedChronologyProjectionTests(unittest.TestCase):
    def test_missing_structured_feed_is_truthful_empty_state(self):
        data = ChronologyProjection(None).response()
        self.assertEqual(CHRONOLOGY_RESPONSE_SCHEMA, data["schema"])
        self.assertTrue(data["read_only"])
        self.assertEqual("NO_SOURCE_BACKED_ASSERTIONS", data["source_status"])
        self.assertEqual(0, data["assertion_count"])
        self.assertEqual([], data["rows"])
        self.assertEqual([], data["linear"])
        self.assertEqual(EMPTY_MESSAGE, data["empty_message"])
        self.assertEqual(
            {
                "mutation": False,
                "inferred_chronology": False,
                "narrative_order_used": False,
                "automatic_harmonization": False,
            },
            data["truth"],
        )

    def test_projection_preserves_only_canonical_lab_semantics_and_linear_parity(self):
        lab = ChronologyLab(
            (
                ChronologyAssertion(
                    assertion_id="A-REL",
                    event_id="EV-B",
                    event_label="Event B",
                    kind=TemporalKind.RELATIVE,
                    confidence=Confidence.T1,
                    source_scope="test-fixture/source-b",
                    temporal_label="explicitly before Event A",
                    witness="Witness B",
                    passage_ids=("P-B",),
                    relative_to_event_id="EV-A",
                    relative_relation=TemporalRelation.BEFORE,
                    uncertainty="source wording retained",
                ),
                ChronologyAssertion(
                    assertion_id="A-EXACT",
                    event_id="EV-A",
                    event_label="Event A",
                    kind=TemporalKind.EXACT,
                    confidence=Confidence.T2,
                    source_scope="test-fixture/source-a",
                    temporal_label="source-provided label A",
                    tx1=True,
                    witness="Witness A",
                    evidence_ids=("E-A",),
                    order_start=10,
                    order_scale_id="SOURCE-SCALE-A",
                ),
                ChronologyAssertion(
                    assertion_id="A-UNKNOWN",
                    event_id="EV-C",
                    event_label="Event C",
                    kind=TemporalKind.UNKNOWN,
                    confidence=Confidence.C1,
                    source_scope="test-fixture/source-c",
                    passage_ids=("P-C",),
                    uncertainty="source does not state a chronology",
                ),
            )
        )

        data = ChronologyProjection(lab).response()
        self.assertEqual("SOURCE_BACKED_ASSERTIONS", data["source_status"])
        self.assertEqual(3, data["assertion_count"])
        self.assertEqual(3, len(data["linear"]))
        self.assertIsNone(data["empty_message"])
        self.assertEqual(["A-EXACT", "A-REL", "A-UNKNOWN"], [row["assertion_id"] for row in data["rows"]])
        by_id = {row["assertion_id"]: row for row in data["rows"]}
        self.assertEqual("source-provided label A", by_id["A-EXACT"]["temporal"])
        self.assertEqual("T2", by_id["A-EXACT"]["confidence"])
        self.assertTrue(by_id["A-EXACT"]["tx1"])
        self.assertEqual("BEFORE", by_id["A-REL"]["relative_relation"])
        self.assertEqual("EV-A", by_id["A-REL"]["relative_to_event_id"])
        self.assertEqual("Not stated in cited text", by_id["A-UNKNOWN"]["temporal"])
        self.assertFalse(data["truth"]["inferred_chronology"])
        self.assertFalse(data["truth"]["automatic_harmonization"])

    def test_projection_rejects_noncanonical_chronology_object(self):
        with self.assertRaises(ValueError):
            ChronologyProjection({"timeline": "invented"})


class PackagedChronologyBoundaryTests(unittest.TestCase):
    def test_gateway_uses_runtime_owned_lab_when_present(self):
        lab = ChronologyLab(
            (
                ChronologyAssertion(
                    assertion_id="A-1",
                    event_id="EV-1",
                    event_label="Event 1",
                    kind=TemporalKind.UNKNOWN,
                    confidence=Confidence.D1,
                    source_scope="test-fixture/source",
                    evidence_ids=("E-1",),
                    uncertainty="no chronology stated",
                ),
            )
        )
        runtime = SimpleNamespace(chronology=lab)
        gateway = RuntimeBackedPlayerGateway(lambda request: request, runtime_application=runtime)
        data = gateway.get_chronology_lab()
        self.assertEqual(1, data["assertion_count"])
        self.assertEqual("A-1", data["rows"][0]["assertion_id"])

    def test_gateway_without_structured_feed_does_not_infer_from_other_runtime_state(self):
        runtime = SimpleNamespace(evidence={"prose": "must not become chronology"})
        gateway = RuntimeBackedPlayerGateway(lambda request: request, runtime_application=runtime)
        data = gateway.get_chronology_lab()
        self.assertEqual("NO_SOURCE_BACKED_ASSERTIONS", data["source_status"])
        self.assertEqual([], data["rows"])

    def test_application_allowlist_is_read_only_and_empty_payload_only(self):
        service_source = (
            PLATFORM_ROOT / "scripture_archive_platform" / "application" / "service.py"
        ).read_text(encoding="utf-8")
        route = "if cmd=='research.get_chronology_lab':"
        empty_payload_guard = (
            "if p:raise ValueError('research.get_chronology_lab accepts an empty payload')"
        )
        self.assertEqual(1, service_source.count(route))
        self.assertIn(empty_payload_guard, service_source)
        self.assertIn("return self._chronology_lab()", service_source)
        self.assertIn("return self.player_gateway.get_chronology_lab()", service_source)

        request = {
            "api_version": "scripture.transport.v1",
            "request_id": "chronology-test",
            "command": "research.get_chronology_lab",
            "payload": {},
        }
        self.assertEqual("research.get_chronology_lab", validate_request_shape(request)[1])
        request["payload"] = {"mutate": True}
        with self.assertRaises(ValueError):
            validate_request_shape(request)

    def test_gateway_fails_closed_without_canonical_runtime(self):
        gateway = RuntimeBackedPlayerGateway(lambda request: request)
        with self.assertRaises(RuntimeGatewayError):
            gateway.get_chronology_lab()

    def test_supplemental_ui_is_semantic_keyboard_first_and_text_safe(self):
        overlay = Path(__file__).resolve().parents[1]
        frontend = overlay / "frontend"
        compat = (frontend / "library-shell-compat.js").read_text(encoding="utf-8")
        ui = (frontend / "chronology-lab-ui.js").read_text(encoding="utf-8")
        self.assertEqual(1, compat.count("import './chronology-lab-ui.js';"))
        self.assertIn("research.get_chronology_lab", ui)
        self.assertNotIn("innerHTML", ui)
        self.assertIn("textContent", ui)
        self.assertIn("createElement", ui)
        self.assertIn("role:'status'", ui)
        self.assertIn("aria-live", ui)
        self.assertIn("caption", ui)
        self.assertIn("scope:'col'", ui)
        self.assertIn("chronology-lab-linear", ui)
        self.assertIn("MutationObserver", ui)
        self.assertIn("generation", ui)
        self.assertNotIn("<canvas", ui)
        self.assertNotIn("<svg", ui)
        for forbidden_command in (
            "player.submit_answer",
            "player.request_hint",
            "player.navigate_branch",
            "player.save_checkpoint",
            "authoring.",
            "research.upsert_",
            "research.delete_",
        ):
            self.assertNotIn(forbidden_command, ui)


if __name__ == "__main__":
    unittest.main()
