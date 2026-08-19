# LN_VARIANT_RELATION_REGISTER_v0.4

**Date:** 2026-08-19  
**Status:** `R04 EXPANSION / CAMPAIGN-WIDE D-005 OPEN`

Canonical relation classes remain:
`EXACT`, `VARIANT`, `PASSAGE_REVISIT`, `CROSS_CONTEXT`, `SYNTHESIS`, `NONE`.

Wording-only paraphrase remains `EXACT`.

## New LN-02 relations
| source | target | relation | rationale |
|---|---|---|---|
| LN02-N02 | LN12-N03 | SYNTHESIS | table scene-setting is reused inside final reconstruction |
| LN02-N04 | LN12-N03 | SYNTHESIS | bread-action common core enters final reconstruction |
| LN02-N06 | LN11-N03 | PASSAGE_REVISIT | source contamination is re-tested as provenance |
| LN02-N08 | LN12-N10 | CROSS_CONTEXT | covenant/TX1-aware comparison is used in final variant audit context |
| LN02-N11 | LN12-N10 | PASSAGE_REVISIT | textual-variant policy is re-applied to final TX1 audit |
| wording-only restatement of LN02-N04 | LN02-N04 | EXACT | no new evidence operation |

## New LN-03 relations
| source | target | relation | rationale |
|---|---|---|---|
| LN03-N03 | LN11-N03 | PASSAGE_REVISIT | explicit naming provenance is re-tested |
| LN03-N08 | LN11-N03 | CROSS_CONTEXT | unnamed-disciple boundary becomes evidence-map provenance |
| LN03-N10 | LN11-N08 | PASSAGE_REVISIT | John-local order remains local-order evidence |
| LN03-N12 | LN11-N11 | SYNTHESIS | claim classification feeds anti-false-harmonization audit |
| LN03-N13 | LN12-N03 | SYNTHESIS | full betrayal-at-table case feeds final reconstruction |
| wording-only restatement of LN03-N09 | LN03-N09 | EXACT | no novelty from paraphrase |

## Scheduler invariants
- successful `EXACT` content is suppressed in the adjacent daily session;
- TX1 metadata does not convert an EXACT paraphrase into `VARIANT`;
- if no audited fingerprint changes, choose other content/due review/end slot rather than inventing a variant;
- synthesis targets are not duplicates when evidence operation and context materially change.

D-005 remains OPEN until the remaining LN-06/LN-10/LN-11 nodes are canonicalized and one final relation/fingerprint pass covers all 185 nodes.
