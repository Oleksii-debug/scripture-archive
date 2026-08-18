# LN-08 — Свідчення і звинувачення

**Campaign:** `LN` — «Остання ніч»  
**Status:** `MISSION_COMPLETE / SOURCE_AUDITED / STRUCTURALLY_NORMALIZED_v1.2`  
**Version:** v1.1  
**Supersedes for canonical normalization:** `LN-08_TESTIMONY_AND_ACCUSATION_v1.0.md`  
**History rule:** v1.0 remains preserved and must not be deleted.  
**Scope:** textual pre-production only; no platform implementation.

## 1. Mission record

- `mission_id`: `LN-08`
- `campaign_id`: `LN`
- `title`: **Свідчення і звинувачення**
- `mission_role`: investigation + witness comparison + accusation synthesis
- `estimated_time`: 35–55 minutes
- `difficulty`: 4/6
- `learning_objectives`:
  1. reconstruct Matthew 26:59–68 locally;
  2. reconstruct Mark 14:55–65 locally;
  3. identify the false/problematic testimony problem in Matthew/Mark;
  4. preserve witness-specific temple-accusation wording;
  5. distinguish silence before testimony from response to the Messiah/Son question;
  6. compare Messiah/Son terminology without false harmonization;
  7. accept responsible translation-equivalent renderings of Jesus’ answers;
  8. retrieve Son-of-Man/right-hand/cloud imagery;
  9. preserve Luke 22:66 daybreak boundary;
  10. prevent import of Matthew/Mark false-witness material into Luke or John;
  11. use `T1/T2/D1` boundaries responsibly.
- `mastery_tags`: `GOSPEL_WITNESS_PROVENANCE`, `PARALLEL_TEXT_COMPARISON`, `CLAIM_EVIDENCE_DISCIPLINE`, `LOCAL_CHRONOLOGY`, `ACCUSATION_RECONSTRUCTION`, `MESSIAH_SON_OF_GOD_TERMINOLOGY`, `TEMPLE_SAYING_PROVENANCE`, `ANTI_FALSE_HARMONIZATION`
- `retrieval_targets`: LN-03 witness-specific detail; LN-06 witness-provenance matrix; LN-07 John local order and Luke daybreak boundary
- `future_repetition_hooks`: LN08-R01 through LN08-R06, defined below
- `primary_scripture`: Matthew 26:59–68; Mark 14:55–65; Luke 22:66–71
- `secondary_scripture`: John 18:19–24, provenance contrast only
- `historical_context_sources`: none
- `interpretive_sources`: none
- `source_classification_notes`: all answer-bearing claims are T1/T2 comparisons of cited Scripture; no legal-history reconstruction is required
- `disputed_points`: exact merged chronology/procedure across all witnesses is not graded; no single English wording is forced where responsible translations differ
- `textual_variant_points`: none material to grading in this mission; translation-aware validation remains required
- `opening_brief`: LN-07 established post-arrest route and witness separation. LN-08 investigates testimony, accusation, decisive questions and the limits of each Gospel witness.
- `case_question`: Який доказовий шлях веде від проблемних свідчень до формулювання звинувачення й рішення, якщо Матвія, Марка і Луку не зливати в один текст?
- `known_facts_at_start`: LN-07 established John provenance distinction and Luke 22:66 daybreak; Peter-denial fulfilment remains reserved for LN-09
- `unknowns_to_resolve`: testimony problem; temple wording; silence/answer transition; Messiah/Son questions; Luke daybreak content boundary; shared core vs witness-specific detail
- `entry_node`: `LN08-N01`
- `task_nodes`: `LN08-N01`…`LN08-N14`
- `optional_nodes`: `LN08-O01`, `LN08-O02`
- `failure_recovery_routes`: targeted source-check → current node retry; optional provenance node may unlock for N13 remediation; no dead-end failure
- `completion_conditions`: all required nodes traversed; N04/N10/N13/N14 correct or guided-complete; final synthesis preserves witness provenance
- `perfect_investigation_conditions`: 14/14 independent; both optional; no merged temple quotation; Luke daybreak recalled without hint; no imported false-witness claim assigned to Luke/John
- `keyboard_complete_equivalent`: required for all selections, ordering, comparison and classification
- `screen_reader_announcement_requirements`: announce prompt context, current witness/source, selected answer, correctness, evidence, confidence and mastery consequence
- `nonvisual_equivalent`: every side-by-side comparison has linear `witness → claim → verse → confidence`; ordering uses numbered/move controls; no spatial-only evidence
- `focus_order_requirements`: prompt → source scope → controls → submit → concise feedback → evidence → next action
- `editorial_status`: `MISSION_COMPLETE`
- `source_audit_status`: `PASS`

## 2. Source-audit invariants retained from v1.0

- Matthew 26:59–61: council seeks false testimony; many witnesses; two present a temple-related accusation.
- Mark 14:55–59: false testimony is sought/given but does not agree; even the temple testimony does not agree.
- Matthew 26:62–64 and Mark 14:60–62: silence precedes the direct Messiah/Son question; witness wording remains distinct.
- Matthew 26:64 and Mark 14:62: Son of Man/right-hand/cloud imagery is shared in related form.
- Luke 22:66 explicitly begins at daybreak/when day came; Luke 22:67–71 structures the questioning differently and does not narrate the Matthew/Mark false-witness block.
- John 18:19–24 is used only as provenance contrast; it does not become a hidden fourth account of the false-witness procedure.

