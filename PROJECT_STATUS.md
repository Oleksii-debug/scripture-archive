# Архів Писання — PROJECT STATUS

**Repository:** `Oleksii-debug/scripture-archive`  
**Project phase:** textual pre-production only  
**Platform decision:** intentionally deferred  
**Current baseline:** Game Design Bible v1.1 — 18 August 2026  
**Canonical content schema:** v1.2 — 18 August 2026  
**Player memory/session scheduling:** v1.0 — 18 August 2026  
**Textual-variant policy:** v1.0 — 17 August 2026  
**Pilot campaign authoring status:** 12/12 missions authored and source-audited  
**Pilot cross-mission audit:** IN_PROGRESS — structural normalization defects identified

## Non-negotiable scope

The project is currently developing the game itself, not a website, WordPress plugin, Windows application, mobile app, or production code. Canonical pre-production must define the product from A to Z before platform implementation is chosen: campaign architecture; missions; questions and answers; evidence; branching; hints; chronology; characters; mastery; spaced retrieval; persistent player memory; adaptive session composition; group modes; theological/textual transparency; accessibility; monetization boundaries; and a platform-neutral content model.

## Product definition

Working title: **Архів Писання / Scripture Archive**.

> The act of reading, searching, comparing and interpreting Scripture is itself the gameplay.

The player acts as a researcher/investigator. Missions require direct work with biblical texts and distinguish evidence from inference and interpretation.

## Scale correction — 18 August 2026

The old Game Design Bible v1.0 used a **500-mission macro spine** as an early planning device. Product-owner direction explicitly rejects 500 as the intended final scale. It remains preserved only as historical v1.0 planning material.

Game Design Bible v1.1 now requires an architecture capable of:
- **thousands of authored missions/cases** over the long-term corpus;
- **tens of thousands of source-audited canonical task nodes/variants**;
- a planning envelope of approximately **2,000–10,000+ missions/cases** and **30,000–100,000+ canonical task nodes/variants** without changing the core content/progress model;
- much larger session diversity through verified variants, cross-context retrieval and different personal learning histories;
- no artificial duplication merely to hit a numeric target.

This is a scale envelope, not a requirement to ship an initial release with the maximum catalog size.

## Player memory and adaptive repetition — canonical direction

Pure random task selection is not an acceptable default session model.

The project must persist per-player:
- campaign checkpoint;
- exact task-node history;
- Bible-passage exposure;
- concept-level mastery;
- correct/incorrect attempts and hint use;
- weak areas;
- review timing;
- recent task-family/content fatigue.

The scheduler distinguishes:
- exact repeat;
- variant repeat of the same knowledge;
- passage revisit with a new investigative goal;
- cross-context retrieval;
- synthesis retrieval.

After a successful task, accidental exact repetition in the next daily session is prohibited. Forgotten/weak knowledge may return sooner, preferably through another source-audited form. Normal sessions combine continuation/new material, due review, weak material, cross-links and synthesis. Randomness is only a tie-breaker among eligible tasks or an explicit user-selected random-study mode.

Canonical specification: `docs/spec/PLAYER_MEMORY_AND_SESSION_SCHEDULING_v1.0.md`.  
Research baseline: `docs/research/PERSONALIZED_REPETITION_RESEARCH_v1.0.md`.

## Current baseline content

Game Design Bible v1.0 established 20 task/mechanic families, 8 branching types, 7 hint levels, 6 difficulty levels, mastery/adaptive repetition, theological-source and AI policies, accessibility requirements, group/cooperative modes, monetization principles, a canonical mission data model, 72 baseline task-node concepts for «Остання ніч», 32 for «Дорога Павла», and the historical 500-mission spine.

Game Design Bible v1.1 preserves those design foundations but supersedes v1.0 for current macro-scale and repetition planning. The 500 figure is no longer a product ceiling. The **104 historical baseline concepts** remain planning material and must not be confused with fully migrated canonical nodes.

## Canonical authored content now in repository

As of 2026-08-18:

