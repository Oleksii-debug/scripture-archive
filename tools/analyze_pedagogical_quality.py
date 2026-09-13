#!/usr/bin/env python3
"""Pedagogical quality analyzer for CONTENT_NODE_SCHEMA v1.2.

This tool is deliberately source-neutral. It detects mechanically provable
pedagogical contract failures and heuristic review signals; it never decides
biblical/source truth and never rewrites content.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

SCHEMA = "CONTENT_NODE_SCHEMA_v1.2"
HINT_KEYS = tuple(f"H{i}" for i in range(1, 8))
BLOCKER = "BLOCKER"
WARN = "WARN"
INFO = "INFO"
SEVERITY_ORDER = {INFO: 0, WARN: 1, BLOCKER: 2}

_PLACEHOLDER_TOKENS = {
    "todo", "tbd", "placeholder", "not used", "not_used", "n/a", "na",
    "correct", "incorrect", "try again", "good job", "well done",
}
_GENERIC_HINT_PATTERNS = (
    "restatethe task goal without revealing the answer",
    "identify the relevant witness/source",
    "narrow to the decisive verse or claim",
    "separate direct text from comparison/inference",
    "check provenance and the likely overclaim",
    "reveal the decisive source anchor",
    "guided answer/model may be shown; mastery becomes guided",
)


@dataclass(frozen=True)
class Finding:
    severity: str
    code: str
    node_id: str
    file: str
    message: str
    evidence: str = ""


@dataclass(frozen=True)
class NodeRecord:
    file: Path
    node: Mapping[str, Any]

    @property
    def node_id(self) -> str:
        return str(self.node.get("node_id") or "<missing>")


@dataclass
class AnalysisResult:
    files_scanned: int
    schema_files: int
    nodes_analyzed: int
    findings: list[Finding]
    duplicate_hint_ladders: list[dict[str, Any]]
    duplicate_prompt_answer_fingerprints: list[dict[str, Any]]
    repeated_feedback_fingerprints: list[dict[str, Any]]
    canonical_status_counts: dict[str, int]

    def counts(self) -> dict[str, int]:
        out = {BLOCKER: 0, WARN: 0, INFO: 0}
        for finding in self.findings:
            out[finding.severity] += 1
        return out

    def to_dict(self) -> dict[str, Any]:
        return {
            "contract": "SCRIPTURE_ARCHIVE_PEDAGOGICAL_QUALITY_REPORT_v1",
            "files_scanned": self.files_scanned,
            "schema_files": self.schema_files,
            "nodes_analyzed": self.nodes_analyzed,
            "finding_counts": self.counts(),
            "canonical_status_counts": self.canonical_status_counts,
            "findings": [asdict(item) for item in self.findings],
            "duplicate_hint_ladders": self.duplicate_hint_ladders,
            "duplicate_prompt_answer_fingerprints": self.duplicate_prompt_answer_fingerprints,
            "repeated_feedback_fingerprints": self.repeated_feedback_fingerprints,
            "interpretation": {
                "BLOCKER": "mechanically provable pedagogical contract failure",
                "WARN": "review signal; requires human/source-aware judgment before content mutation",
                "INFO": "inventory/context only",
                "not_claimed": [
                    "biblical/source correctness",
                    "independent audit acceptance",
                    "authored/source-audited count promotion",
                    "automatic content repair",
                ],
            },
        }


def _norm(value: Any) -> str:
    text = str(value or "").strip().casefold()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^\w\s]+", "", text, flags=re.UNICODE)
    return text.strip()


def _fingerprint(*parts: Any) -> str:
    payload = "\x1f".join(_norm(part) for part in parts)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _is_placeholder(value: Any) -> bool:
    normalized = _norm(value)
    if not normalized:
        return True
    if normalized in _PLACEHOLDER_TOKENS:
        return True
    return any(token in normalized for token in ("todo", "tbd", "placeholder", "not_used"))


def _has_substance(value: Any, *, minimum: int = 12) -> bool:
    text = str(value or "").strip()
    return len(text) >= minimum and not _is_placeholder(text)


def _discover_json(roots: Sequence[str]) -> list[Path]:
    found: set[Path] = set()
    for raw in roots:
        path = Path(raw)
        if path.is_dir():
            found.update(p for p in path.rglob("*.json") if p.is_file())
        elif path.is_file():
            found.add(path)
    return sorted(found, key=lambda p: p.as_posix())


def _load_schema_nodes(paths: Iterable[Path]) -> tuple[list[NodeRecord], int, Counter[str]]:
    records: list[NodeRecord] = []
    schema_files = 0
    statuses: Counter[str] = Counter()
    for path in paths:
        try:
            doc = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError):
            continue
        if not isinstance(doc, dict) or doc.get("schema_version") != SCHEMA:
            continue
        nodes = doc.get("nodes")
        if not isinstance(nodes, list):
            continue
        schema_files += 1
        statuses[str(doc.get("canonical_status") or "<unspecified>")] += len(nodes)
        for node in nodes:
            if isinstance(node, dict):
                records.append(NodeRecord(path, node))
    return records, schema_files, statuses


def _node_findings(record: NodeRecord) -> list[Finding]:
    n = record.node
    nid = record.node_id
    file = record.file.as_posix()
    findings: list[Finding] = []

    hints = n.get("hints")
    if not isinstance(hints, dict):
        findings.append(Finding(BLOCKER, "HINT_LADDER_NOT_OBJECT", nid, file, "hints must be an H1-H7 object"))
    else:
        actual_keys = set(map(str, hints.keys()))
        missing = [key for key in HINT_KEYS if key not in actual_keys]
        extra = sorted(actual_keys - set(HINT_KEYS))
        if missing or extra:
            findings.append(Finding(
                BLOCKER,
                "HINT_LADDER_KEYS",
                nid,
                file,
                "hint ladder must contain exactly H1-H7",
                f"missing={missing}; extra={extra}",
            ))
        for key in HINT_KEYS:
            if key in hints and not _has_substance(hints[key], minimum=8):
                findings.append(Finding(
                    BLOCKER,
                    "HINT_NOT_SUBSTANTIVE",
                    nid,
                    file,
                    f"{key} is empty or placeholder-like",
                    str(hints[key])[:160],
                ))
        normalized_hints = [_norm(hints.get(key)) for key in HINT_KEYS if key in hints]
        if len(normalized_hints) == 7 and len(set(normalized_hints)) < 5:
            findings.append(Finding(
                BLOCKER,
                "HINT_LADDER_COLLAPSED",
                nid,
                file,
                "at least three H1-H7 steps collapse to duplicate wording",
                f"unique_steps={len(set(normalized_hints))}/7",
            ))

    feedback_fields = ("success_feedback", "partial_feedback", "failure_feedback")
    feedback_values = []
    for field in feedback_fields:
        value = n.get(field)
        feedback_values.append(_norm(value))
        if not _has_substance(value, minimum=12):
            findings.append(Finding(
                BLOCKER,
                "FEEDBACK_NOT_SUBSTANTIVE",
                nid,
                file,
                f"{field} is empty or placeholder-like",
                str(value)[:160],
            ))
    if all(feedback_values) and len(set(feedback_values)) < 3:
        findings.append(Finding(
            BLOCKER,
            "FEEDBACK_OUTCOME_COLLAPSE",
            nid,
            file,
            "success/partial/failure feedback must remain outcome-specific",
        ))

    for field, minimum in (
        ("why_this_node_exists", 18),
        ("skill_target", 12),
        ("knowledge_target", 8),
        ("functional_nonvisual_equivalent", 20),
    ):
        if not _has_substance(n.get(field), minimum=minimum):
            findings.append(Finding(
                BLOCKER,
                "PEDAGOGICAL_FIELD_NOT_SUBSTANTIVE",
                nid,
                file,
                f"{field} is empty or placeholder-like",
                str(n.get(field))[:160],
            ))

    mastery_domains = n.get("mastery_domains")
    if not isinstance(mastery_domains, list) or not mastery_domains or any(not str(item).strip() for item in mastery_domains):
        findings.append(Finding(BLOCKER, "MASTERY_DOMAINS_INVALID", nid, file, "mastery_domains must be a non-empty list"))

    mastery_mode = _norm(n.get("mastery_mode"))
    if not mastery_mode:
        findings.append(Finding(BLOCKER, "MASTERY_MODE_MISSING", nid, file, "mastery_mode is required"))
    elif isinstance(hints, dict) and _norm(hints.get("H7")) and "guided" in _norm(hints.get("H7")) and "guided" not in mastery_mode:
        findings.append(Finding(
            BLOCKER,
            "GUIDED_REVEAL_WITHOUT_MASTERY_DOWNGRADE",
            nid,
            file,
            "H7 describes guided/revealed help but mastery_mode does not record guided mastery",
        ))

    spaced = _norm(n.get("spaced_retrieval"))
    if spaced not in {"yes", "true", "enabled", "required"}:
        findings.append(Finding(
            WARN,
            "SPACED_RETRIEVAL_NOT_EXPLICIT",
            nid,
            file,
            "spaced_retrieval is not an explicit enabled value",
            str(n.get("spaced_retrieval"))[:120],
        ))

    review_rule = n.get("review_queue_rule")
    if not _has_substance(review_rule, minimum=3):
        findings.append(Finding(BLOCKER, "REVIEW_QUEUE_RULE_MISSING", nid, file, "review_queue_rule must be explicit"))

    retrieval_effect = str(n.get("later_retrieval_effect") or "").strip()
    if not retrieval_effect:
        findings.append(Finding(BLOCKER, "LATER_RETRIEVAL_EFFECT_MISSING", nid, file, "later_retrieval_effect must be explicit"))

    prompt = str(n.get("player_prompt") or "")
    answer = str(n.get("accepted_answer") or "")
    if _norm(prompt) == _norm(answer) and _norm(prompt):
        findings.append(Finding(
            BLOCKER,
            "ANSWER_LEAKS_AS_PROMPT",
            nid,
            file,
            "normalized player_prompt is identical to accepted_answer",
        ))

    return findings


def analyze(roots: Sequence[str], *, duplicate_threshold: int = 3) -> AnalysisResult:
    paths = _discover_json(roots)
    records, schema_files, statuses = _load_schema_nodes(paths)
    findings: list[Finding] = []
    for record in records:
        findings.extend(_node_findings(record))

    hint_ladders: defaultdict[str, list[NodeRecord]] = defaultdict(list)
    prompt_answers: defaultdict[str, list[NodeRecord]] = defaultdict(list)
    feedback_sets: defaultdict[str, list[NodeRecord]] = defaultdict(list)
    per_hint_text: defaultdict[str, list[tuple[NodeRecord, str]]] = defaultdict(list)

    for record in records:
        n = record.node
        hints = n.get("hints")
        if isinstance(hints, dict) and all(key in hints for key in HINT_KEYS):
            hint_ladders[_fingerprint(*(hints[key] for key in HINT_KEYS))].append(record)
            for key in HINT_KEYS:
                text_norm = _norm(hints[key])
                if text_norm:
                    per_hint_text[text_norm].append((record, key))
        prompt_answers[_fingerprint(n.get("player_prompt"), n.get("accepted_answer"))].append(record)
        feedback_sets[_fingerprint(n.get("success_feedback"), n.get("partial_feedback"), n.get("failure_feedback"))].append(record)

    duplicate_hint_ladders = []
    for fp, group in sorted(hint_ladders.items()):
        if len(group) >= duplicate_threshold:
            ids = [item.node_id for item in group]
            duplicate_hint_ladders.append({"fingerprint": fp, "count": len(group), "node_ids": ids})
            for item in group:
                findings.append(Finding(
                    WARN,
                    "DUPLICATE_HINT_LADDER",
                    item.node_id,
                    item.file.as_posix(),
                    f"identical H1-H7 ladder occurs in {len(group)} nodes; review for wording-only/filler pedagogy",
                    ",".join(ids[:12]),
                ))

    duplicate_prompt_answer = []
    for fp, group in sorted(prompt_answers.items()):
        if len(group) >= 2:
            ids = [item.node_id for item in group]
            duplicate_prompt_answer.append({"fingerprint": fp, "count": len(group), "node_ids": ids})
            for item in group:
                findings.append(Finding(
                    WARN,
                    "DUPLICATE_PROMPT_ANSWER_FINGERPRINT",
                    item.node_id,
                    item.file.as_posix(),
                    "normalized prompt+accepted-answer pair is duplicated across stable IDs; verify this is not wording-only EXACT inflation",
                    ",".join(ids[:12]),
                ))

    repeated_feedback = []
    for fp, group in sorted(feedback_sets.items()):
        if len(group) >= duplicate_threshold:
            ids = [item.node_id for item in group]
            repeated_feedback.append({"fingerprint": fp, "count": len(group), "node_ids": ids})
            for item in group:
                findings.append(Finding(
                    WARN,
                    "DUPLICATE_FEEDBACK_SET",
                    item.node_id,
                    item.file.as_posix(),
                    f"identical success/partial/failure feedback set occurs in {len(group)} nodes",
                    ",".join(ids[:12]),
                ))

    for text_norm, uses in per_hint_text.items():
        if len(uses) < max(5, duplicate_threshold):
            continue
        if text_norm in {_norm(value) for value in _GENERIC_HINT_PATTERNS}:
            ids = [item.node_id for item, _ in uses]
            for item, key in uses:
                findings.append(Finding(
                    WARN,
                    "GENERIC_HINT_REUSE",
                    item.node_id,
                    item.file.as_posix(),
                    f"{key} uses a corpus-repeated generic hint template; review whether it narrows this node specifically",
                    f"uses={len(uses)}; sample={','.join(ids[:10])}",
                ))

    findings.sort(key=lambda f: (-SEVERITY_ORDER[f.severity], f.file, f.node_id, f.code))
    return AnalysisResult(
        files_scanned=len(paths),
        schema_files=schema_files,
        nodes_analyzed=len(records),
        findings=findings,
        duplicate_hint_ladders=duplicate_hint_ladders,
        duplicate_prompt_answer_fingerprints=duplicate_prompt_answer,
        repeated_feedback_fingerprints=repeated_feedback,
        canonical_status_counts=dict(sorted(statuses.items())),
    )


def _markdown(result: AnalysisResult) -> str:
    counts = result.counts()
    lines = [
        "# Scripture Archive pedagogical quality report",
        "",
        f"- Schema: `{SCHEMA}`",
        f"- Files scanned: {result.files_scanned}",
        f"- Schema files: {result.schema_files}",
        f"- Nodes analyzed: {result.nodes_analyzed}",
        f"- BLOCKER findings: {counts[BLOCKER]}",
        f"- WARN findings: {counts[WARN]}",
        f"- INFO findings: {counts[INFO]}",
        "",
        "> WARN findings are review signals only. They do not prove a biblical/source defect and must not trigger automatic content rewriting.",
        "",
        "## Canonical status inventory",
        "",
    ]
    for status, count in result.canonical_status_counts.items():
        lines.append(f"- `{status}`: {count} nodes")
    lines.extend(["", "## Findings", ""])
    if not result.findings:
        lines.append("No findings.")
    else:
        for finding in result.findings:
            suffix = f" Evidence: {finding.evidence}" if finding.evidence else ""
            lines.append(
                f"- **{finding.severity} {finding.code}** `{finding.node_id}` — {finding.message}. `{finding.file}`.{suffix}"
            )
    lines.extend([
        "",
        "## Governance",
        "",
        "This report does not change AUTHORED, SOURCE_AUDITED, or AUDITOR_ACCEPTED status and does not decide source truth.",
        "",
    ])
    return "\n".join(lines)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("roots", nargs="+", help="JSON files or directories to scan recursively")
    parser.add_argument("--json-output", type=Path)
    parser.add_argument("--markdown-output", type=Path)
    parser.add_argument("--duplicate-threshold", type=int, default=3)
    parser.add_argument("--fail-on", choices=("none", "blocker", "warn"), default="blocker")
    args = parser.parse_args(argv)
    if args.duplicate_threshold < 2:
        parser.error("--duplicate-threshold must be >= 2")

    result = analyze(args.roots, duplicate_threshold=args.duplicate_threshold)
    payload = result.to_dict()
    if args.json_output:
        args.json_output.parent.mkdir(parents=True, exist_ok=True)
        args.json_output.write_text(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    if args.markdown_output:
        args.markdown_output.parent.mkdir(parents=True, exist_ok=True)
        args.markdown_output.write_text(_markdown(result), encoding="utf-8")

    counts = result.counts()
    print(
        f"PEDAGOGY nodes={result.nodes_analyzed} schema_files={result.schema_files} "
        f"blockers={counts[BLOCKER]} warnings={counts[WARN]}"
    )
    for finding in result.findings:
        print(f"{finding.severity} {finding.code} {finding.node_id} {finding.file}: {finding.message}")

    if args.fail_on == "none":
        return 0
    threshold = SEVERITY_ORDER[BLOCKER if args.fail_on == "blocker" else WARN]
    return 1 if any(SEVERITY_ORDER[item.severity] >= threshold for item in result.findings) else 0


if __name__ == "__main__":
    raise SystemExit(main())
