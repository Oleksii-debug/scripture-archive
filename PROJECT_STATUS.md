# Архів Писання — PROJECT STATUS

**Repository:** `Oleksii-debug/scripture-archive`  
**Project phase:** textual pre-production only  
**Platform decision:** intentionally deferred  
**Current baseline:** Game Design Bible v1.1 — 18 August 2026  
**Canonical content schema:** v1.2 — 18 August 2026  
**Player memory/session scheduling:** v1.0 — 18 August 2026  
**Textual-variant policy:** v1.0 — 17 August 2026  
**Parallel production workflow:** v1.0 — 18 August 2026  
**Pilot authoring:** 12/12 missions authored and source-audited  
**Pilot editorial status:** `PILOT_AUDIT_IN_PROGRESS`

## Non-negotiable scope

Current work develops the game itself, not a website, WordPress plugin, Windows/mobile application or production code. Platform choice remains deferred until explicitly authorized.

Product principle:
> The act of reading, searching, comparing and interpreting Scripture is itself the gameplay.

The game evaluates defined knowledge/mastery, never faith, holiness, spirituality or closeness to God.

## Parallel production mode — ACTIVE

Direct product-owner instruction on 18 August 2026 supersedes the previous sequential stopping rule. LN pilot closure remains mandatory, but it no longer blocks independently safe pre-production in later lanes.

Canonical workflow: `docs/workflow/PARALLEL_PRODUCTION_PLAN_v1.0.md`.

Five concurrent lanes are active:
1. **LN pilot closure** — normalization, retrieval/variant closure, TX1, translation neutrality, NVDA and branch regression.
2. **PA «Дорога Павла»** — migrate and author the eight canonical PA missions under schema v1.2 from the start.
3. **Large-scale Scripture corpus map** — build the versioned architecture for thousands of cases without artificial duplicates.
4. **Evidence and cross-reference corpus** — reusable provenance-grounded people/event/place/promise/cross-testament evidence infrastructure.
5. **Task variants, mastery, accessibility and session-scale system** — safe novelty, player memory, mastery transitions, simulations and NVDA acceptance matrices.

Parallel lanes should normally write only to their owned paths. Shared files are integration-controlled and must be refetched before every update.

## Scale direction

Historical v1.0 `500-mission` spine is preserved only as an early planning artifact, not a target or ceiling.

Current architecture envelope:
- approximately **2,000–10,000+ missions/cases**;
- approximately **30,000–100,000+ source-audited canonical task nodes/variants**;
- no artificial duplicates merely to reach a count.

Canonical macro-scale document remains `docs/BASELINE_INDEX_v1.1.md`; its old sequential order is overridden only on workflow sequencing by `PARALLEL_PRODUCTION_PLAN_v1.0.md`.

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
Created: `docs/campaigns/LN/LN-08_TESTIMONY_AND_ACCUSATION_v1.1.md`.

Result:
- all **16 LN-08 nodes** now have stable canonical IDs;
- required nodes: `LN08-N01`…`LN08-N14`;
- optional nodes: `LN08-O01`, `LN08-O02`;
- canonical identity, learning-purpose, ground-truth, feedback, branch, retrieval/mastery and accessibility fields are explicit;
- structural required-route reachability passes;
- `LN08-N08` explicitly enforces translation-neutral semantic validation;
- no material TX1 grading point exists in LN-08;
- `LN08-N10` consumes the Luke 22:66 daybreak anchor from LN-07 without exact-task repetition;
- `LN08-N13` preserves the anti-false-harmonization boundary for Luke/John.

Current normalized total: **31/185 nodes = 16.8%**. Remaining: **154 nodes**.

## Retrieval closure progress

Current register: `docs/audits/LN_RETRIEVAL_REGISTER_v0.2.md`.

Stable links currently proven include:
- `LN07-O02 → LN08-N10` for Luke 22:66 daybreak retrieval;
- LN-07 provenance/boundary retrieval → `LN08-O01` / `LN08-N13`.

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
- `docs/audits/LN_PILOT_DEFECT_REGISTER_v0.5.md`;
- `docs/audits/LN_RETRIEVAL_REGISTER_v0.2.md`;
- `docs/audits/LN_VARIANT_RELATION_REGISTER_v0.1.md`;
- `docs/audits/LN_NORMALIZATION_MATRIX_v0.3.md`;
- `docs/audits/LN_PLAYER_MEMORY_SIMULATION_v0.1.md`.

## Open LN defects

### D-001 — HIGH — node schema not uniformly explicit
`OPEN — 31/185 STRUCTURALLY NORMALIZED`.

### D-002 — MEDIUM — stable node IDs inconsistent
`OPEN — 31/185 STABLE IDS PROVEN`.

### D-003 — MEDIUM — confidence vocabulary ambiguity
`FIXED_BY_SPEC_v1.2`.

### D-004 — HIGH — retrieval closure incomplete
`OPEN — LN-07/LN-08 STABLE LINKS PARTIALLY CLOSED`.

### D-005 — HIGH — variant relationships incomplete
`OPEN — REGISTER STARTED`.

Current LN open summary: **0 critical, 3 high, 1 medium; 1 medium fixed by specification**.

## Accessibility status

Every mission has nonvisual equivalents at design level. LN-07 and LN-08 v1.1 make nonvisual controls explicit per node. Dedicated task-family NVDA/nonvisual audit is still required before LN pilot editorial closure.

Player-memory/session controls must expose textually:
- why an item appears (`new`, `due`, `weak`, `cross-link`, `synthesis`);
- progress/mastery state;
- review reason/mode;
- no essential color-only/animation-only state.

## Immediate five-lane production order

### Lane 1 — LN
Normalize LN-04/LN-09 prediction→fulfilment/TX1 chain; then LN-11/LN-12, LN-10 and remaining missions; close registers and run NVDA/branch/player-history regression.

### Lane 2 — PA
Begin `PA-01 — Переслідувач` immediately under schema v1.2, then advance through PA-08 with per-mission source audit. Historical 32 PA concepts remain planning input, not a canonical authored-node count.

### Lane 3 — corpus map
Create the first versioned large-scale Scripture corpus map and coverage taxonomy for books, events, themes, people, places and cross-testament study depth.

### Lane 4 — evidence corpus
Create reusable evidence/cross-reference registry specification and seed records with source provenance, confidence, chronology boundaries and textual-variant attachment points.

### Lane 5 — systems
Create task-variant/mastery/accessibility production matrix; extend player-memory/session simulations and deterministic duplicate/cooldown safeguards.

## Current sequencing rule

The former rule “do not begin PA migration or mass corpus expansion while LN pilot closure blockers remain” is **SUPERSEDED**.

Current rule: **all five lanes advance concurrently. LN quality blockers remain blockers for LN editorial closure, but do not block independently safe PA, corpus, evidence or system work. No known unresolved LN defect may be blindly propagated into new canonical content.**
