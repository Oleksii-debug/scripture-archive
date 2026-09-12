from __future__ import annotations

from typing import Any

from runtime_engine.scripture_archive_runtime.chronology import ChronologyLab


CHRONOLOGY_RESPONSE_SCHEMA = "scripture.research.chronology.v1"
EMPTY_MESSAGE = "No source-backed chronology assertions are available in the current runtime."


class ChronologyProjection:
    """Read-only packaged projection of the canonical source-safe Chronology Lab.

    This layer never manufactures assertions from prose, passage order, evidence
    labels, or witness omission. If the canonical runtime does not currently own
    a ChronologyLab, the only truthful projection is an explicit empty state.
    """

    def __init__(self, chronology: ChronologyLab | None) -> None:
        if chronology is not None and not isinstance(chronology, ChronologyLab):
            raise ValueError("Chronology projection requires canonical ChronologyLab data")
        self._chronology = chronology

    def response(self) -> dict[str, Any]:
        chronology = self._chronology or ChronologyLab()
        rows = chronology.semantic_rows()
        linear = chronology.linearize()
        if len(linear) != len(rows):
            raise ValueError("Chronology semantic/linear projection parity mismatch")
        return {
            "schema": CHRONOLOGY_RESPONSE_SCHEMA,
            "read_only": True,
            "source_status": (
                "SOURCE_BACKED_ASSERTIONS" if rows else "NO_SOURCE_BACKED_ASSERTIONS"
            ),
            "assertion_count": len(rows),
            "rows": rows,
            "linear": linear,
            "empty_message": None if rows else EMPTY_MESSAGE,
            "truth": {
                "mutation": False,
                "inferred_chronology": False,
                "narrative_order_used": False,
                "automatic_harmonization": False,
            },
        }
