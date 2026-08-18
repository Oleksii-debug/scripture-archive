# LN-07 — Анна, Каяфа і нічний допит — v1.1 normalization

**Campaign:** `LN` — «Остання ніч»  
**Mission ID:** `LN-07`  
**Status:** `MISSION_COMPLETE / SOURCE_AUDITED / STRUCTURAL_NORMALIZATION_PASS`  
**Version:** 1.1 — 2026-08-18  
**Supersedes for canonical normalization:** v1.0 remains preserved as historical authored source and is not overwritten.

## 1. Mission record under CONTENT_NODE_SCHEMA_v1.2

- `mission_id`: `LN-07`
- `campaign_id`: `LN`
- `title`: `Анна, Каяфа і нічний допит`
- `mission_role`: investigation + witness provenance + local chronology + evidence discipline
- `estimated_time`: 30–40 min
- `difficulty`: 4/6
- `learning_objectives`: preserve witness-specific post-arrest routes; identify John’s “first to Annas” local order; distinguish named/unnamed high-priest references; reconstruct John 18:19–24 questioning/strike sequence; preserve Luke 22:66 daybreak boundary; stop before LN-08 accusation/witness material.
- `mastery_tags`: `post_arrest_route`, `annas`, `caiaphas`, `named_vs_unnamed`, `witness_provenance`, `local_chronology`, `anti_false_harmonization`, `public_teaching`, `evidence_principle`, `custody_mockery`, `day_night_boundary`, `source_citation`, `retrieval_ln06`, `forward_ln08`, `forward_ln09`.
- `retrieval_targets`: LN-06 arrest/binding anchor from John 18:12; later synthesis in LN-11/LN-12; boundary carry-forward to LN-08.
- `future_repetition_hooks`: explicit per-node records below; unresolved generic “later” is forbidden.
- `primary_scripture`: John 18:12–24; Matthew 26:57–58; Mark 14:53–54; Luke 22:54–65.
- `secondary_scripture`: John 11:49–53 optional cross-reference.
- `historical_context_sources`: `none` for grading.
- `interpretive_sources`: `none` for grading.
- `source_classification_notes`: local witness statements grade T1; direct cross-witness comparison grades T2; forced universal microchronology is D1.
- `disputed_points`: exact merged minute-by-minute cross-Gospel order is not graded as established fact.
- `textual_variant_points`: `none` material to grading in this mission.
- `opening_brief`: unchanged in substance from v1.0; investigation begins immediately after arrest and distinguishes each Gospel’s explicit route language.
- `case_question`: what each witness actually permits the player to claim about route, questioning and night treatment, and where responsible reconstruction must stop.
- `known_facts_at_start`: Jesus has been arrested; John 18:12 says He was bound; Peter-denial fulfilment remains outside this mission.
- `unknowns_to_resolve`: first destination in John; Annas/Caiaphas relation; named vs unnamed references; subject of John’s questioning; public-teaching answer; strike and response; John 18:24 transfer; Luke night/day boundary; limits of merged chronology.
- `completion_synthesis`: witness-by-witness reconstruction preserving provenance and uncertainty.
- `entry_node`: `LN07-N01`
- `task_nodes`: `LN07-N01` through `LN07-N13`
- `optional_nodes`: `LN07-O01`, `LN07-O02`
- `failure_recovery_routes`: all incorrect/partial routes return to source-specific remediation and then current/next valid node; no dead ends.
- `completion_conditions`: complete required nodes and final witness-bounded synthesis.
- `perfect_investigation_conditions`: required nodes completed independently plus both optional evidence nodes without false harmonization.

## 2. Accessibility contract

- Entire mission is keyboard-complete.
- Every witness comparison has a linear equivalent: `witness → claim → passage → confidence → qualification`.
- No drag-only matrix is canonical; selection/reordering must support keyboard controls.
- Screen reader announces task identity, source scope, correctness state, evidence/confidence and mastery consequence.
- No answer depends on color, pointer position, animation or a time-only cue.

## 3. Stable ID migration

Historical shorthand remains readable but canonical IDs are now:

