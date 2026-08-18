# Task variant / mastery / accessibility production matrix v0.1

**Date:** 2026-08-18  
**Status:** `SYSTEM BASELINE / READY FOR CAMPAIGN USE`

## 1. Canonical relation test
Before an item is eligible as a new session item, classify its relation to the player's recent item.

| Relation | Meaning | May appear next daily session after success? | Counts as novel authored task? |
|---|---|---:|---:|
| `EXACT` | same cognitive operation and same target; wording-only change still EXACT | no, unless explicit user review mode | no |
| `VARIANT` | same knowledge target, materially different evidence operation | yes if audited and scheduler-eligible; normally respect short cooldown | yes, if distinct learning purpose |
| `PASSAGE_REVISIT` | same passage, different knowledge target/operation | yes | yes if purpose is distinct |
| `CROSS_CONTEXT` | old knowledge needed in a later narrative/context | yes; preferred retrieval form | yes when later context is genuinely distinct |
| `SYNTHESIS` | combines multiple prior targets into a new evidence product | yes | yes |
| `NONE` | no safe alternate exists | choose other content | no fabricated replacement |

## 2. Deterministic duplicate fingerprint
Every canonical task must expose a content fingerprint composed of:
- source unit(s);
- primary knowledge target;
- skill/evidence operation;
- required proposition set;
- answer mode family;
- provenance/confidence target.

If all material fingerprint fields match, the tasks are `EXACT` even if wording differs. AI-generated paraphrase cannot override this classification.

## 3. Mastery state model
Canonical states:
- `UNSEEN`
- `INTRODUCED`
- `LEARNING`
- `STABLE`
- `REVIEW_DUE`
- `LAPSED`
- `MASTERED_FOR_NOW`

Evidence-strength transitions:
- recognition success may move UNSEEN→INTRODUCED but cannot alone grant MASTERED_FOR_NOW;
- independent recall/application can move LEARNING→STABLE;
- synthesis success strengthens multiple targets but does not erase source-specific weaknesses;
- H6/H7 or answer reveal records guided mastery and schedules earlier retrieval;
- repeated independent success with increasing intervals may yield MASTERED_FOR_NOW;
- a lapse returns the target to LEARNING/REVIEW_DUE without erasing history.

## 4. Review queue priorities
Deterministic eligibility order for normal study:
1. campaign-continuation item if not blocked;
2. overdue weak/lapsed item;
3. due stable item;
4. cross-context retrieval required by current narrative;
5. new item;
6. synthesis item when prerequisites are ready.

Tie-breaking may use bounded randomness only among equally eligible candidates.

## 5. Cooldown rules
- successful `EXACT`: blocked from adjacent daily session by default;
- guided success: may return sooner, preferably as VARIANT/CROSS_CONTEXT;
- failed task: do not immediately loop exact wording more than one corrective retry; route to evidence/hint and later audited variant/review queue;
- repeated task-family fatigue: if same family appears 3 times in a short window, next eligible item should prefer another family unless mission logic requires continuation;
- same-passage fatigue: avoid repeated passage display when a different due target can satisfy session goals.

These are baseline policies to test, not hard-coded implementation constants.

## 6. Session composition targets
For a normal 20–30 item session, initial test envelope:
- 45–60% continuation/new;
- 15–25% due review;
- 10–20% weak/lapsed;
- 5–15% cross-context;
- 0–10% synthesis depending on prerequisites.

If due/weak load is high, continuation may shrink but should not disappear indefinitely. Explicit user modes may override composition.

## 7. Five canonical player-history simulations
### H-A — strong continuous player
History: high independent accuracy, no hints, daily play.  
Expected: no adjacent-day EXACT repeats; majority continuation; occasional due/cross-context retrieval; task-family diversity.

### H-B — weak evidence-provenance player
History: content recall good but repeatedly misattributes witness/source.  
Expected: provenance VARIANT/CROSS_CONTEXT tasks rise in priority; unrelated mastered facts do not repeat merely because mission is old.

### H-C — hint-dependent player
History: frequent H5–H7 use.  
Expected: guided mastery; shorter review interval; next retrieval preferably different audited operation; no shame/punitive messaging.

### H-D — returning after long absence
History: 30+ day gap.  
Expected: due/weak sample before large new-content burst; avoid dumping every overdue item; interleave continuation to prevent review wall.

### H-E — small eligible pool
History: user has exhausted most variants in a narrow topic.  
Expected: choose other eligible content or explicitly offer review mode; never fabricate AI paraphrase as novelty.

## 8. NVDA/nonvisual acceptance matrix

| Mechanic family | Visual form | Required nonvisual equivalent | Fail condition |
|---|---|---|---|
| source selection | cards/checklist | linear labelled checkbox list; selected count announced | unlabeled controls or color-only selection |
| witness comparison | columns/table | witness-by-witness headings, claim→source→confidence sequence | horizontal spatial relation required |
| ordering | drag/drop timeline | numbered items + move up/down or assign position | drag-only operation |
| evidence map | graph/board | linear node list + relation list + jump-by-ID | edge meaning only spatial/color based |
| classification | bins | claim followed by explicit category choices | pointer-only placement |
| free response | text box | labelled field + source scope + feedback | focus loss after submit |
| hint ladder | layered UI | H1–H7 buttons/commands announced by level | hint state not spoken |
| confidence/TX1 | badges/colors | literal text `T1`, `D1`, `TX1` plus explanation | color/icon only |
| mastery update | animation/progress bar | spoken text: domain, evidence strength, mastery consequence | silent animation only |
| map/geography | visual map | ordered place list, route edges, distances only if sourced | essential coordinate pointing |
| synthesis | canvas | repeatable records `claim → source → confidence → qualification` | free spatial board required |

## 9. Accessibility regression checklist per node
A node fails accessibility if any answer-bearing information depends on:
- color alone;
- image recognition alone;
- drag-and-drop without keyboard alternative;
- timed-only response;
- hover/pointer state;
- unlabeled icon;
- visual adjacency with no textual relation;
- feedback that does not announce correctness/evidence/mastery consequence.

## 10. Session reason transparency
Every surfaced item must be able to explain, in text suitable for a screen reader, one primary reason:
- `NEW`
- `CONTINUE_CAMPAIGN`
- `DUE`
- `WEAK`
- `CROSS_LINK`
- `SYNTHESIS`
- `USER_SELECTED_REVIEW`

This reason is part of user control and debugging; the scheduler must not be an opaque AI choice.

## 11. Production acceptance for a new variant
A proposed variant is accepted only if:
1. its relation class is recorded;
2. its fingerprint differs materially from EXACT;
3. source/ground truth is independently audited;
4. it has a distinct learning purpose;
5. its mastery effect is explicit;
6. its cooldown/session eligibility is defined;
7. keyboard/NVDA equivalent is functionally complete.

## 12. Next systems package
Create `MECHANIC_FAMILY_VARIANT_TEMPLATES_v0.1` with safe variant templates for source selection, provenance, chronology, quotation/allusion, textual-variant awareness and synthesis; then rerun H-A…H-E against normalized LN and authored PA records.