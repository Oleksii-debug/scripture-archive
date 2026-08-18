# LN-12 — Фінальна реконструкція

**Campaign:** LN — «Остання ніч»  
**Status:** `MISSION_COMPLETE / SOURCE_AUDITED`  
**Schema:** CONTENT_NODE_SCHEMA v1.1  
**Date:** 2026-08-18

## 1. Mission identity

- `mission_id`: LN-12
- `campaign_id`: LN
- `title`: Фінальна реконструкція
- `mission_role`: final case / synthesis / delayed retrieval / source-cited reconstruction
- `estimated_time`: 55–90 minutes
- `difficulty`: 6/6

## 2. Player promise

Після завершення гравець зможе самостійно побудувати доказово відповідальну реконструкцію подій від приготування Пасхи до ранкової передачі Ісуса Пилатові, не змішуючи прямий текст, міжтекстове порівняння, текстологічні варіанти та невизначені місця. Фінальний результат не є «єдиною правильною гармонією»: він є джерельно прозорим висновком, у якому кожне суттєве твердження має свідка, уривок, рівень певності та, де потрібно, межу невизначеності.

## 3. Learning objectives

1. Відновити повний каркас LN-01–LN-10 без повторного проходження кампанії.
2. Використати evidence graph LN-11 як доказовий інструмент, а не як готову відповідь.
3. Побудувати повну реконструкцію з явними citation anchors.
4. Відокремити narrow shared core від witness-specific details.
5. Правильно застосувати `T1`, `T2`, `TX1`, `D1` та не підвищувати `C1/I1` до біблійного факту.
6. Відновити щонайменше два prediction→fulfilment ланцюги: зречення Петра та розсіяння/втеча учнів.
7. Зберегти локальні порядки окремих Євангелій без вигаданого універсального похвилинного порядку.
8. Включити текстологічні примітки там, де вони реально впливають на формулювання відповіді.
9. Виявити й виправити щонайменше одну навмисно запропоновану false-harmonization помилку.
10. Захистити фінальний висновок у форматі `claim → witness → passage → confidence → qualification`.
11. Сформулювати, що саме ми знаємо впевнено, що знаємо лише через порівняння, а що лишається невизначеним.
12. Завершити кампанію результатом, який однаково працює в майбутньому візуальному й невізуальному інтерфейсі.

`mastery_tags`: final-synthesis; delayed-retrieval; evidence-citation; witness-provenance; anti-false-harmonization; chronology-boundaries; prediction-fulfilment; textual-variants; uncertainty; authority-handoff; free-reconstruction.

`retrieval_targets`: LN-01 through LN-11.

`future_repetition_hooks`: later campaigns should periodically retrieve provenance grammar, evidence confidence, prediction→fulfilment and uncertainty-boundary skills learned here.

## 4. Source model

### Primary Scripture / inherited audited corpus

LN-12 introduces no new answer-bearing narrative corpus. It reuses only claims already source-audited in LN-01–LN-10 and structurally linked in LN-11:

- Mt 26:17–27:2;
- Mk 14:12–15:1;
- Lk 22:7–23:1;
- Jn 13:18–30; 13:36–38; 18:2–29;
- optional previously-audited cross references: 1 Cor 11:23–26; Ps 41:9.

### Source audit method

- Every graded factual claim must either point to an inherited `SOURCE_AUDITED` claim or be a direct `T2` comparison of such claims.
- No new historical/legal chronology is introduced.
- The campaign sequence is a pedagogical scaffold and must never be presented as proof of an exact harmonized chronology across all four Gospels.
- `TX1` qualifications inherited from earlier missions remain attached to the claims they qualify.
- A player may produce more than one responsible reconstruction if each one preserves the same source constraints and explicitly marks uncertainty.

### Disputed / limited-certainty points

- Exact minute-by-minute inter-Gospel chronology is `D1` where the texts do not establish it.
- The unnamed beloved disciple is not graded as personally named in Jn 13.
- The unnamed young man in Mk 14:51–52 is not assigned an identity.
- Legal/procedural reconstructions beyond explicit Gospel wording remain `C1/I1/D1` unless independently sourced in a future context module.
- Mark’s first/second cock-crow wording and Luke 22:43–44 remain under the existing `TX1` policy.

## 5. Narrative shell

### Opening brief

Архів зібрано. Окремі свідчення перевірено. Карта доказів побудована. Тепер останнє завдання: не повторити чужий переказ, а власноруч скласти висновок так, щоб кожен крок витримував перевірку джерел.

### Case question

**Яку фінальну реконструкцію подій від приготування Пасхи до ранкової передачі Пилатові можна захистити без хибної гармонізації, якщо кожне суттєве твердження має конкретне джерело, рівень певності та явну межу там, де точнішого висновку текст не дозволяє?**