No new biblical claim is introduced by v1.1. This revision is structural normalization of the source-audited v1.0 content.

## 3. Required route

`LN08-N01 → LN08-N02 → LN08-N03 → LN08-N04 → LN08-N05 → LN08-N06 → LN08-N07 → LN08-N08 → LN08-N09 → LN08-N10 → LN08-N11 → LN08-N12 → LN08-N13 → LN08-N14 → COMPLETE`

Optional nodes may unlock from relevant remediation/synthesis points and always return to the required route.

---

# 4. Canonical task-node records

## LN08-N01 — Встанови корпус

- `node_id`: `LN08-N01`
- `mission_id`: `LN-08`
- `task_family`: source selection
- `difficulty`: 2/6
- `required`: yes
- `skill_target`: passage scoping
- `knowledge_target`: primary witness corpus vs provenance-only John contrast
- `why_this_node_exists`: prevents later attribution errors before evidence analysis begins
- `player_prompt`: Обери три основні уривки, за якими ця місія реконструює свідчення і звинувачення.
- `source_scope_visible_to_player`: Gospel passage candidates with book/chapter/verse labels
- `response_mode`: citation selection
- `accepted_answer`: Matthew 26:59–68; Mark 14:55–65; Luke 22:66–71
- `accepted_variants`: canonical localized book names/abbreviations identifying the same ranges
- `required_evidence`: cited passage labels
- `rejected_answers`: John 18:19–24 as a primary false-witness account
- `rejection_reason`: John is contrast-only here and does not narrate that procedure
- `confidence_code`: `T1`
- `textual_variant_flag`: none
- `success_feedback`: Основний корпус відокремлено від Іванового окремого допиту.
- `partial_feedback`: Перевірте, чи Іван використаний як основний свідок неправдивих свідчень.
- `failure_feedback`: Звузьте корпус до Матвія 26, Марка 14 і Луки 22; Іван тут лише контроль походження.
- `hints`: H1 book names; H2 chapter numbers; H3 three Synoptics; H4 exclude John as primary; H5 verse ranges; H6 show two of three; H7 reveal corpus with explanation
- `on_correct`: `LN08-N02`
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: guided mastery then `LN08-N02`
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: none
- `mastery_domains`: `GOSPEL_WITNESS_PROVENANCE`
- `evidence_strength`: recognition
- `mastery_mode`: independent unless H6/H7 then guided
- `spaced_retrieval`: no
- `review_queue_rule`: weak source-scoping → `LN_SOURCE_SCOPE_REVIEW`
- `accessibility`: keyboard-toggleable labelled choices; screen reader announces book/chapter/verse and selection state; no unlabeled checkbox grid

## LN08-N02 — Що шукала рада в Матвія?

- `node_id`: `LN08-N02`
- `mission_id`: `LN-08`
- `task_family`: close reading
- `difficulty`: 2/6
- `required`: yes
- `skill_target`: explicit claim extraction
- `knowledge_target`: Matthew’s stated search for false testimony and purpose
- `why_this_node_exists`: establishes witness-specific accusation evidence before comparison
- `player_prompt`: За Мт 26:59–60, що шукали первосвященники і рада та з якою метою?
- `source_scope_visible_to_player`: Matthew 26:59–60
- `response_mode`: semantic short answer
- `accepted_answer`: неправдиве свідчення/доказ проти Ісуса, щоб віддати Його на смерть; багато неправдивих свідків з’являлися, але потрібного результату спочатку не було
- `accepted_variants`: responsible translation-equivalent paraphrases preserving purpose and testimony problem
- `required_evidence`: Matthew 26:59–60
- `rejected_answers`: they immediately had fully agreed testimony
- `rejection_reason`: contradicts the cited passage
- `confidence_code`: `T1`
- `textual_variant_flag`: none
- `success_feedback`: Ви відновили Матвієву мету й проблему свідчень окремо.
- `partial_feedback`: Назвіть і те, що шукали, і навіщо.
- `failure_feedback`: Перечитайте обидва вірші: мета і проблема названі окремо.
- `hints`: progressive verse focusing; H7 explains answer
- `on_correct`: `LN08-N03`
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: guided mastery then `LN08-N03`
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: none
- `mastery_domains`: `ACCUSATION_RECONSTRUCTION`, `CLAIM_EVIDENCE_DISCIPLINE`
- `evidence_strength`: recall, application
- `mastery_mode`: independent/guided by hint level
- `spaced_retrieval`: no
- `review_queue_rule`: weak claim extraction → `LN_WITNESS_PROVENANCE_REVIEW`
- `accessibility`: semantic response not exact-wording graded; evidence is read linearly after feedback

## LN08-N03 — Що не сходилося в Марка?

