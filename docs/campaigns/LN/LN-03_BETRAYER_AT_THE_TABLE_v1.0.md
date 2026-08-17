# LN-03 — Зрадник за столом

**Campaign:** LN — «Остання ніч»  
**Status:** `MISSION_COMPLETE / SOURCE_AUDITED`  
**Schema:** CONTENT_NODE_SCHEMA v1.1  
**Date:** 2026-08-17

## 1. Mission identity

- `mission_id`: LN-03
- `campaign_id`: LN
- `title`: Зрадник за столом
- `mission_role`: investigation / parallel-witness comparison / source-limit training
- `estimated_time`: 30–45 minutes
- `difficulty`: 3/6

## 2. Player promise

Після завершення гравець зможе реконструювати, що кожне з чотирьох Євангелій повідомляє про оголошення зради під час вечері; відрізняти спільне ядро свідчень від деталей окремого автора; показати, де Юда названий прямо, а де ні; і не створювати штучної точної хронології там, де тексти її не встановлюють.

## 3. Learning objectives

1. Порівняти Мт 26:21–25; Мк 14:18–21; Лк 22:21–23; Ів 13:18–30.
2. Відрізнити «один із вас» від прямої ідентифікації Юди.
3. Розрізнити синоптичну деталь спільної трапези/посудини та йоанівський знак із умоченим шматком.
4. Встановити реакцію учнів у кожному свідченні.
5. Виявити унікальні для Івана деталі: улюблений учень, жест Петра, переданий Юді шматок, нерозуміння інших, вихід Юди.
6. Навчитися маркувати межу певності щодо точного порядку паралельних епізодів.

`mastery_tags`: Gospel-parallels; evidence-classification; Judas; Last-Supper; chronology-limits; explicit-vs-inferred; source-citation.

`retrieval_targets`: LN-02 parallel-witness comparison; distinction T1/T2; translation-aware evidence handling.

`future_repetition_hooks`: LN-04/LN-05 may retrieve Judas departure and witness-specific details; arrest mission retrieves identity and betrayal trajectory.

## 4. Source model

### Primary Scripture
- Matthew 26:21–25
- Mark 14:18–21
- Luke 22:21–23
- John 13:18–30

### Secondary Scripture
- Psalm 41:9 only as an optional cross-reference for John 13:18; it is not required to solve the core case.

### Source audit notes
- Matthew explicitly names Judas in 26:25 and records his question to Jesus.
- Mark does not name Judas in 14:18–21; the betrayer is described as one of the Twelve and one dipping/eating with Jesus.
- Luke does not name Judas in 22:21–23; the betrayer's hand is with Jesus at the table and the disciples question who it could be.
- John explicitly identifies Judas in 13:26, after the beloved disciple asks at Peter's prompting; John then narrates Judas receiving the morsel, Satan entering him, Jesus' instruction, the other diners' misunderstanding, and Judas' immediate departure.
- The mission must not assert that the Synoptic dipping statement and John's giving of a dipped morsel are mechanically identical gestures or that all four accounts present every event in one recoverable minute-by-minute order.

### Disputed / limited-certainty points
- Exact harmonized ordering of the betrayal announcement relative to every other supper action across all four Gospels is not forced by this mission (`D1`).
- The identity of the unnamed «disciple whom Jesus loved» is not a required answer here; the passage itself does not name him (`T1` source-limit exercise).

## 5. Narrative shell

### Opening brief
У попередній справі ви дослідили трапезу. Тепер у матеріалах з'являється загроза зсередини: Ісус оголошує, що один із присутніх Його зрадить. Чотири свідчення передають спільне ядро, але не однаковий набір деталей. Ваше завдання — встановити, що можна довести кожним текстом окремо, а що стає видимим лише після зіставлення.

### Case question
**Що саме чотири Євангелія дозволяють встановити про оголошення та ідентифікацію зрадника за столом — і де закінчується текстова певність?**

### Known facts at start
- подія відбувається в контексті останньої вечері;
- Ісус знає про майбутню зраду;
- гравець має чотири паралельні корпуси свідчень.

### Unknowns to resolve
- чи всі чотири тексти прямо називають Юду;
- як реагують учні;
- які знаки/дії пов'язані з ідентифікацією;
- хто ставить пряме питання в кожному тексті;
- що відбувається після передачі шматка в Івана;
- чи можна безпечно створити одну точну хронологію всіх деталей.

