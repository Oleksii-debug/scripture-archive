import sys
import threading
import unittest
from pathlib import Path
from types import SimpleNamespace

HERE = Path(__file__).resolve()
REPO_ROOT = next(
    (candidate for candidate in HERE.parents if (candidate / "runtime_engine" / "scripture_archive_runtime").is_dir()),
    None,
)
if REPO_ROOT is None:
    raise RuntimeError("Unable to locate canonical runtime_engine from packaged Dossiers test")
PLATFORM_ROOT = HERE.parents[1]
for candidate in (REPO_ROOT, PLATFORM_ROOT):
    if str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

from runtime_engine.scripture_archive_runtime.evidence import (
    Claim,
    EvidenceRecord,
    EvidenceRuntime,
    PassageRef,
    Relation,
)
from runtime_engine.scripture_archive_runtime.models import Confidence
from scripture_archive_platform.application.dossier_projection import build_player_safe_dossiers
from scripture_archive_platform.application.service import PlatformApplication
from scripture_archive_platform.transport.contracts import validate_request_shape


def gateway_for(runtime):
    return SimpleNamespace(
        _runtime_application=SimpleNamespace(evidence=runtime),
        _runtime_lock=threading.RLock(),
    )


class PackagedDossiersProjectionTests(unittest.TestCase):
    def make_runtime(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-VISIBLE",
                (PassageRef("ACTS-9-1", "Acts", 9, 1, witness="Luke"),),
                "Luke explicitly places the subject in the cited scene.",
                Confidence.T1,
                witness="Luke",
                entity_ids=("PERSON-PAUL",),
                relation_ids=("REL-VISIBLE",),
            )
        )
        runtime.add_evidence(
            EvidenceRecord(
                "EV-LOCKED",
                (PassageRef("ACTS-22-1", "Acts", 22, 1, witness="Luke"),),
                "Locked proposition must not be disclosed.",
                Confidence.T1,
                witness="Luke",
                entity_ids=("PERSON-PAUL", "PERSON-LOCKED-ONLY"),
            )
        )
        runtime.add_claim(
            Claim(
                "CLAIM-VISIBLE",
                "Source-bounded synthesis.",
                Confidence.T2,
                tx1=True,
                source_scope="Acts 9:1",
                uncertainty="Witness-local scope only",
                required_evidence_ids=("EV-VISIBLE",),
                witness="Luke",
            )
        )
        runtime.add_claim(
            Claim(
                "CLAIM-LOCKED",
                "Depends on locked evidence.",
                Confidence.T2,
                required_evidence_ids=("EV-VISIBLE", "EV-LOCKED"),
            )
        )
        runtime.add_relation(
            Relation(
                "REL-VISIBLE",
                "PERSON-PAUL",
                "appears_in",
                "EVENT-SCENE",
                witness="Luke",
                passage_ids=("MUST-NOT-BE-SUBSTITUTED",),
            )
        )
        runtime.unlock("EV-VISIBLE")
        return runtime

    def test_projection_reuses_runtime_dossier_truth_and_linear_parity(self):
        data = build_player_safe_dossiers(gateway_for(self.make_runtime()))
        self.assertEqual("scripture.research.dossiers.v1", data["schema"])
        self.assertTrue(data["read_only"])
        self.assertEqual("unlocked_only", data["evidence_scope"])
        self.assertEqual("D5/runtime", data["truth_owner"])
        self.assertEqual(1, data["dossier_count"])
        dossier = data["dossiers"][0]
        self.assertEqual("scripture.dossier-view.v1", dossier["schema"])
        self.assertEqual("PERSON-PAUL", dossier["subject"]["subject_id"])
        self.assertEqual("PERSON", dossier["subject"]["kind"])
        self.assertEqual("PERSON-PAUL", dossier["subject"]["display_name"])
        self.assertTrue(dossier["stated"])
        row_ids = [row["row_id"] for row in dossier["rows"]]
        self.assertEqual(["EV-VISIBLE", "CLAIM-VISIBLE", "REL-VISIBLE"], row_ids)
        joined = repr(data)
        self.assertNotIn("EV-LOCKED", joined)
        self.assertNotIn("CLAIM-LOCKED", joined)
        self.assertNotIn("PERSON-LOCKED-ONLY", joined)
        self.assertNotIn("MUST-NOT-BE-SUBSTITUTED", joined)
        self.assertIn("ACTS-9-1@Luke", "\n".join(dossier["linear"]))
        self.assertIn("confidence=T2", "\n".join(dossier["linear"]))
        self.assertTrue(data["linear"])
        self.assertFalse(data["truth"]["locked_evidence_exposed"])
        self.assertFalse(data["truth"]["inferred_subject_labels"])
        self.assertFalse(data["truth"]["automatic_harmonization"])

    def test_conflicting_witness_subject_is_fail_closed_without_subject_leak(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-CONFLICT",
                (PassageRef("MK-1-1", "Mark", 1, 1, witness="Luke"),),
                "Conflicting witness metadata must fail closed.",
                Confidence.T1,
                witness="Mark",
                entity_ids=("PERSON-CONFLICT",),
            )
        )
        runtime.unlock("EV-CONFLICT")
        data = build_player_safe_dossiers(gateway_for(runtime))
        self.assertEqual(0, data["dossier_count"])
        self.assertEqual([], data["dossiers"])
        joined = repr(data)
        self.assertNotIn("PERSON-CONFLICT", joined)
        self.assertNotIn("EV-CONFLICT", joined)
        self.assertNotIn("MK-1-1", joined)
        self.assertNotIn("Conflicting witness metadata", joined)

    def test_unknown_entity_kind_is_not_reclassified(self):
        runtime = EvidenceRuntime()
        runtime.add_evidence(
            EvidenceRecord(
                "EV-UNKNOWN-KIND",
                (),
                "Explicit record with an unsupported entity kind.",
                Confidence.T1,
                entity_ids=("MANUSCRIPT-X",),
            )
        )
        runtime.unlock("EV-UNKNOWN-KIND")
        data = build_player_safe_dossiers(gateway_for(runtime))
        self.assertEqual(0, data["dossier_count"])
        self.assertNotIn("MANUSCRIPT-X", repr(data))

    def test_empty_runtime_is_truthful_current_scope_not_not_stated_claim(self):
        data = build_player_safe_dossiers(gateway_for(EvidenceRuntime()))
        self.assertEqual(0, data["dossier_count"])
        self.assertIn("current scope", " ".join(data["linear"]).lower())
        self.assertNotIn("Not stated in cited text", repr(data))


