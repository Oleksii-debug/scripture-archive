# Архів Писання — PROJECT STATUS

**Repository:** `Oleksii-debug/scripture-archive`  
**Project phase:** textual pre-production only  
**Platform decision:** intentionally deferred  
**Current baseline:** Game Design Bible v1.1 — 18 August 2026  
**Canonical content schema:** v1.2 — 18 August 2026  
**Player memory/session scheduling:** v1.0 — 18 August 2026  
**Textual-variant policy:** v1.0 — 17 August 2026  
**Pilot authoring:** 12/12 missions authored and source-audited  
**Pilot editorial status:** `PILOT_AUDIT_IN_PROGRESS`

## Non-negotiable scope

Current work develops the game itself, not a website, WordPress plugin, Windows/mobile application or production code. Platform choice remains deferred until textual pre-production, pilot audit and scalable content/memory model are proven.

Product principle:
> The act of reading, searching, comparing and interpreting Scripture is itself the gameplay.

The game evaluates defined knowledge/mastery, never faith, holiness, spirituality or closeness to God.

## Scale direction

Historical v1.0 `500-mission` spine is preserved only as an early planning artifact, not a target or ceiling.

Current architecture envelope:
- approximately **2,000–10,000+ missions/cases**;
- approximately **30,000–100,000+ source-audited canonical task nodes/variants**;
- no artificial duplicates merely to reach a count.

Canonical macro-scale document: `docs/BASELINE_INDEX_v1.1.md`.

## Player memory and adaptive repetition

Pure random is not the standard scheduler. Per-player state must persist campaign checkpoint, exact node history, passage exposure, concept mastery, mistakes/attempts/hints, due state, weak areas and recent content/task-family fatigue.

Canonical repetition relations:
- `EXACT`;
- `VARIANT`;
- `PASSAGE_REVISIT`;
- `CROSS_CONTEXT`;
- `SYNTHESIS`;
- `NONE` where no safe alternate exists.

After successful completion an exact task may not randomly recur in the adjacent daily session. Wording-only paraphrases are still EXACT. Weak knowledge may return sooner, preferably through a registered audited alternative. If none exists, choose other content rather than fabricate novelty with an LLM.

Canonical documents:
- `docs/spec/PLAYER_MEMORY_AND_SESSION_SCHEDULING_v1.0.md`;
- `docs/audits/LN_VARIANT_RELATION_REGISTER_v0.1.md`.

## LN pilot authored content

Campaign «Остання ніч» has 12 completed, source-audited missions, LN-01 through LN-12.

Current authored total: **160 required + 25 optional/conditional = 185 authored nodes**.

Mission-count completion is **12/12 = 100%**, but editorial closure is not yet granted.

## Normalization progress

Current control matrix: `docs/audits/LN_NORMALIZATION_MATRIX_v0.3.md`.

### LN-07 repaired to v1.1

- 15/15 nodes have stable canonical IDs and schema-v1.2 structural records.
- Structural required-route reachability passes.
- No material TX1 grading point exists in LN-07.

### LN-08 repaired to v1.1

Created:
`docs/campaigns/LN/LN-08_TESTIMONY_AND_ACCUSATION_v1.1.md`.

Result:
- all **16 LN-08 nodes** now have stable canonical IDs;
- required nodes: `LN08-N01`…`LN08-N14`;
- optional nodes: `LN08-O01`, `LN08-O02`;
- all canonical identity, learning-purpose, ground-truth, feedback, branch, retrieval/mastery and accessibility fields are explicit;
- structural required-route reachability passes;
- `LN08-N08` explicitly enforces translation-neutral semantic validation;
- no material TX1 grading point exists in LN-08;
- `LN08-N10` consumes the Luke 22:66 daybreak anchor from LN-07 without exact-task repetition;
- `LN08-N13` preserves the anti-false-harmonization boundary for Luke/John;
- dedicated campaign-wide NVDA, variant closure and end-to-end regression remain pending.

Current normalized total: **31/185 nodes = 16.8%**. Remaining: **154 nodes**.

## Retrieval closure progress

Current register: `docs/audits/LN_RETRIEVAL_REGISTER_v0.2.md`.

New stable cross-mission links proven:
- `LN07-O02 → LN08-N10` for Luke 22:66 daybreak retrieval;
- LN-07 provenance/boundary retrieval → `LN08-O01` / `LN08-N13`.

