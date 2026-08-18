# Архів Писання — Player Memory & Session Scheduling v1.0

**Дата:** 2026-08-18  
**Статус:** CANONICAL PRE-PRODUCTION SPEC  
**Призначення:** визначити платформо-незалежну модель того, що гра пам’ятає про конкретного гравця і як вона обирає наступний матеріал без безглуздих повторів.

## 1. Базовий принцип

Гра не використовує чистий випадковий вибір завдань як основний механізм сесії.

Кожна наступна сесія повинна будуватися з урахуванням:
- де гравець зупинився у кампаніях;
- які уривки він уже читав;
- які конкретні task nodes уже бачив;
- що відповідав правильно/неправильно;
- які підказки використовував;
- які знання засвоєні слабко;
- які знання давно не повторювались;
- які exact tasks з’являлися нещодавно;
- яку складність гравець реально витримує;
- які task families надмірно повторювались у недавніх сесіях.

## 2. Рівні пам’яті

Пам’ять гравця повинна існувати щонайменше на п’яти рівнях.

### A. Campaign progress
Зберігається поточна кампанія, місія, checkpoint, завершені й відкриті гілки.

### B. Node history
Для кожного канонічного task node зберігається факт показу, кількість спроб, результат, використані підказки, останній показ та стан повторення.

### C. Passage exposure
Окремо зберігається, які біблійні уривки людина читала/відкривала у грі і в яких контекстах. Прочитаний уривок не вважається автоматично «засвоєним».

### D. Concept mastery
Кожен task node посилається на одну або більше одиниць знань. Приклади:
- персонаж;
- подія;
- місце;
- хронологічний зв’язок;
- хто кому що сказав;
- причинно-наслідковий зв’язок;
- witness provenance;
- паралельні тексти;
- OT↔NT зв’язок;
- пророцтво/виконання;
- цитата/джерело;
- структура біблійної книги;
- історико-культурний контекст;
- textual variant awareness;
- відмінність Text / Context / Interpretation.

### E. Session/fatigue history
Зберігається недавній розподіл task families, книг Біблії, персонажів, уривків і exact nodes, щоб не створювати монотонні сесії.

## 3. Стани знання

Рекомендований платформо-незалежний набір:

- `UNSEEN` — ще не зустрічалось;
- `INTRODUCED` — зустрічалось, але недостатньо даних;
- `LEARNING` — є помилки/підказки або нестабільне знання;
- `STABLE` — кілька успішних відтворень через інтервал;
- `MASTERED_FOR_NOW` — висока поточна ймовірність пригадування;
- `REVIEW_DUE` — час перевірити знову;
- `LAPSED` — раніше сильне знання було забуте.

`MASTERED_FOR_NOW` ніколи не означає духовну зрілість або остаточне знання Біблії. Це лише стан конкретної навчальної одиниці.

## 4. Exact repeat vs useful retrieval

Гра повинна принципово розрізняти:

1. `EXACT_REPEAT` — те саме формулювання + той самий corpus + та сама дія;
2. `VARIANT_REPEAT` — те саме знання, але інша перевірена форма;
3. `PASSAGE_REVISIT` — той самий уривок із новим дослідницьким завданням;
4. `CROSS_CONTEXT_RETRIEVAL` — старе знання потрібне в новій місії;
5. `SYNTHESIS_RETRIEVAL` — кілька старих знань використовуються для нової реконструкції.

Основний захист від нудьги стосується `EXACT_REPEAT`. Інші типи повторення є повноцінною частиною навчання.

## 5. Novelty guard

### Після правильної сильної відповіді
Exact node переходить у cooldown. Він не повинен випадково повертатися в найближчу сесію.

Стартове правило для майбутнього тестування:
- наступного дня exact repeat заборонений, якщо немає спеціальної педагогічної причини;
- для добре засвоєного exact node базовий cooldown має бути щонайменше кілька днів і зростати разом зі стабільністю знання;
- перед exact repeat система спочатку шукає інший source-audited variant того самого concept.

Точні інтервали не є догмою до pilot telemetry; вони повинні калібруватися після тестування.

### Після помилки
Система може повернути знання швидше, але пріоритет:
1. коротке пояснення/підказка;
2. інша форма перевірки;
3. повтор у новому контексті;
4. exact repeat лише якщо це педагогічно виправдано.

Безпосереднє нескінченне «ти помилився — ось те саме питання ще раз» заборонено як стандартний цикл.

## 6. Session composer

Сесія формується не випадковим shuffle, а з кількох черг.

### Основні черги
- `CONTINUE` — наступні вузли активної кампанії;
- `NEW` — ще не бачені вузли;
- `DUE_REVIEW` — знання, які вже час повторити;
- `WEAK` — помилки, часті підказки, нестабільне mastery;
- `CROSS_LINK` — старе знання, потрібне для нового біблійного зв’язку;
- `SYNTHESIS` — великі реконструкції/карти/порівняння;
- `USER_REQUESTED` — користувач явно попросив конкретний режим або тему.

### Стартова пропорція для звичайної щоденної сесії
Це baseline для тестування, не фінальна константа:
- 55–65% — нове/продовження;
- 20–25% — due review;
- 10–15% — слабкі місця;
- 5–10% — cross-link або synthesis.

Якщо у користувача багато простроченого слабкого матеріалу, review частка може тимчасово зростати. Якщо користувач новий — переважає новий матеріал.

## 7. Selection score

