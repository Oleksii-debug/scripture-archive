"""DEV-A platform compatibility surface for the canonical D5 runtime answer contract.

There is intentionally no platform-owned copy of ANSWER_DTO_v1 truth here. The
runtime package is the sole source for task aliases, descriptors and validation.
"""
from runtime_engine.scripture_archive_runtime.answer_contracts import (
    ANSWER_CONTRACT_VERSION,
    answer_contract_descriptor,
    canonical_task_type,
    validate_answer_dto,
)
from runtime_engine.scripture_archive_runtime.security import ValidationError as AnswerContractError

FIELDS = {
    name: answer_contract_descriptor(name)["fields"]
    for name in (
        "SINGLE_CHOICE", "MULTI_SELECT", "SHORT_TEXT", "LONG_TEXT", "ARGUMENT",
        "COMBOBOX_SELECT", "ORDERING", "MATCHING", "EVIDENCE_SELECT",
        "CLAIM_EVIDENCE", "COMPOSITE_MULTI_STEP", "SPEAKER_RECIPIENT",
        "PARALLEL_WITNESS_COMPARE", "OT_NT_LINK",
    )
}
