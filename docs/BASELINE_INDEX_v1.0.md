# Game Design Bible v1.0 — baseline index

**Date:** 2026-08-17  
**Status:** MASTER PRE-PRODUCTION BASELINE

This file indexes the first completed design baseline so subsequent work can expand it without changing its core intent accidentally.

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
24. 500-mission spine: «Від Буття до Об’явлення»
25. Question-authoring rules for all 500 missions
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
Appendix A. Future technical references

## Starter campaign: «Остання ніч»

Purpose: a complete vertical slice demonstrating the major mechanics through direct comparison of Gospel material. It reconstructs events from preparation of the Passover meal through the morning decision of the religious authorities. Where exact inter-Gospel chronology is disputed, the game must expose uncertainty rather than force a false single reconstruction.

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

Detailed task-node count in this campaign: **72**.

### Example baseline node from LN-01

Goal: establish how the place for the Passover meal was arranged.

Primary corpus: Matthew 26:17–19; Mark 14:12–16; Luke 22:7–13.

Representative task forms already defined in the baseline include:

- identify whom Jesus sent to prepare the Passover according to Luke;
- compare Mark and Luke for the shared identifying detail of the man carrying water;
- cite the passage showing the disciples found things as they had been told;
- order instruction → city → finding the place → preparing Passover;
- determine whether the owner of the room is named in the Gospel texts;
- identify how Mark and Luke describe the room.

The design accepts translation-equivalent wording where appropriate and distinguishes exact textual claims from inference.

## Demonstration campaign: «Дорога Павла»

Mission sequence:

- `PA-01` — Переслідувач
- `PA-02` — Дорога до Дамаска
- `PA-03` — Ананія
- `PA-04` — Перші дні
- `PA-05` — Антіохія
- `PA-06` — Ім’я Павло
- `PA-07` — Єрусалимська нарада
- `PA-08` — Фінальний маршрут

Detailed task-node count in this campaign: **32**.

## Detailed baseline count

`72 + 32 = 104` detailed task nodes in the first baseline.

The 500-mission spine is not to be represented as 500 finished missions. It is the macro-content map that further cycles must progressively convert into source-audited, fully authored mission specifications.

## Rules that later work must preserve

- Scripture is evidence, not decorative flavor text.
- A player should often have to open/read the relevant passage to proceed.
- Recognition-only trivia must not dominate.
- No invented dialogue should masquerade as biblical text.
- Text, context and interpretation must remain separately labelled.
- Disputed chronology or interpretation must be represented transparently.
- Mastery measures knowledge, never faith or holiness.
- Failure should usually redirect to guided investigation rather than punish or shame.
- Hints may reduce mastery credit, but must keep the player moving.
- Branches should affect information, order, evidence, mastery, hints or later retrieval; avoid fake branches.
- Every mechanic must have a keyboard/screen-reader equivalent.
- Platform implementation remains deferred until explicitly authorized.

## Next authoring objective

Preserve this baseline while expanding the 500-mission spine into complete campaigns and task nodes. New content should be versioned and audited for Scripture references, internal consistency, pedagogical purpose, theological classification and accessibility implications.