### Known facts at start

- LN-01–LN-10 source-audited;
- LN-11 evidence map completed;
- prediction→fulfilment, witness provenance, authority handoff, `TX1` and uncertainty-boundary mechanics already known;
- player has access to Scripture references and their own evidence notes.

### Unknowns to resolve

- чи може гравець відновити кампанію без покрокового підказування;
- чи збереже він походження кожної деталі;
- чи відрізнить локальний порядок свідка від універсальної хронології;
- чи зможе сам позначити невизначеність;
- чи фінальний висновок достатньо точний і водночас не сильніший за джерела.

## 6. Flow

`entry_node`: LN12-N01  
Required route: N01 → N02 → N03 → N04 → N05 → N06 → N07 → N08 → N09 → N10 → N11 → N12 → N13 → N14.  
Optional nodes: N15, N16, N17.  
No dead ends. Incorrect answers open targeted source/provenance correction routes and then return to the same node.

---

## LN12-N01 — Відновіть каркас без карти

- `task_family`: delayed retrieval / ordering
- `difficulty`: 5/6
- `required`: yes
- `skill_target`: independent recall of campaign macrostructure
- `knowledge_target`: LN-01–LN-10 event scaffold
- `why_this_node_exists`: final synthesis must begin from memory before the evidence map is reopened.
- `player_prompt`: Без карти LN-11 відновіть десять основних етапів кампанії від приготування Пасхи до ранкової передачі Пилатові.
- `source_scope_visible_to_player`: memory first; mission titles unlocked by hints.
- `response_mode`: ordering
- `accepted_answer`: Приготування → За столом → Зрадник за столом → Попередження Петрові → Гефсиманія: молитва і сон → Арешт → Анна, Каяфа і нічний допит → Свідчення і звинувачення → Три зречення → Ранок.
- `accepted_variants`: synonymous mission labels preserving campaign scaffold.
- `required_evidence`: campaign mission sequence only.
- `rejected_answers`: claim that this design sequence itself proves exact inter-Gospel chronology.
- `rejection_reason`: campaign order is pedagogical; several cross-witness micro-orders remain uncertain.
- `confidence`: internal canonical sequence; not universal T1 chronology.
- `success_feedback`: Каркас відновлено. Тепер кожний етап треба наповнити тільки джерельно захищеними твердженнями.
- `partial_feedback`: mark displaced stage and schedule retrieval.
- `failure_feedback`: reveal first/last anchors, then progressively unlock mission titles.
- `hints`: H1 goal; H2 first three stages; H3 middle anchors; H6 full title set; H7 guided order.
- `on_correct`: N02
- `on_partial`: N02 with weak retrieval flag
- `on_incorrect`: correction loop
- `on_hint_threshold`: guided mastery
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: weak stages become post-campaign review targets
- `mastery`: campaign-structure / recall / spaced retrieval yes
- `accessibility`: numbered text list; numeric ordering or move-up/down; no drag-only requirement.

## LN12-N02 — Спільне ядро чи деталь свідка?

- `task_family`: classification / provenance
- `difficulty`: 5/6
- `required`: yes
- `skill_target`: separate narrow shared core from witness-specific detail
- `knowledge_target`: anti-false-harmonization
- `why_this_node_exists`: prevents final reconstruction from flattening distinct Gospel testimony.
- `player_prompt`: Для запропонованих тверджень визначте: `shared core`, `witness-specific`, `unsupported universalization`.
- `source_scope_visible_to_player`: audited claim cards from LN-01–LN-10.
- `response_mode`: classification
- `accepted_answer`: e.g. «Ісус передбачив три зречення Петра до півнячого маркера» = shared core; «Лука описує погляд Ісуса на Петра» = witness-specific; «усі Євангелія прямо називають Малха» = unsupported universalization.
- `accepted_variants`: equivalent classification with correct source reasoning.
- `required_evidence`: LN-04, LN-06, LN-09 audited corpora.
- `rejected_answers`: treating a detail from one Gospel as universal.
- `rejection_reason`: true detail ≠ universally attested detail.
- `confidence`: T1 per witness; T2 for shared-core comparison.
- `success_feedback`: Походження деталей збережено.
- `partial_feedback`: identify correct fact but missing provenance.
- `failure_feedback`: reopen the exact witness claim and ask who says it.
- `hints`: H1 distinguish fact from provenance; H4 look for named witness; H6 passage anchors; H7 classification reveal.
- `on_correct`: N03
- `on_partial`: N03 with provenance weakness
- `on_incorrect`: source correction loop
- `on_hint_threshold`: guided
- `optional_evidence_unlock`: N15
- `later_retrieval_effect`: witness-specific errors return in N12
- `mastery`: witness-provenance / application / spaced retrieval yes
- `accessibility`: linear records `claim → witness → classification`.

