# Scripture corpus map v0.1

**Date:** 2026-08-18  
**Status:** `PLANNING_BASELINE / NOT_AUTHORED_CONTENT`

## Purpose
Define the scalable content map for Scripture Archive beyond the obsolete 500-mission ceiling. This document plans coverage; it does not declare planned cases or nodes source-audited.

## Scale envelope
- 2,000–10,000+ authored missions/cases over the lifetime of the corpus.
- 30,000–100,000+ source-audited canonical nodes/variants.
- No numeric quota may be satisfied by wording-only duplicates.
- A case counts only when it has a distinct source/question/learning purpose or a substantively different evidence operation.

## Coverage axes
Every future case receives tags across these independent axes:
1. `book_scope` — one book, parallel books, or cross-canon.
2. `event_scope` — event/scene/episode.
3. `person_scope` — named/unnamed persons and groups.
4. `place_scope` — location/geographic movement.
5. `speaker_recipient_scope` — who speaks/writes to whom.
6. `theme_scope` — covenant, kingdom, wisdom, exile, prayer, justice, discipleship, resurrection, church, mission, etc.
7. `evidence_operation` — locate, compare, sequence, provenance, contradiction-check, quotation/allusion, synthesis, uncertainty audit.
8. `depth_tier` — D1 orientation; D2 close reading; D3 parallel comparison; D4 cross-reference; D5 historical/textual boundary; D6 synthesis.
9. `testament_relation` — OT-only, NT-only, OT↔NT explicit link, debated/typological link.
10. `player_state_fit` — NEW, DUE, WEAK, CROSS_CONTEXT, SYNTHESIS.

## Canonical corpus families
### A. Torah / Pentateuch
Planned families: creation/fall; patriarchal promises; exodus; covenant/Sinai; tabernacle/priesthood; wilderness; Deuteronomy speeches/law-memory. Status: `PLANNED`.

### B. Former Prophets / Historical books
Planned families: conquest; judges cycles; Samuel/Saul/David; monarchy; temple; divided kingdom; prophetic confrontation; exile/return; Ezra-Nehemiah; Esther. Status: `PLANNED`.

### C. Wisdom and poetry
Planned families: Psalms speaker/audience; lament/praise; Proverbs comparison; Job dialogue provenance; Ecclesiastes argument structure; Song of Songs speaker attribution boundaries. Status: `PLANNED`.

### D. Major and Minor Prophets
Planned families: call narratives; oracles by audience; covenant lawsuit; judgment/restoration; messianic/kingdom texts; historical setting boundaries; later NT reuse. Status: `PLANNED`.

### E. Gospels
Existing authored family: `LN — Остання ніч` (12 missions / 185 authored nodes; audit in progress). Planned families: infancy narratives; Galilean ministry; parables; signs/miracles; discipleship; Jerusalem conflict; passion beyond Pilate threshold; resurrection appearances; parallel-witness comparison. Status mixed: LN authored; others `PLANNED`.

### F. Acts
Current authored work: `PA — Дорога Павла` begins with PA-01. Planned families: Pentecost; Jerusalem community; Stephen; Philip/Samaria/Ethiopian official; Peter/Cornelius; Antioch; Paul journeys; councils; speeches/defenses; imprisonment/voyage; narrator-vs-speech provenance. Status: PA partially authored; rest `PLANNED`.

### G. Pauline letters
Planned families by letter and by cross-letter theme: audience/situation; argument structure; quotations; autobiographical claims; ethics; ecclesiology; justification; resurrection; gifts; suffering; mission; disputed chronology where relevant. Status: `PLANNED`.

### H. General letters
Planned families: Hebrews argument/OT citations; James wisdom/action; Petrine suffering/identity; Johannine tests/witness/love; Jude source/allusion boundaries. Status: `PLANNED`.

### I. Revelation
Planned families: letters to churches; throne/visions; seals/trumpets/bowls; symbolic imagery source links; speaker shifts; OT allusions; interpretive uncertainty layers. Status: `PLANNED`; high interpretation-risk family requiring explicit D1/I1 handling.

## Quantitative coverage controls
Counts are quality-control signals, not production quotas.

For each biblical book track:
- chapters represented by at least one `PLANNED` case;
- chapters with `AUTHOR_COMPLETE` cases;
- chapters with `SOURCE_AUDITED` cases;
- number of distinct evidence operations;
- number of reusable evidence records;
- duplicate-risk ratio;
- accessibility-review coverage;
- interpretation/TX1 risk inventory.

## Case generation rule
A planned case must state before authoring:
- distinct case question;
- source corpus;
- learning operation;
- expected evidence artifact;
- relation to existing cases (`NEW`, `PASSAGE_REVISIT`, `CROSS_CONTEXT`, `SYNTHESIS`);
- duplicate-risk check;
- uncertainty/TX1 risk;
- accessibility risk.

If it cannot state a distinct learning operation, it is not a new case.

## Initial expansion waves
### Wave 1 — demonstrate diverse mechanics
- LN pilot closure.
- PA campaign completion.
- one Torah case family.
- one Wisdom case family.
- one Prophets→Gospel cross-reference case family.
- one General Epistle case family.

### Wave 2 — canonical breadth
Create `PLANNED` maps for every biblical book before attempting massive final authoring. Priority is coverage visibility, not node volume.

### Wave 3 — depth and retrieval
Add D3–D6 cases that revisit existing passages through new operations: provenance, parallel comparison, quotation/allusion, uncertainty, synthesis.

## Anti-duplication invariant
Two records are not separate canonical tasks merely because:
- wording changes;
- answer options are reordered;
- a synonym replaces another word;
- the same verse is asked with the same cognitive operation.

They may be distinct only when evidence operation, source relationship, context, mastery target or synthesis requirement materially changes.

## Next corpus package
Create `BOOK_COVERAGE_REGISTRY_v0.1` with one row per biblical book, planning status, risk flags and first proposed case families; then seed Torah, Psalms, Isaiah, Gospels, Acts and Romans as cross-genre exemplars.