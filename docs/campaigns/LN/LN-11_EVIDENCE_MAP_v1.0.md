# LN-11 — Карта доказів

**Campaign:** LN — «Остання ніч»  
**Status:** `MISSION_COMPLETE / SOURCE_AUDITED`  
**Schema:** CONTENT_NODE_SCHEMA v1.1  
**Date:** 2026-08-18

## 1. Mission identity

- `mission_id`: LN-11
- `campaign_id`: LN
- `title`: Карта доказів
- `mission_role`: synthesis / retrieval / evidence-graph investigation
- `estimated_time`: 45–70 minutes
- `difficulty`: 5/6

## 2. Player promise

Після завершення гравець зможе зібрати матеріал LN-01–LN-10 у єдину доказову систему без вигаданих зв’язків: відрізняти подію від свідчення про подію; прив’язувати кожне твердження до конкретного Євангелія й уривка; позначати тип зв’язку між доказами; зберігати окремими прямий текст, порівняння, текстологічну примітку та межу певності; бачити, де передбачення переходить у виконання, де локальна хронологія є прямою, а де міжєвангельська послідовність лишається невизначеною.

## 3. Learning objectives

1. Пригадати 10 попередніх місій як один доказовий корпус, не повторюючи їх поелементно.
2. Побудувати лінійний каркас подій: приготування → стіл → зрадник → попередження Петрові → Гефсиманія → арешт → Анна/Каяфа → свідчення/звинувачення → три зречення → ранок/передача Пилатові.
3. Відокремити `event node` від `witness claim node`: подія може мати кілька свідків, але конкретне формулювання належить конкретному тексту.
4. Використати типи зв’язків: `supports`, `fulfils`, `local-order`, `contrast`, `same-event`, `authority-handoff`, `textual-variant`, `uncertainty-boundary`.
5. Відновити щонайменше два prediction→fulfilment ланцюги без підказки: зречення Петра та розсіяння/втеча учнів.
6. Встановити witness provenance для деталей, які легко помилково універсалізувати: Петро та Іван у Лк 22:8; Малх у Ів 18:10; праве вухо та зцілення у Лк 22:50–51; Анна перший у Ів 18:13; денна межа ради у Лк 22:66; ранкове передання до Пилата у синоптиків/Івана.
7. Позначити текстологічні вузли `TX1`, уже відкриті в кампанії: Мк 14:30/14:72 щодо співу півня; Лк 22:43–44; інші варіантні місця, якщо вони були явно зафіксовані в попередніх місіях.
8. Встановити місця, де гра не має права вимагати єдину похвилинну міжєвангельську хронологію.
9. Виявляти хибну гармонізацію як окремий тип помилки доказової карти.
10. Підготувати повний доказовий пакет для LN-12 — фінальної реконструкції.

`mastery_tags`: synthesis; evidence-graph; witness-provenance; source-citation; chronology-boundaries; anti-false-harmonization; prediction-fulfilment; textual-variants; uncertainty; authority-handoff; retrieval.

`retrieval_targets`: LN-01 through LN-10.

`future_repetition_hooks`: any later campaign using parallel witnesses, predictions, custody transitions, textual variants or disputed chronology should retrieve the same evidence-graph grammar.

## 4. Source model

### Primary Scripture / inherited audited corpus

LN-11 introduces no new narrative corpus. It reuses the already source-audited evidence of LN-01–LN-10:

- LN-01: Mt 26:17–19; Mk 14:12–16; Lk 22:7–13.
- LN-02: Mt 26:20,26–29; Mk 14:17,22–25; Lk 22:14–20; optional 1 Cor 11:23–26.
- LN-03: Mt 26:21–25; Mk 14:18–21; Lk 22:21–23; Jn 13:18–30; optional Ps 41:9.
- LN-04: Mt 26:30–35; Mk 14:26–31; Lk 22:31–34; Jn 13:36–38.
- LN-05: Mt 26:36–46; Mk 14:32–42; Lk 22:39–46.
- LN-06: Mt 26:47–56; Mk 14:43–52; Lk 22:47–53; Jn 18:2–12.
- LN-07: Jn 18:12–24; Mt 26:57–58; Mk 14:53–54; Lk 22:54–65.
- LN-08: Mt 26:59–68; Mk 14:55–65; Lk 22:66–71; Jn 18:19–24 as contrast.
- LN-09: Mt 26:69–75; Mk 14:66–72; Lk 22:54–62; Jn 18:15–18,25–27.
- LN-10: Mt 27:1–2; Mk 15:1; Lk 22:66–23:1; Jn 18:28–29.

