# Архів Писання — pre-production workflow

## Purpose of this repository

This repository is the versioned working source for the textual pre-production of **Архів Писання / Scripture Archive**.

Until the project owner explicitly changes phase, work here is limited to game design, narrative design, structured content and verification. No website, WordPress, Windows, mobile or other production code should be introduced.

## Hourly development cycle

Each development cycle should:

1. Read the current repository state before making new decisions.
2. Preserve previously approved product principles unless a documented revision is justified.
3. Expand the least-complete part of the pre-production specification.
4. Validate new biblical claims against reliable Scripture/source references before marking them final.
5. Check theological wording for the distinction between text, context and interpretation.
6. Check branching consistency: every choice, success, failure and hint path must resolve coherently.
7. Check learning design: each task must teach or test a defined knowledge/skill objective rather than exist only as decorative gameplay.
8. Check accessibility implications of every mechanic.
9. Record what changed and what remains incomplete.
10. Preserve version history; never erase earlier work merely because a new version exists.

## Content completion standard for a mission

A mission is not considered fully authored until it has, where applicable:

- stable mission ID and title;
- campaign/book/period placement;
- learning objectives;
- prerequisite knowledge or unlock conditions;
- source passages;
- opening brief;
- task-node sequence;
- explicit answer/evidence rules;
- accepted variants where free response is allowed;
- failure handling;
- hint ladder;
- branching consequences;
- optional evidence/side objectives;
- final synthesis;
- mastery tags affected by the mission;
- repetition hooks for later missions;
- theological/source classification;
- accessibility notes;
- editorial/source-review status.

## Question authoring rules

Questions should prefer active investigation over recognition-only trivia. Strong task forms include:

- find textual evidence;
- reconstruct chronology;
- compare parallel passages;
- identify who/where/when from evidence;
- connect Old and New Testament passages;
- distinguish direct text from inference;
- detect an unsupported claim;
- build and defend a conclusion with citations;
- resolve conflicting or incomplete witness accounts without inventing facts;
- retrieve previously learned material in a new context.

Multiple choice may be used when pedagogically justified, but it must not become the dominant mechanic.

## Branching rule

Branches are meaningful only when they alter at least one of:

- information available;
- order of investigation;
- hint cost;
- optional evidence discovered;
- mastery assessment;
- later retrieval/repetition;
- final synthesis path.

Fake branches that immediately collapse into the same content without consequence should be avoided.

## Source rule

Never fabricate Scripture references, historical facts, quotations, manuscript claims or scholarly consensus. Uncertain claims must remain explicitly unresolved until verified.

## Versioning

Use human-readable versioned documents for major baselines and retain history in Git. Major changes should document:

- what changed;
- why;
- affected missions/systems;
- whether older content needs migration or re-audit.

## Current priority

Convert the 500-mission macro spine into increasingly complete authored content while continuing to harden the common game system. The immediate reference campaigns are **«Остання ніч»** and **«Дорога Павла»**.
