# Архів Писання — PROJECT STATUS

**Repository:** `Oleksii-debug/scripture-archive`  
**Project phase:** textual pre-production only  
**Platform decision:** intentionally deferred  
**Current baseline:** Game Design Bible v1.0 — 17 August 2026  
**Canonical content schema:** v1.1 — 17 August 2026  
**Textual-variant policy:** v1.0 — 17 August 2026

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
- `LN-05_GETHSEMANE_PRAYER_AND_SLEEP_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 13 required + 2 optional; corpus Mt 26:36–46; Mk 14:32–42; Lk 22:39–46; explicit `TX1` handling for Lk 22:43–44;
- `LN-06_ARREST_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 14 required + 2 optional; corpus Mt 26:47–56; Mk 14:43–52; Lk 22:47–53; Jn 18:2–12; witness-provenance handling for kiss/sign, Peter, Malchus, healing and local chronology;
- `LN-07_ANNAS_CAIAPHAS_NIGHT_QUESTIONING_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 13 required + 2 optional; corpus Jn 18:12–24; Mt 26:57–58; Mk 14:53–54; Lk 22:54–65; preserves John local order `bound → Annas first → questioning → sent bound to Caiaphas` and Luke explicit daybreak boundary at 22:66;
- `LN-08_TESTIMONY_AND_ACCUSATION_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 14 required + 2 optional; primary corpus Mt 26:59–68; Mk 14:55–65; Lk 22:66–71; Jn 18:19–24 contrast only; preserves Matthew/Mark false-witness and temple-accusation provenance while keeping Luke's explicit daybreak council distinct.

Current canonical migrated total in campaign LN: **105 required task nodes + 15 optional/conditional nodes across 8 completed missions**.

Campaign mission completion: **8/12 = 66.7%**. This percentage is mission-count completion, not total editorial effort for the entire 500-mission game.

Canonical distinctions:
- baseline task-node concept — planning only;
- `AUTHOR_COMPLETE` — prompt, answers, evidence, feedback, hints, branches, mastery and accessibility authored;
- `SOURCE_AUDITED` — answer-bearing claims checked;
- `MISSION_COMPLETE` — all required nodes meet the standard and valid branches resolve.

## Reusable design results established so far
### Anti-false-harmonization
Established in LN-03 and reused thereafter: identify narrow common core; classify witness-specific details; test explicit wording vs imported knowledge; reconstruct local chronology only where supplied; state limits of cross-witness certainty.

### Prediction-to-fulfilment retrieval
Established in LN-04: author prediction evidence separately; store exact anchors; require later recall before comparison with fulfilment; do not rewrite prediction from hindsight. For Peter, LN-09 must retrieve three predicted denials, rooster marker, Peter's confidence/readiness, and Mark's `TX1` second-crow caution.

### Textual-variant-in-play pattern
Strengthened in LN-05: when a gameplay-relevant verse is materially textually variable, the variant note must be available before grading; a responsible translation that brackets/omits the variant cannot be treated as player error. Lk 22:43–44 is the current exemplar.

### Witness-provenance matrix
Established explicitly in LN-06: in multi-Gospel scenes, every important name, action and ordering claim must retain its witness provenance. A detail known from one Gospel may inform synthesis but cannot be graded as though every parallel passage directly states it.

### Local-chronology / daybreak boundary safeguard
Strengthened in LN-07 and reused in LN-08: a witness-specific order may be graded as T1 only inside that witness. John explicitly supports `Annas first → questioning/strike → sent bound to Caiaphas`; Matthew explicitly names Caiaphas at its entry point; Luke 22:66 explicitly marks the council gathering as occurring when day came. LN-08 therefore treats Luke's council scene as explicitly daybreak material and does not silently move it into an undifferentiated night trial.

### Mission-boundary partitioning
LN-07 established a production safeguard for overlapping Gospel scenes: adjacent missions declare what evidence belongs to the current mission and what is intentionally deferred. LN-08 owns witnesses, temple accusation, Messiah/Son questioning and accusation/condemnation synthesis; LN-09 owns the three-denial fulfilment.

### Accusation-provenance separation
Established in LN-08: procedural parallelism does not imply identical evidentiary content. Matthew/Mark explicitly narrate false witnesses and temple-related testimony; Luke 22:66–71 does not. John 18:19–24 is retained only as provenance contrast. Future multi-witness accusation scenes must distinguish shared event context from witness-specific evidence claims before grading.

## Theological integrity
Claims use: `T1` direct scriptural statement; `T2` direct comparison; `C1` historical/contextual; `I1` interpretation; `D1` disputed/not responsibly reducible to one forced answer. `TX1` is an adjunct for material textual-transmission variation. The game never scores faith, spirituality, holiness or closeness to God; only defined knowledge/mastery domains.

## Accessibility baseline
Keyboard-complete interaction, meaningful screen-reader labels, logical headings/focus, text alternatives for visual mechanics, no essential drag-only/color-only/spatial-only information, accessible feedback and textual-variant notes. LN-01 through LN-08 each specify nonvisual equivalents. Multi-witness comparison must have a linear text mode `witness → claim → verse → confidence`; visual evidence boards are never the only representation.

## Platform neutrality
No platform is canonical. Content and game rules remain separable from presentation. Do not start website or application implementation until explicitly authorized by the project owner.

## Current production objective
Continue canonical migration of pilot campaign LN, then PA, then expand the 500-mission spine campaign by campaign while auditing branching, mastery, theology, textual transmission and accessibility.

Immediate priority:
1. author/source-audit `LN-09 — Три зречення` from the canonical baseline;
2. retrieve prediction anchors from LN-04 before presenting fulfilment evidence;
3. compare Mt 26:69–75; Mk 14:66–72; Lk 22:54–62; Jn 18:15–18,25–27 while preserving witness-specific accusers, wording and local sequence;
4. preserve Mark 14:30/72 `TX1` handling for the second-crow detail and do not penalize responsible translations/manuscript traditions;
5. continue through `LN-12`, then migrate PA and expand the macro spine.

Before each new mission, read baseline index and current canonical status to preserve identity, sequence, retrieval dependencies and safeguards.