### Source audit method

- Every answer-bearing narrative claim in LN-11 must point back to a claim already marked `SOURCE_AUDITED` in LN-01–LN-10.
- LN-11 may combine those claims only through explicit relation types. A relation is `T2` only when it follows directly from comparing audited scriptural claims without an external premise.
- No new historical/legal reconstruction is introduced.
- Any proposed edge that requires an unstated exact time, motive, institutional procedure or identity must be rejected or labelled `C1/I1/D1` rather than silently promoted to `T1/T2`.

### Disputed / limited-certainty points

- Exact harmonized minute-by-minute chronology across all four Gospels is not established (`D1`).
- The identity of the unnamed beloved disciple in Jn 13 in that passage is not graded as a directly named personal identity (`T1` boundary).
- The unnamed young man in Mk 14:51–52 is not assigned an identity (`T1` boundary).
- Legal/procedural reconstructions beyond the explicit Gospel wording are outside this mission unless later supported by external sources (`C1/I1/D1`).
- `TX1` notes remain attached to the claim they qualify and cannot be detached from grading context.

## 5. Narrative shell

### Opening brief

Десять справ закрито, але архів ще не готовий до фінального висновку. У вас сотні окремих фактів, посилань, застережень і зв’язків. Завдання цієї місії — не знайти нову сенсацію, а побудувати доказову карту так, щоб жоден зв’язок не був сильнішим за джерело, на якому він стоїть.

### Case question

**Яку доказову структуру подій від приготування Пасхи до ранкової передачі Пилатові можна побудувати з LN-01–LN-10, якщо кожен вузол зберігає свідка, джерело, тип зв’язку та межу певності?**

### Known facts at start

- усі десять попередніх місій завершені;
- кожна вже має source-audited claims;
- частина подій має кілька паралельних свідків;
- частина деталей належить тільки одному свідкові;
- у кампанії вже існують `TX1`, prediction→fulfilment і authority-handoff зв’язки;
- платформа не визначена, тому карта описується як логічна структура, а не як конкретний UI.

### Unknowns to resolve

- які вузли справді є центральними подіями, а які — лише окремими свідченнями;
- які зв’язки можна назвати прямими;
- де потрібен `T2`, `D1` або `TX1`;
- які хибні ребра треба заборонити;
- чи достатньо карти для фінальної реконструкції LN-12.

## 6. Evidence-map grammar

Карта складається з двох рівнів:

1. `event node` — нейтральна назва події/етапу, що не містить зайвих авторсько-специфічних деталей;
2. `witness claim node` — конкретне твердження з конкретним джерелом, confidence і за потреби `TX1`.

Дозволені relation types:

- `supports` — уривок прямо підтримує claim/event;
- `same-event` — два witness claims описують той самий широкий етап без вимоги однакового формулювання;
- `fulfils` — пізніший claim виконує раніше зафіксоване передбачення;
- `local-order` — порядок прямий лише всередині конкретного свідка;
- `contrast` — свідки дають різний набір деталей або формулювань;
- `authority-handoff` — перехід від однієї влади/місця утримання до іншої;
- `textual-variant` — `TX1` qualification attached to a claim;
- `uncertainty-boundary` — межа, за якою точніший висновок не підтриманий.

Заборонене relation type: `therefore-exact-harmonized-order`, якщо його не встановлює сам текст.

## 7. Flow

`entry_node`: LN11-N01  
Required route: N01 → N02 → N03 → N04 → N05 → N06 → N07 → N08 → N09 → N10 → N11 → N12 → N13 → N14.  
Optional nodes: N15, N16, N17.  
Wrong answers route to source/provenance checks; no dead ends.

---

## LN11-N01 — Відновіть десять етапів

