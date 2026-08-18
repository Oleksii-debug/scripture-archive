# PA-01 — Переслідувач

**Campaign:** PA — «Дорога Павла»  
**Status:** `MISSION_COMPLETE / SOURCE_AUDITED`  
**Schema:** CONTENT_NODE_SCHEMA v1.2  
**Date:** 2026-08-18

## Mission record
- `mission_id`: PA-01
- `campaign_id`: PA
- `title`: Переслідувач
- `mission_role`: source investigation / autobiography-vs-narrative comparison / provenance training
- `estimated_time`: 35–50 minutes
- `difficulty`: 3/6
- `learning_objectives`: establish Saul's pre-Damascus persecution from Acts and Pauline autobiographical texts; distinguish narrator claims from Paul's later self-report; identify authorization, targets and extent without inventing motives beyond the sources; prepare the transition to PA-02.
- `mastery_tags`: Saul-Paul; persecution; Acts; Pauline-autobiography; provenance; source-comparison; explicit-vs-inferred; chronology-boundary.
- `retrieval_targets`: source delimitation; narrator vs first-person testimony; authority/provenance; gender-inclusive target identification; Jerusalem→Damascus transition.
- `future_repetition_hooks`: PA-02 retrieves Damascus authorization and journey purpose; PA-04 may retrieve contrast between former persecution and early proclamation; later epistle cases may retrieve Gal 1:13–14 and Phil 3:5–6 as autobiographical evidence.

## Source model
### Primary Scripture
- Acts 7:58–8:3
- Acts 9:1–2
- Acts 22:3–5
- Acts 26:9–11
- Galatians 1:13–14
- Philippians 3:5–6

### Secondary Scripture
- none required for grading.

### Historical-context sources
- none required for core grading in v1.0. Any later claim about institutional legal procedure, Sanhedrin jurisdiction outside Judea, chronology dates or Roman administration must be separately sourced and cannot be inferred from this mission.

### Interpretive sources
- none required for core grading.

### Source-audit summary
- Acts 7:58 identifies Saul at Stephen's execution scene; Acts 8:1 states Saul approved the execution; Acts 8:3 depicts Saul entering houses, taking men and women and committing them to prison.
- Acts 9:1–2 depicts Saul still threatening the Lord's disciples, requesting letters from the high priest to Damascus synagogues so that people belonging to the Way, men or women, could be brought bound to Jerusalem.
- Acts 22:3–5 is Paul's later first-person testimony: born in Tarsus, brought up/educated in Jerusalem under Gamaliel, zealous for God, persecuted the Way to death, bound men and women, received letters for Damascus and intended to bring prisoners to Jerusalem for punishment.
- Acts 26:9–11 is another first-person defense: Paul says he opposed the name of Jesus of Nazareth, imprisoned many, acted with chief-priestly authority, participated when believers were put to death, punished them in synagogues, attempted to force blasphemy and pursued them as far as foreign cities.
- Gal 1:13–14 independently supplies Paul's autobiographical summary that he intensely/violently persecuted the church of God and tried to destroy it, while advancing in Judaism and being extremely zealous for ancestral traditions.
- Phil 3:5–6 includes persecution of the church within Paul's former zeal credentials.

### Disputed / limited-certainty points
- Do not infer from Acts 7:58 alone that Saul personally threw stones at Stephen. The assigned text places garments at Saul's feet and Acts 8:1 says he approved the execution; direct stoning by Saul is not stated (`T1` safeguard).
- Do not reduce Acts 26:10 «cast my vote / gave my voice» to a single unqualified modern legal-office claim; translation and interpretive questions exist around the exact institutional implication. Core grading asks only that Paul portrays himself as approving/participating when believers were put to death (`T1` at proposition level; institutional inference not graded).
- Exact harmonized chronology among Acts' narrator and Paul's later speeches is not forced beyond explicit sequence anchors.
- No `TX1` point is required for core grading in this mission.

## Narrative shell
### Opening brief
Архів відкриває справу не з дороги до Дамаска, а з того, ким Савл був до неї. Свідчення походять із двох різних типів джерел: оповіді Дій і пізніших слів самого Павла. Завдання — не переказати знайому історію, а встановити, що кожне джерело реально стверджує.

