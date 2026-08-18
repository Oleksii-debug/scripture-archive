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

Current work develops the game itself, not a website, WordPress plugin, Windows/mobile application or production code. Platform choice remains deferred until the textual pre-production, pilot audit and scalable content/memory model are proven.

The product principle remains:

> The act of reading, searching, comparing and interpreting Scripture is itself the gameplay.

The game evaluates defined knowledge/mastery, never faith, holiness, spirituality or closeness to God.

## Scale direction

The historical Game Design Bible v1.0 used a 500-mission spine as an early planning device. It remains in history but is no longer the target or ceiling.

Current design capacity target:
- approximately **2,000–10,000+ missions/cases** over long-term expansion;
- approximately **30,000–100,000+ source-audited canonical task nodes/variants**;
- no artificial duplicate content merely to reach a number.

`docs/BASELINE_INDEX_v1.1.md` is canonical for this macro-scale direction.

## Player memory and adaptive repetition

Pure random selection is not the default learning strategy.

The game must persist per player:
- campaign checkpoint;
- exact node history;
- Bible-passage exposure;
- concept mastery;
- mistakes, attempts and hint use;
- review timing / due state;
- weak areas;
- recent task-family, passage and content fatigue.

The scheduler distinguishes `EXACT_REPEAT`, `VARIANT_REPEAT`, `PASSAGE_REVISIT`, `CROSS_CONTEXT_RETRIEVAL` and `SYNTHESIS_RETRIEVAL`.

After a successful task, accidental exact repetition in the adjacent daily session is prohibited. Weak/forgotten knowledge may return sooner, preferably through another source-audited form. If no valid alternative exists, the system should select different content or shorten/end the narrow session rather than fake novelty or ask an LLM to invent an unreviewed question.

Canonical spec: `docs/spec/PLAYER_MEMORY_AND_SESSION_SCHEDULING_v1.0.md`.

## LN pilot authored content

Campaign «Остання ніч» contains 12 completed, source-audited mission files:

1. `LN-01_PREPARATION_v1.0.md`
2. `LN-02_AT_THE_TABLE_v1.0.md`
3. `LN-03_BETRAYER_AT_THE_TABLE_v1.0.md`
4. `LN-04_PETER_WARNING_v1.0.md`
5. `LN-05_GETHSEMANE_PRAYER_AND_SLEEP_v1.0.md`
6. `LN-06_ARREST_v1.0.md`
7. `LN-07_ANNAS_CAIAPHAS_NIGHT_QUESTIONING_v1.0.md`
8. `LN-08_TESTIMONY_AND_ACCUSATION_v1.0.md`
9. `LN-09_THREE_DENIALS_v1.0.md`
10. `LN-10_MORNING_v1.0.md`
11. `LN-11_EVIDENCE_MAP_v1.0.md`
12. `LN-12_FINAL_RECONSTRUCTION_v1.0.md`

Current authored total: **160 required + 25 optional/conditional = 185 authored nodes**.

Mission-count completion is **12/12 = 100%**, but this is not yet editorial closure. Existing v1.0 mission files remain preserved as historical authored artifacts while schema-v1.2 normalization proceeds through new versioned revisions where needed.

## Source/theological integrity status

No critical theological/source-integrity defect has been found in audited high-risk boundaries.

Passed at mission-design level:
- LN-04 prediction → LN-09 fulfilment → LN-12 synthesis separation;
- Mark rooster wording `TX1` propagation;
- LN-07/LN-08 questioning vs accusation boundary;
- Luke 22:66 daybreak safeguard;
- John 18:19–24 provenance separation from Matthew/Mark false-witness material;
- LN-10/LN-12 Pilate threshold;
- final reconstruction preserves provenance, confidence and uncertainty.

Canonical confidence vocabulary: `T1/T2/C1/I1/D1`; `TX1` is an adjunct textual-variant flag.

## Audit progress — 18 August 2026 current cycle

New canonical audit artifacts:

- `docs/audits/LN_RETRIEVAL_REGISTER_v0.1.md` — the first campaign-wide retrieval closure register. It explicitly registers the high-risk LN-04→LN-09 chain, LN-09→LN-12 synthesis path and post-campaign review queues. It is intentionally marked incomplete until all 185 node retrieval fields are scanned.
- `docs/audits/LN_PLAYER_MEMORY_SIMULATION_v0.1.md` — five simulated player histories covering strong success, weak/hinted learning, prediction→fulfilment retrieval, long absence/lapse and a tiny eligible task pool.
- `docs/audits/LN_PILOT_DEFECT_REGISTER_v0.2.md` — current defect register; v0.1 retained in history.

Five-history simulation result: **anti-repeat logic passes at design level**, including the rule that a successful exact task is not blindly repeated next day. Practical closure exposed a new high-severity dependency: canonical variant relationships are not yet registered across the LN corpus.

## Current open defects

### D-001 — HIGH — node schema not uniformly explicit
All 185 authored nodes still require field-completeness normalization against `CONTENT_NODE_SCHEMA_v1.2`.

### D-002 — MEDIUM — stable node IDs inconsistent
Bare `Nxx` shorthand still exists in some missions. Canonical full IDs must become globally unique and stable.

### D-003 — MEDIUM — confidence vocabulary ambiguity
`FIXED_BY_SPEC_v1.2`.

### D-004 — HIGH — retrieval closure incomplete
`LN_RETRIEVAL_REGISTER_v0.1` now exists and closes/registers the highest-risk known chains, but every non-none retrieval hook across all 185 nodes still has to be inventoried and resolved to `RESOLVED_NODE`, `REVIEW_QUEUE`, `DEFERRED_CAMPAIGN` or `RETIRED`.

### D-005 — HIGH — variant relationships not canonically registered
The memory scheduler can only safely prefer “another audited variant” if the project can prove which normalized node IDs are exact repeats, genuine variants, passage revisits, cross-context retrievals or synthesis tasks.

Required artifact: `LN_VARIANT_RELATION_REGISTER_v0.1` after/during stable-ID normalization.

## Accessibility status

Every mission currently defines nonvisual equivalents at design level, including linear witness/provenance forms and non-drag alternatives. A dedicated task-family NVDA/nonvisual audit is still required before pilot closure.

Player-memory/session controls must expose textually:
- why an item appears (`new`, `due`, `weak`, `cross-link`, `synthesis`);
- current progress/mastery state;
- review reason and mode;
- no essential color-only/animation-only state.

## Immediate production order

1. run a field-completeness scan across all 185 authored nodes against schema v1.2;
2. normalize globally stable full node IDs without deleting v1.0 mission history;
3. complete `LN_RETRIEVAL_REGISTER` from the full node scan;
4. create `LN_VARIANT_RELATION_REGISTER` with normalized IDs and relation types;
5. audit translation-neutral answers and every TX1-before-grading case;
6. perform dedicated NVDA/nonvisual task-family audit;
7. trace branch/reachability and final-synthesis accessibility regression;
8. re-run the five player histories against normalized retrieval + variant registers;
9. mark `PILOT_AUDIT_COMPLETE` only after all HIGH defects are fixed and MEDIUM defects fixed or explicitly accepted;
10. only then migrate PA «Дорога Павла»;
11. then build the versioned large-scale Bible corpus plan for thousands of missions and tens of thousands of audited nodes;
12. expand campaign by campaign without weakening source quality, theological transparency, accessibility or deduplication.

## Current stopping rule

Do **not** begin PA migration or mass corpus expansion while LN pilot closure blockers remain. Fix the production system on 185 authored nodes before multiplying the same risks across thousands.