- `task_family`: delayed retrieval / ordering
- `difficulty`: 3/6
- `required`: yes
- `skill_target`: retrieve campaign macrostructure without reopening every answer
- `knowledge_target`: LN-01–LN-10 sequence
- `why_this_node_exists`: creates the neutral event skeleton before witness-specific details are attached.
- `player_prompt`: Розташуйте десять уже розслідуваних етапів у порядку кампанії, використовуючи лише назви місій.
- `source_scope_visible_to_player`: memory; mission list available after hint threshold.
- `response_mode`: ordering
- `accepted_answer`: Приготування → За столом → Зрадник за столом → Попередження Петрові → Гефсиманія: молитва і сон → Арешт → Анна, Каяфа і нічний допит → Свідчення і звинувачення → Три зречення → Ранок.
- `accepted_variants`: equivalent labels preserving mission order.
- `required_evidence`: canonical campaign sequence, not an asserted exact inter-Gospel chronology.
- `rejected_answers`: treating the list itself as proof of exact minute-by-minute chronology.
- `rejection_reason`: campaign order is a design scaffold; several cross-witness micro-orders remain uncertain.
- `confidence`: internal canonical sequence; chronology claims still source-classified separately.
- `success_feedback`: Каркас відновлено. Тепер до нього можна приєднувати тільки ті зв’язки, які мають джерело.
- `partial_feedback`: accept nearly correct order but flag displaced mission for retrieval.
- `failure_feedback`: show first/last anchors and reopen mission titles.
- `hints`: H1 goal; H2 first five titles; H3 second five; H6 full list; H7 guided order.
- `on_correct`: N02
- `on_partial`: N02 with weak sequence mastery
- `on_incorrect`: correction route
- `later_retrieval_effect`: weak sequence returns in LN-12
- `mastery`: campaign-structure / recall / spaced retrieval yes
- `accessibility`: linear numbered list; move-up/move-down or numeric ordering; no drag-only interaction.

## LN11-N02 — Подія чи свідчення?

- `task_family`: classification
- `difficulty`: 4/6
- `required`: yes
- `skill_target`: distinguish neutral event node from witness-specific claim
- `knowledge_target`: evidence-map two-level model
- `player_prompt`: Класифікуйте приклади як `event node` або `witness claim node`: «Арешт»; «Іван називає слугу Малхом»; «Гефсиманія»; «Лука говорить про праве вухо і зцілення»; «Ранкове передання Пилатові».
- `source_scope_visible_to_player`: LN-05/LN-06/LN-10 summaries.
- `response_mode`: classification
- `accepted_answer`: event: Арешт, Гефсиманія, Ранкове передання Пилатові; witness claims: Іван/Малх, Лука/праве вухо+зцілення.
- `required_evidence`: LN-06 and LN-10 audited claims.
- `rejected_answers`: placing witness-specific wording into a neutral event label.
- `rejection_reason`: would erase provenance and invite false universalization.
- `confidence`: T1 for witness claims; map classification is design metadata.
- `success_feedback`: Рівні карти розділено: подія не поглинає специфіку свідка.
- `failure_feedback`: якщо твердження містить «за Матвієм/Марком/Лукою/Іваном» або унікальну деталь, воно майже напевно є witness claim.
- `on_correct`: N03
- `on_incorrect`: provenance tutorial branch
- `mastery`: evidence-graph / application
- `accessibility`: each item announced with classification choices.

## LN11-N03 — Побудуйте provenance spine

- `task_family`: evidence linking
- `difficulty`: 4/6
- `required`: yes
- `skill_target`: attach claims to witnesses and passages
- `knowledge_target`: representative provenance anchors across campaign
- `player_prompt`: Приєднайте кожну деталь до її прямого джерела: 1) Петро та Іван послані готувати Пасху; 2) чоловік з посудиною води; 3) умочений шматок переданий Юді; 4) Малх; 5) праве вухо та зцілення; 6) Анна перший; 7) «коли настав день» перед радою.
- `response_mode`: evidence linking
- `accepted_answer`: 1 Lk 22:8; 2 Mk 14:13 and Lk 22:10; 3 Jn 13:26; 4 Jn 18:10; 5 Lk 22:50–51; 6 Jn 18:13; 7 Lk 22:66.
- `accepted_variants`: precise verse ranges that contain the same explicit claim.
- `required_evidence`: cited passages, inherited from source-audited missions.
- `rejected_answers`: assigning Malchus by name to Matthew/Mark/Luke; assigning Peter-and-John naming to Mark; assigning Annas-first to Synoptics as their explicit wording.
- `rejection_reason`: imports knowledge across witnesses.
- `confidence`: T1 per cited claim.
- `success_feedback`: Provenance spine locked.
- `partial_feedback`: each wrong link opens only the relevant source pair.
- `failure_feedback`: trace the claim back to the mission where it was first source-audited.
- `on_correct`: N04
- `on_partial`: targeted repair
- `mastery`: witness-provenance / application / spaced retrieval yes
- `accessibility`: linear `claim → choose witness → choose verse` workflow.

