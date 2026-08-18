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
- `LN-06_ARREST_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 14 required + 2 optional; corpus Mt 26:47–56; Mk 14:43–52; Lk 22:47–53; Jn 18:2–12;
- `LN-07_ANNAS_CAIAPHAS_NIGHT_QUESTIONING_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 13 required + 2 optional; corpus Jn 18:12–24; Mt 26:57–58; Mk 14:53–54; Lk 22:54–65;
- `LN-08_TESTIMONY_AND_ACCUSATION_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 14 required + 2 optional; primary corpus Mt 26:59–68; Mk 14:55–65; Lk 22:66–71; Jn 18:19–24 contrast only;
- `LN-09_THREE_DENIALS_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 14 required + 2 optional; corpus Mt 26:69–75; Mk 14:66–72; Lk 22:54–62; Jn 18:15–18,25–27; retrieves LN-04 prediction before fulfilment, preserves witness-specific accusers and wording, and applies `TX1` to Mark’s first/second-crow variation;
- `LN-10_MORNING_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 13 required + 2 optional; corpus Mt 27:1–2; Mk 15:1; Lk 22:66–23:1; Jn 18:28–29; isolates the morning authority handoff and explicitly defers the substantive Roman trial.

Current canonical migrated total in campaign LN: **132 required task nodes + 19 optional/conditional nodes across 10 completed missions**.

Campaign mission completion: **10/12 = 83.3%**. This percentage is mission-count completion, not total editorial effort for the entire 500-mission game.

Canonical distinctions:
- baseline task-node concept — planning only;
- `AUTHOR_COMPLETE` — prompt, answers, evidence, feedback, hints, branches, mastery and accessibility authored;
- `SOURCE_AUDITED` — answer-bearing claims checked;
- `MISSION_COMPLETE` — all required nodes meet the standard and valid branches resolve.

## Reusable design results established so far

### Anti-false-harmonization
Established in LN-03 and reused thereafter: identify narrow common core; classify witness-specific details; test explicit wording vs imported knowledge; reconstruct local chronology only where supplied; state limits of cross-witness certainty.

### Prediction-to-fulfilment retrieval
Established in LN-04: author prediction evidence separately; store exact anchors; require later recall before comparison with fulfilment; do not rewrite prediction from hindsight.

### Textual-variant-in-play pattern
Strengthened in LN-05: when a gameplay-relevant verse is materially textually variable, the variant note must be available before grading; a responsible translation that brackets/omits the variant cannot be treated as player error.

### Witness-provenance matrix
Established explicitly in LN-06: in multi-Gospel scenes, every important name, action and ordering claim must retain its witness provenance.

### Local-chronology / daybreak boundary safeguard
Strengthened in LN-07 and reused in LN-08/LN-10: a witness-specific order may be graded as T1 only inside that witness. Luke’s explicit daybreak boundary must not be silently moved into an undifferentiated night trial.

### Mission-boundary partitioning
Established in LN-07: adjacent missions declare what evidence belongs to the current mission and what is intentionally deferred, preventing duplicate/conflicting grading.

### Accusation-provenance separation
Established in LN-08: procedural parallelism does not imply identical evidentiary content; witness-specific accusations stay witness-specific.

### Prediction-to-fulfilment delta matrix
Established in LN-09: retrieve prediction before showing fulfilment; lock prediction anchors; gather fulfilment witnesses independently; confirm narrow shared fulfilment core; preserve witness-specific deltas; expose textual variants before grading; state limits of harmonized certainty; schedule weak dimensions for spaced retrieval.

### Denial-count safeguard
Established in LN-09: the game counts three denial **episodes**, not three identical sentences or three universally identical accusers. Parallel-event counting must define what is being counted before grading.

### Authority-handoff boundary
Established in LN-10: identify the last securely sourced action under the prior authority; preserve witness-specific custody/transport verbs; identify the receiving authority/location; mark the first action of the new authority as a threshold; keep later accusation/interrogation/verdict content out of the prior-stage mission; classify reconstructed legal procedure beyond the text as `C1/I1/D1`, not `T1`.

## Theological integrity
Claims use: `T1` direct scriptural statement; `T2` direct comparison; `C1` historical/contextual; `I1` interpretation; `D1` disputed/not responsibly reducible to one forced answer. `TX1` is an adjunct for material textual-transmission variation. The game never scores faith, spirituality, holiness or closeness to God; only defined knowledge/mastery domains.

## Accessibility baseline
Keyboard-complete interaction, meaningful screen-reader labels, logical headings/focus, text alternatives for visual mechanics, no essential drag-only/color-only/spatial-only information, accessible feedback and textual-variant notes. LN-01 through LN-10 each specify nonvisual equivalents. Multi-witness comparison must have a linear text mode `witness → claim → verse → confidence`; visual evidence boards are never the only representation. Prediction/fulfilment matrices must also have a linear mode `prediction → fulfilment → witness → delta → certainty limit`. Authority transitions must have a plain-text mode `prior authority → custody/transport → receiving authority → threshold`.

## Platform neutrality
No platform is canonical. Content and game rules remain separable from presentation. Do not start website or application implementation until explicitly authorized by the project owner.

## Current production objective
Continue canonical migration of pilot campaign LN, then perform a cross-mission pilot audit, then PA, then expand the 500-mission spine campaign by campaign while auditing branching, mastery, theology, textual transmission and accessibility.

Immediate priority:
1. read the baseline and author/source-audit `LN-11 — Карта доказів` as a true synthesis mission using evidence already gathered in LN-01 through LN-10 rather than duplicating their questions;
2. ensure LN-11 has a complete linear/nonvisual evidence-map equivalent and provenance-aware linking;
3. author/source-audit `LN-12 — Фінальна реконструкція`;
4. after LN-12, perform a pilot-campaign cross-mission audit for duplicate claims, contradictory grading, broken branches, mastery/retrieval coverage, source provenance, textual variants and accessibility;
5. only after that migrate PA demonstration campaign.

Before each new mission, read baseline index and current canonical status to preserve identity, sequence, retrieval dependencies and safeguards.
