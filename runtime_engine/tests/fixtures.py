from copy import deepcopy

# Exact canonical R05 records copied from live main fixtures and trimmed only by JSON formatting, not semantics.
LN01_N03 = {
    "node_id":"LN01-N03","mission_id":"LN-01","task_family":"text-vs-inference classification","difficulty":"2/6","required":True,
    "skill_target":"classify explicit wording versus parallel synthesis","knowledge_target":"Mark's two disciples vs Luke's named Peter and John",
    "why_this_node_exists":"Teaches that a plausible cross-Gospel synthesis is not the same as explicit wording in one witness.",
    "player_prompt":"Classify: «Mark 14 explicitly identifies the two disciples as Peter and John.»",
    "source_scope_visible_to_player":"Mark 14:13; Luke 22:8.","response_mode":"classification",
    "accepted_answer":"UNSUPPORTED AS A CLAIM ABOUT MARK ALONE; Mark states two disciples, Luke supplies Peter and John.",
    "accepted_variants":"Equivalent wording preserving explicit-vs-comparison distinction.","required_evidence":"Mark 14:13; Luke 22:8.",
    "rejected_answers":"DIRECT TEXT in Mark.","rejection_reason":"The names are not stated by Mark in this passage.","confidence_code":"T2","textual_variant_flag":"none",
    "success_feedback":"Джерельна межа збережена: паралель може підтримати синтез, але не переписує Марка.",
    "partial_feedback":"Якщо обрано «supported by comparison», виправте лише слово «Mark explicitly».",
    "failure_feedback":"Запитайте, що саме каже Марко без допомоги Луки.",
    "hints":{"H1":"Restate the task goal without revealing the answer.","H2":"Identify the relevant witness/source.","H3":"Narrow to the decisive verse or claim.","H4":"Separate direct text from comparison/inference.","H5":"Check provenance and the likely overclaim.","H6":"Reveal the decisive source anchor.","H7":"Guided answer/model may be shown; mastery becomes guided."},
    "on_correct":"LN01-N04","on_partial":"return_to_current_node_after_targeted_partial_feedback","on_incorrect":"return_to_current_node_after_targeted_source_recheck","on_hint_threshold":"guided_then_follow_on_correct","optional_evidence_unlock":"none","later_retrieval_effect":"RESOLVED_NODE LN12-N03",
    "mastery_domains":["TEXT_VS_INFERENCE","GOSPEL_PARALLELS"],"evidence_strength":["application"],"mastery_mode":"independent; H6/H7 or answer reveal records guided mastery","spaced_retrieval":"yes","review_queue_rule":"LN_PREPARATION_PROVENANCE_REVIEW",
    "functional_nonvisual_equivalent":"Keyboard-complete labelled linear text/control flow; feedback announces result, source, confidence/TX1, mastery effect and next action."
}

PA02_N04 = {
    "node_id":"PA02-N04","mission_id":"PA-02","task_family":"chronology/detail comparison","difficulty":"2/6","required":True,
    "skill_target":"preserve local time/location","knowledge_target":"near Damascus vs midday","why_this_node_exists":"prevents a time or location detail from one retelling being declared explicit in all three.",
    "player_prompt":"Що кожне свідчення прямо говорить про час і місце моменту світла?","source_scope_visible_to_player":"Acts 9:3; 22:6; 26:13.","response_mode":"witness comparison",
    "accepted_answer":"Acts 9:3: near/approaching Damascus; the verse does not state noon. Acts 22:6: about noon, near Damascus. Acts 26:13: at midday/noon, on the road.",
    "accepted_variants":"translation-equivalent wording for approaching/near Damascus and midday/noon.","required_evidence":"Acts 9:3; 22:6; 26:13.",
    "rejected_answers":"all three explicitly say noon; Acts 9:3 gives an exact clock time.","rejection_reason":"the local wording differs and Acts 9:3 does not state noon.","confidence_code":"T2","textual_variant_flag":"none",
    "success_feedback":"Час і місце розведено за свідками: Дії 9 не отримують «полудень» лише тому, що він є в пізніших промовах.",
    "partial_feedback":"Один witness рядок містить зайву деталь. Збережіть правильні два й виправте лише цей.","failure_feedback":"Прочитайте три короткЖ вірші окремо й запишіть лише те, що кожен із них прямо додає.",
    "hints":{"H1":"Порівнюйте три рядки, не гармонізуйте.","H2":"Спочатку Acts 9:3: місце, але чи є там час?","H3":"Потім Acts 22:6: перевірте time marker.","H4":"Acts 26:13 теж має time marker.","H5":"Не переносіть midday назад у Acts 9:3.","H6":"Acts 9:3; 22:6; 26:13.","H7":"Acts 9:3 — approaching Damascus, no noon stated; Acts 22:6 — about noon near Damascus; Acts 26:13 — midday on the road. Guided."},
    "on_correct":"PA02-N05","on_partial":"return_to_current_node_mismatched_witness_only","on_incorrect":"return_to_current_node_after_local_detail_reread","on_hint_threshold":"guided_then_PA02-N05","optional_evidence_unlock":"none","later_retrieval_effect":"REVIEW_QUEUE PA_DAMASCUS_LOCAL_DETAIL_REVIEW",
    "mastery_domains":["local-detail","chronology-boundary"],"evidence_strength":["application"],"mastery_mode":"independent; H6/H7 or answer reveal records guided mastery","spaced_retrieval":"yes","review_queue_rule":"PA_DAMASCUS_LOCAL_DETAIL_REVIEW",
    "functional_nonvisual_equivalent":"Three labelled witness rows; time and location announced as separate fields; no timeline graphic required."
}


def node_from(base=LN01_N03, **changes):
    node = deepcopy(base)
    node.update(changes)
    node.setdefault("task_type", node.get("response_mode", "short text"))
    return node