Кожен кандидат на наступний task отримує не одну «випадкову вагу», а набір незалежних сигналів:

- campaign continuity;
- due urgency;
- weakness;
- time since last exposure;
- exact-node cooldown;
- concept cooldown;
- task-family fatigue;
- passage/book diversity;
- difficulty fit;
- prerequisite readiness;
- unresolved retrieval hook;
- user-selected topic/mode;
- group-session constraints.

Чистий random допускається лише як tie-breaker між кількома однаково придатними кандидатами або в окремому режимі «Випадкове дослідження».

## 8. Spaced repetition model

Планувальник може використовувати FSRS-подібні сигнали (difficulty, stability, retrievability) для concept-level review timing. Але FSRS не є повною архітектурою гри.

Наша модель має додатково враховувати:
- narrative continuity;
- різні task forms одного concept;
- біблійний corpus/provenance;
- dependencies між concepts;
- рівні Text/Context/Interpretation;
- synthesis tasks;
- theological/textual uncertainty;
- accessibility-equivalent forms.

Отже: **memory scheduling + content selection = два різні шари.**

## 9. Variant rotation

Кожна важлива одиниця знань повинна з часом мати кілька source-audited способів перевірки, наприклад:

- identify;
- cite evidence;
- order;
- compare witnesses;
- source provenance;
- true/false with evidence;
- eliminate unsupported claim;
- reconstruct;
- connect OT↔NT;
- choose confidence level;
- explain uncertainty;
- defend conclusion;
- retrieve inside another mission.

Варіанти не повинні генерувати нову біблійну «істину». Вони лише по-різному перевіряють уже канонічно визначене знання.

## 10. Rules against accidental repetition

Hard constraints for normal mode:

1. Не показувати той самий `node_id` двічі в одній сесії, крім явно позначеної remediation-loop.
2. Не показувати exact node у двох сусідніх щоденних сесіях після успішного виконання.
3. Не дозволяти одному task family захопити всю сесію без сюжетної причини.
4. Не повертати mastered concept лише через те, що pool малого розміру — краще показати новий матеріал або завершити сесію.
5. Не плутати повторне читання важливого уривка з дублем завдання.
6. Не використовувати streak як причину показувати педагогічно непотрібний контент.
7. Не карати втрату streak шляхом скидання знань або прогресу.

## 11. User-facing modes

Майбутній продукт має підтримувати принаймні:

- **Продовжити** — сюжет/кампанія + розумні вставки review;
- **Нове дослідження** — максимально новий матеріал;
- **Мої слабкі місця** — персональна remediation-сесія;
- **Повторити вивчене** — due review;
- **Велика перевірка** — змішаний synthesis/mastery challenge;
- **Книга Біблії / тема / персонаж** — targeted study;
- **Випадкове дослідження** — свідомо random, але з novelty guard;
- **Групова справа** — окремі правила командної роботи.

## 12. AI boundary

LLM не є джерелом пам’яті користувача і не вирішує довільно, що показати далі.

Детерміновано зберігаються:
- історія;
- timestamps;
- результати;
- cooldown;
- due dates;
- mastery state;
- deduplication;
- eligibility;
- source IDs;
- session composition.

AI може бути опційним для:
- оцінки вільної відповіді в межах перевірених acceptance rules;
- формулювання пояснення з канонічних джерел;
- класифікації помилки;
- вибору з уже source-audited task variants.

AI не може:
- вигадувати новий біблійний факт для завдання;
- скасовувати provenance/confidence/TX1;
- підміняти scheduler своїм «відчуттям»;
- оцінювати віру, святість або близькість до Бога.

## 13. Scale requirement

Ця модель обов’язкова саме через великий масштаб продукту.

Game Design Bible v1.0 мав історичний 500-mission macro spine. Це більше не є цільовою верхньою межею.

Нова scale class:
- **тисячі** authored missions/cases у довгостроковому каталозі;
- **десятки тисяч** source-audited canonical task nodes;
- значно більша кількість session experiences через перевірені variants, cross-context retrieval і різні персональні траєкторії;
- жодного штучного дублювання лише для досягнення числа.

Планувальна архітектура повинна спокійно підтримувати щонайменше порядок **2,000–10,000+ місій/справ** і **30,000–100,000+ канонічних task nodes/variants** без зміни базової моделі даних чи логіки прогресу. Це scale envelope, а не обіцянка наповнити каталог заради цифри.

## 14. Integration with current LN audit

Поточний `LN_RETRIEVAL_REGISTER` має стати першим маленьким proof-of-concept майбутньої player-memory системи:

- кожен authored future hook отримує конкретну ціль;
- exact retrieval відділяється від concept retrieval;
- після нормалізації 185 LN nodes треба побудувати симульовані профілі гравця й перевірити, що scheduler не створює випадкових дублів;
- pilot closure повинно включити session-level repetition audit, а не тільки mission-level source audit.

## 15. Definition of Done for this subsystem before implementation

До вибору платформи повинні бути письмово визначені:

1. canonical player-state fields;
2. concept taxonomy;
3. exact-node vs concept-repeat rules;
4. cooldown policy;
5. due-review model;
6. session queues and priorities;
7. variant rotation;
8. fatigue/diversity guards;
9. user-controlled study modes;
10. group-mode interaction with personal history;
11. privacy/export/delete expectations for progress data;
12. offline/sync semantics at conceptual level;
13. at least 5 simulated player histories across LN;
14. regression cases proving no accidental next-day exact repetition after successful completion.