- `N01`→`LN07-N01`; `N02`→`LN07-N02`; `N03`→`LN07-N03`; `N04`→`LN07-N04`; `N05`→`LN07-N05`; `N06`→`LN07-N06`; `N07`→`LN07-N07`; `N08`→`LN07-N08`; `N09`→`LN07-N09`; `N10`→`LN07-N10`; `N11`→`LN07-N11`; `N12`→`LN07-N12`; `N13`→`LN07-N13`.
- historical optional `N14`→canonical `LN07-O01`.
- historical optional `N15`→canonical `LN07-O02`.

No historical label is deleted.

## 4. Canonical node control records

The prompt/answer/evidence prose from v1.0 remains source-audited and is incorporated by immutable node mapping below. This revision makes identity, branch, retrieval, mastery, confidence and accessibility fields explicit without changing answer-bearing claims.

### LN07-N01 — Встанови межі справи
- `mission_id`: `LN-07`; `task_family`: citation selection; `difficulty`: 1/6; `required`: yes.
- `skill_target`: source scoping; `knowledge_target`: correct LN-07 corpus and LN-08 boundary; `why_this_node_exists`: prevents source bleed.
- `source_scope_visible_to_player`: John 18:12–24; Matthew 26:57–58; Mark 14:53–54; Luke 22:54–65; `response_mode`: citation selection.
- `accepted_answer/variants/evidence/rejected`: unchanged from v1.0 N01; translation-neutral citation naming accepted.
- `confidence_code`: T2; `textual_variant_flag`: none.
- `success_feedback/partial_feedback/failure_feedback/hints`: v1.0 N01, with partial routed to corpus contrast.
- `on_correct`: `LN07-N02`; `on_partial`: return to `LN07-N01` after source contrast; `on_incorrect`: return to `LN07-N01`; `on_hint_threshold`: guided mastery then `LN07-N02`; `optional_evidence_unlock`: none; `later_retrieval_effect`: `REVIEW_QUEUE` if source-boundary weakness persists.
- `mastery_domains`: source_navigation + witness_provenance; `evidence_strength`: recognition/application; `mastery_mode`: independent unless high hint threshold; `spaced_retrieval`: yes; `review_queue_rule`: `LN_POST_CAMPAIGN_REVIEW` if weak.
- `nonvisual_equivalent`: linear citation list with keyboard toggles and spoken scope labels.

### LN07-N02 — Зв’язок із арештом
- family retrieval; difficulty 1/6; required yes; target John 18:12↔18:24 continuity.
- prompt/accepted/rejected/evidence: v1.0 N02; `confidence_code`: T1; TX1 none.
- branches: correct→`LN07-N03`; partial/incorrect→source reread→current node; hints→guided→`LN07-N03`; optional unlock none.
- `later_retrieval_effect`: `RESOLVED_NODE` to `LN07-N12` and later synthesis; mastery local_continuity/retrieval_ln06; recall/application; spaced retrieval yes.
- nonvisual: two-verse linear comparison.

### LN07-N03 — Хто перший за Іваном?
- family exact evidence extraction; difficulty 2/6; required yes; target explicit local order.
- v1.0 N03 prompt/answers/evidence retained; `confidence_code`: T1; TX1 none.
- correct→`LN07-N04`; partial/incorrect (“Каяфа”)→John 18:13/24 contrast→current; hints→guided→next; optional unlock none.
- later retrieval: `RESOLVED_NODE` to `LN07-N13` synthesis and LN-11 evidence map; mastery explicit_text/local_chronology; recall/application; spaced yes.
- nonvisual: spoken verse + answer options; no spatial timeline required.

### LN07-N04 — Спорідненість і посада
- family relationship extraction; difficulty 2/6; required yes; target Annas/Caiaphas relationship + office.
- v1.0 N04 content retained; translation-equivalent “father-in-law / father of wife” accepted; `confidence_code`: T1; TX1 none.
- correct→`LN07-N05`; partial→split relationship/office remediation→current; incorrect→verse reread→current; hints→guided→next; optional unlock `LN07-O01` after successful completion; later retrieval→`RESOLVED_NODE` to final synthesis.
- mastery named_relationships; recognition/recall; spaced yes; review queue if weak.
- nonvisual: two labelled fields relationship/office.