### Case question
**Що можна надійно встановити про переслідування Савлом послідовників Ісуса до дороги в Дамаск, хто це засвідчує і де закінчується пряма інформація тексту?**

### Known facts at start
- персонаж названий Савлом у ранніх сценах Дій;
- пізніше він сам описує своє минуле;
- мета місії — джерельна реконструкція, а не моральне оцінювання гравця.

### Unknowns to resolve
- роль Савла біля смерті Степана;
- кого саме він переслідував;
- які дії текст приписує йому прямо;
- які повноваження/листи він шукав або отримав;
- що сам Павло пізніше каже про мотивовану ревністю колишню поведінку;
- які деталі не можна дописувати з популярної гармонізованої історії.

## Flow
- `entry_node`: PA01-N01
- required route: `PA01-N01 → PA01-N02 → PA01-N03 → PA01-N04 → PA01-N05 → PA01-N06 → PA01-N07 → PA01-N08 → PA01-N09 → PA01-N10 → PA01-N11 → PA01-N12`
- optional nodes: `PA01-O01`, `PA01-O02`
- wrong answers route to witness-specific source re-check; no dead ends.
- completion requires PA01-N12 synthesis.

---

## PA01-N01 — Зберіть корпус справи
- `node_id`: PA01-N01
- `mission_id`: PA-01
- `task_family`: source selection
- `difficulty`: 1/6
- `required`: yes
- `skill_target`: delimit evidence corpus
- `knowledge_target`: six primary passages
- `why_this_node_exists`: prevents solving from one remembered Damascus narrative.
- `player_prompt`: Оберіть уривки, які безпосередньо описують або ретроспективно підсумовують переслідування Савлом/Павлом до дороги в Дамаск.
- `source_scope_visible_to_player`: Acts and Pauline letters references.
- `response_mode`: citation selection
- `accepted_answer`: Acts 7:58–8:3; Acts 9:1–2; Acts 22:3–5; Acts 26:9–11; Gal 1:13–14; Phil 3:5–6.
- `accepted_variants`: slightly wider ranges containing the same evidence.
- `required_evidence`: all six source units.
- `rejected_answers`: using Acts 9:3ff as a substitute for the pre-journey persecution corpus.
- `rejection_reason`: PA-01 ends at the threshold of the Damascus-road event.
- `confidence_code`: T1
- `textual_variant_flag`: none
- `success_feedback`: Корпус зібрано; далі кожне твердження прив'язується до конкретного джерела.
- `partial_feedback`: identify missing source family without revealing exact verse until later hint.
- `failure_feedback`: separate pre-Damascus persecution evidence from the encounter itself.
- `hints`: H2 — Acts + two letters; H4 — Acts 7–9 plus speeches in 22 and 26; H6 — exact ranges.
- `on_correct`: PA01-N02
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: H6+ => guided
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: REVIEW_QUEUE `PA_SOURCE_DELIMITATION_REVIEW` if weak
- `mastery_domains`: source-citation; provenance
- `evidence_strength`: recognition
- `mastery_mode`: independent unless H6+
- `spaced_retrieval`: yes
- `review_queue_rule`: PA_SOURCE_DELIMITATION_REVIEW
- `accessibility`: linear checkbox list; full keyboard operation; selected count announced.

