from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, Mapping

from .evidence import Claim, EvidenceRecord, EvidenceRuntime, PassageRef, Relation


EVIDENCE_GRAPH_SCHEMA = "evidence-graph.v1"
EVIDENCE_NODE = "evidence"
CLAIM_NODE = "claim"
PASSAGE_NODE = "passage"
ENTITY_NODE = "entity_ref"
SUPPORTS_EDGE = "supports_claim"
CITES_EDGE = "cites_passage"
MENTIONS_EDGE = "mentions_entity"
CANONICAL_EDGE_PREFIX = "canonical:"


@dataclass(frozen=True)
class EvidenceGraphNode:
    graph_id: str
    raw_id: str
    node_type: str
    payload: Mapping[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "graph_id": self.graph_id,
            "raw_id": self.raw_id,
            "node_type": self.node_type,
            "payload": dict(self.payload),
        }


@dataclass(frozen=True)
class EvidenceGraphEdge:
    edge_id: str
    edge_type: str
    source_id: str
    target_id: str
    payload: Mapping[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "edge_id": self.edge_id,
            "edge_type": self.edge_type,
            "source_id": self.source_id,
            "target_id": self.target_id,
            "payload": dict(self.payload),
        }


@dataclass(frozen=True)
class EvidenceGraph:
    evidence_scope: str
    nodes: tuple[EvidenceGraphNode, ...]
    edges: tuple[EvidenceGraphEdge, ...]
    schema: str = EVIDENCE_GRAPH_SCHEMA

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema": self.schema,
            "evidence_scope": self.evidence_scope,
            "nodes": [node.to_dict() for node in self.nodes],
            "edges": [edge.to_dict() for edge in self.edges],
        }

    def linearize(self) -> list[str]:
        """Complete deterministic nonvisual representation of graph truth.

        The linear form intentionally repeats provenance represented structurally in
        ``to_dict`` so a future spatial graph never becomes the only source of
        player-visible information.
        """

        lines = ["Evidence Graph", f"Evidence scope: {self.evidence_scope}"]
        for node in self.nodes:
            payload = node.payload
            if node.node_type == EVIDENCE_NODE:
                tx1 = " TX1" if payload["tx1"] else ""
                witness = payload["witness"] or "not specified"
                lines.append(
                    f"Evidence {node.raw_id}: {payload['proposition']} "
                    f"[{payload['confidence']}{tx1}; witness={witness}]"
                )
            elif node.node_type == CLAIM_NODE:
                tx1 = " TX1" if payload["tx1"] else ""
                witness = payload["witness"] or "not specified"
                lines.append(
                    f"Claim {node.raw_id}: {payload['proposition']} "
                    f"[{payload['confidence']}{tx1}; witness={witness}]"
                )
                lines.append(
                    "  Required evidence: " + ", ".join(payload["required_evidence_ids"])
                )
                if payload["source_scope"]:
                    lines.append(f"  Source scope: {payload['source_scope']}")
                if payload["uncertainty"]:
                    lines.append(f"  Uncertainty: {payload['uncertainty']}")
            elif node.node_type == PASSAGE_NODE:
                verse = str(payload["verse_start"])
                if payload["verse_end"] is not None:
                    verse += f"-{payload['verse_end']}"
                witness = payload["witness"] or "not specified"
                lines.append(
                    f"Passage {node.raw_id}: {payload['book']} "
                    f"{payload['chapter']}:{verse}; witness={witness}"
                )
            elif node.node_type == ENTITY_NODE:
                lines.append(f"Canonical entity reference {node.raw_id}")
            else:  # pragma: no cover - construction is closed over known node types.
                raise ValueError(f"Unsupported graph node type: {node.node_type}")

        for edge in self.edges:
            payload = edge.payload
            if edge.edge_type == SUPPORTS_EDGE:
                lines.append(
                    f"Support edge {edge.edge_id}: {edge.source_id} -> {edge.target_id}"
                )
            elif edge.edge_type == CITES_EDGE:
                lines.append(
                    f"Passage edge {edge.edge_id}: {edge.source_id} -> {edge.target_id}"
                )
            elif edge.edge_type == MENTIONS_EDGE:
                lines.append(
                    f"Entity edge {edge.edge_id}: {edge.source_id} -> {edge.target_id}"
                )
            elif edge.edge_type.startswith(CANONICAL_EDGE_PREFIX):
                witness = payload.get("witness") or "not specified"
                passage_ids = payload.get("passage_ids", [])
                passage_text = ", ".join(passage_ids) if passage_ids else "none stated"
                lines.append(
                    f"Canonical relation {payload['relation_id']}: "
                    f"{edge.source_id} -[{payload['relation_type']}]-> {edge.target_id}; "
                    f"witness={witness}; passages={passage_text}"
                )
            else:  # pragma: no cover - construction is closed over known edge types.
                raise ValueError(f"Unsupported graph edge type: {edge.edge_type}")
        return lines


