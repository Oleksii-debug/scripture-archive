# Архів Писання — PROJECT STATUS

**Repository:** `Oleksii-debug/scripture-archive`  
**Project phase:** textual pre-production only  
**Platform decision:** intentionally deferred  
**Current baseline:** Game Design Bible v1.0 — 17 August 2026  
**Canonical content schema:** v1.1 — 17 August 2026

## Non-negotiable scope

The project is currently developing the game itself, not a website, WordPress plugin, Windows application, mobile app, or production code.

The canonical pre-production work must define the product from A to Z before platform implementation is chosen:

- product concept and adult target audience;
- player fantasy and core loop;
- campaign architecture;
- missions and cases;
- questions, answers and validation rules;
- evidence mechanics tied to Scripture;
- branching and alternate paths;
- hints and difficulty;
- chronology, characters, locations and cross-references;
- mastery/progression;
- spaced repetition and retrieval practice;
- book-level campaigns;
- daily and seasonal content;
- cooperative/group modes;
- theological transparency;
- AI boundaries;
- accessibility, including keyboard and screen-reader use;
- monetization boundaries;
- future data/content model independent of platform.

## Product definition

Working title: **Архів Писання / Scripture Archive**.

The game is not a Bible trivia product and not a generic Duolingo clone. Its central design principle is:

> The act of reading, searching, comparing and interpreting Scripture is itself the gameplay.

The player acts as a researcher/investigator. Missions require direct work with biblical texts: finding textual evidence, reconstructing events, comparing parallel passages, identifying people and places, building chronology, tracing Old/New Testament relationships, and defending conclusions with sources.

## Current baseline content

Game Design Bible v1.0 establishes:

- 20 task/mechanic families;
- 8 branching types;
- 7 hint levels;
- 6 difficulty levels;
- mastery and knowledge-profile system;
- adaptive repetition logic;
- theological-source model;
- AI policy;
- accessibility requirements;
- group/cooperative modes;
- monetization principles;
- canonical mission data model;
- 500-mission macro spine from Genesis to Revelation;
- pilot campaign outline **«Остання ніч» / “The Last Night”** with 72 baseline task-node concepts;
- second demonstration campaign outline **«Дорога Павла» / “The Road of Paul”** with 32 baseline task-node concepts.

The v1.0 baseline therefore references **104 task-node concepts**, but this number must not be confused with fully migrated canonical mission files.

## Canonical authored content now in repository

As of 2026-08-17:

- `docs/spec/CONTENT_NODE_SCHEMA_v1.1.md` — canonical campaign/mission/task-node authoring schema;
- `docs/campaigns/LN/LN-01_PREPARATION_v1.0.md` — first fully migrated mission specification;
- `LN-01` contains 13 required task nodes plus 1 optional evidence node;
- `LN-01` status: `MISSION_COMPLETE / SOURCE_AUDITED`;
- explicit source corpus: Matthew 26:17–19; Mark 14:12–16; Luke 22:7–13.

This distinction is now canonical:

- **baseline task-node concept** — exists in design planning but may not yet satisfy the current schema;
- **AUTHOR_COMPLETE node** — has prompt, answers, evidence, feedback, hints, branches, mastery and accessibility fields;
- **SOURCE_AUDITED node** — answer-bearing claims checked against cited sources;
- **MISSION_COMPLETE** — all required nodes meet the authoring standard and all valid branches can resolve.

## Pilot campaign principle

The first vertical slice is built around the final night before Jesus’ arrest and the movement from the supper toward trial. It uses multiple Gospel accounts and is intended to test:

- evidence collection;
- parallel-text comparison;
- chronology reconstruction;
- character reasoning;
- hints;
- branching;
- final synthesis;
- whether a player actually reads Scripture during play.

## Theological integrity

The system must always distinguish:

1. **Scriptural text** — what the cited passage directly states.
2. **Historical/contextual material** — externally sourced context.
3. **Interpretation** — denominational, traditional or scholarly interpretation.

The game must not silently present one interpretation as if it were the biblical text itself. Claims must be sourceable. Invented dialogue must not be blended with Scripture as factual biblical content.

The software must never score a user’s “faith”, “spirituality”, “holiness”, or “closeness to God”. It may measure only knowledge/mastery of defined learning domains.

## Source-confidence model

Canonical source labels introduced in schema v1.1:

- `T1` — direct scriptural statement;
- `T2` — direct comparison of explicit scriptural statements;
- `C1` — historical/contextual claim requiring an external source;
- `I1` — interpretation;
- `D1` — disputed or not responsibly reducible to one forced answer.

Later authoring must preserve these distinctions.

## AI boundary

AI is not a theological authority and should not function as an oracle. In a future implementation it may support evaluation, adaptive hints, retrieval, classification and tutoring only when responses are grounded in approved source material and traceable to evidence.

## Accessibility baseline

Accessibility is a first-class requirement, not a later patch. Any future interface must be fully operable without vision and without a mouse. Core requirements include:

- keyboard-complete interaction;
- meaningful screen-reader labels;
- logical headings and focus order;
- text alternatives for maps/evidence boards;
- no essential drag-and-drop-only mechanics;
- NVDA-compatible status and feedback;
- accessible error and success announcements.

The first canonical mission specifies linear heading-based parallel-text comparison, accessible ordering controls and structured claim → source → status alternatives for any future evidence-board visualization.

## Platform neutrality

No platform is canonical at this stage. Content and game rules must remain separable from presentation so the same design can later support Web/Netlify, WordPress embedding, PWA, Windows/Tauri or another client without rewriting the authored game.

## Current production objective

Continue migrating the pilot campaign into canonical full mission specifications under schema v1.1, then expand the 500-mission spine into coherent, source-audited campaigns.

Immediate priority order:

1. author and source-audit `LN-02 — За столом`;
2. continue LN campaign migration through `LN-12`;
3. migrate `PA` demonstration campaign;
4. expand the macro spine campaign by campaign;
5. continuously audit system rules, branching, mastery, theological transparency and accessibility.

Do **not** start website or application implementation until the platform decision is explicitly made by the project owner.