## PA01-N02 — Степан: що Савл робить прямо?
- `node_id`: PA01-N02
- `mission_id`: PA-01
- `task_family`: claim-boundary
- `difficulty`: 2/6
- `required`: yes
- `skill_target`: distinguish explicit action from inferred participation
- `knowledge_target`: Acts 7:58; 8:1
- `why_this_node_exists`: blocks the common overclaim that the text directly says Saul threw stones.
- `player_prompt`: За Діями 7:58 і 8:1, що текст прямо каже про Савла біля смерті Степана?
- `source_scope_visible_to_player`: Acts 7:58–8:1
- `response_mode`: free response
- `accepted_answer`: witnesses placed garments at Saul's feet, and Saul approved/consented to Stephen's execution/death.
- `accepted_variants`: semantic translation equivalents.
- `required_evidence`: Acts 7:58; 8:1.
- `rejected_answers`: «Савл особисто каменував Степана» as direct textual claim.
- `rejection_reason`: assigned verses do not state that action.
- `confidence_code`: T1
- `textual_variant_flag`: none
- `success_feedback`: Межа встановлена: присутність/гардеробний епізод + схвалення смерті; особисте кидання каміння не заявлено.
- `partial_feedback`: require both garment scene and approval.
- `failure_feedback`: re-read the verbs attached to Saul.
- `hints`: H3 — two separate verses; H5 — garments / approval.
- `on_correct`: PA01-N03
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: H5+ => guided
- `optional_evidence_unlock`: PA01-O01
- `later_retrieval_effect`: CROSS_CONTEXT to PA01-N11 provenance audit
- `mastery_domains`: explicit-vs-inferred
- `evidence_strength`: recall; application
- `mastery_mode`: conditional
- `spaced_retrieval`: yes
- `review_queue_rule`: PA_PROVENANCE_REVIEW
- `accessibility`: source and claim read sequentially; no visual-only evidence marking.

## PA01-N03 — Кого Савл забирав із домів?
- `node_id`: PA01-N03
- `mission_id`: PA-01
- `task_family`: evidence extraction
- `difficulty`: 1/6
- `required`: yes
- `skill_target`: precise extraction
- `knowledge_target`: Acts 8:3 men and women imprisoned
- `why_this_node_exists`: establishes scope without vague «some believers» wording.
- `player_prompt`: Кого Дії 8:3 прямо називають серед тих, кого Савл забирав і віддавав до в'язниці?
- `source_scope_visible_to_player`: Acts 8:3
- `response_mode`: short answer
- `accepted_answer`: men and women.
- `accepted_variants`: чоловіків і жінок; both men and women.
- `required_evidence`: Acts 8:3.
- `rejected_answers`: men only; apostles only.
- `rejection_reason`: source explicitly includes both sexes.
- `confidence_code`: T1
- `textual_variant_flag`: none
- `success_feedback`: Переслідування прямо охоплює і чоловіків, і жінок.
- `partial_feedback`: none
- `failure_feedback`: locate the paired nouns in Acts 8:3.
- `hints`: H4 — two groups by sex.
- `on_correct`: PA01-N04
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: H4+ => guided
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: RESOLVED_NODE PA01-N06
- `mastery_domains`: detail-recall
- `evidence_strength`: recall
- `mastery_mode`: independent/guided conditional
- `spaced_retrieval`: yes
- `review_queue_rule`: PA_DETAIL_REVIEW
- `accessibility`: plain text response and spoken evidence feedback.

## PA01-N04 — Яка мета листів до Дамаска?
- `node_id`: PA01-N04
- `mission_id`: PA-01
- `task_family`: purpose reconstruction
- `difficulty`: 2/6
- `required`: yes
- `skill_target`: reconstruct explicit mission objective
- `knowledge_target`: Acts 9:1–2
- `why_this_node_exists`: creates the direct bridge to PA-02.
- `player_prompt`: Для чого Савл просить листи до синагог Дамаска за Діями 9:1–2?
- `source_scope_visible_to_player`: Acts 9:1–2
- `response_mode`: free response
- `accepted_answer`: to find people belonging to the Way, men or women, and bring them bound/prisoners to Jerusalem.
- `accepted_variants`: semantic translation equivalents.
- `required_evidence`: Acts 9:1–2.
- `rejected_answers`: to preach in Damascus; to meet Ananias.
- `rejection_reason`: those are not Saul's stated purpose before the journey.
- `confidence_code`: T1
- `textual_variant_flag`: none
- `success_feedback`: Мета подорожі до зустрічі на дорозі зафіксована як переслідування й арешт.
- `partial_feedback`: require both target and intended transfer.
- `failure_feedback`: isolate the purpose clause after the letters.
- `hints`: H4 — «the Way» + Jerusalem.
- `on_correct`: PA01-N05
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: H5+ => guided
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: RESOLVED_NODE PA02-N01 (destination reserved; PA-02 must preserve this ID or record migration if changed before publication)
- `mastery_domains`: chronology; purpose; retrieval
- `evidence_strength`: recall; application
- `mastery_mode`: conditional
- `spaced_retrieval`: yes
- `review_queue_rule`: PA_DAMASCUS_PURPOSE_REVIEW
- `accessibility`: no timed recall; linear source/prompt/answer.

