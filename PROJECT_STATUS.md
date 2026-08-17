# Архів Писання — PROJECT STATUS

**Repository:** `Oleksii-debug/scripture-archive`  
**Project phase:** textual pre-production only  
**Platform decision:** intentionally deferred  
**Current baseline:** Game Design Bible v1.0 — 17 August 2026

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

Game Design Bible v1.0 currently establishes:

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
- fully developed pilot campaign **«Остання ніч» / “The Last Night”** with 72 task nodes;
- second demonstration campaign **«Дорога Павла» / “The Road of Paul”** with 32 task nodes.

Current explicit task-node total in detailed campaigns: **104**.

The 500-mission structure is a macro-design spine, not yet 500 fully authored and source-audited missions. Further pre-production must convert the spine into complete mission specifications and question banks.

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

## Platform neutrality

No platform is canonical at this stage. Content and game rules must remain separable from presentation so the same design can later support Web/Netlify, WordPress embedding, PWA, Windows/Tauri or another client without rewriting the authored game.

## Current production objective

Continue textual pre-production until the project contains a coherent, source-audited and internally consistent final game specification, with missions and question banks developed deeply enough that software implementation does not need to invent core gameplay.

Do **not** start website or application implementation until the platform decision is explicitly made by the project owner.
