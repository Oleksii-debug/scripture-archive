# Архів Писання — PROJECT STATUS

**Repository:** `Oleksii-debug/scripture-archive`  
**Project phase:** textual pre-production only  
**Platform decision:** intentionally deferred  
**Current baseline:** Game Design Bible v1.0 — 17 August 2026  
**Canonical content schema:** v1.1 — 17 August 2026  
**Textual-variant policy:** v1.0 — 17 August 2026

## Non-negotiable scope

The project is currently developing the game itself, not a website, WordPress plugin, Windows application, mobile app, or production code.

The canonical pre-production work must define the product from A to Z before platform implementation is chosen: product concept; campaign architecture; missions; questions and answers; evidence; branching; hints; chronology; characters; mastery; spaced retrieval; group modes; theological and textual transparency; accessibility; monetization boundaries; and a platform-neutral future content model.

## Product definition

Working title: **Архів Писання / Scripture Archive**.

> The act of reading, searching, comparing and interpreting Scripture is itself the gameplay.

The player acts as a researcher/investigator. Missions require direct work with biblical texts and must distinguish evidence from inference and interpretation.

## Current baseline content

Game Design Bible v1.0 establishes 20 task/mechanic families, 8 branching types, 7 hint levels, 6 difficulty levels, mastery and adaptive repetition, theological-source and AI policies, accessibility requirements, group/cooperative modes, monetization principles, a canonical mission data model, a 500-mission macro spine, 72 baseline task-node concepts for «Остання ніч», and 32 for «Дорога Павла».

The baseline therefore references **104 task-node concepts**, which must not be confused with fully migrated canonical nodes.

## Canonical authored content now in repository

As of 2026-08-17:

- `docs/spec/CONTENT_NODE_SCHEMA_v1.1.md` — canonical authoring schema;
- `docs/spec/TEXTUAL_VARIANT_POLICY_v1.0.md` — textual-variation policy;
- `docs/campaigns/LN/LN-01_PREPARATION_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 13 required + 1 optional node; corpus Mt 26:17–19; Mk 14:12–16; Lk 22:7–13;
- `docs/campaigns/LN/LN-02_AT_THE_TABLE_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 12 required + 2 optional/conditional nodes; primary corpus Mt 26:20,26–29; Mk 14:17,22–25; Lk 22:14–20; optional 1 Cor 11:23–26;
- `docs/campaigns/LN/LN-03_BETRAYER_AT_THE_TABLE_v1.0.md` — `MISSION_COMPLETE / SOURCE_AUDITED`, 13 required + 2 optional nodes; corpus Mt 26:21–25; Mk 14:18–21; Lk 22:21–23; Jn 13:18–30; optional Ps 41:9.

Current canonical migrated total in campaign LN: **38 required task nodes + 5 optional/conditional nodes across 3 completed missions**.

Canonical distinctions remain:
- baseline task-node concept — planning only;
- `AUTHOR_COMPLETE` — prompt, answers, evidence, feedback, hints, branches, mastery and accessibility authored;
- `SOURCE_AUDITED` — answer-bearing claims checked;
- `MISSION_COMPLETE` — all required nodes meet the standard and valid branches resolve.

## New design result from LN-03

LN-03 establishes a reusable **anti-false-harmonization pattern** for parallel narratives:
1. identify the narrow common core;
2. classify witness-specific details;
3. test explicit naming vs knowledge imported from elsewhere;
4. reconstruct local chronology only where a witness supplies it;
5. finish with a synthesis that explicitly states the limit of cross-witness chronological certainty.

This pattern should be reused in later Gospel-parallel cases.

## Theological integrity

Always distinguish Scriptural text, historical/contextual material, and interpretation. Claims use the canonical confidence model: `T1` direct scriptural statement; `T2` direct comparison; `C1` historical/contextual; `I1` interpretation; `D1` disputed/not responsibly reducible to one forced answer. `TX1` is an adjunct for material textual-transmission variation.

The game never scores faith, spirituality, holiness or closeness to God; only defined knowledge/mastery domains.

## Accessibility baseline

Accessibility is first-class: keyboard-complete interaction, meaningful screen-reader labels, logical headings/focus, text alternatives for visual mechanics, no essential drag-only/color-only/spatial-only information, accessible feedback and textual-variant notes. LN-01 through LN-03 each specify nonvisual equivalents.

## Platform neutrality

No platform is canonical. Content and game rules remain separable from presentation. Do not start website or application implementation until explicitly authorized by the project owner.

## Current production objective

Continue canonical migration of pilot campaign LN, then PA, then expand the 500-mission spine campaign by campaign while auditing branching, mastery, theology, textual transmission and accessibility.

Immediate priority:
1. author and source-audit `LN-04` according to the baseline campaign sequence;
2. continue through `LN-12`;
3. migrate PA demonstration campaign;
4. expand macro spine campaign by campaign.

Before authoring LN-04, read the baseline index/available Game Design Bible material to preserve the intended mission identity and sequence rather than inventing a conflicting title.
