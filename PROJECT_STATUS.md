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

The historical v1.0 500-mission spine is preserved only as an early planning artifact. It is no longer the target or ceiling.

Current architecture envelope:
- approximately **2,000–10,000+ missions/cases**;
- approximately **30,000–100,000+ source-audited canonical task nodes/variants**;
- no artificial duplicates merely to reach a count.

Canonical macro-scale document: `docs/BASELINE_INDEX_v1.1.md`.

## Player memory and adaptive repetition

Pure random is not the standard scheduler.

The game must persist per player:
- campaign checkpoint;
- exact node history;
- Bible-passage exposure;
- concept mastery;
- mistakes/attempts/hints;
- review timing and due state;
- weak areas;
- recent task-family/passage/content fatigue.

Canonical relation classes for repetition now are:
- `EXACT`;
- `VARIANT`;
- `PASSAGE_REVISIT`;
- `CROSS_CONTEXT`;
- `SYNTHESIS`;
- `NONE` where no safe alternate exists.

After successful completion an exact task may not randomly recur in the adjacent daily session. Wording-only paraphrases are still `EXACT`, not novelty. Weak/forgotten knowledge may return sooner, preferably through a registered source-audited alternative. If none exists, choose other content or end/shorten the narrow session rather than ask an LLM to invent novelty.

Canonical documents:
- `docs/spec/PLAYER_MEMORY_AND_SESSION_SCHEDULING_v1.0.md`;
- `docs/audits/LN_VARIANT_RELATION_REGISTER_v0.1.md`.

## LN pilot authored content

Campaign «Остання ніч» has 12 completed, source-audited mission files, LN-01 through LN-12.

Current authored total: **160 required + 25 optional/conditional = 185 authored nodes**.

Mission-count completion is **12/12 = 100%**, but editorial closure is not yet granted. Existing v1.0 mission files are preserved as historical authored artifacts while schema-v1.2 normalization proceeds through versioned revisions where required.

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

- `docs/audits/LN_PILOT_CROSS_MISSION_AUDIT_v0.2.md` — current cross-mission audit baseline;
- `docs/audits/LN_PILOT_DEFECT_REGISTER_v0.3.md` — current defect register;
- `docs/audits/LN_RETRIEVAL_REGISTER_v0.1.md` — campaign-wide retrieval closure register, started but not complete;
- `docs/audits/LN_VARIANT_RELATION_REGISTER_v0.1.md` — relation model for exact/variant/passage/cross-context/synthesis retrieval, started but not complete;
- `docs/audits/LN_NORMALIZATION_MATRIX_v0.1.md` — mission-by-mission control matrix for all closure requirements;
- `docs/audits/LN_PLAYER_MEMORY_SIMULATION_v0.1.md` — five simulated player histories; anti-repeat logic passes at design level.

## Open defects

### D-001 — HIGH — node schema not uniformly explicit
`OPEN — CONTROL MATRIX CREATED`.

All 185 authored nodes still require node-by-node field-completeness normalization against `CONTENT_NODE_SCHEMA_v1.2`. LN-07 and LN-08 are the first confirmed candidates for versioned repair.

### D-002 — MEDIUM — stable node IDs inconsistent
`OPEN`.

Full stable IDs must be proven for all required and optional nodes; bare `Nxx` remains only a human-readable alias.

### D-003 — MEDIUM — confidence vocabulary ambiguity
`FIXED_BY_SPEC_v1.2`.

### D-004 — HIGH — retrieval closure incomplete
`OPEN — REGISTER STARTED`.

Highest-risk chains and review queues are registered, but every non-none retrieval hook across all 185 nodes still has to be inventoried and resolved.

### D-005 — HIGH — variant relationships incomplete
`OPEN — REGISTER STARTED`.

Canonical relation semantics and high-confidence cross-mission examples are now registered. Full closure requires stable node IDs and concept identities across the 185-node corpus.

Current open summary: **0 critical, 3 high, 1 medium; 1 medium fixed by specification**.

## Accessibility status

Every mission defines nonvisual equivalents at design level, including linear witness/provenance forms and non-drag alternatives. A dedicated task-family NVDA/nonvisual audit is still required before pilot closure.

Player-memory/session controls must expose textually:
- why an item appears (`new`, `due`, `weak`, `cross-link`, `synthesis`);
- progress/mastery state;
- review reason/mode;
- no essential color-only/animation-only state.

## Immediate production order

1. begin node-by-node v1.2 normalization with LN-07 and LN-08, producing versioned revisions rather than overwriting v1.0;
2. normalize globally stable node IDs;
3. complete `LN_RETRIEVAL_REGISTER` from the full scan;
4. complete `LN_VARIANT_RELATION_REGISTER` from normalized concept/node IDs;
5. audit translation-neutral answers and every TX1-before-grading case;
6. perform dedicated NVDA/nonvisual task-family audit;
7. trace branch/reachability and final-synthesis accessibility regression;
8. re-run five player histories against normalized retrieval + variant registers;
9. mark `PILOT_AUDIT_COMPLETE` only after all HIGH defects are fixed and MEDIUM defects are fixed or explicitly accepted;
10. only then migrate PA «Дорога Павла»;
11. then build the versioned large-scale Bible corpus plan for thousands of missions and tens of thousands of audited nodes.

## Current stopping rule

Do **not** begin PA migration or mass corpus expansion while LN pilot closure blockers remain. Fix and prove the production system on 185 authored nodes before multiplying the same risks across thousands.