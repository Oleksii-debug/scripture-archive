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
- `LN-06_ARREST_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 14 required + 2 optional; corpus Mt 26:47–56; Mk 14:43–52; Lk 22:47–53; Jn 18:2–12; explicit witness-provenance handling for kiss/sign, Peter, Malchus, healing and local chronology.

Current canonical migrated total in campaign LN: **78 required task nodes + 11 optional/conditional nodes across 6 completed missions**.

Campaign mission completion: **6/12 = 50%**. This percentage is mission-count completion, not total editorial effort for the entire 500-mission game.

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
Established explicitly in LN-06: in multi-Gospel scenes, every important name, action and ordering claim must retain its witness provenance. A detail known from one Gospel may inform synthesis but cannot be graded as though every parallel passage directly states it. LN-06 exemplars: Simon Peter and Malchus are directly named in Jn 18:10; the healing of the ear is directly narrated in Lk 22:51; the agreed kiss-sign is explicit in Matthew/Mark; Mark alone supplies the unnamed young man in 14:51–52.

## Theological integrity
Claims use: `T1` direct scriptural statement; `T2` direct comparison; `C1` historical/contextual; `I1` interpretation; `D1` disputed/not responsibly reducible to one forced answer. `TX1` is an adjunct for material textual-transmission variation. The game never scores faith, spirituality, holiness or closeness to God; only defined knowledge/mastery domains.

## Accessibility baseline
Keyboard-complete interaction, meaningful screen-reader labels, logical headings/focus, text alternatives for visual mechanics, no essential drag-only/color-only/spatial-only information, accessible feedback and textual-variant notes. LN-01 through LN-06 each specify nonvisual equivalents. Multi-witness comparison must have a linear text mode `witness → claim → verse → confidence`; visual evidence boards are never the only representation.

## Platform neutrality
No platform is canonical. Content and game rules remain separable from presentation. Do not start website or application implementation until explicitly authorized by the project owner.

## Current production objective
Continue canonical migration of pilot campaign LN, then PA, then expand the 500-mission spine campaign by campaign while auditing branching, mastery, theology, textual transmission and accessibility.

Immediate priority:
1. author/source-audit `LN-07 — Анна, Каяфа і нічний допит` from the canonical baseline;
2. preserve Jn 18:12–24 local order (`arrest/bind → Annas first`) separately from Synoptic high-priest/night material and do not force a false single chronology;
3. continue through `LN-12`;
4. migrate PA demonstration campaign;
5. expand macro spine campaign by campaign.

Before each new mission, read baseline index and current canonical status to preserve identity, sequence, retrieval dependencies and safeguards.