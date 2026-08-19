# R02_PLAYER_HISTORY_REGRESSION_v0.1

**Status:** developer simulation / independent audit pending  
**Inputs:** repaired canonical LN-04, LN-09, LN-12 and PA-02 serialized records.

## H-A — strong continuous player
History: independent success on `LN04-N09`, no hints.
Expected deterministic behavior:
- relation to same wording-only item remains `EXACT`;
- adjacent-session exact repeat is suppressed;
- `LN09-N11` is eligible later as `CROSS_CONTEXT`/prediction→fulfilment TX1 use;
- `LN12-N08` becomes eligible only after the LN-09 fulfilment layer is ready.
Result: PASS.

## H-B — weak witness-provenance player
History: remembers event content but repeatedly misattributes witness evidence.
Expected:
- prioritize audited provenance operations such as `LN09-N07`, `PA02-N11` or `PA02-N12` when due/eligible;
- do not repeat unrelated mastered exact facts merely because they are old.
Result: PASS.

## H-C — hint-dependent player
History: reaches H7 on `PA02-N07`.
Expected:
- mastery mode recorded as guided;
- `PA_DAMASCUS_AUDITORY_BOUNDARY_REVIEW` becomes an earlier review target;
- later retrieval should prefer another audited operation, not a shame/punishment loop;
- Acts 22:9 still accepts `did not hear` and `did not understand`.
Result: PASS.

## H-D — return after 30+ days
Expected:
- sample due/weak items before a large burst of new content;
- interleave campaign continuation rather than dumping every overdue node;
- preserve source/TX1 qualifications from stored canonical records.
Result: PASS.

## H-E — small eligible pool
Expected:
- if no audited non-EXACT variant exists, choose other eligible content or user-selected review;
- never fabricate a wording-only LLM paraphrase and call it novel.
Result: PASS.

## TX1-specific history regression
Sequence:
`LN04-N09 → LN09-N11 → LN12-N08`, optional `LN09-O01 → LN12-N10`.

Two translation profiles are simulated:
A. Mark form contains first/second-crow wording.
B. Responsible Mark form omits or footnotes the first-crow wording.

Both profiles:
- receive the TX1 note before affected grading;
- can satisfy the same underlying knowledge proposition;
- receive no penalty solely for textual form;
- retain TX1 through LN-12 synthesis/audit.
Result: PASS.

## NVDA/nonvisual regression
All repaired records expose `functional_nonvisual_equivalent`; no repaired node depends on drag, color, pointer, spatial position or time-only feedback. PA-02 H1–H7 and all feedback are textual and keyboard reachable at specification level.
Result: PASS.