## LN11-N04 — Передбачення про Петра → виконання

- `task_family`: prediction-to-fulfilment synthesis
- `difficulty`: 4/6
- `required`: yes
- `skill_target`: connect earlier prediction evidence to later fulfilment without hindsight rewriting
- `knowledge_target`: LN-04 → LN-09
- `player_prompt`: Створіть зв’язок `fulfils` між попередженням Петрові та сценою зречень. Яке вузьке ядро можна відповідально з’єднати через усі свідчення?
- `response_mode`: structured free response / evidence linking
- `accepted_answer`: Ісус передбачив три зречення Петра до півнячого маркера; пізніша сцена містить три епізоди зречення і спів півня; Mark-specific first/second-crow wording remains `TX1` qualified.
- `required_evidence`: LN-04 corpus; LN-09 corpus.
- `rejected_answers`: forcing all four Gospels to have identical accusers, wording or identical rooster formulation.
- `rejection_reason`: fulfilment core is shared; witness-specific deltas remain distinct.
- `confidence`: T2 for cross-passage fulfilment relation; underlying claims T1; Mark variant `TX1`.
- `success_feedback`: Зв’язок виконання створено без стирання різниць свідків.
- `on_correct`: N05
- `on_incorrect`: prediction/fulfilment delta matrix repair
- `later_retrieval_effect`: LN-12 must retrieve this relation before final chronology.
- `mastery`: prediction-fulfilment / synthesis / spaced retrieval yes
- `accessibility`: linear `prediction → fulfilment → witness delta → TX1` presentation.

## LN11-N05 — Розсіяння/втеча учнів

- `task_family`: prediction-to-fulfilment synthesis
- `difficulty`: 5/6
- `required`: yes
- `skill_target`: connect prediction with later event while preserving witness scope
- `knowledge_target`: LN-04/LN-06 relationship
- `player_prompt`: Який раніше відкритий прогноз можна зв’язати з тим, що під час арешту учні залишили Ісуса й утекли? Позначте зв’язок і його межу.
- `accepted_answer`: warning about the disciples falling away/scattering is connected to arrest-scene flight as fulfilment evidence; exact wording/provenance must remain witness-specific.
- `required_evidence`: Mt 26:31–35 and/or Mk 14:27–31; Mt 26:56 / Mk 14:50 for flight.
- `rejected_answers`: claiming every disciple’s exact movement is narrated identically by all witnesses.
- `rejection_reason`: exceeds direct evidence.
- `confidence`: T2 relation from explicit passages.
- `success_feedback`: Другий prediction→fulfilment edge додано.
- `on_correct`: N06
- `on_incorrect`: reopen LN-04 and LN-06 anchors
- `mastery`: prediction-fulfilment / synthesis
- `accessibility`: relation announced in plain text.

## LN11-N06 — Гефсиманія → арешт: межа переходу

- `task_family`: event-boundary linking
- `difficulty`: 4/6
- `required`: yes
- `skill_target`: identify boundary between adjacent missions
- `knowledge_target`: LN-05 ending and LN-06 opening
- `player_prompt`: Вкажіть останній надійний перехідний зв’язок від молитви/сну до арешту без додавання вигаданої паузи або точного часу.
- `accepted_answer`: Jesus announces that the betrayer is at hand/has arrived; the arresting party with Judas approaches/arrives; this supports an adjacency edge, not an exact minute interval.
- `required_evidence`: Mt 26:45–47; Mk 14:41–43; Lk 22:45–47 as witness-specific sequences.
- `rejected_answers`: exact elapsed minutes; universalized wording.
- `confidence`: T2 for adjacency across explicit local sequences; exact interval D1.
- `success_feedback`: Межу місій з’єднано без вигаданого таймера.
- `on_correct`: N07
- `mastery`: chronology-boundaries / application
- `accessibility`: text pair with relation label.