- `node_id`: `LN08-N03`
- `mission_id`: `LN-08`
- `task_family`: evidence extraction
- `difficulty`: 2/6
- `required`: yes
- `skill_target`: repeated textual signal detection
- `knowledge_target`: Mark 14:56,59 testimony non-agreement
- `why_this_node_exists`: establishes Mark-specific evidence problem
- `player_prompt`: Яку проблему Марко двічі підкреслює щодо свідчень у Мк 14:56 і 14:59?
- `source_scope_visible_to_player`: Mark 14:56,59
- `response_mode`: semantic short answer
- `accepted_answer`: свідчення не узгоджувалися/не збігалися, включно з храмовим звинуваченням
- `accepted_variants`: translation-equivalent wording for non-agreement
- `required_evidence`: Mark 14:56,59
- `rejected_answers`: witnesses fully agreed
- `rejection_reason`: directly contradicted by Mark
- `confidence_code`: `T1`
- `textual_variant_flag`: none
- `success_feedback`: Марків повторюваний сигнал неузгодженості зафіксовано.
- `partial_feedback`: Перевірте обидва вірші, а не лише перший.
- `failure_feedback`: Марко повторює один і той самий критерій проблеми свідчень.
- `hints`: progressive verse focus
- `on_correct`: `LN08-N04`
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: guided mastery then `LN08-N04`
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: none
- `mastery_domains`: `CLAIM_EVIDENCE_DISCIPLINE`
- `evidence_strength`: recall
- `mastery_mode`: independent/guided
- `spaced_retrieval`: no
- `review_queue_rule`: weak → `LN_WITNESS_PROVENANCE_REVIEW`
- `accessibility`: both verse references announced explicitly; no highlight-only indication

## LN08-N04 — Два храмові формулювання

- `node_id`: `LN08-N04`
- `mission_id`: `LN-08`
- `task_family`: comparison
- `difficulty`: 4/6
- `required`: yes
- `skill_target`: witness-specific comparison
- `knowledge_target`: Matthew 26:61 vs Mark 14:58 wording and shared core
- `why_this_node_exists`: trains anti-false-harmonization at quotation level
- `player_prompt`: Порівняй Мт 26:61 і Мк 14:58. Не переказуй їх як одну цитату. Які деталі кожен свідок приписує звинуваченню?
- `source_scope_visible_to_player`: Matthew 26:61; Mark 14:58
- `response_mode`: structured comparison
- `accepted_answer`: Matthew—ability to destroy the temple of God and build/rebuild in three days; Mark—destroy temple made with hands and in three days build another not made with hands
- `accepted_variants`: semantic equivalents preserving witness-specific contrast
- `required_evidence`: Matthew 26:61; Mark 14:58
- `rejected_answers`: one exact merged quotation attributed identically to both Gospels
- `rejection_reason`: erases witness-specific wording
- `confidence_code`: `T2`
- `textual_variant_flag`: none
- `success_feedback`: Спільне ядро збережене без злиття двох формулювань.
- `partial_feedback`: Відокремте Маркові “made with hands/not made with hands” від Матвієвого формулювання.
- `failure_feedback`: Прочитайте спочатку Матвія окремо, потім Марка, а лише тоді назвіть спільне й відмінне.
- `hints`: staged witness isolation; H7 guided comparison
- `on_correct`: `LN08-N05`
- `on_partial`: return_to_current_node
- `on_incorrect`: forced comparison sequence then return_to_current_node
- `on_hint_threshold`: guided mastery then `LN08-N05`
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: `REVIEW_QUEUE:LN_TEMPLE_SAYING_PROVENANCE_REVIEW` if merged incorrectly
- `mastery_domains`: `TEMPLE_SAYING_PROVENANCE`, `PARALLEL_TEXT_COMPARISON`, `ANTI_FALSE_HARMONIZATION`
- `evidence_strength`: synthesis
- `mastery_mode`: independent unless remediation/H6/H7 then guided
- `spaced_retrieval`: yes
- `review_queue_rule`: weak/merged → `LN_TEMPLE_SAYING_PROVENANCE_REVIEW`
- `accessibility`: canonical linear mode `Matthew claim → Mark claim → shared core → differences`; no side-by-side-only requirement

## LN08-N05 — Чи вистачило навіть цього?

- `node_id`: `LN08-N05`
- `mission_id`: `LN-08`
- `task_family`: claim classification
- `difficulty`: 3/6
- `required`: yes
- `skill_target`: evidence-constrained classification
- `knowledge_target`: Mark 14:59 says even temple testimony did not agree
- `why_this_node_exists`: blocks the false inference that the temple accusation solved the testimony problem
- `player_prompt`: Чи дозволяє Мк 14:59 сказати, що храмове звинувачення нарешті стало узгодженим свідченням?
- `source_scope_visible_to_player`: Mark 14:59
- `response_mode`: yes/no + evidence
- `accepted_answer`: no; Mark says even this testimony did not agree
- `accepted_variants`: equivalent semantic response
- `required_evidence`: Mark 14:59
- `rejected_answers`: yes
- `rejection_reason`: contradicts verse
- `confidence_code`: `T1`
- `textual_variant_flag`: none
- `success_feedback`: Ви не перетворили храмове звинувачення на узгоджене свідчення всупереч Маркові.
- `partial_feedback`: Додайте причину з вірша.
- `failure_feedback`: Зверніть увагу на заключну оцінку свідчення в 14:59.
- `hints`: verse-focused
- `on_correct`: `LN08-N06`
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: guided mastery then `LN08-N06`
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: none
- `mastery_domains`: `CLAIM_EVIDENCE_DISCIPLINE`
- `evidence_strength`: application
- `mastery_mode`: independent/guided
- `spaced_retrieval`: no
- `review_queue_rule`: weak → `LN_WITNESS_PROVENANCE_REVIEW`
- `accessibility`: yes/no controls have explicit labels and evidence prompt is textual

