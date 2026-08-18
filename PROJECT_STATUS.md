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
4. **Evidence and cross-reference corpus** — reusable provenance-grounded evidence infrastructure.
5. **Task variants, mastery, accessibility and session-scale system** — safe novelty, player memory, mastery transitions, simulations and NVDA acceptance matrices.

## Scale direction
Historical v1.0 `500-mission` spine is preserved only as an early planning artifact, not a target or ceiling.

Current architecture envelope:
- approximately **2,000–10,000+ missions/cases**;
- approximately **30,000–100,000+ source-audited canonical task nodes/variants**;
- no artificial duplicates merely to reach a count.

## Player memory and adaptive repetition
Pure random is not the standard scheduler. Per-player state must persist campaign checkpoint, exact node history, passage exposure, concept mastery, mistakes/attempts/hints, due state, weak areas and recent content/task-family fatigue.

Canonical repetition relations: `EXACT`, `VARIANT`, `PASSAGE_REVISIT`, `CROSS_CONTEXT`, `SYNTHESIS`, `NONE`.

After successful completion an exact task may not randomly recur in the adjacent daily session. Wording-only paraphrases are still EXACT. Weak knowledge may return sooner, preferably through a registered audited alternative. If none exists, choose other content rather than fabricate novelty with an LLM.

## LN pilot authored content
Campaign «Остання ніч» has 12 completed, source-audited missions, LN-01 through LN-12.

Current authored total: **160 required + 25 optional/conditional = 185 authored nodes**.

Mission-count completion is **12/12 = 100%**, but editorial closure is not yet granted.

### LN structural normalization
- LN-07 v1.1: 15/15 normalized.
- LN-08 v1.1: 16/16 normalized.
- current normalized total: **31/185 = 16.8%**; remaining **154**.

Current matrix: `docs/audits/LN_NORMALIZATION_MATRIX_v0.3.md`.

### LN retrieval closure
Current register is now `docs/audits/LN_RETRIEVAL_REGISTER_v0.3.md`.

New exact stable links closed in the latest five-lane integration:
- `LN04-N01 → LN09-N02` — prediction corpus to fulfilment corpus, with prediction recall still occurring first;
- `LN04-N02 → LN09-N01` — common-core Peter/three-denials/rooster-marker delayed recall.

Previously proven exact links remain, including `LN07-O02 → LN08-N10` and LN-07→LN-08 provenance/boundary retrieval.

The Mark rooster `TX1` chain remains source-audited at mission level but not yet exact-ID closed end-to-end; this still blocks D-004 closure.

### LN defects
- D-001 HIGH — schema not uniformly explicit: OPEN, 31/185 normalized.
- D-002 MEDIUM — stable IDs inconsistent: OPEN, 31/185 proven.
- D-003 MEDIUM — confidence vocabulary ambiguity: FIXED_BY_SPEC_v1.2.
- D-004 HIGH — retrieval closure incomplete: OPEN, but two LN04→LN09 exact anchors newly closed.
- D-005 HIGH — variant relationships incomplete: OPEN.

Current open summary: **0 critical, 3 high, 1 medium; 1 medium fixed by specification**.

## PA «Дорога Павла» — authoring now active
Created `docs/campaigns/PA/PA-01_PERSECUTOR_v1.0.md`.

PA-01 status: **MISSION_COMPLETE / SOURCE_AUDITED**.

Current PA authored total: **12 required + 2 optional = 14 canonical nodes**.

PA-01 is schema-v1.2-native from birth:
- stable IDs `PA01-N01…PA01-N12`, `PA01-O01/O02`;
- explicit source provenance and uncertainty boundaries;
- translation-neutral validation;
- explicit branching, mastery, retrieval queues and NVDA/nonvisual equivalents;
- no material TX1 grading point in v1.0.

Primary source corpus: Acts 7:58–8:3; 9:1–2; 22:3–5; 26:9–11; Gal 1:13–14; Phil 3:5–6.

Important safeguard: PA-01 does not claim as T1 that Saul personally threw stones at Stephen; it distinguishes presence/approval from unsupported direct-action inference.

Next PA package: `PA-02 — Дорога до Дамаска`, comparing Acts 9, 22 and 26 without false harmonization.

## Large-scale Scripture corpus
Created `docs/corpus/SCRIPTURE_CORPUS_MAP_v0.1.md`.