## LN11-N07 — Арешт: збережіть специфічні деталі

- `task_family`: provenance contrast
- `difficulty`: 4/6
- `required`: yes
- `skill_target`: resist detail universalization
- `knowledge_target`: LN-06 witness matrix
- `player_prompt`: Побудуйте три окремі claim nodes навколо поранення слуги: хто називає нападника; хто називає слугу; хто уточнює праве вухо і зцілення.
- `accepted_answer`: John names Simon Peter and Malchus (Jn 18:10); Luke specifies the right ear and healing (Lk 22:50–51); these details must not be merged into a claim that each Gospel states all of them.
- `required_evidence`: Jn 18:10; Lk 22:50–51.
- `confidence`: T1 per claim; combined comparison T2.
- `success_feedback`: Унікальні деталі залишилися у власних свідків.
- `on_correct`: N08
- `mastery`: witness-provenance / synthesis
- `accessibility`: three linear claim records.

## LN11-N08 — Анна → Каяфа: local-order only

- `task_family`: chronology classification
- `difficulty`: 5/6
- `required`: yes
- `skill_target`: distinguish local chronology from universal chronology
- `knowledge_target`: LN-07 sequence safeguard
- `player_prompt`: Який тип ребра дозволено між «Анна» і «Каяфа» в Ів 18:13,24? Чи можна цим ребром змусити Матвія, Марка і Луку сказати те саме?
- `accepted_answer`: `local-order` within John: Jesus is led first to Annas, then sent bound to Caiaphas; no, this does not become explicit Synoptic wording.
- `required_evidence`: Jn 18:13,24; contrast LN-07 Synoptic passages.
- `rejected_answers`: universal exact order attributed equally to all four as T1.
- `rejection_reason`: anti-false-harmonization violation.
- `confidence`: T1 inside John; cross-witness universalization D1/unsupported.
- `success_feedback`: Локальний порядок збережено як локальний.
- `on_correct`: N09
- `mastery`: local-chronology / application
- `accessibility`: relation read as `John: Annas → Caiaphas; scope: John only`.

## LN11-N09 — День/ніч: поставте uncertainty boundary

- `task_family`: uncertainty mapping
- `difficulty`: 5/6
- `required`: yes
- `skill_target`: encode certainty limit rather than force single chronology
- `knowledge_target`: Luke 22:66 daybreak boundary vs night material in other witnesses
- `player_prompt`: Додайте на карту межу певності біля переходу LN-07/LN-08/LN-10. Що Лука прямо фіксує, а що не можна чесно перетворити на єдину похвилинну схему всіх Євангелій?
- `accepted_answer`: Luke explicitly places the council gathering at daybreak (Lk 22:66); exact harmonized timing/structure of all night and morning proceedings across all Gospels is not directly supplied.
- `required_evidence`: Lk 22:66; LN-07/LN-08/LN-10 source notes.
- `confidence`: T1 for Luke marker; D1 for exact harmonized clock/procedural reconstruction.
- `success_feedback`: Карта тепер показує не тільки знання, а й межу знання.
- `on_correct`: N10
- `mastery`: uncertainty / synthesis
- `accessibility`: explicit textual marker `[BOUNDARY: exact cross-witness chronology not established]`.

## LN11-N10 — `TX1` не можна губити