## PA01-N05 — Павлова пізніша версія: Дії 22
- `node_id`: PA01-N05
- `mission_id`: PA-01
- `task_family`: first-person testimony extraction
- `difficulty`: 2/6
- `required`: yes
- `skill_target`: distinguish later self-report from narrator voice
- `knowledge_target`: Acts 22:3–5
- `why_this_node_exists`: teaches provenance by speaker.
- `player_prompt`: Які три елементи свого минулого Павло прямо називає в Діях 22:3–5 перед розповіддю про дорогу до Дамаска?
- `source_scope_visible_to_player`: Acts 22:3–5
- `response_mode`: multi-part free response
- `accepted_answer`: Jewish identity/training under Gamaliel and zeal; persecution of the Way including binding/imprisoning men and women; letters/authorization connected with bringing people from Damascus to Jerusalem for punishment.
- `accepted_variants`: semantic equivalents; exact translation phrasing not required.
- `required_evidence`: Acts 22:3–5.
- `rejected_answers`: claiming Acts' narrator says all these autobiographical details in this passage.
- `rejection_reason`: speaker is Paul in a later defense speech.
- `confidence_code`: T1
- `textual_variant_flag`: none
- `success_feedback`: Тепер доказ позначено не лише віршем, а й промовцем: це пізніше свідчення самого Павла.
- `partial_feedback`: identify missing one of three blocks.
- `failure_feedback`: separate identity/training, persecution, authorization.
- `hints`: H3 gives three categories.
- `on_correct`: PA01-N06
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: H5+ => guided
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: RESOLVED_NODE PA01-N09
- `mastery_domains`: provenance; speaker-recipient
- `evidence_strength`: synthesis
- `mastery_mode`: conditional
- `spaced_retrieval`: yes
- `review_queue_rule`: PA_PROVENANCE_REVIEW
- `accessibility`: three labelled answer fields or one linear text field; labels announced.

## PA01-N06 — Дії 26: масштаб переслідування
- `node_id`: PA01-N06
- `mission_id`: PA-01
- `task_family`: evidence expansion
- `difficulty`: 3/6
- `required`: yes
- `skill_target`: compare later testimony with earlier narrative
- `knowledge_target`: Acts 26:9–11
- `why_this_node_exists`: expands the evidentiary record while preserving speaker provenance.
- `player_prompt`: Які додаткові аспекти переслідування Павло описує в Діях 26:9–11?
- `source_scope_visible_to_player`: Acts 26:9–11
- `response_mode`: evidence selection + free response
- `accepted_answer`: opposition to the name of Jesus of Nazareth; imprisonment under chief-priestly authority; participation/approval when believers were put to death; punishment in synagogues; attempts to make them blaspheme; pursuit even to foreign cities.
- `accepted_variants`: proposition-level translation equivalents.
- `required_evidence`: Acts 26:9–11.
- `rejected_answers`: assigning every detail to Acts 8:3; claiming a specific modern legal office from «vote/voice» language.
- `rejection_reason`: provenance and institutional inference exceed the source.
- `confidence_code`: T1
- `textual_variant_flag`: none
- `success_feedback`: Доказова картина ширша, але кожна деталь лишається прив'язаною до Павлової промови в Діях 26.
- `partial_feedback`: accept subset but request missing categories.
- `failure_feedback`: group verbs by prison / death / synagogue / geographic pursuit.
- `hints`: H4 gives four action categories.
- `on_correct`: PA01-N07
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: H5+ => guided
- `optional_evidence_unlock`: PA01-O02
- `later_retrieval_effect`: RESOLVED_NODE PA01-N09
- `mastery_domains`: provenance; evidence-comparison
- `evidence_strength`: recall; synthesis
- `mastery_mode`: conditional
- `spaced_retrieval`: yes
- `review_queue_rule`: PA_PROVENANCE_REVIEW
- `accessibility`: action list available as linear selectable list; no visual matrix required.

