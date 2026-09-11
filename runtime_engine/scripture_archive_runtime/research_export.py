from __future__ import annotations

from dataclasses import dataclass
from html import escape as html_escape
import json
from typing import Mapping, Sequence

from .evidence import EvidenceRuntime


EXPORT_SCHEMA = "research-export.v1"


@dataclass(frozen=True)
class WorkspaceNote:
    note_id: str
    text: str
    passage_ids: tuple[str, ...] = ()
    evidence_ids: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        if not self.note_id.strip():
            raise ValueError("note_id must be non-empty")


@dataclass(frozen=True)
class ChronologyRow:
    entry_id: str
    label: str
    start_label: str
    end_label: str | None = None
    uncertainty: str | None = None
    evidence_ids: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        if not self.entry_id.strip():
            raise ValueError("entry_id must be non-empty")
        if not self.label.strip():
            raise ValueError("label must be non-empty")
        if not self.start_label.strip():
            raise ValueError("start_label must be non-empty")


@dataclass(frozen=True)
class ResearchExport:
    workspace_id: str
    title: str
    payload: Mapping[str, object]

    def to_json(self) -> str:
        return json.dumps(self.payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n"

    def to_markdown(self) -> str:
        payload = self.payload
        lines: list[str] = [
            f"# {_md(self.title)}",
            "",
            f"- Export schema: `{EXPORT_SCHEMA}`",
            f"- Workspace: `{_md_code(self.workspace_id)}`",
            f"- Evidence scope: `{_md_code(payload['evidence_scope'])}`",
            "- Canonical/source data and user-authored workspace data are labelled separately.",
            "",
            "## Claims",
            "",
        ]
        claims = payload["claims"]
        if not claims:
            lines.append("_No claims in this export._")
        for claim in claims:
            lines.extend([
                f"### {_md(claim['claim_id'])}",
                "",
                f"- Proposition: {_md(claim['proposition'])}",
                f"- Confidence: `{_md_code(claim['confidence'])}`",
                f"- TX1: `{'yes' if claim['tx1'] else 'no'}`",
                f"- Source scope: {_md(claim['source_scope']) or '_not stated_'}",
                f"- Witness: {_md(claim['witness']) if claim['witness'] else '_not stated_'}",
                f"- Uncertainty: {_md(claim['uncertainty']) if claim['uncertainty'] else '_not stated_'}",
                f"- Required evidence: {_md_join(claim['required_evidence_ids'])}",
                "",
            ])

        lines.extend(["## Evidence", ""])
        evidence = payload["evidence"]
        if not evidence:
            lines.append("_No evidence records in this export._")
        for record in evidence:
            lines.extend([
                f"### {_md(record['evidence_id'])}",
                "",
                f"- Proposition: {_md(record['proposition'])}",
                f"- Confidence: `{_md_code(record['confidence'])}`",
                f"- TX1: `{'yes' if record['tx1'] else 'no'}`",
                f"- Witness: {_md(record['witness']) if record['witness'] else '_not stated_'}",
                f"- Entity IDs: {_md_join(record['entity_ids'])}",
                f"- Relation IDs: {_md_join(record['relation_ids'])}",
                "- Passages:",
            ])
            passages = record["passage_refs"]
            if passages:
                for passage in passages:
                    verse = str(passage["verse_start"])
                    if passage["verse_end"] is not None:
                        verse += f"-{passage['verse_end']}"
                    witness = f"; witness={_md(passage['witness'])}" if passage["witness"] else ""
                    lines.append(
                        f"  - `{_md_code(passage['passage_id'])}` — "
                        f"{_md(passage['book'])} {passage['chapter']}:{verse}{witness}"
                    )
            else:
                lines.append("  - _none_")
            lines.append("")

        lines.extend(["## Relations", ""])
        relations = payload["relations"]
        if not relations:
            lines.append("_No relations in this export._")
        for relation in relations:
            lines.append(
                f"- `{_md_code(relation['relation_id'])}`: "
                f"`{_md_code(relation['source_id'])}` — {_md(relation['relation_type'])} → "
                f"`{_md_code(relation['target_id'])}`"
                + (f"; witness={_md(relation['witness'])}" if relation["witness"] else "")
                + (f"; passages={_md_join(relation['passage_ids'])}" if relation["passage_ids"] else "")
            )
        lines.append("")

        lines.extend([
            "## User-authored notes",
            "",
            "_These notes are workspace annotations, not canonical evidence or source claims._",
            "",
        ])
        notes = payload["workspace_notes"]
        if not notes:
            lines.append("_No user-authored notes._")
        for note in notes:
            lines.extend([
                f"### {_md(note['note_id'])}",
                "",
                _md(note["text"]),
                "",
                f"- Passage IDs: {_md_join(note['passage_ids'])}",
                f"- Evidence IDs: {_md_join(note['evidence_ids'])}",
                "",
            ])

        lines.extend([
            "## Workspace chronology",
            "",
            "_Chronology rows below are explicit workspace data; the exporter does not infer dates or consensus._",
            "",
        ])
        chronology = payload["chronology"]
        if not chronology:
            lines.append("_No workspace chronology rows._")
        for row in chronology:
            span = _md(row["start_label"])
            if row["end_label"]:
                span += f" — {_md(row['end_label'])}"
            lines.extend([
                f"### {_md(row['entry_id'])}",
                "",
                f"- Label: {_md(row['label'])}",
                f"- Range/order label: {span}",
                f"- Uncertainty: {_md(row['uncertainty']) if row['uncertainty'] else '_not stated_'}",
                f"- Evidence IDs: {_md_join(row['evidence_ids'])}",
                "",
            ])

        lines.extend(["## Provenance", ""])
        provenance = payload["provenance"]
        if not provenance:
            lines.append("_No provenance metadata supplied._")
        for key, value in provenance.items():
            lines.append(f"- {_md(key)}: {_md(value)}")
        lines.append("")
        return "\n".join(lines)

    def to_html(self, *, lang: str = "uk") -> str:
        payload = self.payload
        claims_rows = "".join(
            "<tr>"
            f"<th scope=\"row\">{_h(c['claim_id'])}</th>"
            f"<td>{_h(c['proposition'])}</td>"
            f"<td>{_h(c['confidence'])}</td>"
            f"<td>{'yes' if c['tx1'] else 'no'}</td>"
            f"<td>{_h(c['source_scope']) or 'not stated'}</td>"
            f"<td>{_h(c['witness']) if c['witness'] else 'not stated'}</td>"
            f"<td>{_h(c['uncertainty']) if c['uncertainty'] else 'not stated'}</td>"
            f"<td>{_h(', '.join(c['required_evidence_ids'])) or 'none'}</td>"
            "</tr>"
            for c in payload["claims"]
        )
        evidence_sections = "".join(_evidence_html(record) for record in payload["evidence"])
        relation_rows = "".join(
            "<tr>"
            f"<th scope=\"row\">{_h(r['relation_id'])}</th>"
            f"<td>{_h(r['source_id'])}</td>"
            f"<td>{_h(r['relation_type'])}</td>"
            f"<td>{_h(r['target_id'])}</td>"
            f"<td>{_h(r['witness']) if r['witness'] else 'not stated'}</td>"
            f"<td>{_h(', '.join(r['passage_ids'])) or 'none'}</td>"
            "</tr>"
            for r in payload["relations"]
        )
        note_sections = "".join(
            "<article>"
            f"<h3>{_h(n['note_id'])}</h3>"
            f"<p>{_h(n['text'])}</p>"
            f"<p><strong>Passage IDs:</strong> {_h(', '.join(n['passage_ids'])) or 'none'}</p>"
            f"<p><strong>Evidence IDs:</strong> {_h(', '.join(n['evidence_ids'])) or 'none'}</p>"
            "</article>"
            for n in payload["workspace_notes"]
        )
        chronology_rows = "".join(
            "<tr>"
            f"<th scope=\"row\">{_h(r['entry_id'])}</th>"
            f"<td>{_h(r['label'])}</td>"
            f"<td>{_h(r['start_label'])}</td>"
            f"<td>{_h(r['end_label']) if r['end_label'] else 'not stated'}</td>"
            f"<td>{_h(r['uncertainty']) if r['uncertainty'] else 'not stated'}</td>"
            f"<td>{_h(', '.join(r['evidence_ids'])) or 'none'}</td>"
            "</tr>"
            for r in payload["chronology"]
        )
        provenance_rows = "".join(
            f"<tr><th scope=\"row\">{_h(key)}</th><td>{_h(value)}</td></tr>"
            for key, value in payload["provenance"].items()
        )

        return (
            "<!doctype html>\n"
            f"<html lang=\"{_h(lang)}\"><head><meta charset=\"utf-8\">"
            "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
            f"<title>{_h(self.title)}</title></head><body>"
            "<a href=\"#main\">Skip to main content</a>"
            f"<main id=\"main\"><h1>{_h(self.title)}</h1>"
            f"<p><strong>Export schema:</strong> {_h(EXPORT_SCHEMA)}. "
            f"<strong>Workspace:</strong> {_h(self.workspace_id)}. "
            f"<strong>Evidence scope:</strong> {_h(payload['evidence_scope'])}.</p>"
            "<p>Canonical/source records and user-authored workspace data are explicitly labelled.</p>"
            "<section aria-labelledby=\"claims-heading\"><h2 id=\"claims-heading\">Claims</h2>"
            "<table><caption>Canonical claim records included in this research export</caption>"
            "<thead><tr><th scope=\"col\">Claim ID</th><th scope=\"col\">Proposition</th>"
            "<th scope=\"col\">Confidence</th><th scope=\"col\">TX1</th>"
            "<th scope=\"col\">Source scope</th><th scope=\"col\">Witness</th>"
            "<th scope=\"col\">Uncertainty</th><th scope=\"col\">Required evidence</th></tr></thead>"
            f"<tbody>{claims_rows}</tbody></table></section>"
            "<section aria-labelledby=\"evidence-heading\"><h2 id=\"evidence-heading\">Evidence</h2>"
            f"{evidence_sections or '<p>No evidence records in this export.</p>'}</section>"
            "<section aria-labelledby=\"relations-heading\"><h2 id=\"relations-heading\">Relations</h2>"
            "<table><caption>Typed relations between exported records</caption>"
            "<thead><tr><th scope=\"col\">Relation ID</th><th scope=\"col\">Source</th>"
            "<th scope=\"col\">Type</th><th scope=\"col\">Target</th>"
            "<th scope=\"col\">Witness</th><th scope=\"col\">Passages</th></tr></thead>"
            f"<tbody>{relation_rows}</tbody></table></section>"
            "<section aria-labelledby=\"notes-heading\"><h2 id=\"notes-heading\">User-authored notes</h2>"
            "<p>These notes are workspace annotations, not canonical evidence or source claims.</p>"
            f"{note_sections or '<p>No user-authored notes.</p>'}</section>"
            "<section aria-labelledby=\"chronology-heading\"><h2 id=\"chronology-heading\">Workspace chronology</h2>"
            "<p>Rows are explicit workspace data. The exporter does not infer dates or consensus.</p>"
            "<table><caption>Workspace chronology with uncertainty and evidence links</caption>"
            "<thead><tr><th scope=\"col\">Entry ID</th><th scope=\"col\">Label</th>"
            "<th scope=\"col\">Start/order</th><th scope=\"col\">End</th>"
            "<th scope=\"col\">Uncertainty</th><th scope=\"col\">Evidence IDs</th></tr></thead>"
            f"<tbody>{chronology_rows}</tbody></table></section>"
            "<section aria-labelledby=\"provenance-heading\"><h2 id=\"provenance-heading\">Provenance</h2>"
            "<table><caption>Export provenance metadata supplied by the caller</caption>"
            "<thead><tr><th scope=\"col\">Key</th><th scope=\"col\">Value</th></tr></thead>"
            f"<tbody>{provenance_rows}</tbody></table></section>"
            "</main></body></html>\n"
        )


def build_research_export(
    runtime: EvidenceRuntime,
    *,
    workspace_id: str,
    title: str,
    notes: Sequence[WorkspaceNote] = (),
    chronology: Sequence[ChronologyRow] = (),
    provenance: Mapping[str, str] | None = None,
    include_locked_evidence: bool = False,
) -> ResearchExport:
    if not workspace_id.strip():
        raise ValueError("workspace_id must be non-empty")
    if not title.strip():
        raise ValueError("title must be non-empty")

    visible_evidence_ids = set(runtime.evidence) if include_locked_evidence else set(runtime.unlocked)
    unknown_unlocked = visible_evidence_ids - set(runtime.evidence)
    if unknown_unlocked:
        raise ValueError(f"Unlocked evidence missing from runtime: {sorted(unknown_unlocked)}")

    for note in notes:
        _validate_workspace_evidence_refs(note.evidence_ids, runtime, visible_evidence_ids)
    for row in chronology:
        _validate_workspace_evidence_refs(row.evidence_ids, runtime, visible_evidence_ids)

    visible_relations = [
        relation for relation in runtime.relations.values()
        if _relation_is_visible(relation, runtime, visible_evidence_ids)
    ]

    payload: dict[str, object] = {
        "schema": EXPORT_SCHEMA,
        "workspace_id": workspace_id,
        "title": title,
        "evidence_scope": "all_runtime_evidence" if include_locked_evidence else "unlocked_only",
        "claims": [_claim_payload(runtime.claims[key]) for key in sorted(runtime.claims)],
        "evidence": [_evidence_payload(runtime.evidence[key]) for key in sorted(visible_evidence_ids)],
        "relations": [_relation_payload(relation) for relation in sorted(visible_relations, key=lambda item: item.relation_id)],
        "workspace_notes": [
            {
                "note_id": note.note_id,
                "kind": "user_note",
                "text": note.text,
                "passage_ids": list(note.passage_ids),
                "evidence_ids": list(note.evidence_ids),
            }
            for note in sorted(notes, key=lambda item: item.note_id)
        ],
        "chronology": [
            {
                "entry_id": row.entry_id,
                "kind": "workspace_chronology",
                "label": row.label,
                "start_label": row.start_label,
                "end_label": row.end_label,
                "uncertainty": row.uncertainty,
                "evidence_ids": list(row.evidence_ids),
            }
            for row in sorted(chronology, key=lambda item: item.entry_id)
        ],
        "provenance": {str(key): str(value) for key, value in sorted((provenance or {}).items(), key=lambda item: str(item[0]))},
    }
    return ResearchExport(workspace_id=workspace_id, title=title, payload=payload)


def _validate_workspace_evidence_refs(evidence_ids: Sequence[str], runtime: EvidenceRuntime, visible_evidence_ids: set[str]) -> None:
    for evidence_id in evidence_ids:
        if evidence_id not in runtime.evidence:
            raise KeyError(evidence_id)
        if evidence_id not in visible_evidence_ids:
            raise PermissionError(f"Evidence not unlocked for export: {evidence_id}")


def _relation_is_visible(relation, runtime: EvidenceRuntime, visible_evidence_ids: set[str]) -> bool:
    for endpoint in (relation.source_id, relation.target_id):
        if endpoint in runtime.evidence and endpoint not in visible_evidence_ids:
            return False
    return True


def _claim_payload(claim) -> dict[str, object]:
    return {
        "claim_id": claim.claim_id,
        "kind": "canonical_claim",
        "proposition": claim.proposition,
        "confidence": claim.confidence.value,
        "tx1": claim.tx1,
        "source_scope": claim.source_scope,
        "uncertainty": claim.uncertainty,
        "required_evidence_ids": list(claim.required_evidence_ids),
        "witness": claim.witness,
    }


def _evidence_payload(record) -> dict[str, object]:
    passages = sorted(record.passage_refs, key=lambda p: (p.book, p.chapter, p.verse_start, p.verse_end or p.verse_start, p.passage_id))
    return {
        "evidence_id": record.evidence_id,
        "kind": "canonical_evidence",
        "proposition": record.proposition,
        "confidence": record.confidence.value,
        "tx1": record.tx1,
        "witness": record.witness,
        "passage_refs": [
            {
                "passage_id": p.passage_id,
                "book": p.book,
                "chapter": p.chapter,
                "verse_start": p.verse_start,
                "verse_end": p.verse_end,
                "witness": p.witness,
            }
            for p in passages
        ],
        "entity_ids": sorted(record.entity_ids),
        "relation_ids": sorted(record.relation_ids),
    }


def _relation_payload(relation) -> dict[str, object]:
    return {
        "relation_id": relation.relation_id,
        "kind": "canonical_relation",
        "source_id": relation.source_id,
        "relation_type": relation.relation_type,
        "target_id": relation.target_id,
        "witness": relation.witness,
        "passage_ids": sorted(relation.passage_ids),
    }


def _evidence_html(record: Mapping[str, object]) -> str:
    passage_rows = "".join(
        "<tr>"
        f"<th scope=\"row\">{_h(p['passage_id'])}</th>"
        f"<td>{_h(p['book'])}</td>"
        f"<td>{p['chapter']}</td>"
        f"<td>{p['verse_start']}</td>"
        f"<td>{p['verse_end'] if p['verse_end'] is not None else p['verse_start']}</td>"
        f"<td>{_h(p['witness']) if p['witness'] else 'not stated'}</td>"
        "</tr>"
        for p in record["passage_refs"]
    )
    return (
        "<article>"
        f"<h3>{_h(record['evidence_id'])}</h3>"
        f"<p>{_h(record['proposition'])}</p>"
        f"<p><strong>Confidence:</strong> {_h(record['confidence'])}; "
        f"<strong>TX1:</strong> {'yes' if record['tx1'] else 'no'}; "
        f"<strong>Witness:</strong> {_h(record['witness']) if record['witness'] else 'not stated'}.</p>"
        f"<p><strong>Entity IDs:</strong> {_h(', '.join(record['entity_ids'])) or 'none'}. "
        f"<strong>Relation IDs:</strong> {_h(', '.join(record['relation_ids'])) or 'none'}.</p>"
        "<table><caption>Passage references for this evidence record</caption>"
        "<thead><tr><th scope=\"col\">Passage ID</th><th scope=\"col\">Book</th>"
        "<th scope=\"col\">Chapter</th><th scope=\"col\">Verse start</th>"
        "<th scope=\"col\">Verse end</th><th scope=\"col\">Witness</th></tr></thead>"
        f"<tbody>{passage_rows}</tbody></table></article>"
    )


def _h(value: object) -> str:
    return html_escape(str(value), quote=True)


def _md(value: object) -> str:
    text = str(value)
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    for ch in ("\\", "`", "*", "_", "[", "]"):
        text = text.replace(ch, "\\" + ch)
    return text.replace("\r\n", "\n").replace("\r", "\n").replace("\n", "  \n")


def _md_code(value: object) -> str:
    return str(value).replace("`", "\\`").replace("\n", " ")


def _md_join(values: Sequence[object]) -> str:
    return ", ".join(f"`{_md_code(value)}`" for value in values) if values else "_none_"