## LN08-N06 — Мовчання перед свідченнями

- `node_id`: `LN08-N06`
- `mission_id`: `LN-08`
- `task_family`: sequence reconstruction
- `difficulty`: 3/6
- `required`: yes
- `skill_target`: local sequence reconstruction
- `knowledge_target`: silence before transition to direct question in Matthew/Mark
- `why_this_node_exists`: prevents flattening witness-testimony stage and direct-question stage
- `player_prompt`: Що робить Ісус після питання первосвященника про свідчення в Мт 26:62–63 і Мк 14:60–61?
- `source_scope_visible_to_player`: Matthew 26:62–63; Mark 14:60–61
- `response_mode`: semantic short answer
- `accepted_answer`: remains silent/does not answer before transition to next question
- `accepted_variants`: translation-equivalent semantic wording
- `required_evidence`: Matthew 26:62–63; Mark 14:60–61
- `rejected_answers`: immediately refutes each witness
- `rejection_reason`: not stated in cited sequence
- `confidence_code`: `T2`
- `textual_variant_flag`: none
- `success_feedback`: Локальний перехід від свідчень до прямого питання збережено.
- `partial_feedback`: Уточніть, що мовчання належить саме цьому етапу.
- `failure_feedback`: Простежте послідовність по кожному свідку окремо.
- `hints`: staged sequence cues
- `on_correct`: `LN08-N07`
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: guided mastery then `LN08-N07`
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: none
- `mastery_domains`: `LOCAL_CHRONOLOGY`
- `evidence_strength`: recall
- `mastery_mode`: independent/guided
- `spaced_retrieval`: no
- `review_queue_rule`: weak → `LN_LOCAL_SEQUENCE_REVIEW`
- `accessibility`: sequence is linear text, not timeline-only

## LN08-N07 — Вирішальне питання: не зливай формулювання

- `node_id`: `LN08-N07`
- `mission_id`: `LN-08`
- `task_family`: witness comparison
- `difficulty`: 4/6
- `required`: yes
- `skill_target`: precise witness comparison
- `knowledge_target`: Matthew 26:63 vs Mark 14:61 question wording
- `why_this_node_exists`: preserves witness provenance in a high-theological-salience question
- `player_prompt`: Віднови питання первосвященника окремо за Матвієм і Марком.
- `source_scope_visible_to_player`: Matthew 26:63; Mark 14:61
- `response_mode`: structured witness comparison
- `accepted_answer`: Matthew asks whether Jesus is Messiah/Christ, Son of God, under oath by the living God; Mark asks whether He is Messiah/Christ, Son of the Blessed One
- `accepted_variants`: responsible translation equivalents preserving witness distinction
- `required_evidence`: Matthew 26:63; Mark 14:61
- `rejected_answers`: both texts have an identical verbatim question
- `rejection_reason`: false harmonization
- `confidence_code`: `T2`
- `textual_variant_flag`: none
- `success_feedback`: Високозначущі формулювання збережено окремо за свідками.
- `partial_feedback`: Вкажіть, що саме специфічне для Матвія і для Марка.
- `failure_feedback`: Не шукайте одну універсальну цитату — прочитайте кожний текст окремо.
- `hints`: witness-by-witness cues
- `on_correct`: `LN08-N08`
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: guided mastery then `LN08-N08`
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: none
- `mastery_domains`: `MESSIAH_SON_OF_GOD_TERMINOLOGY`, `GOSPEL_WITNESS_PROVENANCE`
- `evidence_strength`: synthesis
- `mastery_mode`: independent/guided
- `spaced_retrieval`: no
- `review_queue_rule`: weak → `LN_MESSIAH_TERMINOLOGY_REVIEW`
- `accessibility`: witness labels precede each claim; screen reader announces source before wording

## LN08-N08 — Відповідь Ісуса: переклад без пастки

- `node_id`: `LN08-N08`
- `mission_id`: `LN-08`
- `task_family`: translation-aware comparison
- `difficulty`: 4/6
- `required`: yes
- `skill_target`: semantic validation across responsible translations
- `knowledge_target`: Mark’s direct affirmative formulation vs Matthew’s different response idiom
- `why_this_node_exists`: prevents exact-string grading from creating false doctrinal/textual errors
- `player_prompt`: Порівняй першу частину відповіді Ісуса в Мт 26:64 та Мк 14:62. Яке твердження безпечно робити незалежно від перекладу?
- `source_scope_visible_to_player`: Matthew 26:64; Mark 14:62
- `response_mode`: semantic comparison
- `accepted_answer`: Mark directly gives an affirmative “I am” in common translations; Matthew uses a different idiom such as “you have said/you say”, so Matthew must not be graded as though it had Mark’s exact wording
- `accepted_variants`: any responsible translation-equivalent statement preserving the distinction
- `required_evidence`: Matthew 26:64; Mark 14:62
- `rejected_answers`: Matthew and Mark must both say the exact words “I am” to be correct
- `rejection_reason`: translation-insensitive false equivalence
- `confidence_code`: `T2`
- `textual_variant_flag`: none
- `success_feedback`: Зміст оцінено семантично, без пастки дослівного збігу.
- `partial_feedback`: Відокремте зміст відповіді від конкретної англійської/української форми.
- `failure_feedback`: Гра не вимагає від Матвія Маркового дослівного формулювання.
- `hints`: translation-aware staged explanation
- `on_correct`: `LN08-N09`
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: guided mastery then `LN08-N09`
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: `REVIEW_QUEUE:LN_TRANSLATION_NEUTRAL_REVIEW` if exact-wording error occurs
- `mastery_domains`: `PARALLEL_TEXT_COMPARISON`, `CLAIM_EVIDENCE_DISCIPLINE`
- `evidence_strength`: application, synthesis
- `mastery_mode`: independent/guided
- `spaced_retrieval`: yes if translation-equivalence weakness detected
- `review_queue_rule`: `LN_TRANSLATION_NEUTRAL_REVIEW`
- `accessibility`: translation note is spoken before grading; exact text is not color-difference dependent