## PA01-N07 — Галатів: як Павло підсумовує минуле?
- `node_id`: PA01-N07
- `mission_id`: PA-01
- `task_family`: epistle autobiography
- `difficulty`: 2/6
- `required`: yes
- `skill_target`: retrieve autobiographical summary from a letter
- `knowledge_target`: Gal 1:13–14
- `why_this_node_exists`: gives a source outside Acts for the same former-life theme.
- `player_prompt`: Які два пов'язані твердження про своє колишнє життя Павло робить у Гал 1:13–14?
- `source_scope_visible_to_player`: Galatians 1:13–14
- `response_mode`: free response
- `accepted_answer`: he intensely/violently persecuted the church of God and tried to destroy it; he advanced in Judaism beyond many contemporaries and was extremely zealous for ancestral traditions.
- `accepted_variants`: semantic translation equivalents.
- `required_evidence`: Gal 1:13–14.
- `rejected_answers`: claiming Galatians mentions Stephen or Damascus letters in these verses.
- `rejection_reason`: those details come from Acts, not this passage.
- `confidence_code`: T1
- `textual_variant_flag`: none
- `success_feedback`: Павлова власна епістолярна ретроспектива підтверджує інтенсивність переслідування й його колишню ревність.
- `partial_feedback`: require persecution + zeal/advancement pair.
- `failure_feedback`: keep Acts details out of Galatians.
- `hints`: H4 — «church of God» and «traditions».
- `on_correct`: PA01-N08
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: H5+ => guided
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: RESOLVED_NODE PA01-N10
- `mastery_domains`: epistle-provenance
- `evidence_strength`: recall; application
- `mastery_mode`: conditional
- `spaced_retrieval`: yes
- `review_queue_rule`: PA_EPISTLE_AUTOBIOGRAPHY_REVIEW
- `accessibility`: linear passage and text response.

## PA01-N08 — Филип'ян: де стоїть переслідування в переліку Павла?
- `node_id`: PA01-N08
- `mission_id`: PA-01
- `task_family`: context classification
- `difficulty`: 2/6
- `required`: yes
- `skill_target`: preserve local literary context
- `knowledge_target`: Phil 3:5–6
- `why_this_node_exists`: prevents decontextualized use of one phrase.
- `player_prompt`: У якому контексті Флп 3:5–6 Павло згадує переслідування церкви?
- `source_scope_visible_to_player`: Philippians 3:5–6
- `response_mode`: free response
- `accepted_answer`: within a list of former identity/credential claims, where «zeal» is illustrated by persecuting the church and law-based righteousness is described as blameless.
- `accepted_variants`: semantic equivalents.
- `required_evidence`: Phil 3:5–6.
- `rejected_answers`: treating the verse as praise of persecution or as a command to imitate it.
- `rejection_reason`: it is autobiographical credential context, not a normative command.
- `confidence_code`: T1
- `textual_variant_flag`: none
- `success_feedback`: Контекст збережено: переслідування згадується як частина колишнього набору ревнісних «переваг» Павла.
- `partial_feedback`: require credential-list context.
- `failure_feedback`: read surrounding list rather than isolated word «zeal».
- `hints`: H3 — pedigree/credentials list.
- `on_correct`: PA01-N09
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: H5+ => guided
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: REVIEW_QUEUE `PA_EPISTLE_AUTOBIOGRAPHY_REVIEW`
- `mastery_domains`: context
- `evidence_strength`: application
- `mastery_mode`: conditional
- `spaced_retrieval`: yes
- `review_queue_rule`: PA_EPISTLE_AUTOBIOGRAPHY_REVIEW
- `accessibility`: surrounding verses presented in linear reading order.

