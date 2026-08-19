# PA-02 — Дорога до Дамаска

**Campaign:** PA — «Дорога Павла»  
**Status:** `MISSION_COMPLETE / SOURCE_AUDITED`  
**Schema:** `CONTENT_NODE_SCHEMA v1.2`  
**Version:** 1.0 — 2026-08-19

## Mission record
- `mission_id`: `PA-02`; `campaign_id`: `PA`; `title`: `Дорога до Дамаска`.
- `mission_role`: delayed retrieval / three-witness source comparison / uncertainty-preserving reconstruction.
- `estimated_time`: 45–65 min; `difficulty`: 5/6.
- `learning_objectives`: retrieve PA01 objective; compare Acts9 narrator with Paul's Acts22/26 speeches; preserve visual/auditory/fall/commission/Ananias boundaries; use `not stated in cited text`; final source-cited synthesis.
- `mastery_tags`: Damascus; narrator-vs-speech; provenance; parallel-comparison; not-stated; translation-neutrality; commission; uncertainty.
- `retrieval_targets`: `PA01-N04`; `future_repetition_hooks`: explicit below.
- `primary_scripture`: Acts 9:1–19; Acts 22:6–16; Acts 26:12–18.
- `secondary_scripture`: none; `historical_context_sources`: none; `interpretive_sources`: none for grading.
- `source_classification_notes`: local explicit=T1; direct comparison=T2; forced auditory harmonization=D1.
- `disputed_points`: Acts9:7 vs Acts22:9 must not be solved by an unsourced single theory; Acts22:9 is translation-neutral.
- `textual_variant_points`: none registered as material TX1 for core grading; translation difference alone is not TX1.
- `opening_brief`: three witness units are compared without flattening.
- `case_question`: what each witness states, what is shared, and where evidence requires uncertainty.
- `known_facts_at_start`: PA01-N04 pre-journey purpose.
- `unknowns_to_resolve`: time/location; fall; companions; voice; immediate instruction; blindness; Ananias; commission; boundaries.
- `completion_synthesis`: three-witness source-cited reconstruction.
- `entry_node`: `PA02-N01`; required route N01→…→N14; optional O01/O02.
- `failure_recovery_routes`: only failed witness/dimension reopened; no dead ends.
- `completion_conditions`: 14 required nodes + source/provenance/auditory safeguards.
- `perfect_investigation_conditions`: independent high-value evidence nodes plus optional evidence; no spirituality score.

## Common node contract
For every row below: `mission_id=PA-02`; `required=yes` for N, `no` for O; `accepted_variants=semantic/translation equivalents preserving proposition`; `success_feedback` announces the evidence relation; `partial_feedback` asks only for the missing dimension; `failure_feedback` reopens the exact source; `hints=H1–H7 with H7 guided`; `on_partial=return_to_current_node`; `on_incorrect=return_to_current_node_after_witness_source_recheck`; `on_hint_threshold=guided_then_on_correct`; `optional_evidence_unlock=none unless stated`; `mastery_mode=independent unless high hints/reveal => guided`; `spaced_retrieval=yes`; `review_queue_rule=later_retrieval_effect when REVIEW_QUEUE, otherwise queue only weak destination performance`; `functional_nonvisual_equivalent=keyboard-complete labelled linear records, spoken source/result/confidence/mastery, no drag/color/spatial/time-only requirement`.

