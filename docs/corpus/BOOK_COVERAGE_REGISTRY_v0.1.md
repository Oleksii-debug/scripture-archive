# BOOK_COVERAGE_REGISTRY v0.1

**Date:** 2026-08-19  
**Status:** `PLANNING_BASELINE / NOT_AUTHORED_CONTENT`  
**Parent:** `SCRIPTURE_CORPUS_MAP_v0.1.md`

## Scope rule
This first operational registry uses the 66-book working profile already implied by the repository's current corpus architecture. This is a coverage scaffold, **not a theological claim that other Christian canon profiles are invalid**. The data model must support additional canon profiles without renumbering authored content; deuterocanonical/other profile expansion remains an explicit product-scope decision.

Planned rows do not count as authored or source-audited nodes. `REFERENCED_IN_AUDITED_CONTENT` / `AUDITED_REFERENCE_ONLY` means a passage from the book has already appeared in source-audited content, not that the book itself is covered.

## Status vocabulary
- `PLANNED` — no authored book-level case counted.
- `REFERENCED_IN_AUDITED_CONTENT` — cited/used in audited material only.
- `AUDITED_REFERENCE_ONLY` — one or more claims are source-audited evidence records, without a book campaign.
- `AUTHORED_PARTIAL_SOURCE_AUDITED` — canonical authored cases currently cover only part of the book.

