from __future__ import annotations

from typing import Any

from .answer_contracts import ANSWER_CONTRACT_VERSION, answer_contract_descriptor
from .security import ALLOWED_COMMANDS

TRANSPORT_CONTRACT_VERSION = "D1_RUNTIME_TRANSPORT_v1"
CANONICAL_TASK_TYPES = (
    "SINGLE_CHOICE", "MULTI_SELECT", "SHORT_TEXT", "LONG_TEXT",
    "COMBOBOX_SELECT", "ORDERING", "MATCHING", "EVIDENCE_SELECT",
    "CLAIM_EVIDENCE", "SPEAKER_RECIPIENT", "PARALLEL_WITNESS_COMPARE",
    "OT_NT_LINK", "COMPOSITE_MULTI_STEP", "ARGUMENT",
)


def transport_contract_descriptor() -> dict[str, Any]:
    return {
        "schema": TRANSPORT_CONTRACT_VERSION,
        "answer_contract": ANSWER_CONTRACT_VERSION,
        "commands": sorted(ALLOWED_COMMANDS),
        "task_types": {name: answer_contract_descriptor(name) for name in CANONICAL_TASK_TYPES},
        "platform_rule": "domain/runtime contains no pywebview, win32 or desktop-only imports",
    }