class PackagedDossiersBoundaryTests(unittest.TestCase):
    def test_transport_is_explicitly_allowlisted_and_empty_payload_only(self):
        request = {
            "api_version": "scripture.transport.v1",
            "request_id": "dossiers-test",
            "command": "research.get_dossiers",
            "payload": {},
        }
        self.assertEqual("research.get_dossiers", validate_request_shape(request)[1])
        request["payload"] = {"include_locked": True}
        with self.assertRaises(ValueError):
            validate_request_shape(request)

    def test_application_route_uses_same_projection_and_rejects_payload(self):
        runtime = EvidenceRuntime()
        gateway = gateway_for(runtime)
        app = object.__new__(PlatformApplication)
        app.player_gateway = gateway
        data = app._dispatch("research.get_dossiers", {})
        self.assertEqual("scripture.research.dossiers.v1", data["schema"])
        self.assertEqual("unlocked_only", data["evidence_scope"])
        with self.assertRaises(ValueError):
            app._dispatch("research.get_dossiers", {"include_locked": True})

    def test_frontend_surface_is_loaded_semantic_keyboard_first_and_text_safe(self):
        frontend = PLATFORM_ROOT / "frontend"
        mastery = (frontend / "mastery.js").read_text(encoding="utf-8")
        ui = (frontend / "dossiers-ui.js").read_text(encoding="utf-8")
        self.assertEqual(1, mastery.count("import('./dossiers-ui.js')"))
        self.assertIn("research.get_dossiers", ui)
        self.assertNotIn("innerHTML", ui)
        self.assertIn("textContent", ui)
        self.assertIn("createElement", ui)
        self.assertIn("role:'status'", ui)
        self.assertIn("aria-live", ui)
        self.assertIn("caption", ui)
        self.assertIn("scope:'col'", ui)
        self.assertIn("dossiers-linear", ui)
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