- `docs/BASELINE_INDEX_v1.1.md` — current design baseline for scale/player-memory direction; v1.0 retained in history;
- `docs/spec/CONTENT_NODE_SCHEMA_v1.2.md` — current canonical authoring/normalization schema; v1.1 retained in history;
- `docs/spec/PLAYER_MEMORY_AND_SESSION_SCHEDULING_v1.0.md` — persistent player-state, anti-repeat and adaptive-session specification;
- `docs/research/PERSONALIZED_REPETITION_RESEARCH_v1.0.md` — comparison of Duolingo, Khan Academy, Quizlet, Anki/FSRS and current Bible-study products;
- `docs/spec/TEXTUAL_VARIANT_POLICY_v1.0.md` — textual-variation policy;
- `docs/audits/LN_PILOT_CROSS_MISSION_AUDIT_v0.2.md` — current pilot cross-mission audit;
- `docs/audits/LN_PILOT_DEFECT_REGISTER_v0.1.md` — current defect register;
- `LN-01_PREPARATION_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 13 required + 1 optional;
- `LN-02_AT_THE_TABLE_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 12 required + 2 optional/conditional;
- `LN-03_BETRAYER_AT_THE_TABLE_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 13 required + 2 optional;
- `LN-04_PETER_WARNING_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 13 required + 2 optional; includes Mark 14:30 `TX1` handling;
- `LN-05_GETHSEMANE_PRAYER_AND_SLEEP_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 13 required + 2 optional; explicit `TX1` handling for Lk 22:43–44;
- `LN-06_ARREST_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 14 required + 2 optional;
- `LN-07_ANNAS_CAIAPHAS_NIGHT_QUESTIONING_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 13 required + 2 optional;
- `LN-08_TESTIMONY_AND_ACCUSATION_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 14 required + 2 optional;
- `LN-09_THREE_DENIALS_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 14 required + 2 optional; preserves prediction→fulfilment and Mark cock-crow `TX1`;
- `LN-10_MORNING_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 13 required + 2 optional; isolates authority handoff to Pilate;
- `LN-11_EVIDENCE_MAP_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 14 required + 3 optional; provenance-aware evidence graph and complete linear/nonvisual equivalent;
- `LN-12_FINAL_RECONSTRUCTION_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 14 required + 3 optional; final source-cited reconstruction, uncertainty statement and defence.

Current authored total in campaign LN: **160 required task nodes + 25 optional/conditional nodes = 185 authored nodes across 12 completed missions**.

Campaign mission-count completion: **12/12 = 100%**.

This does **not** mean the pilot is editorially closed. Cross-mission audit v0.2 found structural normalization defects that must be repaired before all 185 authored nodes can be called fully normalized canonical records under schema v1.2. Campaign status remains `PILOT_AUDIT_IN_PROGRESS`.

## Current audit findings

No critical theological/source-integrity defect has been identified in the high-risk cross-mission boundaries audited so far.

Passed at mission-design level:
- LN-04 prediction → LN-09 fulfilment → LN-12 final retrieval separation;
- Mark cock-crow `TX1` propagation in that chain;
- LN-07/LN-08 division of questioning vs accusation material;
- Luke 22:66 daybreak safeguard;
- provenance separation of John 18:19–24 from Matthew/Mark false-witness material;
- LN-10/LN-12 Pilate threshold;
- LN-12 final provenance and uncertainty grammar.

Open structural defects:
- `D-001 HIGH` — task-node records are not uniformly explicit against the canonical schema; at minimum LN-07/LN-08 require normalization review and the full 185-node corpus must be scanned;
- `D-002 MEDIUM` — stable node identifier convention is inconsistent (`LNxx-Nyy` vs bare `Nyy` shorthand);
- `D-004 HIGH` — future-retrieval hooks do not yet have one campaign-wide closure register proving each hook resolves to a concrete later node or explicit review queue.

Fixed at specification level:
- `D-003 MEDIUM` — confidence vocabulary ambiguity in schema v1.1; schema v1.2 now requires `confidence_code: T1/T2/C1/I1/D1`, with `TX1` as an adjunct textual-variant flag.

The new player-memory/session model does not close D-004 by itself, but it makes the correct architecture explicit: campaign retrieval hooks and per-player review scheduling must be connected rather than maintained as unrelated mechanisms.

## Canonical distinctions

- baseline task-node concept — planning only;
- authored node — gameplay node written in a mission file;
- normalized canonical node — authored node conforming explicitly to current schema v1.2;
- `AUTHOR_COMPLETE` — prompt, answers, evidence, feedback, hints, branches, mastery and accessibility authored;
- `SOURCE_AUDITED` — answer-bearing claims checked;
- `MISSION_COMPLETE` — all required authored nodes meet the mission-level standard and valid branches resolve;
- `PILOT_AUDIT_COMPLETE` — cross-mission defects fixed/accepted, canonical normalization complete, player-memory/session regression included and final audit passed.

## Reusable design results established so far

### Anti-false-harmonization
Identify narrow common core; classify witness-specific details; test explicit wording vs imported knowledge; reconstruct local chronology only where supplied; state limits of cross-witness certainty.

### Prediction-to-fulfilment retrieval
Author prediction evidence separately; lock exact anchors; require later recall before comparison with fulfilment; do not rewrite prediction from hindsight.

### Textual-variant-in-play
When a gameplay-relevant verse is materially textually variable, the variant note must be available before grading; a responsible translation that brackets/omits the variant cannot be treated as player error.

### Witness-provenance matrix
In multi-Gospel scenes, every important name, action and ordering claim retains its witness provenance.