## Registry
| book_id | Book | Family | Current status | First/next proposed case family | Primary risk flags |
|---|---|---|---|---|---|
| `B-OT-01` | Genesis / Буття | Torah | `PLANNED` | creation/fall; patriarchal promise evidence chains | chronology; genealogy; cross-reference |
| `B-OT-02` | Exodus / Вихід | Torah | `PLANNED` | exodus sequence; covenant/Sinai; tabernacle evidence | chronology; law-context; cross-reference |
| `B-OT-03` | Leviticus / Левит | Torah | `PLANNED` | priesthood/sacrifice/source-structure cases | ritual-context; terminology; cross-reference |
| `B-OT-04` | Numbers / Числа | Torah | `PLANNED` | wilderness episodes; census/provenance; route cases | chronology; geography; repetition |
| `B-OT-05` | Deuteronomy / Повторення Закону | Torah | `PLANNED` | speech/audience; covenant-memory; quotation reuse | speaker-recipient; law-context; quotation |
| `B-OT-06` | Joshua / Ісус Навин | Historical | `PLANNED` | conquest/land-allocation evidence and chronology | geography; chronology; ethical-interpretive |
| `B-OT-07` | Judges / Судді | Historical | `PLANNED` | judge-cycle provenance and local chronology | chronology; repeated-cycle dedup |
| `B-OT-08` | Ruth / Рут | Historical | `PLANNED` | kinship/provenance and local sequence | genealogy; social-context |
| `B-OT-09` | 1 Samuel / 1 Самуїла | Historical | `PLANNED` | Samuel/Saul/David source and authority transitions | chronology; person-provenance |
| `B-OT-10` | 2 Samuel / 2 Самуїла | Historical | `PLANNED` | Davidic reign; covenant; parallel-event comparison | chronology; parallel-text |
| `B-OT-11` | 1 Kings / 1 Царів | Historical | `PLANNED` | Solomon/temple/divided-kingdom transitions | chronology; temple-context |
| `B-OT-12` | 2 Kings / 2 Царів | Historical | `PLANNED` | prophetic confrontation; exile sequence; parallel records | chronology; parallel-text |
| `B-OT-13` | 1 Chronicles / 1 Хронік | Historical | `PLANNED` | genealogy + parallel-event provenance | genealogy; parallel-text; dedup |
| `B-OT-14` | 2 Chronicles / 2 Хронік | Historical | `PLANNED` | temple/kings/parallel-history comparison | parallel-text; chronology |
| `B-OT-15` | Ezra / Ездра | Historical | `PLANNED` | return/rebuilding document and authority cases | chronology; document-provenance |
| `B-OT-16` | Nehemiah / Неємія | Historical | `PLANNED` | rebuilding/social reform chronology and records | chronology; speaker-provenance |
| `B-OT-17` | Esther / Естер | Historical | `PLANNED` | court sequence; decree/provenance cases | chronology; document-provenance |
| `B-OT-18` | Job / Йов | Wisdom | `PLANNED` | speaker-attribution dialogue and argument tracking | speaker shifts; interpretation |
| `B-OT-19` | Psalms / Псалми | Wisdom/Poetry | `REFERENCED_IN_AUDITED_CONTENT` | speaker/audience; lament/praise; quotation reuse | poetry; speaker; quotation/allusion |
| `B-OT-20` | Proverbs / Приповісті | Wisdom | `PLANNED` | comparison/classification of wisdom sayings | genre; context; duplicate-risk |
| `B-OT-21` | Ecclesiastes / Екклезіяст | Wisdom | `PLANNED` | argument structure and speaker/voice cases | speaker; interpretation; structure |
| `B-OT-22` | Song of Songs / Пісня над піснями | Wisdom/Poetry | `PLANNED` | speaker-attribution boundary cases | speaker ambiguity; interpretation |
| `B-OT-23` | Isaiah / Ісая | Prophets | `PLANNED` | oracle audience; historical setting; NT quotation/allusion | quotation/allusion; chronology; interpretation |
| `B-OT-24` | Jeremiah / Єремія | Prophets | `PLANNED` | oracle/audience + narrative/document provenance | chronology; speaker; document-provenance |
| `B-OT-25` | Lamentations / Плач Єремії | Prophets/Poetry | `PLANNED` | lament voice/structure and evidence-boundary cases | poetry; speaker; interpretation |
| `B-OT-26` | Ezekiel / Єзекіїль | Prophets | `PLANNED` | vision/oracle provenance and symbolic action | symbolic imagery; chronology; interpretation |
| `B-OT-27` | Daniel / Даниїл | Prophets/Apocalyptic | `PLANNED` | court narratives + vision/speaker boundaries | chronology; apocalyptic; interpretation |
| `B-OT-28` | Hosea / Осія | Minor Prophets | `PLANNED` | oracle/audience and metaphor boundaries | metaphor; interpretation |
| `B-OT-29` | Joel / Йоіл | Minor Prophets | `PLANNED` | day-of-the-Lord + Acts quotation relation | quotation; chronology; interpretation |
| `B-OT-30` | Amos / Амос | Minor Prophets | `PLANNED` | oracle audience; justice claims; Acts reuse | quotation/allusion; context |
| `B-OT-31` | Obadiah / Авдій | Minor Prophets | `PLANNED` | Edom oracle source/audience case | historical-context; interpretation |
| `B-OT-32` | Jonah / Йона | Minor Prophets | `PLANNED` | narrative sequence + speaker/motive boundaries | chronology; motive-inference |
| `B-OT-33` | Micah / Михей | Minor Prophets | `PLANNED` | oracle provenance + Gospel quotation relation | quotation; interpretation |
| `B-OT-34` | Nahum / Наум | Minor Prophets | `PLANNED` | Nineveh oracle audience/context boundaries | historical-context; interpretation |
| `B-OT-35` | Habakkuk / Авакум | Minor Prophets | `PLANNED` | dialogue structure + Pauline quotation reuse | speaker; quotation |
| `B-OT-36` | Zephaniah / Софонія | Minor Prophets | `PLANNED` | judgment/restoration oracle structure | audience; interpretation |
| `B-OT-37` | Haggai / Огій | Minor Prophets | `PLANNED` | dated oracle + rebuilding chronology | chronology; date-context |
| `B-OT-38` | Zechariah / Захарія | Minor Prophets | `REFERENCED_IN_AUDITED_CONTENT` | shepherd/sheep quotation relation; vision/oracle families | quotation/allusion; symbolic; TX risk |
| `B-OT-39` | Malachi / Малахія | Minor Prophets | `PLANNED` | messenger/oracle + Gospel reuse | quotation/allusion; interpretation |
| `B-NT-40` | Matthew / Матвій | Gospel | `AUTHORED_PARTIAL_SOURCE_AUDITED` | parallel-witness Jesus narrative; LN expansion | parallel-witness; chronology; TX1 |
| `B-NT-41` | Mark / Марко | Gospel | `AUTHORED_PARTIAL_SOURCE_AUDITED` | parallel-witness Jesus narrative; textual-variant aware cases | parallel-witness; TX1; chronology |
| `B-NT-42` | Luke / Лука | Gospel | `AUTHORED_PARTIAL_SOURCE_AUDITED` | parallel-witness; local chronology; textual-boundary cases | parallel-witness; TX1; chronology |
| `B-NT-43` | John / Іван | Gospel | `AUTHORED_PARTIAL_SOURCE_AUDITED` | parallel-witness; provenance; local sequence | parallel-witness; unnamed-person boundary |
| `B-NT-44` | Acts / Дії | Narrative/History | `AUTHORED_PARTIAL_SOURCE_AUDITED` | PA campaign; narrator-vs-speech; journeys/defenses | narrator-vs-speech; chronology; harmonization |
| `B-NT-45` | Romans / Римлян | Pauline Letter | `PLANNED` | argument structure; OT quotation provenance | argument; quotation; interpretation |
| `B-NT-46` | 1 Corinthians / 1 Коринтян | Pauline Letter | `REFERENCED_IN_AUDITED_CONTENT` | audience/problem blocks; resurrection; tradition/quotation | speaker-recipient; argument; quotation |
| `B-NT-47` | 2 Corinthians / 2 Коринтян | Pauline Letter | `PLANNED` | argument shifts; autobiography; reconciliation | speaker-recipient; autobiography |
| `B-NT-48` | Galatians / Галатів | Pauline Letter | `AUDITED_REFERENCE_ONLY` | autobiography + argument/quotation cases | autobiography; chronology; argument |
| `B-NT-49` | Ephesians / Ефесян | Pauline Letter | `PLANNED` | argument/theme structure; OT reuse | speaker-recipient; quotation |
| `B-NT-50` | Philippians / Филип'ян | Pauline Letter | `AUDITED_REFERENCE_ONLY` | autobiographical credentials; argument cases | autobiography; argument |
| `B-NT-51` | Colossians / Колосян | Pauline Letter | `PLANNED` | argument/Christology text-vs-interpretation cases | interpretation; argument |
| `B-NT-52` | 1 Thessalonians / 1 Солунян | Pauline Letter | `PLANNED` | audience/history; eschatology argument boundaries | speaker-recipient; interpretation |
| `B-NT-53` | 2 Thessalonians / 2 Солунян | Pauline Letter | `PLANNED` | eschatology/source-boundary comparison | interpretation; chronology |
| `B-NT-54` | 1 Timothy / 1 Тимофія | Pauline Letter | `PLANNED` | instruction/recipient provenance | speaker-recipient; historical-context |
| `B-NT-55` | 2 Timothy / 2 Тимофія | Pauline Letter | `PLANNED` | autobiography/charge/provenance | speaker-recipient; autobiography |
| `B-NT-56` | Titus / Тита | Pauline Letter | `PLANNED` | instruction/recipient/leadership source cases | speaker-recipient; historical-context |
| `B-NT-57` | Philemon / Филимона | Pauline Letter | `PLANNED` | participant/speaker-recipient relational evidence | person-relations; social-context |
| `B-NT-58` | Hebrews / Євреїв | General Letter/Sermonic | `PLANNED` | OT quotation chain and argument structure | quotation; speaker/audience; interpretation |
| `B-NT-59` | James / Якова | General Letter | `PLANNED` | wisdom/action argument and source comparison | argument; wisdom parallels |
| `B-NT-60` | 1 Peter / 1 Петра | General Letter | `PLANNED` | audience/suffering/OT reuse | speaker-recipient; quotation |
| `B-NT-61` | 2 Peter / 2 Петра | General Letter | `PLANNED` | memory/testimony/interpretive-boundary cases | provenance; interpretation |
| `B-NT-62` | 1 John / 1 Івана | General Letter | `PLANNED` | witness/test/love argument structure | speaker-recipient; argument |
| `B-NT-63` | 2 John / 2 Івана | General Letter | `PLANNED` | recipient/teaching boundary cases | recipient ambiguity; provenance |
| `B-NT-64` | 3 John / 3 Івана | General Letter | `PLANNED` | person/letter-provenance and hospitality conflict | person-provenance |
| `B-NT-65` | Jude / Юди | General Letter | `PLANNED` | allusion/source-boundary cases | allusion; external-tradition; interpretation |
| `B-NT-66` | Revelation / Об'явлення | Apocalyptic | `PLANNED` | speaker shifts; church letters; OT allusion map | symbolic imagery; allusion; I1/D1 |

## Cross-genre exemplar seeds
The first explicit planning wave should seed:
1. Genesis — event/chronology/provenance.
2. Psalms — speaker/audience + quotation/allusion.
3. Isaiah — oracle context + NT reuse with relation class.
4. Gospels — continue audited parallel-witness mechanics beyond LN.
5. Acts — continue PA and narrator-vs-speech cases.
6. Romans — argument structure + explicit quotation provenance.

## Coverage controls per book
Future updates add without inflating authored counts:
- chapters with at least one planned distinct case;
- chapters with AUTHOR_COMPLETE cases;
- chapters with SOURCE_AUDITED cases;
- distinct evidence operations;
- reusable evidence record count;
- duplicate-risk ratio;
- accessibility review status;
- interpretation/TX1 risk inventory.

## Anti-duplication rule
A new row/case family never authorizes wording-only duplicates. Before authoring, each case must state source corpus, distinct question, evidence operation, expected artifact, relation to existing content, uncertainty/TX1 risk and nonvisual equivalent.