## 6. Flow

`entry_node`: LN03-N01  
Required route: N01 → N02 → N03 → N04 → N05 → N06 → N07 → N08 → N09 → N10 → N11 → N12 → N13.  
Optional nodes: N14, N15.  
Incorrect evidence claims route to a targeted source re-check; no wrong answer creates a dead end.

---

## LN03-N01 — Зберіть корпус свідчень

- `task_family`: source selection
- `difficulty`: 1/6
- `required`: yes
- `skill_target`: source delimitation
- `knowledge_target`: four betrayal-at-table passages
- `why_this_node_exists`: prevents answering from memory without checking the assigned texts.
- `player_prompt`: Оберіть чотири уривки, які треба зіставити для цієї справи.
- `response_mode`: citation selection
- `accepted_answer`: Matthew 26:21–25; Mark 14:18–21; Luke 22:21–23; John 13:18–30.
- `rejected_answers`: passages outside the assigned scene as substitutes for any primary witness.
- `confidence`: T1
- `success_feedback`: Корпус зібрано. Тепер кожне твердження треба прив'язувати до конкретного свідка.
- `failure_feedback`: Не розширюйте справу до всієї історії Юди; спочатку досліджуємо саме сцену за столом.
- `hints`: H2 називає чотири Євангелія; H3 дає глави; H6 дає точні діапазони.
- `on_correct`: N02
- `on_incorrect`: повторний вибір із підсвіченим діапазоном глав
- `mastery`: source-citation / recognition / independent unless H6+
- `accessibility`: список посилань із прапорцями; повне керування клавіатурою.

## LN03-N02 — Спільне оголошення

- `task_family`: parallel comparison
- `difficulty`: 2/6
- `required`: yes
- `skill_target`: identify common witness core
- `player_prompt`: Яке твердження є спільним ядром усіх чотирьох свідчень?
- `accepted_answer`: Ісус повідомляє, що один із присутніх/учнів Його зрадить.
- `accepted_variants`: semantic equivalents preserving «one of you» and betrayal.
- `required_evidence`: Mt 26:21; Mk 14:18; Lk 22:21–23; Jn 13:21–22.
- `rejected_answers`: «Усі чотири одразу називають Юду»; «усі описують передачу шматка Юді».
- `rejection_reason`: those details are not present in all four accounts.
- `confidence`: T2
- `success_feedback`: Спільне ядро вузьке: майбутня зрада походить від одного з присутніх. Ідентифікаційні деталі відрізняються.
- `on_correct`: N03
- `on_incorrect`: correction branch asks player to mark the exact sentence in each witness.
- `mastery`: Gospel-parallels / synthesis
- `accessibility`: four passages presented as heading-separated linear text.

## LN03-N03 — Хто прямо називає Юду?

- `task_family`: evidence classification
- `difficulty`: 2/6
- `required`: yes
- `player_prompt`: Класифікуйте свідчення: «Юда прямо названий у досліджуваному уривку» / «Юда не названий у цьому уривку».
- `accepted_answer`: Matthew — named; Mark — not named; Luke — not named; John — named.
- `required_evidence`: Mt 26:25; Mk 14:18–21; Lk 22:21–23; Jn 13:26.
- `rejected_answers`: treating knowledge from elsewhere in a Gospel as if present in the assigned verses.
- `confidence`: T2
- `success_feedback`: Матвій та Іван прямо називають Юду в цих уривках; Марко й Лука — ні.
- `on_correct`: N04
- `on_partial`: re-check only misclassified witness
- `mastery`: explicit-vs-inferred / application / spaced retrieval yes
- `accessibility`: radio groups with witness name announced before options.

## LN03-N04 — Питання учнів у Матвія і Марка

- `task_family`: witness-detail comparison
- `difficulty`: 2/6
- `required`: yes
- `player_prompt`: Що роблять учні після оголошення про зраду в Матвія та Марка?
- `accepted_answer`: Вони засмучуються і по черзі/кожен запитують, чи не вони це.
- `required_evidence`: Mt 26:22; Mk 14:19.
- `confidence`: T2
- `rejected_answers`: «Вони одразу звинувачують Юду».
- `success_feedback`: Реакція — самоперевірка й смуток, а не колективне публічне звинувачення Юди.
- `on_correct`: N05
- `mastery`: character-reaction / recall
- `accessibility`: free response accepts semantic equivalents.

