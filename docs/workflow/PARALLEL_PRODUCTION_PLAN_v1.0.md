# Архів Писання — five-lane parallel production plan v1.0

**Date:** 2026-08-18  
**Status:** ACTIVE PRODUCTION WORKFLOW  
**Authority:** direct product-owner instruction on 2026-08-18  
**Scope:** textual pre-production only; platform implementation remains deferred.

## Purpose

Replace the previous sequential stopping rule with controlled parallel textual production. The project now advances through five independent lanes at the same time. LN pilot quality work remains mandatory, but it no longer blocks independent work in other lanes.

This change increases throughput without allowing one unresolved structural defect to be copied blindly into later canonical content.

## Global rules for all lanes

1. Read current repository HEAD before every cycle.
2. Work only in the lane-owned paths unless an integration change is explicitly assigned.
3. Preserve source audit, provenance, confidence (`T1/T2/C1/I1/D1`) and `TX1` rules.
4. Do not invent a biblical fact, chronology, manuscript claim, theological consensus or source.
5. Do not use an LLM as theological authority or as the source of player progress memory.
6. Every new gameplay mechanic must have a keyboard/NVDA-equivalent representation.
7. Preserve historical versions; create versioned successors instead of destructive rewrites.
8. Do not create production website/app/platform code.
9. Do not create meaningless duplicate tasks to inflate scale.
10. Each cycle must leave a concrete versioned repository artifact and an auditable status/result.

## Lane 1 — LN pilot closure

**Objective:** finish the quality system on «Остання ніч» while other work proceeds independently.

**Owned areas:**
- `docs/campaigns/LN/**`
- `docs/audits/LN_*`
- LN-specific audit/status artifacts.

**Current baseline:** 12/12 missions authored and source-audited; 185 authored nodes; 31/185 structurally normalized at activation of this plan.

**Work:**
- normalize remaining nodes to schema v1.2;
- close stable IDs;
- close retrieval and variant relations;
- audit translation-neutral answers and every TX1-before-grading case;
- dedicated NVDA/nonvisual audit;
- end-to-end branch/reachability regression;
- rerun player-memory simulations;
- grant `PILOT_AUDIT_COMPLETE` only when closure criteria pass.

## Lane 2 — PA «Дорога Павла»

**Objective:** begin the second canonical demonstration campaign now, without waiting for LN editorial closure.

**Owned area:** `docs/campaigns/PA/**` and PA-specific audit/status artifacts.

**Canonical mission sequence:**
- `PA-01` — Переслідувач
- `PA-02` — Дорога до Дамаска
- `PA-03` — Ананія
- `PA-04` — Перші дні
- `PA-05` — Антіохія
- `PA-06` — Ім’я Павло
- `PA-07` — Єрусалимська нарада
- `PA-08` — Фінальний маршрут

**Work:** migrate the historical 32 planning concepts into fully authored, source-audited canonical nodes under schema v1.2 and current player-memory rules. Start from PA-01 and advance mission by mission. Do not copy unresolved LN defects: new PA content must be born with stable IDs, explicit branching/retrieval/accessibility fields, provenance and confidence labels.

## Lane 3 — large-scale Scripture corpus map

**Objective:** replace the obsolete 500-mission ceiling with the versioned macro-content architecture needed for thousands of missions.

**Owned areas:**
- `docs/corpus/**`
- versioned large-scale corpus planning artifacts.

**Work:**
- design coverage by biblical books, major events, themes, people, places and cross-testament links;
- define campaign/case families and depth tiers;
- create quantitative coverage controls without turning counts into artificial quotas;
- define how 2,000–10,000+ cases and 30,000–100,000+ audited nodes can be expanded incrementally;
- identify future campaign candidates, but mark them `PLANNED` until explicitly canonicalized.

Lane 3 plans breadth and coverage; it does not bypass source audit by mass-generating final questions.

## Lane 4 — evidence and cross-reference corpus

**Objective:** build reusable source-grounded knowledge infrastructure for future cases.

**Owned areas:**
- `docs/evidence/**`
- reusable provenance/cross-reference registers that are not mission-specific.

**Work:**
- canonical evidence-record model for persons/events/places/promises/speakers/recipients;
- witness-specific claims and source provenance;
- OT↔NT links with explicit category (`explicit fulfilment`, `quotation/allusion`, `traditional`, `typological`, `disputed` as applicable);
- chronology boundaries and uncertainty records;
- textual-variant attachment points;
- reusable evidence packs that later campaigns may consume without silently importing unsupported harmonizations.

## Lane 5 — task variants, mastery, accessibility and session-scale system

**Objective:** make the tens-of-thousands-node system varied, adaptive and accessible without fake novelty.

**Owned areas:**
- `docs/systems/**`
- new versioned cross-project specifications for task variation, mastery, scheduling simulations and accessibility test matrices.

**Work:**
- define safe `EXACT / VARIANT / PASSAGE_REVISIT / CROSS_CONTEXT / SYNTHESIS / NONE` production rules;
- build variant authoring templates and deterministic duplicate safeguards;
- expand player-memory simulations for different histories and weak/strong profiles;
- define task-family mastery transitions and review queues;
- create NVDA/nonvisual acceptance matrices for every mechanic family;
- specify large-session selection behavior and fatigue/cooldown rules.

## Conflict-avoidance and integration

Parallel speed is useful only if agents do not overwrite each other.

- Lanes 1–5 should normally write only their owned paths.
- `PROJECT_STATUS.md`, `docs/BASELINE_INDEX_v1.1.md`, core schemas and global policies are integration-controlled shared files.
- A lane may propose a global change in its own artifact; the integration pass applies it to shared files after reading current HEAD.
- Before any shared-file update, refetch the file to avoid overwriting another lane's commit.
- If two lanes discover contradictory requirements, preserve both findings and record the conflict; do not silently choose one.

## Throughput rule

All five lanes are active concurrently. No lane waits for another merely because it is earlier in the historical sequence. Quality gates remain local:
- LN cannot claim `PILOT_AUDIT_COMPLETE` until its defects close.
- PA cannot claim a mission source-audited without its own source audit.
- corpus/evidence/system planning cannot call planning concepts fully authored canonical nodes.

## Immediate five-lane start

1. Lane 1: normalize the LN-04 → LN-09 prediction/fulfilment/TX1 chain, then continue remaining LN normalization.
2. Lane 2: migrate and fully author/source-audit `PA-01 — Переслідувач` under schema v1.2.
3. Lane 3: create the first versioned large-scale Scripture corpus map and coverage taxonomy.
4. Lane 4: create the first reusable evidence/cross-reference registry specification and seed set.
5. Lane 5: create the first task-variant/mastery/accessibility production matrix and extend session simulations.

## Superseded stopping rule

The former rule “do not begin PA migration or mass corpus expansion while LN pilot closure blockers remain” is superseded by this plan. The replacement rule is: **continue LN closure and independently safe later work in parallel; never propagate a known unresolved defect into new canonical content.**