## PA01-N09 — Оповідач і Павло: не змішуйте голоси
- `node_id`: PA01-N09
- `mission_id`: PA-01
- `task_family`: provenance matrix
- `difficulty`: 3/6
- `required`: yes
- `skill_target`: assign claims to narrator vs first-person testimony
- `knowledge_target`: Acts 8/9 vs Acts 22/26
- `why_this_node_exists`: core witness-provenance training for PA campaign.
- `player_prompt`: Розкладіть твердження за походженням: рання оповідь Дій, Павлова промова в Діях 22, Павлова промова в Діях 26.
- `source_scope_visible_to_player`: Acts 8:1–3; 9:1–2; 22:3–5; 26:9–11
- `response_mode`: classification
- `accepted_answer`: every statement assigned only where explicit; overlapping propositions may have multiple provenance labels.
- `accepted_variants`: none beyond semantically equivalent labels.
- `required_evidence`: cited passages.
- `rejected_answers`: treating all details as one anonymous harmonized narrator.
- `rejection_reason`: provenance loss.
- `confidence_code`: T2
- `textual_variant_flag`: none
- `success_feedback`: Один факт може мати кілька свідчень, але кожне свідчення зберігає власного промовця й уривок.
- `partial_feedback`: highlight only misassigned claims.
- `failure_feedback`: re-open passages by speaker.
- `hints`: H4 provides three provenance buckets.
- `on_correct`: PA01-N10
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: H5+ => guided
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: RESOLVED_NODE PA01-N12
- `mastery_domains`: provenance
- `evidence_strength`: application; synthesis
- `mastery_mode`: conditional
- `spaced_retrieval`: yes
- `review_queue_rule`: PA_PROVENANCE_REVIEW
- `accessibility`: classification has linear form `claim → choose source(s)`; no drag-only table.

## PA01-N10 — Спільне ядро без штучної гармонізації
- `node_id`: PA01-N10
- `mission_id`: PA-01
- `task_family`: synthesis
- `difficulty`: 3/6
- `required`: yes
- `skill_target`: derive supported common core
- `knowledge_target`: pre-Damascus persecutor profile
- `why_this_node_exists`: creates a concise proposition set supported across source types.
- `player_prompt`: Сформулюйте мінімальне спільне ядро про Савла до дороги в Дамаск, не приписуючи кожному джерелу всі деталі інших.
- `source_scope_visible_to_player`: all PA-01 primary sources
- `response_mode`: structured free response
- `accepted_answer`: Saul/Paul intensely persecuted followers/the church; imprisonment/binding is explicitly attested; his actions were associated with zeal and high-priestly/chief-priestly authorization in Acts; the Damascus journey began with intent to apprehend people of the Way and bring them to Jerusalem.
- `accepted_variants`: narrower propositions supported by evidence; not all clauses need be claimed as present in every source.
- `required_evidence`: at least Acts 8:3; Acts 9:1–2; one later Acts speech; Gal 1:13–14 or Phil 3:6.
- `rejected_answers`: every source says he tried to force blasphemy; every source names Gamaliel; Saul personally stoned Stephen.
- `rejection_reason`: witness-specific details overgeneralized.
- `confidence_code`: T2
- `textual_variant_flag`: none
- `success_feedback`: Спільне ядро зібране без втрати походження конкретних деталей.
- `partial_feedback`: identify overgeneralized clause.
- `failure_feedback`: reduce synthesis to propositions supported by cited witnesses.
- `hints`: H4 asks «which source actually says this?» for each clause.
- `on_correct`: PA01-N11
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: H5+ => guided
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: RESOLVED_NODE PA01-N12
- `mastery_domains`: source-comparison; synthesis
- `evidence_strength`: synthesis
- `mastery_mode`: conditional
- `spaced_retrieval`: yes
- `review_queue_rule`: PA_SYNTHESIS_REVIEW
- `accessibility`: structured linear fields `claim → source → confidence`.