## LN03-N05 — Що додає Лука?

- `task_family`: source-limit extraction
- `difficulty`: 2/6
- `required`: yes
- `player_prompt`: За Лк 22:21–23, яку ознаку близькості зрадника до сцени прямо названо і що роблять учні після слів Ісуса?
- `accepted_answer`: Рука зрадника є з Ісусом на столі; учні починають питати/обговорювати між собою, хто це може бути.
- `required_evidence`: Lk 22:21,23.
- `confidence`: T1
- `rejected_answers`: naming Judas as if Luke names him in these verses.
- `success_feedback`: Лука підкреслює присутність зрадника за тим самим столом, але в цьому уривку не називає його.
- `on_correct`: N06
- `mastery`: Luke-detail / recall
- `accessibility`: two-part prompt announced as Part 1 and Part 2.

## LN03-N06 — Знак посудини у синоптиків

- `task_family`: comparison / precision
- `difficulty`: 3/6
- `required`: yes
- `player_prompt`: Який образ пов'язує зрадника зі спільною посудиною у Матвія та Марка, і чого цей образ сам по собі НЕ доводить?
- `accepted_answer`: Matthew speaks of the one who dipped his hand with Jesus in the dish; Mark of one of the Twelve dipping with him in the bowl/dish. This does not by itself license importing John's exact morsel-giving sequence into these verses.
- `required_evidence`: Mt 26:23; Mk 14:20; compare Jn 13:26 only after first answering Synoptic wording.
- `confidence`: T2
- `rejected_answers`: «Матвій і Марко прямо описують, як Ісус передає Юді шматок».
- `success_feedback`: Схожий образ спільної страви не означає, що автори описують деталь однаковими словами або з однаковою функцією.
- `on_correct`: N07
- `on_incorrect`: source-check branch isolates Mt/Mk before showing John.
- `mastery`: precision / application / spaced retrieval yes
- `accessibility`: no visual-only parallel columns; sequential headings.

## LN03-N07 — Юда говорить у Матвія

- `task_family`: character evidence
- `difficulty`: 2/6
- `required`: yes
- `player_prompt`: Яка деталь у Мт 26:25 прямо індивідуалізує Юду?
- `accepted_answer`: Judas asks Jesus whether it is he; Jesus replies with the formula commonly translated «You have said so» / semantic translation equivalent.
- `required_evidence`: Mt 26:25.
- `confidence`: T1
- `rejected_answers`: claiming all disciples hear an explicit public accusation beyond what the verse states.
- `success_feedback`: Матвій прямо вводить Юду як мовця. Не додавайте реакцій інших людей, яких текст тут не описує.
- `on_correct`: N08
- `mastery`: Matthew-detail / recall
- `accessibility`: translation variants accepted semantically.

## LN03-N08 — Хто питає в Івана?

- `task_family`: relationship reconstruction
- `difficulty`: 3/6
- `required`: yes
- `player_prompt`: Відновіть ланцюг дій в Ів 13:22–25: хто ініціює запит і хто безпосередньо питає Ісуса?
- `accepted_answer`: Simon Peter signals/prompts the disciple whom Jesus loved; that disciple asks Jesus who it is.
- `required_evidence`: Jn 13:22–25.
- `confidence`: T1
- `rejected_answers`: «Іван прямо названий у віршах 22–25».
- `rejection_reason`: the passage calls him the disciple whom Jesus loved; this node does not require an external identification.
- `success_feedback`: Текст дозволяє встановити ролі Петра й улюбленого учня, але не вимагає підміняти неназваного персонажа традиційною ідентифікацією.
- `on_correct`: N09
- `mastery`: John-detail / application
- `accessibility`: ordering via numbered list and move-up/move-down controls in future UI.

## LN03-N09 — Йоанівський знак

- `task_family`: evidence linking
- `difficulty`: 2/6
- `required`: yes
- `player_prompt`: Який знак Ісус називає у відповідь на питання «хто це?» і кому потім дає шматок?
- `accepted_answer`: The betrayer is the one to whom Jesus will give the dipped morsel/piece of bread; he gives it to Judas Iscariot, son of Simon.
- `required_evidence`: Jn 13:26.
- `confidence`: T1
- `success_feedback`: Тут Іван прямо поєднує оголошений знак із Юдою.
- `on_correct`: N10
- `mastery`: evidence-link / recall
- `accessibility`: citation plus text answer; no image of table required.