## LN12-N03 — Приготування і стіл: перший реконструкційний блок

- `task_family`: free reconstruction / citation
- `difficulty`: 5/6
- `required`: yes
- `skill_target`: synthesize LN-01–LN-03 with citations
- `knowledge_target`: preparation, meal, betrayer-at-table evidence
- `why_this_node_exists`: tests source-cited narrative writing rather than recognition.
- `player_prompt`: Складіть короткий реконструкційний блок від приготування Пасхи до оголошення про зрадника. Для кожної суттєвої деталі додайте свідка й уривок.
- `source_scope_visible_to_player`: LN-01–LN-03 corpus.
- `response_mode`: structured free response
- `accepted_answer`: any reconstruction preserving audited claims, including Luke naming Peter and John for preparation; Synoptic meal evidence; witness-specific betrayer details; no invented single micro-order across all witnesses.
- `accepted_variants`: multiple responsible formulations.
- `required_evidence`: at least one source anchor per stage and provenance for witness-specific details.
- `rejected_answers`: invented names for unnamed figures; universalizing John’s or Matthew’s unique details.
- `rejection_reason`: exceeds direct evidence.
- `confidence`: T1/T2 with D1 where order is not established.
- `success_feedback`: Перший блок витримує перевірку джерел.
- `partial_feedback`: mark uncited or overgeneralized claims individually.
- `failure_feedback`: return only failed claims to source check, not entire reconstruction.
- `hints`: passage-range narrowing; decisive references only at H6; H7 model skeleton, not a single mandatory prose wording.
- `on_correct`: N04
- `on_partial`: N04 with flagged claims queued for N12
- `on_incorrect`: correction branch
- `on_hint_threshold`: guided
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: weak claim provenance repeats in N12
- `mastery`: synthesis / citation / application / spaced retrieval yes
- `accessibility`: text template with fields `claim; witness; passage; confidence; note`.

## LN12-N04 — Передбачення Петрові без знання результату

- `task_family`: delayed retrieval / prediction
- `difficulty`: 5/6
- `required`: yes
- `skill_target`: retrieve prediction independently from fulfilment
- `knowledge_target`: LN-04
- `why_this_node_exists`: preserves prediction-before-fulfilment discipline.
- `player_prompt`: До перегляду LN-09 відновіть, що саме було передбачено Петрові, і позначте, які формулювання залежать від конкретного свідка.
- `source_scope_visible_to_player`: LN-04 only until commit.
- `response_mode`: structured recall
- `accepted_answer`: three denials before cock-crow marker as narrow shared core; Mark’s two-crow form marked witness/textual-variant sensitive; Luke’s prayer/return material and John’s life-laying dialogue kept witness-specific.
- `accepted_variants`: translation-equivalent.
- `required_evidence`: Mt 26:30–35; Mk 14:26–31; Lk 22:31–34; Jn 13:36–38.
- `rejected_answers`: rewriting prediction from fulfilment details not present in prediction text.
- `rejection_reason`: hindsight contamination.
- `confidence`: T1/T2; Mark wording may carry TX1.
- `success_feedback`: Передбачення зафіксоване окремо від виконання.
- `partial_feedback`: correct core but missing witness-specific distinction.
- `failure_feedback`: reopen LN-04 source matrix.
- `hints`: narrow witness; passage; phrase type; H6 anchors; H7 guided reconstruction.
- `on_correct`: N05
- `on_partial`: N05 with prediction weakness
- `on_incorrect`: correction
- `on_hint_threshold`: guided
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: informs N09/N12 grading
- `mastery`: prediction-retrieval / recall / spaced retrieval yes
- `accessibility`: plain text witness-by-witness form.

## LN12-N05 — Гефсиманія та арешт: другий реконструкційний блок

