# LN pilot defect register v0.1

**Campaign:** LN — «Остання ніч»  
**Audit phase:** cross-mission normalization and regression  
**Date:** 2026-08-18

## Severity model

- `CRITICAL` — invalidates central theological/source integrity or makes completion impossible.
- `HIGH` — invalidates canonical portability, grading consistency, or a required learning path across multiple nodes.
- `MEDIUM` — material editorial/data-model inconsistency that must be fixed or explicitly accepted before pilot closure.
- `LOW` — polish/consistency issue that does not change learning correctness.
- `PASS` — audited risk checked and no defect found.

## D-001 — Canonical node-record schema is not uniformly explicit

**Severity:** `HIGH`  
**Status:** `OPEN`  
**Affected:** at minimum LN-07 and LN-08; full LN-01–LN-12 normalization scan still required.

### Evidence

`CONTENT_NODE_SCHEMA_v1.1` requires every task node to state identity, learning purpose, ground truth, feedback, branch consequences, mastery effect and accessibility. During cross-mission audit, later mission files were found to use compact human-readable node records in which some mandatory fields are omitted or implicit.

Examples:
- LN-07 uses section labels such as `N01` and a compact node form rather than consistently exposing full `node_id`, `mission_id`, and all canonical branch/retrieval fields.
- LN-08 likewise uses bare `N01`–`N14`; visible node records may provide prompt/answer/confidence/mastery/accessibility but do not consistently expose every v1.1 branching field.

The missions remain pedagogically useful and source-audited, but they cannot yet be treated as fully normalized canonical data records.

### Fix strategy

1. Use `CONTENT_NODE_SCHEMA_v1.2` as the normalization target.
2. Scan all 185 authored nodes.
3. Create versioned mission revisions only where fields are missing; never overwrite v1.0 history silently.
4. Add explicit `none`/queue values rather than omitting non-applicable branch/retrieval fields.

### Regression check

Every required node must satisfy a field-completeness checklist against schema v1.2; all stable IDs must resolve uniquely; all required routes must remain traversable.

---

## D-002 — Stable node identifier convention is inconsistent

**Severity:** `MEDIUM`  
**Status:** `OPEN`  
**Affected:** campaign-wide normalization.

### Evidence

Some mission files use fully scoped IDs such as `LN04-N01` and `LN09-N01`; others use human shorthand such as `N01`. Human shorthand is readable, but the platform-neutral content model requires globally stable identifiers for retrieval links, analytics, accessibility references and future import/export.

### Fix strategy

Canonicalize full IDs as `LNxx-Nyy`; optional nodes should receive a stable full ID as well. Existing visible labels may remain as aliases.

### Regression check

No duplicate canonical `node_id`; every cross-mission retrieval link points to a unique stable ID.

---

## D-003 — Confidence field vocabulary in schema v1.1 is internally ambiguous

**Severity:** `MEDIUM`  
**Status:** `FIXED_BY_SPEC_v1.2`

### Evidence

Schema v1.1 describes task-node `confidence` using prose categories (`direct text / strong inference / interpretation / disputed`) while section 5 defines canonical codes `T1/T2/C1/I1/D1`. Mission files generally use the codes. The dual vocabulary creates avoidable normalization ambiguity.

### Fix

`CONTENT_NODE_SCHEMA_v1.2` now requires `confidence_code` to use exactly `T1/T2/C1/I1/D1`. `TX1` is explicitly an adjunct textual-variant flag rather than a replacement confidence code.

### Regression check

Normalization scan rejects undefined confidence values and verifies that retrieval does not silently upgrade a prior confidence code.

---

## D-004 — Future-retrieval hooks need a closure contract

**Severity:** `HIGH`  
**Status:** `OPEN`  
**Affected:** all nodes with `later_retrieval_effect`, mission-level `future_repetition_hooks`, and LN-12 post-campaign review targets.

### Evidence

LN-04 explicitly schedules weaknesses into LN-09, and LN-09 explicitly routes weak prediction recall back into later synthesis. LN-12 also creates post-campaign review targets. These are sound designs, but the campaign currently has no single register proving that every promised future retrieval either reaches a concrete later node or enters an explicit review queue.

### Fix strategy

Build `LN_RETRIEVAL_REGISTER_v0.1` with one row per hook:
`origin node → concept → destination node/review queue → mastery domain → status`.

Schema v1.2 defines allowed statuses: `RESOLVED_NODE`, `REVIEW_QUEUE`, `DEFERRED_CAMPAIGN`, `RETIRED`.

### Regression check

No anonymous/unresolved retrieval hook remains at `PILOT_AUDIT_COMPLETE`.

---

## A-06 — LN-04 prediction → LN-09 fulfilment separation

**Severity:** `PASS`  
**Status:** `PASS`

LN-04 explicitly reserves the later denial narratives for fulfilment work and records the prediction independently. LN-09 begins with memory retrieval before opening the fulfilment corpus, preserves the common-core prediction, and treats Mark’s second-crow wording under `TX1` rather than making it universal. LN-12 again retrieves prediction independently from fulfilment. No hindsight rewrite was found in the audited mission-level design.

Regression requirement: normalized revisions must preserve original witness anchors and the Mark `TX1` qualification.

---

## A-07 — LN-07 / LN-08 mission boundary and Luke daybreak handling

**Severity:** `PASS`  
**Status:** `PASS`

LN-07 reserves Matthew 26:59–68, Mark 14:55–65 and Luke 22:66–71 for LN-08 and explicitly states that Luke 22:66 begins when day comes. LN-08 retains that boundary, uses John 18:19–24 only as provenance contrast, and does not equate John’s questioning with Matthew/Mark’s false-witness sequence.

No contradictory universal night chronology was found at mission-design level.

Regression requirement: later normalization must not reclassify Luke’s daybreak council as universal `T1` night chronology.

---

## A-08 — LN-10 / LN-12 Pilate threshold

**Severity:** `PASS`  
**Status:** `PASS`

The pilot’s substantive narrative ends at the authority handoff to Pilate. LN-12 explicitly states that it introduces no new answer-bearing narrative corpus and does not expand into Roman interrogation, Barabbas, Herod, scourging or verdict material. The final reconstruction therefore remains inside the declared campaign boundary.

Regression requirement: any future contextual module must remain outside LN pilot grading unless separately source-audited.

---

## A-09 — Final synthesis protects provenance and uncertainty

**Severity:** `PASS`  
**Status:** `PASS`

LN-12 requires structured claims in the form `claim → witness → passage → confidence → qualification`, allows multiple responsible reconstructions where evidence is `D1`, preserves `TX1`, and explicitly warns that the pedagogical mission order is not proof of exact harmonized Gospel chronology.

This is sufficient at design level. Node-schema normalization remains separately open under D-001/D-002.

---

## Current defect summary

- Critical open: **0**
- High open: **2** (`D-001`, `D-004`)
- Medium open: **1** (`D-002`)
- Medium fixed by specification: **1** (`D-003`)
- Passed cross-mission checks recorded here: **4** (`A-06`–`A-09`)

## Next audit actions

1. create retrieval-hook register and resolve LN-04 → LN-09 → LN-12 chain plus all other future hooks;
2. run node-field completeness audit across LN-01–LN-12 against schema v1.2;
3. normalize stable IDs without deleting v1.0 mission history;
4. then perform dedicated translation-neutral answer validation and NVDA/nonvisual task-family audit;
5. run final branch regression only after normalization fixes are committed.

The campaign remains `PILOT_AUDIT_IN_PROGRESS`.