## LN08-N09 — Спільний образ Сина Людського

- `node_id`: `LN08-N09`
- `mission_id`: `LN-08`
- `task_family`: evidence linking
- `difficulty`: 4/6
- `required`: yes
- `skill_target`: shared-core evidence linking
- `knowledge_target`: right hand/power and clouds imagery in Matthew/Mark
- `why_this_node_exists`: demonstrates legitimate cross-witness shared core after prior distinction work
- `player_prompt`: Які два образи поєднують Мт 26:64 і Мк 14:62 після відповіді Ісуса?
- `source_scope_visible_to_player`: Matthew 26:64; Mark 14:62
- `response_mode`: semantic recall with evidence
- `accepted_answer`: Son of Man at/right hand of Power/the Mighty and coming/appearing with clouds of heaven
- `accepted_variants`: responsible translation equivalents
- `required_evidence`: Matthew 26:64; Mark 14:62
- `rejected_answers`: witness-specific wording falsely treated as a verbatim shared quotation
- `rejection_reason`: shared imagery does not require identical wording
- `confidence_code`: `T2`
- `textual_variant_flag`: none
- `success_feedback`: Спільне ядро встановлено без вимоги дослівної тотожності.
- `partial_feedback`: Назвіть обидва образи.
- `failure_feedback`: Перечитайте другу частину обох відповідей.
- `hints`: imagery cues
- `on_correct`: `LN08-N10`
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: guided mastery then `LN08-N10`
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: `RESOLVED_NODE:LN11` stable destination pending LN-11 normalization
- `mastery_domains`: `PARALLEL_TEXT_COMPARISON`
- `evidence_strength`: recall, application
- `mastery_mode`: independent/guided
- `spaced_retrieval`: yes
- `review_queue_rule`: if destination unavailable before normalization, queue `LN_SON_OF_MAN_SHARED_CORE_REVIEW`
- `accessibility`: evidence pair read sequentially with witness labels

## LN08-N10 — Лука: спочатку час

- `node_id`: `LN08-N10`
- `mission_id`: `LN-08`
- `task_family`: chronology checkpoint
- `difficulty`: 3/6
- `required`: yes
- `skill_target`: explicit temporal-boundary retrieval
- `knowledge_target`: Luke 22:66 daybreak marker
- `why_this_node_exists`: prevents importing Luke’s council scene into an unqualified night sequence
- `player_prompt`: Перед аналізом Лк 22:67–71 назви часовий маркер у Лк 22:66.
- `source_scope_visible_to_player`: Luke 22:66
- `response_mode`: semantic recall
- `accepted_answer`: when day came / at daybreak / equivalent translation
- `accepted_variants`: відповідальні перекладні еквіваленти «коли настав день», «на світанку» тощо
- `required_evidence`: Luke 22:66
- `rejected_answers`: the passage explicitly calls this a night council
- `rejection_reason`: contradicts the explicit temporal marker
- `confidence_code`: `T1`
- `textual_variant_flag`: none
- `success_feedback`: Лукину часову межу збережено.
- `partial_feedback`: Назвіть саме маркер часу, не лише подію.
- `failure_feedback`: Поверніться до першої фрази Лк 22:66; цей якір уже вводився в LN-07.
- `hints`: H1 recall LN-07; H2 first clause; H7 reveal with explanation
- `on_correct`: `LN08-N11`
- `on_partial`: return_to_current_node
- `on_incorrect`: retrieve `LN07-N10` daybreak anchor then return_to_current_node
- `on_hint_threshold`: guided mastery then `LN08-N11`
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: `RESOLVED_NODE:LN10` stable destination pending LN-10 normalization
- `mastery_domains`: `LOCAL_CHRONOLOGY`, `GOSPEL_WITNESS_PROVENANCE`
- `evidence_strength`: recall
- `mastery_mode`: independent unless recovered from LN07-N10/H6/H7 then guided
- `spaced_retrieval`: yes
- `review_queue_rule`: weak → `LN_DAYBREAK_REVIEW`
- `accessibility`: temporal marker announced textually; no timeline-position-only cue

## LN08-N11 — Лука: два питання, не одне