The corpus now has a versioned planning architecture across:
- biblical books;
- events;
- people;
- places;
- speaker/recipient relations;
- themes;
- evidence operations;
- depth tiers D1–D6;
- OT↔NT relation classes;
- player-state fit.

Planned cases remain explicitly `PLANNED`; they are not counted as authored/source-audited content.

Next package: `BOOK_COVERAGE_REGISTRY_v0.1` with per-book status/risk/first-case families.

## Evidence and cross-reference corpus
Created `docs/evidence/EVIDENCE_REGISTRY_SPEC_AND_PA_SEEDS_v0.1.md`.

Result:
- reusable evidence-record schema defined;
- OT↔NT/cross-reference category vocabulary defined;
- **7 PA seed evidence records** created and source-audited (`EV-PA-0001…EV-PA-0007`);
- narrator vs Paul's later speech vs epistolary autobiography provenance is preserved;
- chronology boundaries are explicit;
- unsupported modern legal-office inference from Acts 26:10 is not encoded as T1.

Next evidence package: PA-02 Damascus-road witness records from Acts 9/22/26.

## Variants / mastery / accessibility / session scale
Created `docs/systems/TASK_VARIANT_MASTERY_ACCESSIBILITY_MATRIX_v0.1.md`.

It now defines:
- deterministic relation test for EXACT/VARIANT/PASSAGE_REVISIT/CROSS_CONTEXT/SYNTHESIS/NONE;
- content fingerprint for duplicate detection;
- mastery states from UNSEEN through MASTERED_FOR_NOW/LAPSED;
- review-queue priorities and cooldown rules;
- initial session-composition envelope;
- five canonical player-history simulations;
- NVDA/nonvisual acceptance matrix for source selection, witness comparison, ordering, evidence maps, classification, free response, hint ladders, TX1/confidence, mastery, geography and synthesis;
- textual reason codes for why an item appears (`NEW`, `DUE`, `WEAK`, `CROSS_LINK`, etc.).

Next systems package: `MECHANIC_FAMILY_VARIANT_TEMPLATES_v0.1` and rerun of five histories against normalized LN + PA.

## Source/theological integrity status
No critical theological/source-integrity defect has been found in the audited high-risk LN boundaries or PA-01 source audit.

Canonical confidence vocabulary remains `T1/T2/C1/I1/D1`; `TX1` is an adjunct textual-variant flag.

## Accessibility status
Every LN mission has a nonvisual equivalent at design level; LN-07/LN-08 have explicit per-node normalized nonvisual controls. PA-01 is authored with explicit per-node accessibility from the start. The new cross-project systems matrix defines acceptance criteria for major mechanic families, but a dedicated campaign-wide NVDA regression is still required for LN closure.

## Latest five-lane integration delta
Concrete completed artifacts in the latest integrated cycle:
1. Lane 1: `LN_RETRIEVAL_REGISTER_v0.3.md` — 2 exact LN04→LN09 links newly closed.
2. Lane 2: `PA-01_PERSECUTOR_v1.0.md` — 14 canonical nodes authored/source-audited.
3. Lane 3: `SCRIPTURE_CORPUS_MAP_v0.1.md` — first large-scale canonical planning map.
4. Lane 4: `EVIDENCE_REGISTRY_SPEC_AND_PA_SEEDS_v0.1.md` — evidence model + 7 source-audited PA seeds.
5. Lane 5: `TASK_VARIANT_MASTERY_ACCESSIBILITY_MATRIX_v0.1.md` — adaptive repetition/mastery/NVDA production baseline.

No shared-file conflict was detected during final HEAD refetch before this integration update.

## Next five-lane production package
1. LN: normalize LN-04/LN-09 mission records to v1.2 and close the complete TX1 retrieval chain.
2. PA: author/source-audit PA-02.
3. Corpus: build per-book coverage registry.
4. Evidence: build Damascus-road witness pack with Acts 9/22/26 comparison.
5. Systems: create mechanic-family variant templates and rerun H-A…H-E against real LN+PA records.

## Current sequencing rule
All five lanes advance concurrently. LN quality blockers remain blockers for LN editorial closure, but do not block independently safe PA, corpus, evidence or system work. No known unresolved LN defect may be blindly propagated into new canonical content.