## LN03-N10 — Що відбувається після шматка?

- `task_family`: local chronology
- `difficulty`: 3/6
- `required`: yes
- `player_prompt`: Розташуйте лише за Ів 13:26–30: (A) Юда виходить; (B) Ісус дає шматок Юді; (C) Ісус каже зробити задумане швидко; (D) Сатана входить у Юду; (E) присутні не розуміють причини слів Ісуса.
- `accepted_answer`: B → D → C → E → A.
- `required_evidence`: Jn 13:26–30.
- `confidence`: T1
- `rejected_answers`: importing Synoptic events into this local ordering task.
- `success_feedback`: Це локальна хронологія Івана; вона не проголошується автоматично повною гармонізованою хронологією вечері.
- `on_correct`: N11
- `mastery`: chronology / application / spaced retrieval yes
- `accessibility`: keyboard reorder and numeric-position alternative.

## LN03-N11 — Що подумали інші?

- `task_family`: misconception audit
- `difficulty`: 2/6
- `required`: yes
- `player_prompt`: Чи зрозуміли інші за столом, чому Ісус сказав Юді діяти швидко? Які два пояснення вони припускали?
- `accepted_answer`: No. Some thought, because Judas had the money box, that he should buy what was needed for the feast or give something to the poor.
- `required_evidence`: Jn 13:28–29.
- `confidence`: T1
- `rejected_answers`: «Усі одразу зрозуміли, що Юда йде зраджувати».
- `success_feedback`: Це ключова межа знання персонажів: читач знає більше, ніж частина присутніх у сцені.
- `on_correct`: N12
- `mastery`: explicit-vs-assumed / recall
- `accessibility`: two accepted explanations can be entered in any order.

## LN03-N12 — Аудит тверджень

- `task_family`: claim classification
- `difficulty`: 4/6
- `required`: yes
- `player_prompt`: Класифікуйте твердження як T1, T2 або «не доведено цим корпусом»: (1) Матвій прямо називає Юду; (2) Лука прямо називає Юду в 22:21–23; (3) усі чотири свідки повідомляють про майбутню зраду одним із присутніх; (4) Іван повідомляє, що інші зрозуміли справжню причину виходу Юди; (5) Марко прямо називає зрадника «одним із дванадцятьох».
- `accepted_answer`: 1=T1; 2=not proven/false for assigned passage; 3=T2; 4=not proven/contradicted by Jn 13:28–29; 5=T1.
- `required_evidence`: all primary passages.
- `confidence`: mixed T1/T2
- `success_feedback`: Ви відокремили прямий текст, результат порівняння і твердження, яке текст не підтримує.
- `on_correct`: N13
- `on_partial`: only failed statements return with source links
- `mastery`: evidence-classification / synthesis / independent
- `accessibility`: each statement is its own labelled group; status announced textually.

## LN03-N13 — Фінальна реконструкція без фальшивої гармонізації

- `task_family`: final synthesis
- `difficulty`: 5/6
- `required`: yes
- `player_prompt`: Складіть коротку реконструкцію справи з чотирьох частин: (1) спільне ядро; (2) що додає Матвій; (3) що додає Лука; (4) що детально додає Іван. Завершіть одним реченням про межу хронологічної певності.
- `accepted_answer`: Must include: common announcement that one present will betray Jesus; Matthew's explicit Judas question/response; Luke's hand-at-table and mutual inquiry without naming Judas in assigned verses; John's Peter→beloved-disciple inquiry, dipped morsel given to Judas, subsequent sequence through Judas' departure and others' misunderstanding; final acknowledgement that the corpus does not justify forcing every witness detail into an exact minute-by-minute harmonized order.
- `accepted_variants`: any evidence-grounded equivalent preserving witness distinctions.
- `required_evidence`: citations from all four primary passages.
- `rejected_answers`: synthesis that erases witness differences or claims certainty beyond the texts.
- `confidence`: T2 + D1 boundary note
- `success_feedback`: Справу закрито: ви встановили не лише «хто зрадник», а й те, як різні свідки дають різний рівень ідентифікації та які межі має реконструкція.
- `on_correct`: mission completion
- `on_partial`: return to missing witness only
- `on_incorrect`: correction route to N12, then retry synthesis
- `mastery`: Gospel-parallels / synthesis / strongest evidence; spaced retrieval yes
- `accessibility`: structured four-heading response form; citations selectable by keyboard.

