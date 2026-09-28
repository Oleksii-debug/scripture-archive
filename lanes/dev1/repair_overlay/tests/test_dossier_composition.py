import unittest

from scripture_archive_platform.application.runtime_gateway import RuntimeGatewayError, build_runtime_dossier
from scripture_archive_platform.application.service import PlatformApplication
from scripture_archive_platform.transport.contracts import validate_request_shape
from scripture_archive_runtime.evidence import Claim, EvidenceRecord, EvidenceRuntime
from scripture_archive_runtime.models import Confidence


def canonical_subject_catalog():
    return {
        "PERSON:PAUL": {
            "subject_id": "PERSON:PAUL",
            "display_name": "Paul",
            "kind": "PERSON",
        }
    }


def safe_dossier(subject_id="PERSON:PAUL", display_name="Paul", kind="PERSON"):
    return {
        "dossier": {
            "schema": "scripture.dossier-view.v1",
            "subject": {
                "subject_id": subject_id,
                "kind": kind,
                "display_name": display_name,
            },
            "stated": False,
            "status_text": "No cited support available in current scope",
            "rows": [],
            "linear": [
                f"Dossier {kind} {subject_id}: {display_name}",
                "No cited support available in current scope",
            ],
            "evidence_scope": "unlocked_only",
        }
    }


class FakeGateway:
    def __init__(self, data=None):
        self.data = data if data is not None else safe_dossier()

    def get_dossier(self, subject_id, display_name, kind):
        return self.data


class DossierCompositionTests(unittest.TestCase):
    def test_transport_requires_exact_bounded_control_safe_subject(self):
        request = {
            "api_version": "scripture.transport.v1",
            "request_id": "dossier-1",
            "command": "dossier.get",
            "payload": {"subject_id": "PERSON:PAUL", "display_name": "Paul", "kind": "PERSON"},
        }
        rid, command, payload = validate_request_shape(request)
        self.assertEqual((rid, command), ("dossier-1", "dossier.get"))
        self.assertEqual(payload, request["payload"])

        bad_payloads = (
            {"subject_id": "PERSON:PAUL", "display_name": "Paul", "kind": "PERSON", "path": "../x"},
            {"subject_id": " PERSON:PAUL", "display_name": "Paul", "kind": "PERSON"},
            {"subject_id": "PERSON:PAUL", "display_name": "Paul\nInjected", "kind": "PERSON"},
            {"subject_id": "PERSON:PAUL\u0085X", "display_name": "Paul", "kind": "PERSON"},
            {"subject_id": "PERSON:PAUL", "display_name": "Paul\u2028Injected", "kind": "PERSON"},
            {"subject_id": "PERSON:PAUL", "display_name": "Paul\u2029Injected", "kind": "PERSON"},
            {"subject_id": "PERSON:PAUL", "display_name": "Paul", "kind": "BIOGRAPHY"},
        )
        for payload in bad_payloads:
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    validate_request_shape({**request, "payload": payload})

    def test_platform_attests_scope_subject_and_schema(self):
        app = object.__new__(PlatformApplication)
        app.player_gateway = FakeGateway()
        request = {"subject_id": "PERSON:PAUL", "display_name": "Paul", "kind": "PERSON"}
        result = app._dossier(request)
        self.assertEqual(result["truth_owner"], "D5/runtime")
        self.assertEqual(result["dossier"]["evidence_scope"], "unlocked_only")

        widened = safe_dossier()
        widened["dossier"]["evidence_scope"] = "all_runtime_evidence"
        app.player_gateway = FakeGateway(widened)
        with self.assertRaises(ValueError):
            app._dossier(request)

        substituted = safe_dossier(subject_id="PERSON:OTHER")
        app.player_gateway = FakeGateway(substituted)
        with self.assertRaises(ValueError):
            app._dossier(request)

    def test_packaged_helper_uses_same_runtime_and_hides_locked_dependencies(self):
        evidence = EvidenceRuntime()
        evidence.add_evidence(EvidenceRecord(
            evidence_id="EV-VISIBLE",
            passage_refs=(),
            proposition="Visible canonical proposition",
            confidence=Confidence.T1,
            entity_ids=("PERSON:PAUL",),
        ))
        evidence.add_evidence(EvidenceRecord(
            evidence_id="EV-LOCKED",
            passage_refs=(),
            proposition="Locked proposition",
            confidence=Confidence.T1,
            entity_ids=("PERSON:PAUL",),
        ))
        evidence.add_claim(Claim(
            claim_id="CL-LOCKED",
            proposition="Claim needing locked evidence",
            confidence=Confidence.T2,
            required_evidence_ids=("EV-VISIBLE", "EV-LOCKED"),
        ))
        evidence.unlock("EV-VISIBLE")
        runtime = type("Runtime", (), {"evidence": evidence})()

        packaged = build_runtime_dossier(
            runtime,
            "PERSON:PAUL",
            "Paul",
            "PERSON",
            subject_catalog=canonical_subject_catalog(),
        )["dossier"]
        self.assertEqual(packaged["evidence_scope"], "unlocked_only")
        self.assertEqual([row["row_id"] for row in packaged["rows"]], ["EV-VISIBLE"])
        rendered = "\n".join(packaged["linear"])
        self.assertIn("EV-VISIBLE", rendered)
        self.assertNotIn("EV-LOCKED", rendered)
        self.assertNotIn("CL-LOCKED", rendered)
        self.assertNotIn("Locked proposition", rendered)


    def test_packaged_helper_fails_closed_on_noncanonical_subject_metadata(self):
        evidence = EvidenceRuntime()
        runtime = type("Runtime", (), {"evidence": evidence})()
        catalog = canonical_subject_catalog()

        for display_name, kind in (("Not Paul", "PERSON"), ("Paul", "PLACE")):
            with self.subTest(display_name=display_name, kind=kind):
                with self.assertRaisesRegex(
                    RuntimeGatewayError,
                    "does not match canonical catalog",
                ):
                    build_runtime_dossier(
                        runtime,
                        "PERSON:PAUL",
                        display_name,
                        kind,
                        subject_catalog=catalog,
                    )

        with self.assertRaisesRegex(RuntimeGatewayError, "catalog is unavailable"):
            build_runtime_dossier(runtime, "PERSON:PAUL", "Paul", "PERSON")
        with self.assertRaisesRegex(RuntimeGatewayError, "unknown canonical dossier subject"):
            build_runtime_dossier(
                runtime,
                "PERSON:UNKNOWN",
                "Unknown",
                "PERSON",
                subject_catalog=catalog,
            )


if __name__ == "__main__":
    unittest.main()