- `task_family`: free reconstruction / evidence linking
- `difficulty`: 6/6
- `required`: yes
- `skill_target`: synthesize LN-05–LN-06
- `knowledge_target`: prayer, sleep, approach of betrayer, arrest, sword/ear details
- `why_this_node_exists`: combines high-detail parallel witnesses while retaining provenance.
- `player_prompt`: Побудуйте реконструкційний блок від молитви в Гефсиманії до завершення арешту. Для кожної witness-specific деталі назвіть свідка.
- `source_scope_visible_to_player`: LN-05–LN-06 corpus.
- `response_mode`: structured free response
- `accepted_answer`: any source-cited synthesis preserving: Synoptic prayer/sleep material; Luke 22:43–44 only with TX1 qualification if used; sign-of-kiss distinction; John’s self-identification scene; Peter/Malch naming only from John; right ear/healing only from Luke; disciples’ flight as sourced; no identity assigned to Mark’s young man.
- `accepted_variants`: responsible alternatives.
- `required_evidence`: mission source anchors.
- `rejected_answers`: universalizing Malch/Peter naming; forcing Luke 22:43–44 without variant note; identifying unnamed young man.
- `rejection_reason`: provenance/textual-variant boundary violation.
- `confidence`: T1/T2 + TX1/D1 where applicable.
- `success_feedback`: Другий блок зберігає і подію, і походження деталей.
- `partial_feedback`: flag only unsupported edge/detail.
- `failure_feedback`: targeted source check.
- `hints`: witness matrix; TX1 reminder; decisive passages at H6.
- `on_correct`: N06
- `on_partial`: N06 with flagged claims
- `on_incorrect`: correction
- `on_hint_threshold`: guided
- `optional_evidence_unlock`: N16
- `later_retrieval_effect`: provenance errors return in N12
- `mastery`: multi-witness synthesis / citation / textual-variant awareness yes
- `accessibility`: linear witness matrix and text reconstruction fields.

## LN12-N06 — Анна, Каяфа і межа дня

- `task_family`: chronology boundary / classification
- `difficulty`: 6/6
- `required`: yes
- `skill_target`: preserve local chronology without global overclaim
- `knowledge_target`: LN-07–LN-08
- `why_this_node_exists`: this is the campaign’s highest false-harmonization risk.
- `player_prompt`: Побудуйте лише ті порядкові твердження про Анну, Каяфу, допит і раду, які можна захистити за конкретними свідками. Окремо позначте, що не можна перетворити на універсальний точний порядок.
- `source_scope_visible_to_player`: Jn 18:12–24; Mt 26:57–68; Mk 14:53–65; Lk 22:54–71.
- `response_mode`: chronology classification
- `accepted_answer`: John local order includes Annas first and later sending to Caiaphas; Matthew names Caiaphas in his scene; Mark names the high priest but not personal name in the cited entry verse; Luke explicitly introduces council at daybreak; exact merged minute-by-minute order remains D1.
- `accepted_variants`: equivalent source-faithful wording.
- `required_evidence`: witness-specific passages.
- `rejected_answers`: “all four explicitly say Annas first”; “Luke places the council at night”; one forced precise inter-Gospel sequence.
- `rejection_reason`: false harmonization or witness misattribution.
- `confidence`: T1 local; T2 comparison; D1 merged precision.
- `success_feedback`: Локальні порядки збережено, універсальну точність не вигадано.
- `partial_feedback`: correct sequence but missing witness scope.
- `failure_feedback`: reopen witness lines separately.
- `hints`: identify witness first; daybreak marker; H6 verse anchors; H7 guided classification.
- `on_correct`: N07
- `on_partial`: N07 with chronology weakness
- `on_incorrect`: correction
- `on_hint_threshold`: guided
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: chronology boundary tested again in N13
- `mastery`: chronology-boundary / provenance / application yes
- `accessibility`: linear list `witness → before → after → certainty`.

## LN12-N07 — Свідчення, звинувачення і мовчання

- `task_family`: evidence comparison
- `difficulty`: 6/6
- `required`: yes
- `skill_target`: preserve accusation provenance
- `knowledge_target`: LN-08
- `why_this_node_exists`: prevents procedural similarity from becoming invented identical evidence.
- `player_prompt`: Порівняйте блоки свідчень/звинувачень у Матвія, Марка й Луки. Позначте, які елементи не можна переносити між свідками.
- `source_scope_visible_to_player`: Mt 26:59–68; Mk 14:55–65; Lk 22:66–71.
- `response_mode`: comparison
- `accepted_answer`: Matthew/Mark false-witness material retained to those witnesses; Mark’s nonagreement preserved; Luke daybreak council retained; Luke not credited with the same explicit false-witness block in cited passage.
- `accepted_variants`: equivalent comparison.
- `required_evidence`: direct passages.
- `rejected_answers`: universal false-witness scene across all Synoptics.
- `rejection_reason`: accusation-provenance separation violation.
- `confidence`: T1/T2.
- `success_feedback`: Процедурна спорідненість не підмінила конкретний доказ.
- `partial_feedback`: missing one witness-specific distinction.
- `failure_feedback`: return to witness rows.
- `hints`: source-by-source; H6 anchors; H7 guided matrix.
- `on_correct`: N08
- `on_partial`: N08 with provenance weakness
- `on_incorrect`: correction
- `on_hint_threshold`: guided
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: weak accusation provenance returns in N12
- `mastery`: evidence-comparison / provenance yes
- `accessibility`: text table alternative expressed linearly.