- `task_family`: textual-variant audit
- `difficulty`: 5/6
- `required`: yes
- `skill_target`: keep textual-variant qualification attached through synthesis
- `knowledge_target`: Mark rooster wording; Luke 22:43–44
- `player_prompt`: Позначте два gameplay-relevant `TX1` вузли й поясніть, чому їх не можна перетворити на звичайну «правильно/неправильно» відповідь без примітки.
- `accepted_answer`: Mark 14:30/72 first/second-crow wording has manuscript variation; Luke 22:43–44 has significant manuscript variation/omission in part of the tradition. A responsible translation reflecting either attested form cannot be treated as player error.
- `required_evidence`: LN-04/LN-09 textual-variant notes; LN-05 textual-variant notes.
- `rejected_answers`: deleting variant notes after synthesis; declaring one responsible translation invalid merely because it follows another textual form.
- `confidence`: underlying textual claims `T1+TX1`; transmission status as audited textual-variant metadata.
- `success_feedback`: `TX1` flags survived the map merge.
- `on_correct`: N11
- `mastery`: textual-variants / application
- `accessibility`: TX1 always spoken and text-labeled, never icon/color only.

## LN11-N11 — Виявте хибну гармонізацію

- `task_family`: claim audit / contradiction detection
- `difficulty`: 5/6
- `required`: yes
- `skill_target`: reject unsupported merged claims
- `knowledge_target`: anti-false-harmonization across LN campaign
- `player_prompt`: Позначте твердження, які НЕ можна зберегти як `T1` у такому вигляді: A) «Усі чотири Євангелія називають слугу Малхом»; B) «Лука прямо каже, що Ісуса спочатку повели до Анни»; C) «У Луки рада збирається, коли настав день»; D) «Іван описує ранковий перехід від Каяфи до преторію»; E) «Усі свідки дають однакову точну послідовність усіх нічних подій».
- `accepted_answer`: reject A, B, E; accept C and D within their witness scope.
- `required_evidence`: Jn 18:10,13,24,28; Lk 22:66; contrast Synoptic arrest/custody passages.
- `rejection_reason`: A/B/E import or universalize witness-specific material.
- `confidence`: T1 for C/D; unsupported/D1 for rejected universalizations.
- `success_feedback`: Хибні ребра видалено.
- `on_correct`: N12
- `on_incorrect`: provenance correction branch
- `mastery`: claim-audit / synthesis / spaced retrieval yes
- `accessibility`: each statement individually numbered with accept/reject control.

## LN11-N12 — Authority handoff: до Пилата

- `task_family`: authority-transition synthesis
- `difficulty`: 4/6
- `required`: yes
- `skill_target`: map custody/procedural transition without swallowing the next trial
- `knowledge_target`: LN-10 authority-handoff pattern
- `player_prompt`: Побудуйте останній обов’язковий перехід карти: попередня релігійна влада/місце → транспортування → Пилат/преторій. Де карта LN-11 повинна зупинитися?
- `accepted_answer`: morning council/leadership or departure from Caiaphas as witness-specific prior nodes → Jesus is bound/led/brought/handed over as each witness states → Pilate/governor’s headquarters; stop at threshold of substantive Roman accusation/interrogation, which belongs beyond LN-10/LN-11 scope.
- `required_evidence`: Mt 27:1–2; Mk 15:1; Lk 23:1; Jn 18:28–29.
- `rejected_answers`: adding Barabbas, Herod, scourging or final Roman verdict into current evidence-map scope.
- `confidence`: T1 per witness; T2 for narrow shared handoff core.
- `success_feedback`: Карта закриває кампанійний часовий коридор саме на порозі римського процесу.
- `on_correct`: N13
- `mastery`: authority-handoff / synthesis
- `accessibility`: plain text chain `prior authority → custody/transport → receiving authority → threshold`.

## LN11-N13 — Побудуйте лінійну карту доказів

- `task_family`: synthesis construction
- `difficulty`: 6/6
- `required`: yes
- `skill_target`: convert evidence graph into a nonvisual, auditable representation
- `knowledge_target`: all major campaign relations
- `player_prompt`: Створіть лінійну карту з щонайменше 12 ключових records. Кожен record повинен мати: `event/claim`, `witness`, `verse`, `confidence`, `relation-to-previous`, `TX1/uncertainty if applicable`.
- `response_mode`: structured synthesis
- `accepted_answer`: any map covering LN-01–LN-10 with at least one secure anchor per mission, at least two prediction/fulfilment links, at least one local-order edge, one authority-handoff edge, one TX1 marker and one uncertainty boundary; no unsupported universalization.
- `accepted_variants`: multiple valid maps are expected; scoring is structural/evidentiary, not exact wording.
- `required_evidence`: inherited audited corpus.
- `rejected_answers`: maps without provenance; maps that use campaign order as proof of exact Gospel chronology; maps that strip TX1/uncertainty flags.
- `rejection_reason`: synthesis must preserve evidentiary metadata.
- `confidence`: mixed per record; no global blanket confidence.
- `success_feedback`: Лінійна карта придатна для незалежного аудиту й не потребує візуального полотна.
- `partial_feedback`: missing category triggers targeted insertion, not mission reset.
- `failure_feedback`: system lists missing categories, never says merely «неправильно».
- `on_correct`: N14
- `on_partial`: repair missing evidence class
- `later_retrieval_effect`: map becomes LN-12 input packet
- `mastery`: evidence-graph / synthesis / independent mastery
- `accessibility`: this linear form is canonical-equivalent, not a reduced fallback.

