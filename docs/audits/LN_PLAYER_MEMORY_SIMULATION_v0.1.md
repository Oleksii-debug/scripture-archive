# LN player-memory and session-selection simulation v0.1

**Campaign:** LN — «Остання ніч»  
**Date:** 2026-08-18  
**Spec under test:** `PLAYER_MEMORY_AND_SESSION_SCHEDULING_v1.0`  
**Status:** `PASS_WITH_BLOCKER — anti-repeat logic is coherent; audited variant inventory is incomplete`

## Test objective

Test the design before software implementation using five simulated player histories. The audit asks whether the rules prevent accidental exact repetition while still returning weak/forgotten knowledge in pedagogically useful forms.

This is a pre-production logic simulation, not runtime telemetry.

## Hard invariants under test

1. The same `node_id` is not shown twice in one normal session unless a declared remediation loop requires it.
2. A successfully completed exact node is not shown in the next daily session merely because it remains eligible by topic.
3. A weak concept can return sooner, but another source-audited form is preferred over the same prompt.
4. A mastered concept may be used in cross-context or synthesis retrieval while its exact prompt is still cooling down.
5. If no eligible audited variant exists, the scheduler must choose different content or end the session rather than break the novelty guard.
6. `TX1`, witness provenance and confidence survive every retrieval.
7. User-requested review mode may increase review density but does not silently erase exact-repeat cooldown rules unless the user explicitly requests retrying the same item.

## History 1 — strong new learner

### State
Player completes LN04-N02 independently and correctly on Day 1. The common prediction concept becomes `INTRODUCED/STABLE-CANDIDATE`; exact node LN04-N02 enters cooldown.

### Day 2 candidates
- exact LN04-N02 — topic relevant but cooldown active;
- next campaign node — eligible;
- unrelated due review — eligible;
- concept-equivalent prediction variant — only eligible if separately source-audited and not fatigue-blocked.

### Expected selection
Do not show exact LN04-N02. Continue campaign/new material. A valid variant may appear only if there is a due/learning reason, not simply to fill the session.

### Result
`PASS`.

## History 2 — weak answer with hints

### State
Player reaches a source-provenance task, answers incorrectly twice and uses a high-level hint. Concept state becomes `LEARNING`; exact node remains recently exposed.

### Next session
Weakness gets high selection priority, but the scheduler first searches for:
1. a simpler source-audited variant;
2. passage revisit with a different investigative action;
3. cross-context retrieval;
4. exact retry only if explicitly tagged as remediation and cooldown policy permits.

### Expected selection
Return the knowledge, not necessarily the exact prompt.

### Result
`PASS IN PRINCIPLE`, but practical proof requires a canonical variant inventory.

## History 3 — prediction mastered, fulfilment newly opened

### State
Player previously mastered the LN-04 prediction. On a later day LN-09 opens. Exact LN04 prompt may still be in cooldown or recently used.

### Expected selection
LN09-N01 is permitted because this is `CROSS_CONTEXT_RETRIEVAL` / prediction→fulfilment recall, not an exact repeat. It asks the player to retrieve the prior proposition before viewing fulfilment evidence.

### Guard
The retrieved proposition must preserve the original witness set and Mark `TX1`; familiarity must not upgrade the claim to stronger confidence.

### Result
`PASS`.

## History 4 — long absence and lapse

### State
Player completed several LN missions strongly, then returns after a long interval. Some concepts are `REVIEW_DUE`; one previously stable concept is now `LAPSED` after failure on a retrieval check.

### Session composition
Review share may exceed the normal 20–25% baseline because overdue/weak material is high. Priority is:
- lapsed concepts;
- due concepts;
- campaign continuation if prerequisites remain safe;
- diverse task families and passages.

### Expected selection
The lapsed concept returns soon through an audited variant or synthesis context; exact old prompts are not mass-replayed merely because the player was absent.

### Result
`PASS IN PRINCIPLE`, with the same variant-inventory dependency.

## History 5 — tiny eligible pool

### State
Player chooses a narrow topic/mode after recently completing all exact nodes in that small pool successfully. Every exact candidate is still under cooldown and no audited variant is currently registered.

### Bad behaviour to prevent
Breaking cooldown and replaying yesterday's exact question because the pool is small.

### Required behaviour
The scheduler should:
- offer another adjacent eligible concept;
- offer a broader passage revisit if it is genuinely a different task;
- explain that no further fresh review is currently due;
- or end/shorten the session.

It must not fabricate a new unreviewed question with an LLM solely to fill time.

### Result
`PASS` as a rule; this case proves why “better no task than a bad duplicate” must remain canonical.

## Aggregate result

| History | Exact next-day duplicate blocked | Weak knowledge can return | Variant/cross-context preferred | Provenance/TX1 preserved | Result |
|---|---:|---:|---:|---:|---|
| 1 strong learner | yes | n/a | yes when due | yes | PASS |
| 2 weak + hints | yes unless declared remediation | yes | yes | yes | PASS IN PRINCIPLE |
| 3 prediction→fulfilment | yes | yes | cross-context | yes | PASS |
| 4 long absence/lapse | yes | yes | yes | yes | PASS IN PRINCIPLE |
| 5 tiny pool | yes | n/a | yes or no-task | yes | PASS |

## Newly identified blocker — D-005

**Severity:** `HIGH` for pilot adaptive-session closure.  
**Finding:** the scheduler spec correctly says “prefer another source-audited variant”, but the LN pilot does not yet have a campaign-wide canonical registry proving which variant IDs test the same concept, which are exact repeats, and which are passage/cross-context/synthesis retrievals.

Without that registry, a future implementation could accidentally treat paraphrased duplicates as “new” or fail to find a legitimate alternative when a concept is due.

### Required fix
Create `LN_VARIANT_RELATION_REGISTER_v0.1` during node normalization. For every reviewable concept, record:
- concept ID;
- source-audited node IDs;
- relation type: `EXACT`, `VARIANT`, `PASSAGE_REVISIT`, `CROSS_CONTEXT`, `SYNTHESIS`;
- shared proposition/evidence boundary;
- difficulty delta;
- TX1/confidence inheritance;
- cooldown interaction;
- eligibility constraints.

### Regression
Repeat all five histories against normalized IDs and the variant-relation register. The test passes only if the selector always finds a valid alternative when one exists and never invents/accepts a paraphrased exact duplicate as novel.

## Decision

The player-memory architecture is directionally sound and should remain canonical. It does not yet justify `PILOT_AUDIT_COMPLETE` because canonical variant relationships must be made explicit alongside retrieval closure and node normalization.