## LN03-N14 — OPTIONAL: Псалом у Йоана

- `task_family`: cross-reference tracing
- `difficulty`: 4/6
- `required`: no
- `player_prompt`: Ів 13:18 вводить цитату про того, хто їв хліб і підняв п'яту. Знайдіть старозавітний текст, на який указує перехресне посилання, і поясніть лише текстовий зв'язок без додавання ширшої теологічної теорії.
- `accepted_answer`: Psalm 41:9 (verse numbering may vary by tradition); shared motif of a close bread-sharing companion turning against the speaker.
- `required_evidence`: Jn 13:18 + Ps 41:9.
- `confidence`: T2 for textual relationship as explicitly introduced by John; broader typological claims would require I1.
- `success_feedback`: Ви простежили міжтекстовий зв'язок, не перетворюючи його автоматично на ширше твердження, якого завдання не доводить.
- `mastery`: OT-NT-cross-reference / application
- `accessibility`: verse-number variation explained textually.

## LN03-N15 — OPTIONAL: Чого ми НЕ знаємо з цього уривка?

- `task_family`: source-limit challenge
- `difficulty`: 4/6
- `required`: no
- `player_prompt`: Оберіть твердження, яке не слід робити T1-відповіддю лише на підставі Ів 13:22–25: A) Петро жестом просить іншого учня запитати; B) цей учень названий у тексті власним ім'ям Іван; C) учень ставить Ісусові питання; D) учні спочатку не знають, кого Ісус має на увазі.
- `accepted_answer`: B.
- `required_evidence`: Jn 13:22–25.
- `confidence`: T1 source-limit
- `success_feedback`: Традиційна або наукова ідентифікація може обговорюватися окремо, але сам цей уривок не називає учня власним ім'ям.
- `mastery`: explicit-vs-inferred / application
- `accessibility`: standard labelled multiple-choice control.

## 7. Failure recovery

- Two incorrect attempts on a witness-specific node unlock H3 automatically but do not reveal the answer.
- H6 reveals the decisive reference; H7 reveals the answer and marks mastery as guided.
- Any attempt to merge a John-only detail into all four witnesses triggers a comparison correction branch rather than a generic «wrong» message.
- Chronology errors are corrected first within the single witness being tested; the player is never asked to solve a disputed global chronology as if it had one certain answer.

## 8. Completion conditions

Mission complete when N01–N13 resolve and final synthesis contains evidence from all four witnesses. Optional N14/N15 are not required.

`perfect-investigation_conditions`:
- N01–N13 completed without H7;
- N12 all five classifications correct;
- N13 preserves all witness distinctions and explicitly states the chronology limit;
- at least one optional node completed independently.

## 9. Completion synthesis shown to player

Чотири Євангелія погоджуються в основному: Ісус під час трапези оголошує майбутню зраду одним із присутніх. Але вони не дають однакового набору деталей. Матвій прямо вводить питання Юди; Марко залишає зрадника в цьому уривку неназваним; Лука говорить про руку зрадника за столом і взаємне питання учнів; Іван розгортає окрему сцену запиту через Петра й улюбленого учня, знаку з умоченим шматком, прямої передачі його Юді та виходу Юди. Добре дослідження зберігає ці відмінності замість того, щоб приховувати їх штучною точністю.

## 10. Accessibility audit

PASS at pre-production level:
- no node requires sight, pointer use, color discrimination or drag-and-drop;
- all ordering has keyboard/numeric equivalent;
- parallel witnesses must be exposed as heading-separated linear text;
- feedback and evidence state must be screen-reader announced;
- optional cross-reference is navigable as text;
- no spatial seating reconstruction is required to solve the mission.

## 11. Source-audit result

`SOURCE_AUDITED` on 2026-08-17 against the assigned passages in multiple contemporary/publicly viewable Bible editions. No external historical claim is required for a correct answer. The mission deliberately treats exact cross-Gospel micro-chronology as a limit-of-certainty issue rather than a forced answer.