- `node_id`: `LN08-N11`
- `mission_id`: `LN-08`
- `task_family`: sequence reconstruction
- `difficulty`: 4/6
- `required`: yes
- `skill_target`: local sequence ordering
- `knowledge_target`: Luke 22:67–70 two-question sequence
- `why_this_node_exists`: preserves Luke’s own structure rather than importing Matthew/Mark procedure
- `player_prompt`: Віднови послідовність питань у Лк 22:67–70.
- `source_scope_visible_to_player`: Luke 22:67–70
- `response_mode`: ordered semantic steps
- `accepted_answer`: first whether He is Christ/Messiah; after response and Son-of-Man statement, whether He is then Son of God
- `accepted_variants`: translation-equivalent wording preserving order
- `required_evidence`: Luke 22:67–70
- `rejected_answers`: only one question with no intervening response
- `rejection_reason`: collapses Luke’s sequence
- `confidence_code`: `T1`
- `textual_variant_flag`: none
- `success_feedback`: Лукину локальну послідовність збережено окремо.
- `partial_feedback`: Додайте проміжну відповідь/вислів перед другим питанням.
- `failure_feedback`: Розбийте уривок на питання → відповідь → друге питання.
- `hints`: ordered verse cues
- `on_correct`: `LN08-N12`
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: guided mastery then `LN08-N12`
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: none
- `mastery_domains`: `LOCAL_CHRONOLOGY`, `MESSIAH_SON_OF_GOD_TERMINOLOGY`
- `evidence_strength`: application
- `mastery_mode`: independent/guided
- `spaced_retrieval`: no
- `review_queue_rule`: weak → `LN_LOCAL_SEQUENCE_REVIEW`
- `accessibility`: numbered order or keyboard move-up/down; never drag-only

## LN08-N12 — Чим завершується Лукина сцена?

- `node_id`: `LN08-N12`
- `mission_id`: `LN-08`
- `task_family`: conclusion extraction
- `difficulty`: 3/6
- `required`: yes
- `skill_target`: conclusion extraction
- `knowledge_target`: Luke 22:71 conclusion from hearing Jesus’ own words
- `why_this_node_exists`: keeps Luke’s scene grounded in what Luke actually reports
- `player_prompt`: Який висновок роблять присутні в Лк 22:71?
- `source_scope_visible_to_player`: Luke 22:71
- `response_mode`: semantic short answer
- `accepted_answer`: they say no further testimony is needed because they themselves heard it from His own mouth
- `accepted_variants`: responsible translation equivalents
- `required_evidence`: Luke 22:71
- `rejected_answers`: Luke here describes agreed temple testimony from two witnesses
- `rejection_reason`: imports Matthew/Mark material into Luke
- `confidence_code`: `T1`
- `textual_variant_flag`: none
- `success_feedback`: Лукина власна кульмінація встановлена без імпорту чужого матеріалу.
- `partial_feedback`: Вкажіть, звідки, за текстом, вони вважають, що вже мають достатнє свідчення.
- `failure_feedback`: Перечитайте Лк 22:71 буквально.
- `hints`: verse wording cues
- `on_correct`: `LN08-N13`
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: guided mastery then `LN08-N13`
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: none
- `mastery_domains`: `CLAIM_EVIDENCE_DISCIPLINE`
- `evidence_strength`: recall
- `mastery_mode`: independent/guided
- `spaced_retrieval`: no
- `review_queue_rule`: weak → `LN_WITNESS_PROVENANCE_REVIEW`
- `accessibility`: direct textual evidence; no visual-only conclusion card

## LN08-N13 — Матвій/Марко vs Лука: що не можна переносити

- `node_id`: `LN08-N13`
- `mission_id`: `LN-08`
- `task_family`: provenance classification
- `difficulty`: 5/6
- `required`: yes
- `skill_target`: negative provenance / unsupported-claim detection
- `knowledge_target`: Luke 22:66–71 does not directly narrate Matthew/Mark false-witness temple block
- `why_this_node_exists`: central anti-false-harmonization safeguard
- `player_prompt`: Класифікуй твердження: «Лк 22:66–71 прямо описує тих самих неправдивих свідків і храмову заяву, що Мт 26:59–61 та Мк 14:55–59».
- `source_scope_visible_to_player`: Luke 22:66–71; Matthew 26:59–61; Mark 14:55–59
- `response_mode`: claim classification + evidence
- `accepted_answer`: unsupported as a direct Luke claim; Luke’s cited passage does not narrate that block
- `accepted_variants`: equivalent evidence-based formulations including “not stated in the cited Luke text”
- `required_evidence`: comparison of cited passages
- `rejected_answers`: `T1` for Luke / direct Luke claim
- `rejection_reason`: imports details absent from cited Luke passage
- `confidence_code`: `T2`
- `textual_variant_flag`: none
- `success_feedback`: Паралельність події не перетворила всі деталі на спільні для всіх свідків.
- `partial_feedback`: Скажіть не лише «неправильно», а чому це не є прямим твердженням Луки.
- `failure_feedback`: Порівняйте, які конкретні деталі реально присутні в Лукиному уривку.
- `hints`: provenance ladder; H6 may unlock O01; H7 guided classification
- `on_correct`: `LN08-N14`
- `on_partial`: return_to_current_node
- `on_incorrect`: unlock `LN08-O01`, then return_to_current_node
- `on_hint_threshold`: guided mastery then `LN08-N14`
- `optional_evidence_unlock`: `LN08-O01`
- `later_retrieval_effect`: `RESOLVED_NODE:LN11` stable destination pending LN-11 normalization
- `mastery_domains`: `GOSPEL_WITNESS_PROVENANCE`, `ANTI_FALSE_HARMONIZATION`
- `evidence_strength`: synthesis
- `mastery_mode`: independent unless O01/H6/H7 remediation then guided
- `spaced_retrieval`: yes
- `review_queue_rule`: weak → `LN_PROVENANCE_BOUNDARY_REVIEW`
- `accessibility`: classification label, witness, verse and reason are all spoken; no color-only true/false state

