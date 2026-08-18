# Архів Писання — PROJECT STATUS

**Repository:** `Oleksii-debug/scripture-archive`  
**Project phase:** textual pre-production only  
**Platform decision:** intentionally deferred  
**Current baseline:** Game Design Bible v1.0 — 17 August 2026  
**Canonical content schema:** v1.1 — 17 August 2026  
**Textual-variant policy:** v1.0 — 17 August 2026  
**Pilot campaign authoring status:** 12/12 missions authored and source-audited  
**Pilot cross-mission audit:** IN_PROGRESS

## Non-negotiable scope

The project is currently developing the game itself, not a website, WordPress plugin, Windows application, mobile app, or production code. Canonical pre-production must define the product from A to Z before platform implementation is chosen: campaign architecture; missions; questions and answers; evidence; branching; hints; chronology; characters; mastery; spaced retrieval; group modes; theological/textual transparency; accessibility; monetization boundaries; and a platform-neutral content model.

## Product definition

Working title: **Архів Писання / Scripture Archive**.

> The act of reading, searching, comparing and interpreting Scripture is itself the gameplay.

The player acts as a researcher/investigator. Missions require direct work with biblical texts and distinguish evidence from inference and interpretation.

## Current baseline content

Game Design Bible v1.0 establishes 20 task/mechanic families, 8 branching types, 7 hint levels, 6 difficulty levels, mastery and adaptive repetition, theological-source and AI policies, accessibility requirements, group/cooperative modes, monetization principles, a canonical mission data model, a 500-mission macro spine, 72 baseline task-node concepts for «Остання ніч», and 32 for «Дорога Павла». These **104 baseline concepts** are planning material and must not be confused with fully migrated canonical nodes. Canonical authoring may expand a baseline concept into several source-audited nodes when needed for evidence discipline, accessibility or retrieval design.

## Canonical authored content now in repository

As of 2026-08-18:

- `docs/spec/CONTENT_NODE_SCHEMA_v1.1.md` — canonical authoring schema;
- `docs/spec/TEXTUAL_VARIANT_POLICY_v1.0.md` — textual-variation policy;
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

Current canonical migrated total in campaign LN: **160 required task nodes + 25 optional/conditional nodes = 185 authored canonical nodes across 12 completed missions**.

Campaign mission-count completion: **12/12 = 100%**.

This does **not** mean the pilot is editorially closed. `docs/audits/LN_PILOT_CROSS_MISSION_AUDIT_v0.1.md` has started the mandatory cross-mission audit. Campaign status remains `PILOT_AUDIT_IN_PROGRESS` until duplicate claims, contradictory grading, branches, mastery/retrieval, provenance, TX1, mission boundaries and accessibility are checked across the whole campaign and defects are fixed.

Canonical distinctions:

- baseline task-node concept — planning only;
- `AUTHOR_COMPLETE` — prompt, answers, evidence, feedback, hints, branches, mastery and accessibility authored;
- `SOURCE_AUDITED` — answer-bearing claims checked;
- `MISSION_COMPLETE` — all required nodes meet the standard and valid branches resolve;
- `PILOT_AUDIT_COMPLETE` — cross-mission defects fixed/accepted and regression audit passed.

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

## Theological integrity

Claims use: `T1` direct scriptural statement; `T2` direct comparison; `C1` historical/contextual; `I1` interpretation; `D1` disputed/not responsibly reducible to one forced answer. `TX1` is an adjunct for material textual-transmission variation. The game never scores faith, spirituality, holiness or closeness to God; only defined knowledge/mastery domains.

## Accessibility baseline

Keyboard-complete interaction, meaningful screen-reader labels, logical headings/focus, text alternatives for visual mechanics, no essential drag-only/color-only/spatial-only information, accessible feedback and textual-variant notes. LN-01 through LN-12 specify nonvisual equivalents. Core linear forms include:

- `witness → claim → verse → confidence`;
- `prediction → fulfilment → witness → delta → certainty`;
- `prior authority → custody/transport → receiving authority → threshold`;
- `ID → event/claim → witness → verse → confidence → relation → qualification`;
- final reconstruction: `claim → witness → passage → confidence → qualification`.

Visual evidence boards or timelines are never the only or canonical representation.

## Platform neutrality

No platform is canonical. Content and game rules remain separable from presentation. Do not start website or application implementation until explicitly authorized by the project owner.

## Current production objective

The first pilot campaign is fully authored but not yet editorially closed.

Immediate priority:

1. continue `LN_PILOT_CROSS_MISSION_AUDIT_v0.1` across all 12 missions;
2. build duplicate-claim and grading-consistency matrices;
3. trace every required branch and `later_retrieval_effect`;
4. audit T1/T2/C1/I1/D1/TX1 propagation and translation-neutral validation;
5. audit LN-07/LN-08/LN-09 overlap and LN-10/LN-12 scope boundaries;
6. perform a dedicated NVDA/nonvisual task-family audit;
7. fix high/critical defects and run regression audit;
8. only after `PILOT_AUDIT_COMPLETE`, migrate PA demonstration campaign;
9. then expand the 500-mission spine campaign by campaign.

Preserve all mission history; do not replace prior versions silently.