## LN12-N08 — Виконання передбачення: три зречення

- `task_family`: prediction→fulfilment delta matrix
- `difficulty`: 6/6
- `required`: yes
- `skill_target`: compare prediction and fulfilment while preserving witness deltas
- `knowledge_target`: LN-04 + LN-09
- `why_this_node_exists`: closes the strongest delayed-retrieval arc of the pilot.
- `player_prompt`: Тепер відкрийте fulfilment corpus і зіставте його з вашим записом N04. Визначте narrow shared fulfilment core, witness-specific details і `TX1`.
- `source_scope_visible_to_player`: LN-04 prediction + Mt 26:69–75; Mk 14:66–72; Lk 22:54–62; Jn 18:15–18,25–27.
- `response_mode`: evidence linking / comparison
- `accepted_answer`: three denial episodes before cock-crow marker as shared core; Luke’s roughly-one-hour detail and Jesus’ look witness-specific; John’s gatekeeper/charcoal fire/relative-of-ear-victim witness-specific; Mark first/second-crow wording under TX1 policy.
- `accepted_variants`: translation-equivalent and source-faithful.
- `required_evidence`: prediction and fulfilment anchors.
- `rejected_answers`: three identical accusers/identical sentences across all witnesses; universalizing Luke/John details.
- `rejection_reason`: denial-count safeguard and provenance violation.
- `confidence`: T1/T2 + TX1.
- `success_feedback`: Передбачення й виконання пов’язано без стирання відмінностей свідків.
- `partial_feedback`: correct count, weak deltas.
- `failure_feedback`: reopen prediction then one witness at a time.
- `hints`: shared core first; witness deltas next; TX1 before grading.
- `on_correct`: N09
- `on_partial`: N09 with retrieval weakness
- `on_incorrect`: correction
- `on_hint_threshold`: guided
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: campaign mastery tag retained for future review
- `mastery`: delayed retrieval / synthesis / textual-variant awareness yes
- `accessibility`: linear `prediction → fulfilment → witness → delta → certainty`.

## LN12-N09 — Ранкова передача влади

- `task_family`: authority-handoff reconstruction
- `difficulty`: 5/6
- `required`: yes
- `skill_target`: terminate reconstruction at the correct campaign boundary
- `knowledge_target`: LN-10
- `why_this_node_exists`: prevents scope leakage into the Roman trial.
- `player_prompt`: Сформулюйте останній реконструкційний блок кампанії: від ранкового переходу до передачі Пилатові. Зупиніться на порозі нового процесу.
- `source_scope_visible_to_player`: Mt 27:1–2; Mk 15:1; Lk 22:66–23:1; Jn 18:28–29.
- `response_mode`: structured reconstruction
- `accepted_answer`: source-faithful authority handoff ending at Pilate threshold; John’s route from Caiaphas to praetorium kept witness-specific; no substantive Pilate interrogation imported.
- `accepted_variants`: equivalent wording.
- `required_evidence`: LN-10 anchors.
- `rejected_answers`: Barabbas, Herod, scourging, verdict or crucifixion content as if part of LN-10/LN-12 scope.
- `rejection_reason`: mission-boundary leakage.
- `confidence`: T1/T2; legal reconstructions beyond text not graded T1.
- `success_feedback`: Кампанія закінчується саме на переході до нової влади.
- `partial_feedback`: correct handoff but scope leakage flagged.
- `failure_feedback`: mark threshold verse and remove later material.
- `hints`: authority-handoff grammar; H6 passage anchors; H7 guided threshold.
- `on_correct`: N10
- `on_partial`: N10 with scope flag
- `on_incorrect`: correction
- `on_hint_threshold`: guided
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: boundary skill reused in later campaigns
- `mastery`: scope discipline / authority transition yes
- `accessibility`: linear `prior authority → transport/custody → receiving authority → threshold`.

## LN12-N10 — Аудит текстологічних приміток