## LN08-N14 — Фінальна доказова реконструкція

- `node_id`: `LN08-N14`
- `mission_id`: `LN-08`
- `task_family`: synthesis
- `difficulty`: 5/6
- `required`: yes
- `skill_target`: multi-witness evidence synthesis
- `knowledge_target`: complete LN-08 evidence model with provenance boundaries
- `why_this_node_exists`: demonstrates mission-level mastery rather than isolated recognition
- `player_prompt`: Склади коротку реконструкцію з чотирьох частин: (1) проблема свідчень у Матвія/Марка; (2) храмове звинувачення і його межі; (3) питання про Месію/Сина та відповідь; (4) Лукина денна сцена і межа того, що вона прямо засвідчує. Для кожної частини наведи уривок.
- `source_scope_visible_to_player`: Matthew 26:59–66; Mark 14:55–64; Luke 22:66–71
- `response_mode`: structured synthesis with citations
- `accepted_answer`: synthesis preserving all four provenance boundaries with adequate citations
- `accepted_variants`: multiple responsible formulations; no single merged chronology required
- `required_evidence`: Matthew 26:59–66; Mark 14:55–64; Luke 22:66–71
- `rejected_answers`: flattened narrative attributing all details to all witnesses; unqualified relocation of Luke daybreak scene into night
- `rejection_reason`: violates witness provenance/temporal boundary
- `confidence_code`: `T2`
- `textual_variant_flag`: none
- `success_feedback`: Справу реконструйовано без втрати відмінностей між свідками.
- `partial_feedback`: Позначте, яка частина належить якому свідкові і де є спільне ядро.
- `failure_feedback`: Розділіть реконструкцію на чотири доказові блоки й додайте джерело до кожного.
- `hints`: progressive block scaffolding; H7 supplies a guided structure, not a fabricated harmonization
- `on_correct`: COMPLETE
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: guided completion
- `optional_evidence_unlock`: `LN08-O02` may be offered after completion or during micro-provenance weakness
- `later_retrieval_effect`: `RESOLVED_NODE:LN11` and `RESOLVED_NODE:LN12`, exact stable destinations pending normalization of those missions
- `mastery_domains`: all LN-08 mastery domains
- `evidence_strength`: synthesis
- `mastery_mode`: independent unless guided route used
- `spaced_retrieval`: yes
- `review_queue_rule`: weak dimensions → appropriate `LN_POST_MISSION_REVIEW` entries preserving source/confidence
- `accessibility`: synthesis uses ordered headings/fields; screen reader announces each evidence block and missing field; visual evidence board is optional equivalent only

---

# 5. Optional task-node records

## LN08-O01 — Іван як контроль походження

- `node_id`: `LN08-O01`
- `mission_id`: `LN-08`
- `task_family`: contrast / negative evidence
- `difficulty`: 4/6
- `required`: no
- `skill_target`: provenance boundary testing
- `knowledge_target`: John 18:19–24 does not narrate Matthew/Mark false-witness temple block
- `why_this_node_exists`: remediation for imported-detail error and reinforcement of LN-07/LN-08 boundary
- `player_prompt`: Прочитай Ів 18:19–24. Чи описує цей уривок неправдивих свідків та храмове звинувачення так, як Мт 26:59–61 або Мк 14:55–59?
- `source_scope_visible_to_player`: John 18:19–24; comparison references Matthew/Mark
- `response_mode`: evidence comparison
- `accepted_answer`: no; John describes questioning about disciples/teaching, public teaching response, strike and sending to Caiaphas
- `accepted_variants`: semantic equivalents
- `required_evidence`: John 18:19–24
- `rejected_answers`: John directly narrates the same false-witness temple sequence
- `rejection_reason`: absent from cited John passage
- `confidence_code`: `T2`
- `textual_variant_flag`: none
- `success_feedback`: Іван використаний як контроль походження, а не як прихований дубль синоптичної сцени.
- `partial_feedback`: Назвіть, що саме Іван реально описує.
- `failure_feedback`: Прочитайте Ів 18:19–24 без імпорту деталей з Матвія/Марка.
- `hints`: source-focused
- `on_correct`: return_to_current_node_or_route
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: guided return
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: none
- `mastery_domains`: `GOSPEL_WITNESS_PROVENANCE`, `ANTI_FALSE_HARMONIZATION`
- `evidence_strength`: application
- `mastery_mode`: independent/guided
- `spaced_retrieval`: no
- `review_queue_rule`: weak → `LN_PROVENANCE_BOUNDARY_REVIEW`
- `accessibility`: linear John claim list; no visual contrast dependency

## LN08-O02 — Що сталося після обвинувального рішення?