def build_evidence_graph(
    runtime: EvidenceRuntime,
    *,
    evidence_ids: Iterable[str] | None = None,
    include_locked_evidence: bool = False,
) -> EvidenceGraph:
    """Build a source-safe derived graph over the existing evidence runtime.

    By default only already-unlocked evidence participates. Claims are visible only
    when they have a non-empty required-evidence contract and every required record
    is visible. Relations are visible only when both endpoints resolve uniquely to
    visible graph nodes and every relation passage reference is visible. No missing
    node, endpoint, entity type, chronology, or source fact is inferred.
    """

    selected_ids = _select_evidence_ids(
        runtime,
        evidence_ids=evidence_ids,
        include_locked_evidence=include_locked_evidence,
    )
    selected_set = set(selected_ids)
    visible_claims = _select_visible_claims(runtime, selected_set)
    included_claim_ids = {claim.claim_id for claim in visible_claims}
    hidden_raw_ids = (
        (set(runtime.evidence) - selected_set)
        | (set(runtime.claims) - included_claim_ids)
    )

    nodes: dict[str, EvidenceGraphNode] = {}
    edges: dict[str, EvidenceGraphEdge] = {}
    raw_to_graph_ids: dict[str, set[str]] = {}
    passage_payloads: dict[str, dict[str, Any]] = {}

    def add_node(node: EvidenceGraphNode) -> None:
        if node.graph_id in nodes:
            if nodes[node.graph_id] != node:
                raise ValueError(f"Conflicting graph node {node.graph_id}")
            return
        nodes[node.graph_id] = node
        raw_to_graph_ids.setdefault(node.raw_id, set()).add(node.graph_id)

    def add_edge(edge: EvidenceGraphEdge) -> None:
        if edge.edge_id in edges:
            if edges[edge.edge_id] != edge:
                raise ValueError(f"Conflicting graph edge {edge.edge_id}")
            return
        edges[edge.edge_id] = edge

    for evidence_id in selected_ids:
        record = runtime.evidence[evidence_id]
        _require_stable_id(record.evidence_id, "evidence_id")
        _reject_hidden_alias(record.evidence_id, hidden_raw_ids, "evidence_id")
        add_node(
            EvidenceGraphNode(
                graph_id=_graph_id(EVIDENCE_NODE, record.evidence_id),
                raw_id=record.evidence_id,
                node_type=EVIDENCE_NODE,
                payload=_evidence_payload(record),
            )
        )

        seen_passages: set[str] = set()
        for passage in record.passage_refs:
            _require_stable_id(passage.passage_id, "passage_id")
            _reject_hidden_alias(passage.passage_id, hidden_raw_ids, "passage_id")
            payload = _passage_payload(passage)
            existing = passage_payloads.get(passage.passage_id)
            if existing is not None and existing != payload:
                raise ValueError(
                    f"Conflicting passage metadata for {passage.passage_id}; "
                    "source variants must not be harmonized"
                )
            passage_payloads[passage.passage_id] = payload
            passage_graph_id = _graph_id(PASSAGE_NODE, passage.passage_id)
            add_node(
                EvidenceGraphNode(
                    graph_id=passage_graph_id,
                    raw_id=passage.passage_id,
                    node_type=PASSAGE_NODE,
                    payload=payload,
                )
            )
            if passage.passage_id not in seen_passages:
                add_edge(
                    EvidenceGraphEdge(
                        edge_id=f"cites:{record.evidence_id}:{passage.passage_id}",
                        edge_type=CITES_EDGE,
                        source_id=_graph_id(EVIDENCE_NODE, record.evidence_id),
                        target_id=passage_graph_id,
                        payload={},
                    )
                )
                seen_passages.add(passage.passage_id)

        seen_entities: set[str] = set()
        for entity_id in record.entity_ids:
            _require_stable_id(entity_id, "entity_id")
            _reject_hidden_alias(entity_id, hidden_raw_ids, "entity_id")
            entity_graph_id = _graph_id(ENTITY_NODE, entity_id)
            add_node(
                EvidenceGraphNode(
                    graph_id=entity_graph_id,
                    raw_id=entity_id,
                    node_type=ENTITY_NODE,
                    payload={"canonical_id": entity_id},
                )
            )
            if entity_id not in seen_entities:
                add_edge(
                    EvidenceGraphEdge(
                        edge_id=f"mentions:{record.evidence_id}:{entity_id}",
                        edge_type=MENTIONS_EDGE,
                        source_id=_graph_id(EVIDENCE_NODE, record.evidence_id),
                        target_id=entity_graph_id,
                        payload={},
                    )
                )
                seen_entities.add(entity_id)

    for claim in visible_claims:
        _reject_hidden_alias(claim.claim_id, hidden_raw_ids, "claim_id")
        claim_graph_id = _graph_id(CLAIM_NODE, claim.claim_id)
        add_node(
            EvidenceGraphNode(
                graph_id=claim_graph_id,
                raw_id=claim.claim_id,
                node_type=CLAIM_NODE,
                payload=_claim_payload(claim),
            )
        )
        for evidence_id in sorted(set(claim.required_evidence_ids)):
            add_edge(
                EvidenceGraphEdge(
                    edge_id=f"supports:{evidence_id}:{claim.claim_id}",
                    edge_type=SUPPORTS_EDGE,
                    source_id=_graph_id(EVIDENCE_NODE, evidence_id),
                    target_id=claim_graph_id,
                    payload={},
                )
            )

    visible_passage_ids = set(passage_payloads)
    for relation in sorted(runtime.relations.values(), key=lambda item: item.relation_id):
        _require_stable_id(relation.relation_id, "relation_id")
        _require_stable_id(relation.relation_type, "relation_type")
        _require_stable_id(relation.source_id, "relation source_id")
        _require_stable_id(relation.target_id, "relation target_id")

        source = _resolve_endpoint(
            relation.source_id,
            runtime=runtime,
            selected_evidence=selected_set,
            included_claim_ids=included_claim_ids,
            raw_to_graph_ids=raw_to_graph_ids,
        )
        target = _resolve_endpoint(
            relation.target_id,
            runtime=runtime,
            selected_evidence=selected_set,
            included_claim_ids=included_claim_ids,
            raw_to_graph_ids=raw_to_graph_ids,
        )
        if source is None or target is None:
            continue
        if relation.passage_ids and not set(relation.passage_ids).issubset(visible_passage_ids):
            # Do not leak relation provenance that is outside the visible evidence scope.
            continue
        add_edge(
            EvidenceGraphEdge(
                edge_id=f"relation:{relation.relation_id}",
                edge_type=f"{CANONICAL_EDGE_PREFIX}{relation.relation_type}",
                source_id=source,
                target_id=target,
                payload={
                    "relation_id": relation.relation_id,
                    "relation_type": relation.relation_type,
                    "witness": relation.witness,
                    "passage_ids": list(relation.passage_ids),
                },
            )
        )

    return EvidenceGraph(
        evidence_scope="all_runtime_evidence" if include_locked_evidence else "unlocked_only",
        nodes=tuple(sorted(nodes.values(), key=_node_sort_key)),
        edges=tuple(sorted(edges.values(), key=_edge_sort_key)),
    )