## LN11-N14 — Coverage audit and handoff to final reconstruction

- `task_family`: final case audit
- `difficulty`: 6/6
- `required`: yes
- `skill_target`: audit evidence sufficiency and limits
- `knowledge_target`: readiness for LN-12
- `player_prompt`: Проведіть фінальний аудит карти. Підтвердьте або виправте: 1) усі 10 місій мають хоча б один anchor; 2) унікальні деталі мають provenance; 3) prediction→fulfilment не переписує prediction заднім числом; 4) TX1 збережені; 5) uncertainty boundaries видимі; 6) карта не містить римського процесу після порогу Пилата; 7) усі візуальні зв’язки мають текстовий еквівалент.
- `response_mode`: checklist audit + repair
- `accepted_answer`: all seven conditions satisfied after any repairs.
- `required_evidence`: completed map and prior mission specs.
- `rejected_answers`: declaring complete with missing provenance/TX1/accessibility or scope contamination.
- `confidence`: editorial synthesis over audited claims.
- `success_feedback`: Доказовий пакет готовий до LN-12. Ви не лише знаєте події — ви можете показати, звідки кожне твердження взялося і де закінчується певність.
- `on_correct`: mission complete → unlock LN-12
- `on_partial`: repair specific category
- `on_incorrect`: guided audit
- `mastery`: source-audit / synthesis / metacognition
- `accessibility`: checklist is keyboard-complete; every failure states exact missing record/category.

---

## Optional LN11-N15 — «Чи це справді сказано тут?»

- `task_family`: provenance stress test
- `difficulty`: 6/6
- `required`: no
- `player_prompt`: Отримайте п’ять правдивих біблійних деталей, але для кожної визначте, чи названа вона прямо саме у запропонованому Євангелії, чи знання імпортоване з паралельного тексту.
- `accepted_answer`: graded per witness; examples should reuse Peter/John naming, Malchus, Annas-first, right-ear/healing, Luke daybreak.
- `why_this_node_exists`: trains the difference between «true somewhere in Scripture» and «explicit in this witness».
- `mastery`: witness-provenance / synthesis
- `accessibility`: one claim at a time with source before/after comparison.

## Optional LN11-N16 — Видаліть одне надмірне ребро

- `task_family`: dispute/uncertainty branch
- `difficulty`: 6/6
- `required`: no
- `player_prompt`: Система навмисно вставляє одне ребро `exact-order` між двома cross-witness scenes. Знайдіть його, поясніть, чому воно надмірне, і замініть на `uncertainty-boundary` або witness-local edge.
- `accepted_answer`: any correctly identified unsupported exact cross-witness chronology with justified replacement.
- `confidence`: D1/unsupported edge replaced by honest scope.
- `mastery`: uncertainty / synthesis
- `accessibility`: erroneous edge identified by textual ID, not by visual position.

## Optional LN11-N17 — Аудит альтернативного перекладу

- `task_family`: textual-variant application
- `difficulty`: 6/6
- `required`: no
- `player_prompt`: Уявіть, що гравець користується відповідальним перекладом, де один із `TX1` уривків подано в дужках, примітці або коротшій формі. Чи повинна карта позначити його відповідь неправильною? Обґрунтуйте.
- `accepted_answer`: no; the map must preserve the textual-variant note and grade the proposition in a way compatible with responsible attested textual forms.
- `required_evidence`: campaign `TX1` policy and prior audited mission notes.
- `mastery`: textual-variants / application
- `accessibility`: variant explanation read in full text.