### Local-chronology / daybreak boundary safeguard
A witness-specific order may be graded as T1 only inside that witness. Luke’s explicit daybreak boundary must not be silently moved into an undifferentiated night trial.

### Mission-boundary partitioning
Adjacent missions declare what evidence belongs to the current mission and what is intentionally deferred, preventing duplicate/conflicting grading.

### Accusation-provenance separation
Procedural parallelism does not imply identical evidentiary content; witness-specific accusations stay witness-specific.

### Prediction-to-fulfilment delta matrix
Retrieve prediction before showing fulfilment; preserve witness-specific deltas; expose textual variants before grading; state limits of harmonized certainty; schedule weak dimensions for spaced retrieval.

### Denial-count safeguard
The game counts three denial episodes, not three identical sentences or three universally identical accusers.

### Authority-handoff boundary
Identify prior authority, custody/transport, receiving authority and threshold; keep later interrogation/verdict content out of the prior-stage mission; do not elevate reconstructed legal procedure beyond the text to T1.

### Provenance-aware evidence graph
Separate neutral event nodes from witness claim nodes; every claim stores witness + passage + confidence; every edge has an explicit relation; local-order remains witness-scoped; TX1 and uncertainty survive synthesis; linear/nonvisual evidence map is canonically equivalent to any visual board.

### Source-cited final reconstruction
Established in LN-12: final synthesis is graded claim-by-claim as `claim → witness → passage → confidence → qualification`; multiple responsible reconstructions are allowed where D1 applies; final mastery includes explicit uncertainty statements and source-based defence, not merely a polished retelling.

### Retrieval-closure contract
Established in schema v1.2: every authored future repetition hook must resolve to `RESOLVED_NODE`, `REVIEW_QUEUE`, `DEFERRED_CAMPAIGN` or `RETIRED`. Anonymous “later” retrieval is not allowed at pilot closure.

### Personal novelty / useful-retrieval separation
Established in player-memory spec v1.0: exact repetition and useful retrieval are different. The scheduler suppresses accidental exact repeats while preserving intentional review of the same knowledge through variants, new contexts and synthesis.

## Theological integrity

Claims use: `T1` direct scriptural statement; `T2` direct comparison; `C1` historical/contextual; `I1` interpretation; `D1` disputed/not responsibly reducible to one forced answer. `TX1` is an adjunct for material textual-transmission variation. The game never scores faith, spirituality, holiness or closeness to God; only defined knowledge/mastery domains.

## Accessibility baseline

Keyboard-complete interaction, meaningful screen-reader labels, logical headings/focus, text alternatives for visual mechanics, no essential drag-only/color-only/spatial-only information, accessible feedback and textual-variant notes. LN-01 through LN-12 specify nonvisual equivalents at design level. Core linear forms include:

- `witness → claim → verse → confidence`;
- `prediction → fulfilment → witness → delta → certainty`;
- `prior authority → custody/transport → receiving authority → threshold`;
- `ID → event/claim → witness → verse → confidence → relation → qualification`;
- final reconstruction: `claim → witness → passage → confidence → qualification`.

Visual evidence boards or timelines are never the only or canonical representation. A dedicated task-family NVDA/nonvisual audit is still required before pilot closure. Player-memory and session controls must also expose progress, review reason and current mode textually rather than by color/animation alone.

## Platform neutrality

No platform is canonical. Content, player-state rules and game rules remain separable from presentation. Do not start website or application implementation until explicitly authorized by the project owner.

## Current production objective

The first pilot campaign is fully authored but not yet editorially closed. Do not rush into PA or mass-content authoring until pilot normalization and adaptive-session foundations are proven.

Immediate priority:

1. build `LN_RETRIEVAL_REGISTER_v0.1` and close every authored future-retrieval hook;
2. run a field-completeness scan across all 185 authored nodes against schema v1.2;
3. normalize stable full node IDs without deleting or silently replacing v1.0 mission history;
4. create versioned mission revisions for high-severity schema omissions;
5. audit translation-neutral answer validation and all TX1-before-grading cases;
6. perform the dedicated NVDA/nonvisual task-family audit;
7. trace required branches after normalization and run regression;
8. model at least five simulated player histories through LN and test exact-repeat cooldown, due review, weak-area return and variant rotation;
9. add a session-level repetition regression proving successful content is not blindly repeated the next day;
10. mark `PILOT_AUDIT_COMPLETE` only after high defects are fixed and medium defects are fixed/accepted;
11. only then migrate PA demonstration campaign under the same memory/scheduling rules;
12. replace the historical 500-mission map with a versioned large-scale Bible corpus plan organized for thousands of missions and tens of thousands of audited nodes;
13. expand campaign by campaign while preserving source quality, theological transparency, accessibility and non-duplication.

Preserve all prior mission/baseline history; do not replace old versions silently.