# SA-EXT-01 / OWN_EDITION_RIGHTS_METADATA — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ (SCOPED)

**Дата:** 2026-10-31. **Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Остаточно закрито лише конкретний перевірений дефект успадкованих ліцензійних полів **канонічної біблійної читальні**, не весь батьківський SA-EXT-01 та не 20-роздільний план.

## Функція, яка дійсно працює в основній платформі
- Реальний спільний `public/parallel-reader.js::validEditionRightsMetadata`, який застосовують основний і порівняльний біблійні читачі, тепер приймає `title`, `license` і `source` **лише як власні поля** запису видання. Не приймає успадковані `attribution` / `licenseUrl`, навіть коли їх значення порожні або `null`.
- Некоректні масиви, не-об'єкти та прототипні підміни не можуть видавати чуже походження за підтверджене й не відкривають вірші в реальному порівнянні.
- Збережено всі чинні URL HTTPS-перевірки, точні ліміти metadata, права конкретного видання, `uk/ru/en`, доступні повідомлення про збій та повторну спробу. Не створено нового рендера, сервера, каталогу, корпусу чи прав на біблійні тексти.

## Точний GitHub merge та реальні перевірки
- Реалізація + регресії: [PR #907](https://github.com/Oleksii-debug/scripture-archive/pull/907), **SQUASH MERGED** до `main@be0703585175c4165f5d2841cfd625839d6e870f`; exact тестований PR head `47f9d9a37b1fec4a82a6a012d16a7116aecb1adf`.
- Source blob: `public/parallel-reader.js@16d4fd5622295cd5cfc35ce69f6a3ca604d76e7d`. Native regression blob: `tests/parallel-rights-own-properties.test.mjs@339c5746b684a553fd2073308fc7c442a1036a49`.
- **35 перевірок** у новому test-файлі: 8 прийнятних записів, 12 неприйнятних успадкованих обов'язкових полів, 8 успадкованих optional, 6 недопустимих типів і 1 справжня асинхронна інтеграційна перевірка порівняльного UI, що не показує текст віршів під хибною ліцензією. Це 35 regression checks, **не 35 завершених великих розділів**.
- Фактичний [GitHub Actions exact-head run #41180611036](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41180611036) **COMPLETED SUCCESS**: native Node **2973 PASS / 0 FAIL / 1 SKIP**, disposable Worker/D1 **22 PASS / 0 FAIL**, Python existing validators **2 PASS**; TypeScript, lint і source build виконані успішно. Логи job `124477072194` реально прочитані, усі кроки завершено.
- Після фактичного merge окремо підтверджено PR `merged=true`, GitHub `main@be070358...`, нові source/test blobs і `compare(merge SHA,main)=identical`.

## Остаточний обмежений статус
**SA-EXT-01 / OWN_EDITION_RIGHTS_METADATA — ЗАКРИТО.** `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0`; без повторної розробки без нової вимоги або відтвореного дефекту.

**Повний батьківський SA-EXT-01 залишається OPEN:** повне ліцензоване покриття, підтвердження прав та походження конкретних видань, наскрізні сценарії. SA-EXT-03/04 — раніше закриті; інші незакриті батьківські SA-EXT не переведено в TERMINAL. Справжній Sites installed SHA, жива D1/Chrome, Windows, фізична NVDA, SMTP та production release — **NOT_VERIFIED**. Немає релізу, платежів, розсилок, зміни даних користувачів чи нових біблійних перекладів. Канонічна координація: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297), [#78](https://github.com/Oleksii-debug/scripture-archive/issues/78).