## PA01-N11 — Межі знання
- `node_id`: PA01-N11
- `mission_id`: PA-01
- `task_family`: overclaim audit
- `difficulty`: 4/6
- `required`: yes
- `skill_target`: reject unsupported additions
- `knowledge_target`: mission uncertainty boundaries
- `why_this_node_exists`: prevents later PA missions from inheriting popular but uncited details.
- `player_prompt`: Позначте твердження як «прямо сказано», «можна порівняти», або «не встановлено цим корпусом»: Савл особисто каменував Степана; Савл схвалював його смерть; переслідувалися чоловіки й жінки; точна сучасна юридична посада Савла; мета поїздки в Дамаск.
- `source_scope_visible_to_player`: all PA-01 sources
- `response_mode`: classification
- `accepted_answer`: personal stoning — not stated; approval — direct; men and women — direct; exact modern legal office — not established; Damascus apprehension purpose — direct.
- `accepted_variants`: semantic category equivalents.
- `required_evidence`: Acts 7:58–8:3; 9:1–2.
- `rejected_answers`: upgrading inference to direct fact.
- `rejection_reason`: evidence-boundary violation.
- `confidence_code`: T2
- `textual_variant_flag`: none
- `success_feedback`: Межі справи зафіксовані й можуть безпечно переноситися в наступні місії.
- `partial_feedback`: return only misclassified claims.
- `failure_feedback`: inspect explicit verbs and nouns.
- `hints`: H4 identifies two direct anchors.
- `on_correct`: PA01-N12
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: H5+ => guided
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: REVIEW_QUEUE `PA_PROVENANCE_REVIEW`
- `mastery_domains`: epistemic-boundary
- `evidence_strength`: application
- `mastery_mode`: conditional
- `spaced_retrieval`: yes
- `review_queue_rule`: PA_PROVENANCE_REVIEW
- `accessibility`: each claim read as numbered item with textual category choices.

## PA01-N12 — Фінальна реконструкція: хто був Савл перед дорогою?
- `node_id`: PA01-N12
- `mission_id`: PA-01
- `task_family`: final reconstruction
- `difficulty`: 4/6
- `required`: yes
- `skill_target`: evidence-backed narrative synthesis
- `knowledge_target`: complete PA-01 profile
- `why_this_node_exists`: closes the case and creates retrieval payload for PA-02.
- `player_prompt`: Побудуйте коротку реконструкцію Савла перед дорогою до Дамаска. Для кожного ключового твердження вкажіть джерело та не переносіть специфічну деталь одного свідчення на всі інші.
- `source_scope_visible_to_player`: all primary sources
- `response_mode`: structured reconstruction
- `accepted_answer`: a source-backed synthesis covering Stephen-scene boundary, active persecution/imprisonment, autobiographical zeal, authorization and Damascus objective, with provenance labels.
- `accepted_variants`: any coherent evidence-grounded reconstruction preserving uncertainty boundaries.
- `required_evidence`: minimum four distinct source units including one epistle.
- `rejected_answers`: unsupported personal stoning; conversion-event details from PA-02; unnamed modern legal status.
- `rejection_reason`: scope/provenance violation.
- `confidence_code`: T2
- `textual_variant_flag`: none
- `success_feedback`: Справу «Переслідувач» закрито. Наступна місія починається з уже встановленої мети поїздки до Дамаска, а не з переписаної заднім числом мотивації.
- `partial_feedback`: identify unsupported or uncited claim.
- `failure_feedback`: rebuild claim by claim with source citation.
- `hints`: H3 provides reconstruction slots; H6 provides source checklist.
- `on_correct`: mission_complete
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: H6+ => guided completion
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: RESOLVED_NODE PA02-N01 for Damascus-purpose retrieval; REVIEW_QUEUE for weak provenance claims
- `mastery_domains`: synthesis; provenance; chronology
- `evidence_strength`: synthesis
- `mastery_mode`: conditional
- `spaced_retrieval`: yes
- `review_queue_rule`: PA_POST_MISSION_REVIEW
- `accessibility`: linear repeatable structure `claim → source → confidence/qualification`; completion summary announced.