def _select_evidence_ids(
    runtime: EvidenceRuntime,
    *,
    evidence_ids: Iterable[str] | None,
    include_locked_evidence: bool,
) -> tuple[str, ...]:
    if evidence_ids is None:
        selected = set(runtime.evidence) if include_locked_evidence else set(runtime.unlocked)
    else:
        selected = set()
        for evidence_id in evidence_ids:
            if evidence_id not in runtime.evidence:
                raise KeyError(evidence_id)
            if not include_locked_evidence and evidence_id not in runtime.unlocked:
                raise PermissionError(f"Evidence not unlocked: {evidence_id}")
            selected.add(evidence_id)
    unknown_unlocked = selected - set(runtime.evidence)
    if unknown_unlocked:
        raise ValueError(f"Unlocked evidence missing from runtime: {sorted(unknown_unlocked)}")
    for evidence_id in selected:
        _require_stable_id(evidence_id, "evidence_id")
    return tuple(sorted(selected))


def _select_visible_claims(
    runtime: EvidenceRuntime,
    selected_evidence: set[str],
) -> tuple[Claim, ...]:
    visible: list[Claim] = []
    for claim in sorted(runtime.claims.values(), key=lambda item: item.claim_id):
        _require_stable_id(claim.claim_id, "claim_id")
        required = tuple(claim.required_evidence_ids)
        if not required:
            continue
        unknown = set(required) - set(runtime.evidence)
        if unknown and bool(set(required) & selected_evidence):
            raise ValueError(
                f"Claim {claim.claim_id} references unknown evidence: {sorted(unknown)}"
            )
        if set(required).issubset(selected_evidence):
            visible.append(claim)
    return tuple(visible)