### LN07-N05 — Матвій: кого названо прямо?
- family witness provenance; difficulty 2/6; required yes; target named source attribution.
- v1.0 N05 retained; `confidence_code`: T1; TX1 none.
- correct→N06; partial/incorrect→Matthew-only card→current; hints→guided→N06; no optional unlock; later retrieval→N08/N13 provenance synthesis.
- mastery witness_provenance/named_vs_unnamed; recall/application; spaced yes.
- nonvisual: Matthew-only labelled evidence block.

### LN07-N06 — Марко: не домислюй ім’я
- family explicit-vs-imported classification; difficulty 3/6; required yes.
- v1.0 N06 retained; `confidence_code`: T1 for “name not stated”; cross-witness Caiaphas association only T2; TX1 none.
- correct→N07; partial/incorrect→Mark-only reread→current; hints→guided→N07; later retrieval→N08/N13; optional unlock none.
- mastery explicit_vs_inferred; application; spaced yes.
- nonvisual: verse-first linear presentation without parallel-source leakage.

### LN07-N07 — Лука: місце без особистого імені
- family exact-text boundary; difficulty 3/6; required yes.
- v1.0 N07 retained; `confidence_code`: T1; TX1 none.
- correct→N08; partial/incorrect→Luke 22:54 reread→current; hints→guided→N08; optional unlock `LN07-O02` after successful Luke-boundary work; later retrieval→LN-08 daybreak safeguard.
- mastery textual_precision/day_night_boundary; recall/application; spaced yes.
- nonvisual: spoken “place/title vs personal name” fields.

### LN07-N08 — Матриця походження імен
- family witness-provenance matrix; difficulty 4/6; required yes.
- v1.0 N08 mapping retained; `confidence_code`: T2; TX1 none.
- correct→N09; partial→show one witness at a time→current; incorrect→reset mapping with preserved keyboard focus→current; hints→guided→N09; optional unlock none; later retrieval→LN-11 evidence-map synthesis.
- mastery provenance_synthesis; application/synthesis; spaced yes.
- nonvisual: canonical linear form `witness → claim → verse → confidence`; keyboard selection replaces drag.

### LN07-N09 — Про що запитують у Івана?
- family focused extraction; difficulty 2/6; required yes.
- v1.0 N09 retained; semantic equivalents “disciples/followers” and “teaching/instruction” accepted; `confidence_code`: T1; TX1 none.
- correct→N10; partial/incorrect→highlight two objects in John 18:19→current; hints→guided→N10; later retrieval→N13; optional none.
- mastery question_scope; recall; spaced yes; queue weak items.
- nonvisual: two labelled answer slots.

### LN07-N10 — Аргумент про публічність
- family evidence-chain reconstruction; difficulty 4/6; required yes.
- v1.0 N10 retained; textual chain T1; any imported legal/historical claim excluded from grading; TX1 none.
- correct→N11; partial→three-step scaffold→current; incorrect→source reread→current; hints→guided→N11; later retrieval→N13/LN-11; optional none.
- mastery evidence_chain/explicit_vs_context; application/synthesis; spaced yes.
- nonvisual: ordered textual fields `how spoke → where taught → whom to ask` with keyboard reorder controls.

### LN07-N11 — Удар і вимога свідчення
- family claim-evidence reasoning; difficulty 4/6; required yes.
- v1.0 N11 retained; `confidence_code`: T1; TX1 none.
- correct→N12; partial→event/response split→current; incorrect→John 18:22–23 reread→current; hints→guided→N12; later retrieval→N13; optional none.
- mastery evidence_principle; application; spaced yes.
- nonvisual: two-step event→response structure.

