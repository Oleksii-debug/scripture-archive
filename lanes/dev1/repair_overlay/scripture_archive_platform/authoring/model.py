from __future__ import annotations

from typing import Any

from scripture_archive_platform.domain.models import CONTENT_SCHEMA_VERSION

DRAFT_SCHEMA = "scripture.authoring.draft.v1"
PUBLISH_SCHEMA = "scripture.publish-candidate.v1"
CHANGE_RECORD_SCHEMA = "scripture.authoring.change-record.v1"
KINDS = {"campaign", "mission", "node"}
CONFIDENCE_CODES = {"T1", "T2", "C1", "I1", "D1"}
TX_FLAGS = {"none", "TX1"}
EVIDENCE_STRENGTH = {"recognition", "recall", "application", "synthesis"}
HINT_KEYS = tuple(f"H{i}" for i in range(1, 8))

NODE_REQUIRED = (
    "node_id", "mission_id", "task_family", "difficulty", "required", "skill_target",
    "knowledge_target", "why_this_node_exists", "player_prompt",
    "source_scope_visible_to_player", "response_mode", "accepted_answer",
    "accepted_variants", "required_evidence", "rejected_answers", "rejection_reason",
    "confidence_code", "textual_variant_flag", "success_feedback", "partial_feedback",
    "failure_feedback", "hints", "on_hint_threshold", "on_correct", "on_partial",
    "on_incorrect", "optional_evidence_unlock", "later_retrieval_effect",
    "mastery_domains", "evidence_strength", "mastery_mode", "spaced_retrieval",
    "review_queue_rule", "functional_nonvisual_equivalent",
)
CAMPAIGN_REQUIRED = (
    "campaign_id", "title_ua", "scope", "player_promise", "estimated_total_time",
    "entry_requirements", "mission_sequence", "mastery_domains", "source_corpus",
    "theological_risk_notes", "accessibility_risk_notes", "completion_reward_type",
    "editorial_status", "source_audit_status",
)
MISSION_REQUIRED = (
    "mission_id", "campaign_id", "title", "mission_role", "estimated_time", "difficulty",
    "learning_objectives", "mastery_tags", "retrieval_targets", "future_repetition_hooks",
    "primary_scripture", "secondary_scripture", "historical_context_sources",
    "interpretive_sources", "source_classification_notes", "disputed_points",
    "textual_variant_points", "opening_brief", "case_question", "known_facts_at_start",
    "unknowns_to_resolve", "completion_synthesis", "entry_node", "task_nodes",
    "optional_nodes", "failure_recovery_routes", "completion_conditions",
    "perfect_investigation_conditions", "accessibility",
)


def blank_campaign() -> dict[str, Any]:
    return {
        "campaign_id": "", "title_ua": "", "scope": "", "player_promise": "",
        "estimated_total_time": "", "entry_requirements": [], "mission_sequence": [],
        "mastery_domains": [], "source_corpus": [], "theological_risk_notes": "",
        "accessibility_risk_notes": "", "completion_reward_type": "",
        "editorial_status": "DRAFT", "source_audit_status": "NOT_AUDITED",
    }


def blank_mission() -> dict[str, Any]:
    return {
        "mission_id": "", "campaign_id": "", "title": "", "mission_role": "",
        "estimated_time": "", "difficulty": "2/6", "learning_objectives": [],
        "mastery_tags": [], "retrieval_targets": [], "future_repetition_hooks": [],
        "primary_scripture": [], "secondary_scripture": "none",
        "historical_context_sources": "none", "interpretive_sources": "none",
        "source_classification_notes": "", "disputed_points": [],
        "textual_variant_points": "none", "opening_brief": "", "case_question": "",
        "known_facts_at_start": [], "unknowns_to_resolve": [], "completion_synthesis": "",
        "entry_node": "", "task_nodes": [], "optional_nodes": [],
        "failure_recovery_routes": [], "completion_conditions": [],
        "perfect_investigation_conditions": "not used",
        "accessibility": {"keyboard_complete": True, "nonvisual_equivalent": ""},
    }


def blank_node() -> dict[str, Any]:
    return {
        "node_id": "", "mission_id": "", "task_type": "SHORT_TEXT",
        "task_family": "", "difficulty": "2/6", "required": True,
        "skill_target": "", "knowledge_target": "", "why_this_node_exists": "",
        "player_prompt": "", "source_scope_visible_to_player": "",
        "response_mode": "short_text", "accepted_answer": "", "accepted_variants": [],
        "required_evidence": [], "rejected_answers": [], "rejection_reason": "",
        "confidence_code": "T1", "textual_variant_flag": "none",
        "success_feedback": "", "partial_feedback": "", "failure_feedback": "",
        "hints": {key: "" for key in HINT_KEYS},
        "on_hint_threshold": "guided_then_follow_on_correct", "on_correct": "none",
        "on_partial": "return_to_current_node", "on_incorrect": "return_to_current_node",
        "optional_evidence_unlock": "none",
        "later_retrieval_effect": "REVIEW_QUEUE AUTHORING_REVIEW",
        "mastery_domains": [], "evidence_strength": ["recognition"],
        "mastery_mode": "independent; H6/H7 records guided mastery",
        "spaced_retrieval": "yes", "review_queue_rule": "AUTHORING_REVIEW",
        "functional_nonvisual_equivalent": (
            "Keyboard-complete labelled linear controls with textual feedback/evidence/"
            "confidence/mastery state."
        ),
        "answer_contract": {},
        "ui_metadata": {"options": [], "items": [], "pairs": [], "evidence_options": [], "steps": []},
        "visual_metadata": {"theme_token": "archive", "accent_token": "accent", "icon": None,
                            "media_slot": None, "text_equivalent": ""},
    }

__all__ = [
    "DRAFT_SCHEMA", "PUBLISH_SCHEMA", "CHANGE_RECORD_SCHEMA", "CONTENT_SCHEMA_VERSION",
    "KINDS", "CONFIDENCE_CODES", "TX_FLAGS", "EVIDENCE_STRENGTH", "HINT_KEYS",
    "NODE_REQUIRED", "CAMPAIGN_REQUIRED", "MISSION_REQUIRED",
    "blank_campaign", "blank_mission", "blank_node",
]
