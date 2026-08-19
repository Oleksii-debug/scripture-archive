# LN normalization matrix v0.4

**Campaign:** LN — «Остання ніч»  
**Date:** 2026-08-19  
**Status:** `IN_PROGRESS — LN-04/LN-09 STRUCTURAL NORMALIZATION COMPLETE`  
**Supersedes for current audit work:** v0.3 remains history.

## Mission inventory
| Mission | Authored nodes | v1.2 normalization | Stable IDs | Retrieval | TX1/translation | NVDA design | Current status |
|---|---:|---|---|---|---|---|---|
| LN-01 | 13+1 | PENDING | PENDING | PENDING | PENDING | design pass/dedicated pending | OPEN |
| LN-02 | 12+2 | PENDING | PENDING | PENDING | PENDING | design pass/dedicated pending | OPEN |
| LN-03 | 13+2 | PENDING | PENDING | partial | PENDING | design pass/dedicated pending | OPEN |
| **LN-04** | **13+2** | **STRUCTURAL PASS v1.1** | **PASS 15/15** | **exact LN04→LN09 + queues** | **Mark TX1 PASS** | **explicit per-node PASS** | **REPAIRED — campaign audits pending** |
| LN-05 | 13+2 | PENDING | PENDING | PENDING | Luke 22:43–44 pending normalization | design pass/dedicated pending | OPEN |
| LN-06 | 14+2 | PENDING | PENDING | partial | PENDING | design pass/dedicated pending | OPEN |
| **LN-07** | **13+2** | **STRUCTURAL PASS v1.1** | **PASS 15/15** | partial concrete closure | structural PASS | explicit per-node PASS | REPAIRED |
| **LN-08** | **14+2** | **STRUCTURAL PASS v1.1** | **PASS 16/16** | concrete + downstream hooks | translation PASS | explicit per-node PASS | REPAIRED |
| **LN-09** | **14+2** | **STRUCTURAL PASS v1.1** | **PASS 16/16** | **exact LN09→LN12 + queues** | **Mark TX1 PASS** | **explicit per-node PASS** | **REPAIRED — campaign audits pending** |
| LN-10 | 13+2 | PENDING | PENDING | PENDING | PENDING | design pass/dedicated pending | OPEN |
| LN-11 | 14+3 | PENDING | PENDING | PENDING | PENDING | linear map design PASS | OPEN |
| LN-12 | 14+3 | PENDING | PENDING | post-campaign hooks | inherited TX1 design pass | linear synthesis PASS | OPEN |

## Count
- normalized before R01: 31/185.
- added R01: LN-04 15 + LN-09 16 = 31.
- normalized now: **62/185 = 33.5%**.
- remaining: **123**.

## R01 repair evidence
- created `LN-04_PETER_WARNING_v1.1.md` preserving v1.0 history;
- created `LN-09_THREE_DENIALS_v1.1.md` preserving v1.0 history;
- stable optional mappings N14/N15 and N15/N16 moved to O IDs without deleting aliases;
- all branch fields explicit;
- every later retrieval resolves to exact node or named review queue;
- Mark TX1 visible before affected grading and never substitutes for confidence;
- full key chain: `LN04-N09 → LN09-N11 → LN12-N08`; optional deep variant → `LN12-N10`;
- no new answer-bearing Gospel claim added by normalization.

## Remaining order
1. LN-11/LN-12 normalization;
2. LN-10 exact downstream closure;
3. LN-01/02/03/05/06 normalization;
4. full campaign retrieval + variant relation scan;
5. dedicated translation/TX1 and NVDA regression;
6. full branch reachability;
7. final five-history rerun after all LN records normalize.

`PILOT_AUDIT_COMPLETE` remains blocked.
