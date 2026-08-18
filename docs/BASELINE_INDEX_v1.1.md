# Game Design Bible v1.1 — baseline index

**Date:** 2026-08-18  
**Status:** MASTER PRE-PRODUCTION BASELINE  
**Supersedes for current planning:** `BASELINE_INDEX_v1.0.md`  
**History:** v1.0 remains preserved and must not be deleted.

## Why v1.1 exists

The first design baseline correctly established the product concept and pilot structure but used a **500-mission spine** as the macro-content planning scale. Product-owner direction on 2026-08-18 explicitly changes the required scale class: the architecture must support **thousands of missions/cases and tens of thousands of canonical task nodes**, with persistent per-player history and intelligent repetition rather than dumb random selection.

The 500 figure is therefore retained only as an early historical planning milestone, not a ceiling, not a final catalog size and not a Definition of Done.

## Canonical section map

0. How to read the document / completion meaning
1. Product concept
2. Target audience
3. Player fantasy
4. Design principles
5. Core gameplay loop
6. Macrostructure
7. Task taxonomy
8. Answer model
9. Branching
10. Difficulty
11. Progression and mastery
12. Repetition and memory
13. Hints
14. Theological model
15. AI policy
16. Accessibility
17. Group modes
18. Monetization
19. Canonical mission content model
20. Mission states
21. Final user-session model
22. Fully authored starter campaign: «Остання ніч»
23. Second demonstration campaign: «Дорога Павла»
24. Large-scale Scripture corpus: thousands of missions/cases
25. Question-authoring and variation rules for tens of thousands of nodes
26. Editorial pipeline
27. Pilot testing before software implementation
28. Technical neutrality and future implementation
29. GitHub pre-production workflow
30. Definition of Done for pre-production
31. Risks and safeguards
32. Order of subsequent textual development
33. Repository parameters
34. Source/research notes
35. Final product specification
36. Player memory and adaptive session scheduling
Appendix A. Future technical references

## Product scale class

The project no longer targets a closed 500-mission catalog.

Long-term architecture envelope:
- **2,000–10,000+ authored missions/cases**;
- **30,000–100,000+ source-audited canonical task nodes/variants**;
- further session diversity through safe recombination, cross-context retrieval, difficulty variation and personal learning history;
- no meaningless duplicate content added merely to reach a numeric target.

These numbers define the capacity and editorial scale the system must tolerate; they are not a requirement to ship a first public version with the maximum count.

## Starter campaign: «Остання ніч»

Purpose: a complete vertical slice demonstrating the major mechanics through direct comparison of Gospel material. It reconstructs events from preparation of the Passover meal through the morning authority handoff to Pilate. Where exact inter-Gospel chronology is disputed, the game exposes uncertainty rather than forcing a false single reconstruction.

Mission sequence:
- `LN-01` — Приготування
- `LN-02` — За столом
- `LN-03` — Зрадник за столом
- `LN-04` — Попередження Петрові
- `LN-05` — Гефсиманія: молитва і сон
- `LN-06` — Арешт
- `LN-07` — Анна, Каяфа і нічний допит
- `LN-08` — Свідчення і звинувачення
- `LN-09` — Три зречення
- `LN-10` — Ранок
- `LN-11` — Карта доказів
- `LN-12` — Фінальна реконструкція

Historical v1.0 baseline count: 72 planning concepts.  
Current authored reality: **185 authored nodes** across 12 source-audited missions. The expansion proves why baseline concepts and final canonical nodes must never be treated as the same count.

## Demonstration campaign: «Дорога Павла»

Mission sequence remains:
- `PA-01` — Переслідувач
- `PA-02` — Дорога до Дамаска
- `PA-03` — Ананія
- `PA-04` — Перші дні
- `PA-05` — Антіохія
- `PA-06` — Ім’я Павло
- `PA-07` — Єрусалимська нарада
- `PA-08` — Фінальний маршрут

Historical baseline: 32 planning task concepts. Migration has not yet begun and must wait until the LN pilot audit is closed.

## Player memory is now a core gameplay system

`docs/spec/PLAYER_MEMORY_AND_SESSION_SCHEDULING_v1.0.md` is canonical for current planning.

The game must remember per player:
- campaign checkpoint;
- task-node history;
- passage exposure;
- concept mastery;
- mistakes and hints;
- last exposure / review timing;
- weak areas;
- recent task-family and corpus fatigue.

Normal sessions are **not** pure random shuffle.

The scheduler must distinguish:
- exact repeat;
- variant repeat;
- passage revisit;
- cross-context retrieval;
- synthesis retrieval.

After a successful task, accidental exact repetition in the next daily session is prohibited. Weak/forgotten knowledge can return sooner, preferably through another audited form.

## Session model

A normal session draws from:
- continuation/new content;
- due review;
- weak material;
- cross-links;
- synthesis;
- user-requested modes.

The scheduler balances novelty and retention. Randomness may only break ties among eligible items or power an explicitly chosen random-study mode; it must not be the learning strategy.

## Rules all later work must preserve

- Scripture is evidence, not decorative flavor text.
- A player should often have to open/read the relevant passage to proceed.
- Recognition-only trivia must not dominate.
- No invented dialogue should masquerade as biblical text.
- Text, context and interpretation remain separately labelled.
- Disputed chronology or interpretation is represented transparently.
- Mastery measures knowledge, never faith or holiness.
- Failure usually redirects to guided investigation rather than punishment/shame.
- Hints may reduce mastery credit, but keep the player moving.
- Branches affect information, order, evidence, mastery, hints or later retrieval; avoid fake branches.
- Every mechanic has a keyboard/screen-reader equivalent.
- Per-player progress survives sessions and is conceptually exportable/deletable.
- Exact-task deduplication and cooldown are deterministic, not delegated to an LLM.
- AI may assist bounded answer evaluation/explanation but does not become theological authority or the source of progress memory.
- Platform implementation remains deferred until explicitly authorized.

## Current order of work

1. finish LN cross-mission audit;
2. build and close the LN retrieval register;
3. normalize all 185 LN nodes to current schema;
4. perform translation-neutral, TX1, accessibility and branch regression audits;
5. add player-memory/session-selection simulation to LN pilot closure;
6. mark `PILOT_AUDIT_COMPLETE` only after all high blockers are closed;
7. migrate PA under the same schema and scheduling rules;
8. replace the old 500-mission macro map with a versioned large-scale corpus plan organized by books, events, themes, cross-references and study depth;
9. expand campaign by campaign without sacrificing source audit quality.

## Research basis

See:
- `docs/research/PERSONALIZED_REPETITION_RESEARCH_v1.0.md`;
- `docs/spec/PLAYER_MEMORY_AND_SESSION_SCHEDULING_v1.0.md`.

The external comparison includes Duolingo, Khan Academy, Quizlet, Anki/FSRS and current Bible-study products with progress/adaptive/spaced-review features.