- `task_family`: textual-variant audit
- `difficulty`: 5/6
- `required`: yes
- `skill_target`: attach TX1 before final prose is graded
- `knowledge_target`: inherited campaign variants
- `why_this_node_exists`: final reconstruction must not silently erase material textual variation.
- `player_prompt`: Перевірте свій чернетковий висновок і позначте всі твердження, де раніше в кампанії був активний `TX1`.
- `source_scope_visible_to_player`: campaign TX1 register.
- `response_mode`: audit / classification
- `accepted_answer`: at minimum Mark cock-crow wording and Luke 22:43–44 treated according to policy; any other previously-registered variant retained if used in final claims.
- `accepted_variants`: wording may differ by translation.
- `required_evidence`: inherited TEXTUAL_VARIANT_POLICY and mission flags.
- `rejected_answers`: treating responsible translation omission/bracketing as player error.
- `rejection_reason`: violates textual-variant policy.
- `confidence`: TX1 adjunct to underlying T1/T2 claim.
- `success_feedback`: Варіантні місця не приховано й не перетворено на пастку для користувача.
- `partial_feedback`: missing one active variant.
- `failure_feedback`: list affected mission IDs, not answer text.
- `hints`: mission IDs; passage range; H6 exact references; H7 guided annotations.
- `on_correct`: N11
- `on_partial`: N11 with variant flag
- `on_incorrect`: correction
- `on_hint_threshold`: guided
- `optional_evidence_unlock`: N17
- `later_retrieval_effect`: TX1 awareness retained globally
- `mastery`: textual-criticism transparency / application yes
- `accessibility`: TX1 always announced in words; never icon/color only.

## LN12-N11 — Знайдіть хибну гармонізацію

- `task_family`: error detection / dispute branch
- `difficulty`: 6/6
- `required`: yes
- `skill_target`: detect reconstruction stronger than source evidence
- `knowledge_target`: campaign safeguards
- `why_this_node_exists`: verifies the player can critique a polished but overconfident retelling.
- `player_prompt`: Серед кількох запропонованих реконструкцій знайдіть ту, що містить принаймні три джерельні помилки: universalized witness detail, unsupported exact chronology, or hidden TX1.
- `source_scope_visible_to_player`: LN-11 evidence graph.
- `response_mode`: critique
- `accepted_answer`: identify each unsupported step and replace it with a sourced/qualified form.
- `accepted_variants`: any complete critique catching all seeded violations.
- `required_evidence`: provenance, chronology, TX1 rules.
- `rejected_answers`: choosing a reconstruction only because it “sounds less natural” without evidence.
- `rejection_reason`: critique must be source-based.
- `confidence`: T2/D1/TX1 as applicable.
- `success_feedback`: Ви відрізнили переконливу розповідь від доказово відповідальної реконструкції.
- `partial_feedback`: count remaining violations without revealing them all.
- `failure_feedback`: categorize error types and return to graph.
- `hints`: one category at a time; H6 affected mission IDs; H7 guided critique.
- `on_correct`: N12
- `on_partial`: N12 with audit weakness
- `on_incorrect`: correction
- `on_hint_threshold`: guided
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: false-harmonization skill retained globally
- `mastery`: critical-source reasoning / synthesis yes
- `accessibility`: every candidate reconstruction delivered as ordinary text with numbered claims.

## LN12-N12 — Повна джерельно цитована реконструкція

- `task_family`: final free reconstruction
- `difficulty`: 6/6
- `required`: yes
- `skill_target`: produce complete campaign synthesis
- `knowledge_target`: LN-01–LN-11
- `why_this_node_exists`: this is the core final-case performance.
- `player_prompt`: Складіть повну реконструкцію кампанії від приготування Пасхи до передачі Пилатові. Кожний суттєвий блок подайте у формі `твердження → свідок/свідки → уривок → confidence → qualification`. Там, де є `TX1` або `D1`, позначте це прямо.
- `source_scope_visible_to_player`: full evidence package.
- `response_mode`: structured free response
- `accepted_answer`: any complete reconstruction that covers all ten narrative stages, preserves witness provenance, includes citations, retains TX1 where relevant, labels uncertainty, respects authority boundary, and does not invent exact harmonized microchronology.
- `accepted_variants`: multiple responsible reconstructions explicitly allowed.
- `required_evidence`: minimum one adequate source anchor per stage; witness-specific details individually sourced.
- `rejected_answers`: uncited universal assertions; invented exact chronology; hidden textual variants; scope leakage; unsupported identities/motives.
- `rejection_reason`: final synthesis must not exceed evidence.
- `confidence`: mixed T1/T2/TX1/D1 explicitly represented.
- `success_feedback`: Фінальна реконструкція доказово захищена.
- `partial_feedback`: return a claim-level audit showing which blocks pass and which need correction; do not erase successful work.
- `failure_feedback`: reopen only failed stages and preserve accepted sections.
- `hints`: H1 structure; H2 stage names; H3 source families; H4 confidence types; H5 incomplete edge; H6 exact passage anchors; H7 guided template with mastery marked guided.
- `on_correct`: N13
- `on_partial`: correction loop then N13
- `on_incorrect`: targeted stage repair
- `on_hint_threshold`: guided completion allowed
- `optional_evidence_unlock`: all remaining optional nodes
- `later_retrieval_effect`: final mastery profile generated
- `mastery`: synthesis / application / citation / independent-vs-guided recorded; spaced retrieval yes
- `accessibility`: canonical nonvisual format is the structured text record itself; any future visual board is equivalent, not superior.