## 8. Failure recovery routes

- provenance error → reopen only the source mission/passage that owns the disputed claim;
- chronology overclaim → convert edge to witness-local or uncertainty-boundary, then continue;
- missing `TX1` → restore flag before grading proceeds;
- weak retrieval → allow hints but lower independent mastery confidence, never block mission completion;
- incomplete map → show missing evidence categories, not a generic failure state;
- accessibility failure in representation → mission cannot be considered complete until a linear equivalent exists.

No route resets the whole mission for one bad edge.

## 9. Completion conditions

Mission completes when:

1. neutral event skeleton covers LN-01–LN-10;
2. at least one source-audited anchor per prior mission is present;
3. witness-specific claims retain provenance;
4. at least two prediction→fulfilment relations are correctly built;
5. at least one local-order relation is scoped to its witness;
6. all campaign-relevant `TX1` markers included in the chosen evidence set remain attached;
7. at least one explicit uncertainty boundary is present;
8. authority-handoff to Pilate is mapped without entering the substantive Roman trial;
9. linear/nonvisual map is complete;
10. no unsupported exact harmonization survives final audit.

### Perfect investigation

All required conditions plus all optional nodes completed independently, no H6/H7 reveals, and the player can explain one rejected overclaim in their own words with citation.

## 10. Completion synthesis

Кампанія тепер має не просто послідовність сцен, а доказову модель. Події, свідчення, передбачення, виконання, локальні порядки, текстологічні варіанти й межі певності не зливаються в один «готовий переказ». Гравець бачить, що сильна реконструкція складається не з максимальної кількості деталей, а з максимально прозорого зв’язку між твердженням і джерелом.

LN-11 свідомо не формує остаточну розповідь від А до Я. Це завдання LN-12. Тут сформовано доказовий пакет, який LN-12 має використати без втрати provenance, `TX1` та uncertainty metadata.

## 11. Reusable design result established by LN-11

### Provenance-aware evidence graph

Для майбутніх synthesis-місій канонічно встановлено:

1. розділяти нейтральні `event nodes` і конкретні `witness claim nodes`;
2. кожен claim повинен мати `witness + passage + confidence`;
3. кожне ребро повинно мати явний relation type;
4. `local-order` ніколи автоматично не стає universal order;
5. `TX1` та uncertainty є частиною доказу, а не декоративною приміткою;
6. візуальна карта не є канонічнішою за лінійний текстовий еквівалент;
7. synthesis оцінюється за доказовою коректністю, а не за збігом з одним редакторським переказом.

## 12. Accessibility specification

- Уся місія проходиться без миші.
- Канонічний невізуальний формат record: `ID → event/claim → witness → verse → confidence → relation → qualification`.
- Будь-яка майбутня візуальна evidence board повинна мати синхронний лінійний список усіх вузлів і ребер.
- Переміщення вузлів, якщо буде реалізоване в UI, має дублюватися командами «перемістити вище/нижче», вибором parent/target ID або іншою keyboard-complete моделлю.
- Screen reader має оголошувати додавання/видалення edge, його тип, source claim, target claim і зміну mastery.
- `TX1`, `D1` та інші confidence/qualification ніколи не передаються тільки кольором, формою чи положенням.
- Немає часових обмежень на synthesis.
- Помилка оголошується конкретно: яке джерело/ребро/qualification відсутнє або суперечливе.

## 13. Source audit conclusion

`SOURCE_AUDITED` підтверджено на рівні LN-11, оскільки:

- місія не вводить нових історичних чи богословських claims;
- усі narrative anchors успадковані з LN-01–LN-10, які вже мають `SOURCE_AUDITED`;
- нові твердження LN-11 є або структурними правилами гри, або `T2` relations між раніше перевіреними `T1` claims;
- усі місця, де relation виходив би за прямий текст, явно обмежені `D1`/unsupported або віднесені до майбутнього `C1/I1` дослідження;
- `TX1` qualification не губиться при synthesis;
- accessibility equivalent визначений для кожного типу interaction.

**Final mission status:** `MISSION_COMPLETE / SOURCE_AUDITED`.
