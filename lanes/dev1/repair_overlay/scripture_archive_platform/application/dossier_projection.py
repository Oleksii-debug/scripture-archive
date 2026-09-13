from __future__ import annotations

from contextlib import nullcontext
from typing import Any


def _subject_kind(entity_id: str):
    from runtime_engine.scripture_archive_runtime.dossiers import DossierKind

    prefix = entity_id.split("-", 1)[0].upper()
    try:
        return DossierKind(prefix)
    except ValueError:
        return None


def build_player_safe_dossiers(player_gateway: Any) -> dict[str, Any]:
    """Project dossiers from the canonical in-process unlocked EvidenceRuntime only.

    This adapter owns no source facts. It discovers candidate subjects solely from
    already-unlocked evidence and delegates row construction/witness safety to the
    canonical runtime DossierAssembler. Empty/fail-closed dossier views are omitted
    so conflicting or locked-only records cannot leak subject metadata.
    """
    if player_gateway is None:
        raise ValueError("Dossiers require canonical runtime")
    runtime_application = getattr(player_gateway, "_runtime_application", None)
    if runtime_application is None or getattr(runtime_application, "evidence", None) is None:
        raise ValueError("Dossiers require the canonical runtime application")

    from runtime_engine.scripture_archive_runtime.dossiers import DossierAssembler, DossierSubject

    runtime = runtime_application.evidence
    lock = getattr(player_gateway, "_runtime_lock", None)
    guard = lock if lock is not None else nullcontext()
    with guard:
        candidates: dict[tuple[str, str], DossierSubject] = {}
        for evidence_id in sorted(runtime.unlocked):
            record = runtime.evidence.get(evidence_id)
            if record is None:
                continue
            for raw_entity_id in record.entity_ids:
                if not isinstance(raw_entity_id, str) or not raw_entity_id.strip():
                    continue
                entity_id = raw_entity_id.strip()
                kind = _subject_kind(entity_id)
                if kind is None:
                    continue
                candidates[(kind.value, entity_id)] = DossierSubject(
                    subject_id=entity_id,
                    kind=kind,
                    display_name=entity_id,
                )

        assembler = DossierAssembler(runtime)
        views = []
        linear: list[str] = []
        for key in sorted(candidates):
            view = assembler.build(candidates[key], unlocked_only=True)
            if not view.stated:
                continue
            payload = view.to_dict()
            payload["linear"] = list(view.linearize())
            views.append(payload)
            linear.extend(payload["linear"])

    if not linear:
        linear = [
            "Dossiers",
            "No source-safe unlocked dossier records are available in the current scope.",
        ]
    return {
        "schema": "scripture.research.dossiers.v1",
        "read_only": True,
        "evidence_scope": "unlocked_only",
        "dossier_count": len(views),
        "dossiers": views,
        "linear": linear,
        "truth": {
            "mutation": False,
            "locked_evidence_exposed": False,
            "inferred_subject_labels": False,
            "automatic_harmonization": False,
        },
        "truth_owner": "D5/runtime",
    }