## LN12-N13 — Межі певності

- `task_family`: uncertainty statement / free response
- `difficulty`: 6/6
- `required`: yes
- `skill_target`: articulate what cannot responsibly be claimed
- `knowledge_target`: D1 and source boundaries
- `why_this_node_exists`: a final investigation is incomplete if it only lists conclusions and never states limits.
- `player_prompt`: Назвіть щонайменше чотири межі певності цієї кампанії та поясніть, чому гра не має права перетворити їх на T1.
- `source_scope_visible_to_player`: campaign uncertainty register.
- `response_mode`: free response
- `accepted_answer`: any four valid boundaries, e.g. exact merged minute-by-minute chronology; identity of Mark’s young man; personally naming beloved disciple from that passage alone; legal/procedural reconstructions beyond explicit wording; exact universalization of witness-specific details; textual-variant-sensitive wording without qualification.
- `accepted_variants`: equivalent evidence-based limits.
- `required_evidence`: source model and campaign policies.
- `rejected_answers`: “нічого не можна знати”; limits unrelated to corpus.
- `rejection_reason`: uncertainty must be precise, not global skepticism.
- `confidence`: D1/T1-boundary reasoning.
- `success_feedback`: Ви позначили не лише те, що знаємо, а й де знання закінчується.
- `partial_feedback`: valid limits counted; ask for missing categories.
- `failure_feedback`: show categories, not full answers.
- `hints`: chronology; identity; legal context; textual variants.
- `on_correct`: N14
- `on_partial`: N14 with uncertainty weakness
- `on_incorrect`: guided correction
- `on_hint_threshold`: guided
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: uncertainty reasoning reused globally
- `mastery`: epistemic discipline / synthesis yes
- `accessibility`: plain text list with explicit confidence labels.

## LN12-N14 — Захист висновку

- `task_family`: oral/written defence simulation
- `difficulty`: 6/6
- `required`: yes
- `skill_target`: defend reconstruction against evidence-based challenge
- `knowledge_target`: entire campaign
- `why_this_node_exists`: converts final answer from passive summary into examinable reasoning.
- `player_prompt`: Дайте коротку відповідь на п’ять заперечень до вашої реконструкції. Кожну відповідь обґрунтуйте джерелом або чесною межею певності.
- `source_scope_visible_to_player`: final reconstruction + evidence map.
- `response_mode`: structured defence
- `accepted_answer`: responses that either cite adequate evidence, narrow an overclaim, or explicitly concede D1/TX1 where appropriate.
- `accepted_variants`: multiple valid formulations.
- `required_evidence`: claim-level anchors.
- `rejected_answers`: authority-by-assertion, denominational prestige, or “так прийнято” without source relevance.
- `rejection_reason`: final mastery is evidentiary, not rhetorical.
- `confidence`: per claim.
- `success_feedback`: Справу завершено: висновок не лише сформульований, а й витримує джерельну перевірку.
- `partial_feedback`: show which defences were adequate.
- `failure_feedback`: reopen challenged claim and its provenance.
- `hints`: challenge category; witness; passage; confidence; H7 model reasoning.
- `on_correct`: mission complete
- `on_partial`: mission complete with review queue
- `on_incorrect`: repair loop; completion remains possible through guided route
- `on_hint_threshold`: guided completion
- `optional_evidence_unlock`: N15–N17
- `later_retrieval_effect`: generates post-campaign spaced-review queue
- `mastery`: final synthesis / defence / independent-vs-guided captured
- `accessibility`: objections delivered as numbered text; speech is optional, typed response always equivalent.

---

## Optional nodes

### LN12-N15 — Provenance stress test

- `task_family`: optional evidence audit
- `difficulty`: 6/6
- `required`: no
- `player_prompt`: Перевірте 12 witness-specific деталей і для кожної назвіть точного свідка та уривок.
- `accepted_answer`: provenance-correct mapping.
- `confidence`: T1.
- `branch_effect`: improves witness-provenance mastery and can clear N02/N07 weakness.
- `accessibility`: linear records only.

### LN12-N16 — Два відповідальні варіанти реконструкції

- `task_family`: dispute branch / comparative synthesis
- `difficulty`: 6/6
- `required`: no
- `player_prompt`: Створіть дві різні, але джерельно відповідальні реконструкції одного спірного мікропорядку та вкажіть спільні факти і межу, через яку гра не може обрати одну як єдину правильну.
- `accepted_answer`: any two reconstructions that differ only where D1 permits and preserve the same T1/T2 anchors.
- `confidence`: D1-aware synthesis.
- `branch_effect`: strengthens anti-false-harmonization mastery.
- `accessibility`: text-only comparison fully sufficient.