## Canonical nodes
| node_id | task_family | difficulty | required | skill_target | knowledge_target | player_prompt | accepted_answer | required_evidence | rejected_answers | confidence_code | textual_variant_flag | on_correct | later_retrieval_effect |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|
| `PA02-N01` | delayed retrieval | 2/6 | yes | recall prior objective | Acts 9:1–2 purpose | Why did Saul seek Damascus letters before the encounter? | Way-followers, men/women, to be bound/taken to Jerusalem; semantic equivalents. | Acts 9:1–2; PA01-N04 | preaching/meeting Ananias as stated objective | `T1` | `none` | `PA02-N02` | `RESOLVED_NODE PA02-N14` |
| `PA02-N02` | source selection | 1/6 | yes | delimit witness corpus | Acts 9/22/26 road units | Select the three direct/retrospective Damascus-road witness units. | Acts 9:3–19; 22:6–16; 26:12–18. | all three units | one-source-only corpus | `T1` | `none` | `PA02-N03` | `REVIEW_QUEUE PA_DAMASCUS_SOURCE_DELIMITATION_REVIEW` |
| `PA02-N03` | parallel comparison | 3/6 | yes | extract narrow shared core | minimum encounter core | What is common without flattening witness differences? | journey to Damascus; heavenly light; Saul/Paul falls; addressed voice asks about persecution; speaker identifies as Jesus; event redirects his course. | all three witness units | all companions fell / long commission identical in all three | `T2` | `none` | `PA02-N04` | `RESOLVED_NODE PA02-N14` |
| `PA02-N04` | chronology/detail comparison | 2/6 | yes | preserve local time/location | near Damascus vs midday | What does each witness explicitly say about time/location? | Acts9 near Damascus/no noon in v3; Acts22 about noon near Damascus; Acts26 midday on road. | 9:3;22:6;26:13 | all three explicitly say noon | `T2` | `none` | `PA02-N05` | `REVIEW_QUEUE PA_DAMASCUS_LOCAL_DETAIL_REVIEW` |
| `PA02-N05` | claim-boundary comparison | 3/6 | yes | distinguish subjects | who falls | Who is explicitly described as falling? | Acts9 Saul; Acts22 'I'; Acts26 'we all'. | 9:4;22:7;26:14 | all three say all companions fell | `T2` | `none` | `PA02-N06` | `RESOLVED_NODE PA02-N13` |
| `PA02-N06` | witness-evidence comparison | 3/6 | yes | separate visual evidence | companions see light/person | What can be said about companions' visual experience? | Acts9 see no one; Acts22 see light; Acts26 light around Paul+companions/all fall; none of these establishes that companions saw Jesus. | 9:7;22:9;26:13–14 | companions saw Jesus | `T2` | `none` | `PA02-N07` | `RESOLVED_NODE PA02-N13` |
| `PA02-N07` | translation-neutral witness boundary | 5/6 | yes | preserve auditory boundary | companions hearing | Compare only what each witness reports; do not force a theory. | Acts9 companions hear voice/sound; Acts22 companions see light and responsible translations render the auditory clause as not hearing or not understanding the speaker's voice; Acts26 says Paul heard, without separate companion-hearing claim. | 9:7;22:9;26:14 + translation note/rendering | Acts26 says companions heard nothing; one harmonization as T1 | `D1` | `none` | `PA02-N08` | `REVIEW_QUEUE PA_DAMASCUS_AUDITORY_BOUNDARY_REVIEW` |
| `PA02-N08` | identity comparison | 2/6 | yes | compare self-identification | Jesus identification | What answer follows 'Who are you, Lord?' | all identify Jesus as the one persecuted; Acts22 adds Jesus of Nazareth/Nazarene wording. | 9:5;22:8;26:15 | all three have identical Nazareth wording | `T2` | `none` | `PA02-N09` | `RESOLVED_NODE PA02-N14` |
| `PA02-N09` | instruction provenance | 4/6 | yes | preserve commission placement | city instruction vs direct commission | What immediate instruction follows in each witness? | Acts9 enter city/told what to do; Acts22 go Damascus/told assigned things; Acts26 presents extended servant/witness mission directly in road dialogue. | 9:6;22:10;26:16–18 | all three directly give Acts26 commission on road | `T2` | `none` | `PA02-N10` | `RESOLVED_NODE PA02-N13` |
| `PA02-N10` | evidence-boundary comparison | 3/6 | yes | use not-stated boundary | blindness/hand-leading | What does each witness say about blindness and leading? | Acts9 cannot see/led by hand/three days blind; Acts22 blinded by brilliance/led by companions; Acts26:12–18 does not state blindness or hand-leading. | 9:8–9;22:11;26:12–18 | Acts26 directly states three days blindness | `T2` | `none` | `PA02-N11` | `REVIEW_QUEUE PA_NOT_STATED_BOUNDARY_REVIEW` |
| `PA02-N11` | provenance comparison | 4/6 | yes | distinguish Ananias placement | Ananias across retellings | Compare Ananias in the assigned units. | Acts9 narrator introduces vision/visit/restoration; Acts22 Paul retells Ananias visit/words; Acts26:12–18 omits Ananias in this unit. | 9:10–19;22:12–16;26:12–18 | Acts26 denies Ananias because omitted | `T2` | `none` | `PA02-N12` | `RESOLVED_NODE PA02-N13` |
| `PA02-N12` | commission-source comparison | 5/6 | yes | track speaker/provenance | mission placement | Who reports Paul's future witness/mission role? | Acts9 Lord tells Ananias about chosen instrument; Acts22 Ananias reports witness role in Paul's retelling; Acts26 Jesus directly commissions in Paul's retelling. | 9:15–17;22:14–15;26:16–18 | one merged quotation common to all | `T2` | `none` | `PA02-N13` | `RESOLVED_NODE PA02-N14` |
| `PA02-N13` | witness-provenance synthesis | 5/6 | yes | build three-witness matrix | narrator vs Paul speeches | Build narrator/speaker→light→fall→voice→companions→instruction→Ananias/commission→uncertainty. | matrix preserving each witness, auditory boundary, who falls, commission placement, Ananias presence/absence. | full corpus | fill every source gap from another witness | `T2` | `none` | `PA02-N14` | `RESOLVED_NODE PA02-N14` |
| `PA02-N14` | final case synthesis | 6/6 | yes | produce source-grounded reconstruction | complete PA02 case | 8–12 sentences: pre-event purpose, shared core, >=2 unique details per witness, auditory boundary, one valid not-stated claim. | any fully cited synthesis meeting dimensions, preserving narrator vs speeches and uncertainty. | 9:1–19;22:6–16;26:12–18 | devotional substitute; forced hearing theory; spiritual grading | `T2` | `none` | `mission_complete` | `REVIEW_QUEUE PA_DAMASCUS_FINAL_SYNTHESIS_REVIEW` |
| `PA02-O01` | optional local-detail boundary | 4/6 | no | identify explicit language detail | Acts26 language statement | What language detail does Acts26:14 state, and is it universal across all road units? | Hebrew language/dialect or Aramaic according to responsible translation note; other assigned road units do not explicitly state language. | 26:14 + parallels | all three explicitly name language | `T1` | `none` | `return_to_required_path` | `REVIEW_QUEUE PA_LOCAL_DETAIL_REVIEW` |
| `PA02-O02` | optional knowledge-boundary | 4/6 | no | practice not-stated | Acts26 companion hearing | Does Acts26:14 directly establish whether companions heard the voice? | No; it says all fell and Paul heard a voice; companion hearing is not separately stated. | 26:14 | they definitely heard nothing | `T1` | `none` | `return_to_required_path` | `REVIEW_QUEUE PA_DAMASCUS_AUDITORY_BOUNDARY_REVIEW` |