- `node_id`: `LN08-O02`
- `mission_id`: `LN-08`
- `task_family`: witness-detail comparison
- `difficulty`: 3/6
- `required`: no
- `skill_target`: micro-provenance comparison
- `knowledge_target`: shared treatment core plus Mark-specific face-covering detail
- `why_this_node_exists`: extends witness discipline after major synthesis without changing campaign boundary
- `player_prompt`: Порівняй Мт 26:67–68 і Мк 14:65. Назви спільне ядро поводження з Ісусом і одну Маркову деталь, яку не слід автоматично приписувати Матвію.
- `source_scope_visible_to_player`: Matthew 26:67–68; Mark 14:65
- `response_mode`: structured comparison
- `accepted_answer`: shared core—spitting, striking and “prophesy” taunt; Mark explicitly mentions covering the face in this passage
- `accepted_variants`: responsible translation equivalents
- `required_evidence`: Matthew 26:67–68; Mark 14:65
- `rejected_answers`: face-covering is explicitly stated identically by both cited passages
- `rejection_reason`: erases witness-specific detail
- `confidence_code`: `T2`
- `textual_variant_flag`: none
- `success_feedback`: Мікродеталь збережена за правильним свідком.
- `partial_feedback`: Відокремте спільне ядро від Маркової специфічної деталі.
- `failure_feedback`: Прочитайте кожний уривок окремо перед порівнянням.
- `hints`: witness-specific cues
- `on_correct`: return_to_current_node_or_complete
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: guided return
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: none
- `mastery_domains`: `GOSPEL_WITNESS_PROVENANCE`, `PARALLEL_TEXT_COMPARISON`
- `evidence_strength`: application
- `mastery_mode`: independent/guided
- `spaced_retrieval`: no
- `review_queue_rule`: weak → `LN_WITNESS_PROVENANCE_REVIEW`
- `accessibility`: witness names and claims presented sequentially, not column-only

## 6. Retrieval hooks created/consumed by LN-08

- `LN08-R01`: `LN07-N10` → `LN08-N10`, Luke 22:66 daybreak retrieval; status `RESOLVED_NODE`.
- `LN08-R02`: `LN07-N12` boundary knowledge → `LN08-O01`/`LN08-N13`; status `RESOLVED_NODE`.
- `LN08-R03`: `LN08-N04` temple-saying provenance weakness → `LN_TEMPLE_SAYING_PROVENANCE_REVIEW`; status `REVIEW_QUEUE`.
- `LN08-R04`: `LN08-N10` daybreak concept → LN-10 chronology node; status `RESOLVED_NODE at mission level`, exact LN-10 node ID pending normalization.
- `LN08-R05`: `LN08-N09`/`LN08-N13` provenance/shared-core mastery → LN-11 evidence-map nodes; status `RESOLVED_NODE at mission level`, exact destination pending LN-11 normalization.
- `LN08-R06`: `LN08-N14` synthesis → LN-11/LN-12 synthesis; status `RESOLVED_NODE at mission level`, exact destinations pending normalization.

No successful exact LN-08 prompt is eligible for accidental repeat in the adjacent daily session. Retrieval prefers registered cross-context/synthesis forms; if no safe alternate exists, use a deterministic review queue rather than LLM-generated novelty.

## 7. Branch/reachability structural regression

Required route check: PASS.

- Every required node has an explicit `on_correct` destination.
- Partial/incorrect routes return to the current node after evidence remediation.
- `LN08-N13` may unlock `LN08-O01`, which returns to the required route.
- `LN08-N14` is reachable from every valid required route.
- Optional nodes never gate required completion.
- H6/H7 guided routes reduce mastery status but do not dead-end mission progress.

Campaign-wide end-to-end regression remains pending because downstream stable IDs for LN-10/LN-11/LN-12 are not all normalized yet.

## 8. Translation/TX1 normalization result

- Translation-neutral semantic validation: STRUCTURAL PASS for LN-08.
- Exact quotation matching is not required where the learning target is semantic comparison.
- `LN08-N08` explicitly accepts responsible translation-equivalent wording and announces translation guidance before grading.
- No material `TX1` grading point is present in LN-08; `textual_variant_flag` is explicitly `none` on all nodes.
- If future source audit identifies a material textual-transmission issue, it must become a versioned revision and TX1 must be visible before affected grading.

## 9. Accessibility normalization result

Design-level nonvisual equivalence: PASS for all 16 LN-08 nodes.

Canonical requirements now explicit per node:
- keyboard-complete controls;
- spoken/linear witness and verse labels;
- no color-only provenance;
- no drag-only ordering;
- comparison has linear witness-by-witness mode;
- feedback announces correctness, evidence, confidence and mastery consequence;
- semantic answers are not exact-string graded.

Dedicated campaign-wide NVDA task-family audit remains pending; this mission therefore is not yet granted campaign-final `NORMALIZED_PASS`.

## 10. Source audit result

**PASS — inherited and revalidated structurally from v1.0.**

v1.1 introduces no new answer-bearing biblical or historical claim. It normalizes identifiers, branches, retrieval, mastery and accessibility around the already source-audited content.

## 11. Canonical production result

`LN-08` remains `MISSION_COMPLETE / SOURCE_AUDITED` and now has a versioned schema-v1.2 structural normalization record for **14 required + 2 optional = 16 nodes**.

Historical `v1.0` remains preserved. Final pilot closure still depends on campaign-wide normalization, retrieval/variant closure, dedicated NVDA audit and end-to-end regression.