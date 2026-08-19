# LN_VARIANT_RELATION_REGISTER v0.5

**Date:** 2026-08-19  
**Status:** DEV R05 / independent audit pending

Canonical relation classes remain:
`EXACT`, `VARIANT`, `PASSAGE_REVISIT`, `CROSS_CONTEXT`, `SYNTHESIS`, `NONE`.

## Whole-pilot R05 rules
- Wording-only paraphrase remains `EXACT`.
- TX1 metadata never turns an EXACT paraphrase into a `VARIANT`.
- A `VARIANT` requires a materially different audited evidence operation/fingerprint, not stylistic rephrasing.
- Witness-local sequence questions remain `PASSAGE_REVISIT` or `CROSS_CONTEXT` when moved to another mission; they do not become a universal chronology.
- Final reconstruction/evidence-map tasks may be `SYNTHESIS` only when they integrate multiple previously audited claims and preserve provenance.
- If no audited fingerprint change exists, scheduler chooses another due item/review or ends the slot; LLM generation cannot manufacture novelty.

## R05 coverage additions
- LN-06 adds arrest witness-provenance, named-vs-unnamed and prediction→fulfilment relations.
- LN-10 adds authority-handoff and mission-boundary relations.
- LN-11 adds evidence-graph, uncertainty-boundary and local-order relations.
- LN-02/LN-03 repaired nodes retain their v0.4 relation classes; pedagogy repair does not create new task variants.

Developer-side D-005 is **candidate-for-closure** pending independent R05 semantic/fingerprint audit.