def _resolve_endpoint(
    raw_id: str,
    *,
    runtime: EvidenceRuntime,
    selected_evidence: set[str],
    included_claim_ids: set[str],
    raw_to_graph_ids: Mapping[str, set[str]],
) -> str | None:
    # A hidden evidence/claim ID shadows any coincident visible entity/passage ID so
    # an ambiguous raw identifier can never be reinterpreted to bypass visibility.
    if raw_id in runtime.evidence and raw_id not in selected_evidence:
        return None
    if raw_id in runtime.claims and raw_id not in included_claim_ids:
        return None
    candidates = set(raw_to_graph_ids.get(raw_id, set()))
    if not candidates:
        return None
    if len(candidates) != 1:
        raise ValueError(f"Ambiguous relation endpoint {raw_id}: {sorted(candidates)}")
    return next(iter(candidates))


def _graph_id(node_type: str, raw_id: str) -> str:
    return f"{node_type}:{raw_id}"


def _require_stable_id(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value or value != value.strip():
        raise ValueError(f"{label} must be a non-empty stable string without outer whitespace")
    return value


def _reject_hidden_alias(value: str, hidden_raw_ids: set[str], label: str) -> None:
    if value in hidden_raw_ids:
        raise ValueError(
            f"{label} {value} aliases a hidden evidence/claim identifier; "
            "derived graph refuses cross-namespace disclosure"
        )


def _evidence_payload(record: EvidenceRecord) -> dict[str, Any]:
    return {
        "proposition": record.proposition,
        "confidence": record.confidence.value,
        "tx1": record.tx1,
        "witness": record.witness,
    }


def _claim_payload(claim: Claim) -> dict[str, Any]:
    return {
        "proposition": claim.proposition,
        "confidence": claim.confidence.value,
        "tx1": claim.tx1,
        "source_scope": claim.source_scope,
        "uncertainty": claim.uncertainty,
        "required_evidence_ids": list(claim.required_evidence_ids),
        "witness": claim.witness,
    }


def _passage_payload(passage: PassageRef) -> dict[str, Any]:
    return {
        "book": passage.book,
        "chapter": passage.chapter,
        "verse_start": passage.verse_start,
        "verse_end": passage.verse_end,
        "witness": passage.witness,
    }


def _node_sort_key(node: EvidenceGraphNode) -> tuple[str, str, str]:
    return (node.node_type, node.raw_id, node.graph_id)


def _edge_sort_key(edge: EvidenceGraphEdge) -> tuple[str, str, str, str]:
    return (edge.edge_type, edge.source_id, edge.target_id, edge.edge_id)