## Per-node semantic / validation fields
The fields below are canonical and combine with the common node contract and control table above. This makes each schema-v1.2 requirement explicit without relying on UI layout.

| node_id | why_this_node_exists | source_scope_visible_to_player | response_mode | rejection_reason | mastery_domains | evidence_strength | optional_evidence_unlock |
|---|---|---|---|---|---|---|---|
| `PA02-N01` | preserves genuine delayed retrieval of Saul's pre-encounter objective before new road evidence | Acts 9:1–2 + prior PA01-N04 memory | short free response | rejected answers replace the stated pre-journey objective with later events | pre-journey-purpose; delayed-retrieval | recall | `none` |
| `PA02-N02` | prevents solving from one remembered retelling instead of the assigned three-witness corpus | Acts 9:3–19; 22:6–16; 26:12–18 | citation selection | an incomplete corpus cannot support the mission comparison | source-delimitation; witness-provenance | recognition/application | `none` |
| `PA02-N03` | establishes a narrow shared encounter core before witness-specific details are added | all three witness units | structured free comparison | rejected answers universalize details not present in all three sources | parallel-comparison; anti-false-harmonization | synthesis | `none` |
| `PA02-N04` | trains local-detail attribution and blocks importing Acts 22/26 noon language into Acts 9 | Acts 9:3; 22:6; 26:13 | witness-by-witness classification | the three sources do not all explicitly state noon | local-chronology; provenance | application | `none` |
| `PA02-N05` | makes the subject of the fall explicit and prevents retrospective harmonization | Acts 9:4; 22:7; 26:14 | witness matrix | only Acts 26 in the assigned comparison explicitly says all fell | subject-provenance; close-reading | application | `none` |
| `PA02-N06` | separates seeing light/no person from any unsupported claim that companions saw Jesus | Acts 9:7; 22:9; 26:13–14 | evidence comparison | none of the cited companion clauses establishes that companions saw Jesus | visual-evidence; provenance | application | `none` |
| `PA02-N07` | isolates the highest-risk auditory boundary without forcing an unsourced grammatical/harmonizing theory | Acts 9:7; 22:9 with responsible translation rendering; 26:14 | uncertainty-aware comparison | Acts 26 does not separately state companion hearing, and Acts 22:9 has responsible translation variation | auditory-boundary; translation-neutrality; uncertainty | application/synthesis | `none` |
| `PA02-N08` | distinguishes shared Jesus-identification from Acts 22's witness-specific Nazareth wording | Acts 9:5; 22:8; 26:15 | comparison | a true Acts 22 detail is not universal wording across all three | identity; witness-provenance | recall/application | `none` |
| `PA02-N09` | preserves where immediate instruction/commission appears in each retelling | Acts 9:6; 22:10; 26:16–18 | provenance comparison | Acts 26's extended direct commission cannot be inserted verbatim into Acts 9/22 | commission-provenance; speaker-tracking | application | `none` |
| `PA02-N10` | operationalizes the valid answer “not stated in the cited text” for Acts 26 blindness/leading | Acts 9:8–9; 22:11; 26:12–18 | evidence-boundary classification | omission in Acts 26 cannot be filled from another witness as a direct Acts 26 statement | not-stated-boundary; provenance | application | `none` |
| `PA02-N11` | distinguishes narrator Ananias material, Paul's retrospective Ananias speech, and Acts 26 omission | Acts 9:10–19; 22:12–16; 26:12–18 | witness-provenance comparison | omission is not evidence that Ananias did not participate historically | Ananias-provenance; narrator-vs-speech | application | `none` |
| `PA02-N12` | tracks the source and placement of Paul's witness/mission role instead of merging quotations | Acts 9:15–17; 22:14–15; 26:16–18 | speaker/source comparison | the commission is differently mediated/placed across the three units | commission-provenance; speaker-recipient | application/synthesis | `none` |
| `PA02-N13` | forces a complete three-witness provenance matrix before final prose synthesis | complete PA-02 corpus | structured synthesis matrix | filling every source gap from another witness destroys provenance and uncertainty | witness-provenance; evidence-linking; uncertainty | synthesis | `PA02-O01; PA02-O02` |
| `PA02-N14` | verifies independent reconstruction with citations, source boundaries and one explicit not-stated claim | complete PA-02 corpus + PA01-N04 retrieval anchor | structured free synthesis | source-free devotional reflection or forced auditory harmonization does not satisfy the evidence task | final-synthesis; source-citation; uncertainty | synthesis | `PA02-O01; PA02-O02` |
| `PA02-O01` | teaches a witness-specific language detail without universalizing it | Acts 26:14 + comparison with Acts 9/22 road units | optional boundary check | the assigned Acts 9/22 units do not explicitly name the spoken language | local-detail; translation-note-literacy | application | `none` |
| `PA02-O02` | tests disciplined use of “not stated” for companion hearing in Acts 26 | Acts 26:14 | optional free response | the verse states Paul's hearing, not a separate positive or negative companion-hearing claim | not-stated-boundary; auditory-provenance | application | `none` |

## Source audit
Answer-bearing propositions were checked against Acts 9:1–19, Acts 22:6–16 and Acts 26:12–18 in multiple responsible current translations on 2026-08-19. Acts22:9 is deliberately translation-neutral (`did not hear` / `did not understand` according to translation); this is not automatically TX1. Acts26:14 explicitly says all fell and Paul heard a voice, but does not separately state companion hearing. Omission of Ananias in Acts26:12–18 is not graded as denial of the event.

## Completion validation
- IDs: PA02-N01…N14 + O01/O02 = 16 unique.
- all v1.2 control fields explicit through mission/common contract + node rows.
- PA01-N04 reserved destination `PA02-N01` preserved.
- branch reachability at specification level: PASS.
- source audit: PASS at developer level; independent audit still required.
- NVDA/nonvisual equivalence: PASS at design level.
- production code: none.