### LN07-N12 — Відправлення до Каяфи
- family local chronology; difficulty 2/6; required yes.
- v1.0 N12 retained; `confidence_code`: T1; TX1 none.
- correct→N13; partial/incorrect→compare John 18:13 and 18:24→current; hints→guided→N13; later retrieval→N13/LN-11; optional none.
- mastery local_chronology/continuity; recall/application; spaced yes.
- nonvisual: linear before/after anchors.

### LN07-N13 — Межа реконструкції
- family synthesis + uncertainty classification; difficulty 5/6; required yes.
- v1.0 N13 five required elements retained; `confidence_code`: T2 for comparison with D1 qualification on forced global micro-order; TX1 none.
- correct→mission synthesis; partial→witness-by-witness scaffold→current; incorrect→provenance repair→current; hints→guided synthesis; optional unlocks remain separately accessible; later retrieval→`RESOLVED_NODE` to LN-11/LN-12 synthesis.
- mastery high_level_synthesis/anti_false_harmonization; synthesis; spaced yes.
- nonvisual: four witness blocks followed by explicit uncertainty statement.

### LN07-O01 — Optional: попередня порада Каяфи
- historical alias `N14`; family cross-reference retrieval; difficulty 4/6; required no.
- v1.0 N14 retained; `confidence_code`: T2; TX1 none.
- correct→bonus evidence then return to active required path/synthesis; partial/incorrect→John 18:14 + 11:49–53 reread→optional node; hints→guided bonus; later retrieval→review queue if weak.
- mastery long_range_reference; application; spaced yes.
- nonvisual: cross-reference pair read linearly.

### LN07-O02 — Optional: Лука і нічне поводження
- historical alias `N15`; family local sequence; difficulty 3/6; required no.
- v1.0 N15 retained; `confidence_code`: T1; TX1 none.
- correct→bonus evidence and return; partial/incorrect→Luke 22:63–66 reread→optional node; hints→guided bonus; later retrieval→`RESOLVED_NODE` into LN-08 daybreak-boundary work.
- mastery day_night_boundary; recall/application; spaced yes.
- nonvisual: ordered linear passage summary with explicit daybreak marker.

## 5. Branch/reachability structural check

Required path remains reachable from `LN07-N01` to `LN07-N13` and mission synthesis. Every remediation branch returns to its originating node or advances only after guided resolution. Optional nodes return to the required path/synthesis and cannot trap progress.

**Structural branch result:** PASS at specification level. Dedicated end-to-end branch regression remains campaign-audit work and is not claimed complete here.

## 6. Translation/TX1 check

- Translation-equivalent wording is accepted where proposition is unchanged.
- “not stated in this cited text” remains valid where the witness does not name the person.
- No material TX1 grading point is used in LN-07.
- This revision introduces no new biblical claim; it normalizes already source-audited v1.0 content.

**Translation/TX1 structural result:** PASS for LN-07; final campaign translation audit remains pending.

## 7. Retrieval closure introduced by normalization

- LN07-N02→LN07-N12 local binding continuity: `RESOLVED_NODE`.
- LN07-N03/N05/N06/N07/N08→LN07-N13 provenance synthesis: `RESOLVED_NODE`.
- LN07-O02 daybreak boundary→LN-08 boundary work: `RESOLVED_NODE` at mission level; exact LN-08 stable destination ID to be fixed during LN-08 v1.1 normalization.
- LN07-N13→LN-11/LN-12 synthesis: `RESOLVED_NODE` at mission-design level; exact destinations remain part of campaign retrieval-register normalization.
- weak unresolved per-player mastery uses deterministic `LN_POST_CAMPAIGN_REVIEW`, not anonymous future retrieval.

## 8. Normalization conclusion

LN-07’s confirmed HIGH schema omission is repaired at structural-record level without altering the historical v1.0 file. All 15 authored nodes now have stable canonical IDs and explicit branch/retrieval/accessibility control fields.

This does **not** by itself close D-001 campaign-wide. LN-08 remains a confirmed repair target and the other missions still require the same scan. LN-07 also remains subject to dedicated NVDA task-family regression and final campaign-wide retrieval/variant closure before `PILOT_AUDIT_COMPLETE`.