## Optional PA01-O01 — Чи сказано, що Савл кидав каміння?
- `node_id`: PA01-O01
- `mission_id`: PA-01
- `task_family`: precision challenge
- `difficulty`: 2/6
- `required`: no
- `skill_target`: distinguish presence/approval from direct action
- `knowledge_target`: Acts 7:58–8:1
- `why_this_node_exists`: reinforces anti-overclaim safeguard.
- `player_prompt`: Чи дозволяє цей уривок стверджувати як T1, що Савл особисто кидав каміння в Степана?
- `source_scope_visible_to_player`: Acts 7:58–8:1
- `response_mode`: yes/no + evidence
- `accepted_answer`: no; the text states garments were placed at his feet and that he approved/consented to the execution.
- `accepted_variants`: semantic equivalents.
- `required_evidence`: Acts 7:58; 8:1.
- `rejected_answers`: yes as direct textual claim.
- `rejection_reason`: exceeds wording.
- `confidence_code`: T1
- `textual_variant_flag`: none
- `success_feedback`: Надійний висновок — схвалення; особисте каменування не заявлено.
- `partial_feedback`: none
- `failure_feedback`: inspect explicit verbs.
- `hints`: H4 — approval ≠ direct stoning claim.
- `on_correct`: return_to_main_route
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: guided
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: NONE
- `mastery_domains`: explicit-vs-inferred
- `evidence_strength`: application
- `mastery_mode`: conditional
- `spaced_retrieval`: no
- `review_queue_rule`: none
- `accessibility`: yes/no controls labelled; evidence read textually.

## Optional PA01-O02 — «Голос/голосування» в Діях 26:10
- `node_id`: PA01-O02
- `mission_id`: PA-01
- `task_family`: translation/interpretation boundary
- `difficulty`: 5/6
- `required`: no
- `skill_target`: avoid overclaim from translation wording
- `knowledge_target`: Acts 26:10 death-approval clause
- `why_this_node_exists`: trains caution where English/Ukrainian translations can suggest stronger institutional precision than the mission can prove.
- `player_prompt`: Який безпечний для оцінювання висновок можна взяти з Дій 26:10 без визначення точної юридичної посади Павла?
- `source_scope_visible_to_player`: Acts 26:10 across responsible translations
- `response_mode`: free response
- `accepted_answer`: Paul portrays himself as approving/participating in decisions or action when believers were put to death; the exact institutional/legal role is not graded from this verse alone.
- `accepted_variants`: proposition-level equivalents.
- `required_evidence`: Acts 26:10.
- `rejected_answers`: asserting a specific formal office as T1 solely from one translation's «vote» wording.
- `rejection_reason`: interpretive/legal overreach.
- `confidence_code`: D1
- `textual_variant_flag`: none
- `success_feedback`: В оцінюванні лишається тільки те, що стабільно підтримує текст; юридична реконструкція винесена за межі цієї місії.
- `partial_feedback`: none
- `failure_feedback`: separate proposition from institutional inference.
- `hints`: H5 — grade the action/approval, not the office.
- `on_correct`: return_to_main_route
- `on_partial`: return_to_current_node
- `on_incorrect`: return_to_current_node
- `on_hint_threshold`: guided
- `optional_evidence_unlock`: none
- `later_retrieval_effect`: REVIEW_QUEUE `PA_TRANSLATION_BOUNDARY_REVIEW`
- `mastery_domains`: translation-neutrality; epistemic-boundary
- `evidence_strength`: application
- `mastery_mode`: conditional
- `spaced_retrieval`: yes
- `review_queue_rule`: PA_TRANSLATION_BOUNDARY_REVIEW
- `accessibility`: translation samples exposed as sequential labelled text, not visual columns only.

## Completion synthesis
PA-01 closes with a provenance-aware profile: Saul is explicitly linked to approval of Stephen's death, active household persecution and imprisonment, threats and a Damascus arrest objective in Acts; later speeches and letters add his own retrospective descriptions of zeal, imprisonment, punishment and attempted destruction of the church. The mission does not yet narrate the Damascus encounter.

## Mission Definition of Done check
- 12 required + 2 optional nodes have stable full IDs.
- Required route reaches synthesis without dead end.
- Every node has explicit branch/retrieval/mastery/accessibility fields.
- Answer-bearing claims are tied to cited Scripture; no external historical claim is required for grading.
- Translation-neutral semantic grading is required throughout.
- No material TX1 grading point is used in v1.0.
- PA-02 retrieval contract is established but PA02-N01 remains a reserved destination until PA-02 is authored; if PA-02 uses another stable ID, the retrieval registry must version the migration rather than silently changing history.