# LN_RETRIEVAL_REGISTER_v0.5

**Date:** 2026-08-19  
**Status:** `R02 DEVELOPER VALIDATED / INDEPENDENT AUDIT PENDING`

## Mark rooster TX1 chain
Canonical end-to-end chain:

`LN04-N09 [T2 + TX1]`
→ `LN09-N11 [T1 + TX1]`
→ `LN12-N08 [T2 + TX1]`

Optional deep-dive:
`LN09-O01 [T1 + TX1]`
→ `LN12-N10 [T2 + TX1]`

Every bracketed expression above represents two separate serialized fields:
- `confidence_code`
- `textual_variant_flag`

No node stores `T1/T2 + TX1` as one mixed confidence value.

## Required invariants
1. TX1 note is available before grading affected Mark wording.
2. A responsible translation/textual form omitting or footnoting first-crow wording is not penalized.
3. Mark-specific `twice` is never universalized to Matthew/Luke/John.
4. Retrieval preserves witness, passage, confidence and TX1 qualification.
5. `LN12-N08` performs prediction→fulfilment synthesis; `LN12-N10` performs variant audit.
6. Weakness resolves into a named review queue rather than vague `later`.

## Developer regression
- full first/second-crow form: PASS
- responsible shorter/footnoted form: PASS
- same underlying mastery result, no textual-form penalty: PASS
- TX1 retained at LN-12 destination: PASS

Campaign-wide retrieval closure remains open for missions not yet fully normalized.