### LN12-N17 — TX1 translation check

- `task_family`: optional textual-variant comparison
- `difficulty`: 5/6
- `required`: no
- `player_prompt`: Порівняйте два відповідальні переклади в одному з активних `TX1` місць і поясніть, чому різниця не повинна перетворюватися на помилку користувача.
- `accepted_answer`: identifies the variant-sensitive wording and applies the canonical policy correctly.
- `confidence`: TX1 adjunct.
- `branch_effect`: improves textual-variant mastery.
- `accessibility`: translations presented as ordinary labelled text.

## 7. Failure recovery routes

- No failure state ends the campaign permanently.
- Unsupported claim → reopen exact source scope → player edits only that claim.
- Provenance error → show witness list without revealing the answer → retry.
- False harmonization → classify error type → rebuild only affected edge/order.
- Missing TX1 → variant note becomes visible before regrading.
- Scope leakage → mark campaign boundary and ask player to remove later Roman-trial material.
- Repeated difficulty → guided mode remains available; completion is allowed but mastery records guided evidence rather than independent mastery.

## 8. Completion conditions

Mission completes when:

1. N01–N14 are traversed;
2. the final reconstruction covers all ten narrative stages;
3. every graded witness-specific claim has provenance;
4. at least one explicit uncertainty statement is present;
5. active TX1 material used by the player is qualified;
6. the reconstruction does not claim an unsupported exact merged chronology;
7. the authority-handoff boundary at Pilate is respected;
8. all failed required nodes have been repaired or completed through guided mode.

### Perfect-investigation conditions

- all required nodes completed independently;
- N15–N17 completed;
- zero unresolved provenance violations;
- all seeded false-harmonization errors detected;
- prediction→fulfilment links independently retrieved;
- all active TX1 notes correctly attached;
- at least four valid uncertainty boundaries articulated;
- final reconstruction contains no scope leakage.

Perfect status is a knowledge-performance marker only. It never represents faith, holiness or spiritual worth.

## 9. Completion synthesis

A responsible reconstruction of the «Остання ніч» does not require flattening four Gospel witnesses into one undocumented transcript. The campaign teaches a stricter method: establish direct claims; keep every distinctive detail attached to its witness; compare texts only where comparison itself supports the conclusion; preserve local chronology where a witness gives it; mark textual variation before grading; distinguish prediction from fulfilment; identify transfers of authority; and state where exact chronology or identity remains uncertain.

The player should leave the pilot able to say both **«ось що текст прямо дає»** and **«ось де я не маю права говорити сильніше за текст»**. That epistemic discipline is a core mechanic of Scripture Archive, not an editorial footnote.

## 10. Accessibility specification

The canonical representation of LN-12 is text-first.

- All ordering supports numeric ordering and move-up/move-down controls.
- Every evidence relation has a linear form: `claim → witness → passage → confidence → qualification`.
- Every chronology relation has a linear form: `witness → prior → next → certainty`.
- Every prediction→fulfilment relation has a linear form: `prediction → fulfilment → witness → delta → certainty`.
- Every TX1 note is spoken/read as text and never signalled by icon or colour alone.
- No task requires drag-and-drop, pointer precision, visual spatial memory, colour recognition or reading a graphical timeline.
- A future evidence board may exist, but the nonvisual text representation is canonically equivalent and must expose the same information and editing operations.
- Screen-reader feedback announces: node result; source adequacy; confidence; qualification; mastery effect; next available action.
- Speech input may be offered in a future implementation but typed/keyboard response is always a complete equivalent.

## 11. Branch integrity audit

- Required path has 14 nodes and no dead end.
- Every incorrect route returns to the failed claim/node after targeted source work.
- Optional nodes alter mastery/evidence depth and are not cosmetic.
- Hints lower independence confidence but never block campaign completion.
- Partial success preserves already-correct reconstruction sections.
- Final completion is reachable through independent or guided routes.

## 12. Source-audit conclusion

`SOURCE_AUDITED` is granted because LN-12 introduces no new answer-bearing narrative claims beyond the already audited LN-01–LN-10 corpus. Its new graded content consists of provenance, comparison, reconstruction and uncertainty operations over those inherited claims. All synthesis rules are constrained by the existing T1/T2/C1/I1/D1/TX1 model and the LN-11 provenance-aware evidence graph.

**Mission status:** `MISSION_COMPLETE / SOURCE_AUDITED`.