LN-08 downstream hooks into LN-10/LN-11/LN-12 are now explicit. Exact destination IDs remain pending only because those destination missions have not yet been normalized.

## Source/theological integrity status

No critical theological/source-integrity defect has been found in audited high-risk boundaries.

Passed at mission-design/normalized level:
- LN-04 prediction → LN-09 fulfilment → LN-12 synthesis separation;
- Mark rooster wording TX1 propagation;
- LN-07/LN-08 questioning vs accusation boundary;
- Luke 22:66 daybreak safeguard;
- John 18:19–24 provenance separation from Matthew/Mark false-witness material;
- LN-08 translation-neutral answer handling;
- LN-10/LN-12 Pilate threshold;
- final reconstruction preserves provenance, confidence and uncertainty.

Canonical confidence vocabulary: `T1/T2/C1/I1/D1`; `TX1` is an adjunct textual-variant flag.

## Current audit artifacts

- `docs/audits/LN_PILOT_CROSS_MISSION_AUDIT_v0.2.md`;
- `docs/audits/LN_PILOT_DEFECT_REGISTER_v0.5.md` — current defect register;
- `docs/audits/LN_RETRIEVAL_REGISTER_v0.2.md` — current retrieval register;
- `docs/audits/LN_VARIANT_RELATION_REGISTER_v0.1.md`;
- `docs/audits/LN_NORMALIZATION_MATRIX_v0.3.md` — current normalization matrix;
- `docs/audits/LN_PLAYER_MEMORY_SIMULATION_v0.1.md`.

## Open defects

### D-001 — HIGH — node schema not uniformly explicit
`OPEN — 31/185 STRUCTURALLY NORMALIZED`.

LN-07 and LN-08 are repaired in v1.1. Remaining 154 nodes require scan/repair as applicable.

### D-002 — MEDIUM — stable node IDs inconsistent
`OPEN — 31/185 STABLE IDS PROVEN`.

LN-07 and LN-08 are fully stable; campaign-wide proof remains incomplete.

### D-003 — MEDIUM — confidence vocabulary ambiguity
`FIXED_BY_SPEC_v1.2`.

### D-004 — HIGH — retrieval closure incomplete
`OPEN — LN-07/LN-08 STABLE LINKS PARTIALLY CLOSED`.

Concrete LN-07→LN-08 links are now stable. Remaining exact destinations depend on normalization of LN-09/LN-10/LN-11/LN-12 and full 185-node scan.

### D-005 — HIGH — variant relationships incomplete
`OPEN — REGISTER STARTED`.

No wording-only duplicate is accepted as novelty. LN-08 repair uses deterministic review queues rather than invented AI variants.

Current open summary: **0 critical, 3 high, 1 medium; 1 medium fixed by specification**.

## Accessibility status

Every mission has nonvisual equivalents at design level. LN-07 and LN-08 v1.1 now make nonvisual controls explicit per node. A dedicated task-family NVDA/nonvisual audit is still required before pilot closure.

Player-memory/session controls must expose textually:
- why an item appears (`new`, `due`, `weak`, `cross-link`, `synthesis`);
- progress/mastery state;
- review reason/mode;
- no essential color-only/animation-only state.

## Immediate production order

1. normalize LN-04/LN-09 high-risk prediction→fulfilment/TX1 chain;
2. update retrieval register with their exact stable IDs;
3. normalize LN-11/LN-12 synthesis layers;
4. normalize LN-10 and close exact LN08→LN10 daybreak destination;
5. scan/repair LN-01/LN-02/LN-03/LN-05/LN-06 until all 185 nodes are covered;
6. complete retrieval + variant registers;
7. audit translation-neutral answers and every TX1-before-grading case;
8. perform dedicated NVDA/nonvisual task-family audit;
9. run end-to-end branch/reachability regression;
10. re-run five player histories against normalized retrieval/variant data;
11. mark `PILOT_AUDIT_COMPLETE` only after all HIGH defects are fixed and MEDIUM defects fixed/accepted;
12. only then migrate PA «Дорога Павла» and later build the large-scale Bible corpus plan.

## Current stopping rule

Do **not** begin PA migration or mass corpus expansion while LN pilot closure blockers remain. Fix and prove the production system on 185 authored nodes before multiplying the same risks across thousands.