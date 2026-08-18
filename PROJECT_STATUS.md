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

Current control matrix: `docs/audits/LN_NORMALIZATION_MATRIX_v0.2.md`.

### LN-07 repaired to v1.1

Created:
`docs/campaigns/LN/LN-07_ANNAS_CAIAPHAS_NIGHT_QUESTIONING_v1.1.md`.

Result:
- all **15 LN-07 nodes** now have stable canonical IDs;
- required nodes: `LN07-N01`…`LN07-N13`;
- historical optional N14/N15 map to `LN07-O01`/`LN07-O02` without deleting history;
- mission-level v1.2 fields are explicit;
- node identity, branching, retrieval/mastery and nonvisual control fields are explicit;
- structural required-route reachability passes;
- translation-neutral handling passes structurally; no material TX1 grading point exists in LN-07;
- dedicated campaign-wide NVDA, retrieval/variant closure and end-to-end branch regression remain pending.

This means **15 of 185 authored nodes now have a versioned structural normalization record under v1.2**. LN-08 is the next confirmed repair target.

## Source/theological integrity status

No critical theological/source-integrity defect has been found in audited high-risk boundaries.

Passed at mission-design level:
- LN-04 prediction → LN-09 fulfilment → LN-12 synthesis separation;
- Mark rooster wording TX1 propagation;
- LN-07/LN-08 questioning vs accusation boundary;
- Luke 22:66 daybreak safeguard;
- John 18:19–24 provenance separation from Matthew/Mark false-witness material;
- LN-10/LN-12 Pilate threshold;
- final reconstruction preserves provenance, confidence and uncertainty.

Canonical confidence vocabulary: `T1/T2/C1/I1/D1`; `TX1` is an adjunct textual-variant flag.

## Current audit artifacts

- `docs/audits/LN_PILOT_CROSS_MISSION_AUDIT_v0.2.md`;
- `docs/audits/LN_PILOT_DEFECT_REGISTER_v0.4.md` — current defect register;
- `docs/audits/LN_RETRIEVAL_REGISTER_v0.1.md`;
- `docs/audits/LN_VARIANT_RELATION_REGISTER_v0.1.md`;
- `docs/audits/LN_NORMALIZATION_MATRIX_v0.2.md` — current normalization control matrix;
- `docs/audits/LN_PLAYER_MEMORY_SIMULATION_v0.1.md`.

## Open defects

### D-001 — HIGH — node schema not uniformly explicit
`OPEN — 15/185 STRUCTURALLY NORMALIZED`.

LN-07 is repaired in v1.1. Remaining 170 authored nodes still require scan/repair as applicable. LN-08 is next.

### D-002 — MEDIUM — stable node IDs inconsistent
`OPEN — LN-07 FIXED LOCALLY`.

LN-07 now has 15/15 stable IDs; campaign-wide proof remains incomplete.

### D-003 — MEDIUM — confidence vocabulary ambiguity
`FIXED_BY_SPEC_v1.2`.

### D-004 — HIGH — retrieval closure incomplete
`OPEN — LN-07 CONCRETE HOOKS NORMALIZED`.

LN-07 local hooks are now explicit. Exact cross-mission destination IDs still depend on normalization of LN-08/LN-11/LN-12 and register updates.

### D-005 — HIGH — variant relationships incomplete
`OPEN — REGISTER STARTED`.

No wording-only duplicate is accepted as novelty. Full corpus mapping waits on stable IDs/concept identities.

Current open summary: **0 critical, 3 high, 1 medium; 1 medium fixed by specification**.

## Accessibility status

Every mission has nonvisual equivalents at design level. LN-07 v1.1 now makes its nonvisual controls explicit per node. A dedicated task-family NVDA/nonvisual audit is still required before pilot closure.

Player-memory/session controls must expose textually:
- why an item appears (`new`, `due`, `weak`, `cross-link`, `synthesis`);
- progress/mastery state;
- review reason/mode;
- no essential color-only/animation-only state.

## Immediate production order

1. create versioned LN-08 v1.1 structural normalization;
2. update retrieval register with exact LN-07→LN-08 stable destinations;
3. normalize LN-04/LN-09 high-risk prediction→fulfilment/TX1 chain;
4. normalize LN-11/LN-12 synthesis layers;
5. scan/repair remaining missions until all 185 nodes are covered;
6. complete retrieval + variant registers;
7. audit translation-neutral answers and every TX1-before-grading case;
8. perform dedicated NVDA/nonvisual task-family audit;
9. run end-to-end branch/reachability regression;
10. re-run five player histories against normalized retrieval/variant data;
11. mark `PILOT_AUDIT_COMPLETE` only after all HIGH defects are fixed and MEDIUM defects fixed/accepted;
12. only then migrate PA «Дорога Павла» and later build the large-scale Bible corpus plan.

## Current stopping rule

Do **not** begin PA migration or mass corpus expansion while LN pilot closure blockers remain. Fix and prove the production system on 185 authored nodes before multiplying the same risks across thousands.