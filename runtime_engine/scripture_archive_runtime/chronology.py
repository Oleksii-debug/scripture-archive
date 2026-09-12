from __future__ import annotations

from dataclasses import asdict, dataclass
from enum import Enum
from itertools import combinations
from typing import Iterable

from .models import Confidence


NOT_STATED = "Not stated in cited text"


class TemporalKind(str, Enum):
    """How a chronology assertion is expressed by its source data."""

    EXACT = "EXACT"
    RANGE = "RANGE"
    RELATIVE = "RELATIVE"
    UNKNOWN = "UNKNOWN"


class TemporalRelation(str, Enum):
    BEFORE = "BEFORE"
    AFTER = "AFTER"
    SAME_TIME = "SAME_TIME"
    OVERLAPS = "OVERLAPS"
    INDETERMINATE = "INDETERMINATE"


@dataclass(frozen=True)
class ChronologyAssertion:
    """One explicit, provenance-bearing chronology assertion.

    ``order_start``/``order_end`` are optional source-provided ordinal keys.
    They are intentionally *not* parsed or inferred from ``temporal_label`` and
    are comparable only when both assertions declare the same
    ``order_scale_id``. Calendar text remains display/source data so the runtime
    cannot manufacture a date or silently combine unrelated local orderings.
    """

    assertion_id: str
    event_id: str
    event_label: str
    kind: TemporalKind
    confidence: Confidence
    source_scope: str
    temporal_label: str = ""
    tx1: bool = False
    witness: str | None = None
    passage_ids: tuple[str, ...] = ()
    evidence_ids: tuple[str, ...] = ()
    order_start: int | None = None
    order_end: int | None = None
    order_scale_id: str | None = None
    relative_to_event_id: str | None = None
    relative_relation: TemporalRelation | None = None
    uncertainty: str | None = None

    def to_dict(self) -> dict:
        data = asdict(self)
        data["kind"] = self.kind.value
        data["confidence"] = self.confidence.value
        data["relative_relation"] = (
            self.relative_relation.value if self.relative_relation else None
        )
        data["passage_ids"] = list(self.passage_ids)
        data["evidence_ids"] = list(self.evidence_ids)
        return data

    @property
    def display_temporal(self) -> str:
        # UNKNOWN is a hard no-chronology boundary. Never echo a caller-supplied
        # label here: validation rejects such labels, and this property remains
        # fail-closed even if inspected before an assertion is added to a lab.
        if self.kind is TemporalKind.UNKNOWN:
            return NOT_STATED
        return self.temporal_label.strip()

    @property
    def explicit_interval(self) -> tuple[int, int] | None:
        if self.kind is TemporalKind.EXACT and self.order_start is not None:
            return (self.order_start, self.order_start)
        if (
            self.kind is TemporalKind.RANGE
            and self.order_start is not None
            and self.order_end is not None
        ):
            return (self.order_start, self.order_end)
        return None


@dataclass(frozen=True)
class ChronologyFinding:
    finding_type: str
    assertion_ids: tuple[str, str]
    event_id: str
    witness_values: tuple[str | None, str | None]
    message: str

    def to_dict(self) -> dict:
        return {
            "finding_type": self.finding_type,
            "assertion_ids": list(self.assertion_ids),
            "event_id": self.event_id,
            "witness_values": list(self.witness_values),
            "message": self.message,
        }


def _require_text(value: object, label: str, *, allow_empty: bool = False) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{label} must be a string")
    if not allow_empty and not value.strip():
        raise ValueError(f"{label} is required")
    if any(
        ord(char) < 0x20
        or ord(char) == 0x7F
        or char in {"\u2028", "\u2029"}
        for char in value
    ):
        raise ValueError(
            f"{label} must not contain control or line-separator characters"
        )
    return value


def _require_id(value: object, label: str) -> str:
    text = _require_text(value, label)
    if text != text.strip():
        raise ValueError(f"{label} must not contain surrounding whitespace")
    if any(ord(char) < 0x20 or ord(char) == 0x7F for char in text):
        raise ValueError(f"{label} must not contain control characters")
    return text


def _validate_ids(values: Iterable[str], label: str) -> tuple[str, ...]:
    if isinstance(values, (str, bytes)):
        raise ValueError(f"{label} must contain string IDs, not a string value")
    try:
        result = tuple(values)
    except TypeError as exc:
        raise ValueError(f"{label} must be an iterable of string IDs") from exc
    for index, value in enumerate(result):
        _require_id(value, f"{label}[{index}]")
    if len(result) != len(set(result)):
        raise ValueError(f"{label} must not contain duplicate IDs")
    return result


def _validate_ordinal(value: object, label: str) -> None:
    if value is not None and type(value) is not int:
        raise ValueError(f"{label} must be an integer")


def _validate_assertion(assertion: ChronologyAssertion) -> None:
    if not isinstance(assertion, ChronologyAssertion):
        raise TypeError("ChronologyLab accepts ChronologyAssertion values only")

    _require_id(assertion.assertion_id, "assertion_id")
    _require_id(assertion.event_id, "event_id")
    _require_text(assertion.event_label, "event_label")
    _require_text(assertion.source_scope, "source_scope")
    _require_text(assertion.temporal_label, "temporal_label", allow_empty=True)

    if assertion.witness is not None:
        _require_text(assertion.witness, "witness")
    if assertion.uncertainty is not None:
        _require_text(assertion.uncertainty, "uncertainty")
    if assertion.order_scale_id is not None:
        _require_id(assertion.order_scale_id, "order_scale_id")
    if assertion.relative_to_event_id is not None:
        _require_id(assertion.relative_to_event_id, "relative_to_event_id")

    if not isinstance(assertion.kind, TemporalKind):
        raise ValueError("kind must be a TemporalKind")
    if not isinstance(assertion.confidence, Confidence):
        raise ValueError("confidence must be T1/T2/C1/I1/D1")
    if not isinstance(assertion.tx1, bool):
        raise ValueError("tx1 must be a boolean flag separate from confidence")

    passage_ids = _validate_ids(assertion.passage_ids, "passage_ids")
    evidence_ids = _validate_ids(assertion.evidence_ids, "evidence_ids")
    if not passage_ids and not evidence_ids:
        raise ValueError("chronology assertions require passage or evidence provenance")

    _validate_ordinal(assertion.order_start, "order_start")
    _validate_ordinal(assertion.order_end, "order_end")

    if assertion.kind is TemporalKind.EXACT:
        if not assertion.temporal_label.strip():
            raise ValueError("EXACT chronology requires source-provided temporal_label")
        if assertion.order_end is not None:
            raise ValueError("EXACT chronology uses at most order_start")
        if assertion.order_start is not None and assertion.order_scale_id is None:
            raise ValueError("EXACT order_start requires explicit order_scale_id")
        if assertion.order_start is None and assertion.order_scale_id is not None:
            raise ValueError("order_scale_id requires source-provided order keys")
        if assertion.relative_to_event_id or assertion.relative_relation:
            raise ValueError("EXACT chronology cannot also declare a relative relation")
        return

    if assertion.kind is TemporalKind.RANGE:
        if not assertion.temporal_label.strip():
            raise ValueError("RANGE chronology requires source-provided temporal_label")
        if (assertion.order_start is None) != (assertion.order_end is None):
            raise ValueError("RANGE order_start/order_end must be supplied together")
        if assertion.order_start is not None and assertion.order_scale_id is None:
            raise ValueError("RANGE order keys require explicit order_scale_id")
        if assertion.order_start is None and assertion.order_scale_id is not None:
            raise ValueError("order_scale_id requires source-provided order keys")
        if (
            assertion.order_start is not None
            and assertion.order_end is not None
            and assertion.order_start > assertion.order_end
        ):
            raise ValueError("RANGE order_start cannot exceed order_end")
        if assertion.relative_to_event_id or assertion.relative_relation:
            raise ValueError("RANGE chronology cannot also declare a relative relation")
        return

    if assertion.kind is TemporalKind.RELATIVE:
        if assertion.order_start is not None or assertion.order_end is not None:
            raise ValueError("RELATIVE chronology cannot carry inferred order keys")
        if assertion.order_scale_id is not None:
            raise ValueError("RELATIVE chronology cannot declare order_scale_id")
        if assertion.relative_to_event_id is None:
            raise ValueError("RELATIVE chronology requires relative_to_event_id")
        if assertion.relative_to_event_id == assertion.event_id:
            raise ValueError("RELATIVE chronology cannot target the same event_id")
        if assertion.relative_relation not in {
            TemporalRelation.BEFORE,
            TemporalRelation.AFTER,
            TemporalRelation.SAME_TIME,
            TemporalRelation.OVERLAPS,
        }:
            raise ValueError("RELATIVE chronology requires an explicit source relation")
        if not assertion.temporal_label.strip():
            raise ValueError("RELATIVE chronology requires source wording in temporal_label")
        return

    if assertion.kind is TemporalKind.UNKNOWN:
        if assertion.temporal_label.strip():
            raise ValueError(
                "UNKNOWN chronology cannot carry temporal_label; "
                "use uncertainty for non-temporal source wording"
            )
        if assertion.order_start is not None or assertion.order_end is not None:
            raise ValueError("UNKNOWN chronology cannot carry order keys")
        if assertion.order_scale_id is not None:
            raise ValueError("UNKNOWN chronology cannot declare order_scale_id")
        if assertion.relative_to_event_id or assertion.relative_relation:
            raise ValueError("UNKNOWN chronology cannot declare a relative relation")
        return

    raise ValueError(f"Unsupported chronology kind: {assertion.kind!r}")


class ChronologyLab:
    """Deterministic chronology queries over explicit source-safe assertions.

    This object never derives chronology from narrative order, witness omission,
    passage numbering, or prose. It compares source-provided ordinal keys only
    within one explicitly declared order scale, compares explicit relative
    relations when present, and returns INDETERMINATE otherwise.
    """

    def __init__(self, assertions: Iterable[ChronologyAssertion] = ()) -> None:
        self._assertions: dict[str, ChronologyAssertion] = {}
        for assertion in assertions:
            self.add(assertion)

    def add(self, assertion: ChronologyAssertion) -> None:
        _validate_assertion(assertion)
        if assertion.assertion_id in self._assertions:
            raise ValueError(f"Duplicate assertion_id {assertion.assertion_id}")
        self._assertions[assertion.assertion_id] = assertion

    def get(self, assertion_id: str) -> ChronologyAssertion:
        try:
            return self._assertions[assertion_id]
        except KeyError as exc:
            raise KeyError(f"Unknown chronology assertion {assertion_id}") from exc

    def assertions_for_event(self, event_id: str) -> tuple[ChronologyAssertion, ...]:
        return tuple(
            assertion
            for assertion in self.ordered_assertions()
            if assertion.event_id == event_id
        )

    @staticmethod
    def _sort_key(assertion: ChronologyAssertion) -> tuple:
        interval = assertion.explicit_interval
        if interval is not None:
            # order_scale_id is validation-required for every interval. The
            # scale token provides a deterministic non-chronological grouping
            # across unrelated scales; numeric interval ordering is applied
            # only *within* the same explicitly comparable scale.
            return (
                0,
                assertion.order_scale_id,
                interval[0],
                interval[1],
                assertion.event_id,
                assertion.assertion_id,
            )
        if assertion.kind is TemporalKind.RELATIVE:
            return (1, "", 0, 0, assertion.event_id, assertion.assertion_id)
        if assertion.kind is TemporalKind.UNKNOWN:
            return (3, "", 0, 0, assertion.event_id, assertion.assertion_id)
        return (2, "", 0, 0, assertion.event_id, assertion.assertion_id)

    def ordered_assertions(self) -> tuple[ChronologyAssertion, ...]:
        return tuple(sorted(self._assertions.values(), key=self._sort_key))

    def relation(self, left_id: str, right_id: str) -> TemporalRelation:
        left = self.get(left_id)
        right = self.get(right_id)
        left_interval = left.explicit_interval
        right_interval = right.explicit_interval
        if (
            left_interval is not None
            and right_interval is not None
            and left.order_scale_id is not None
            and left.order_scale_id == right.order_scale_id
        ):
            if left_interval[1] < right_interval[0]:
                return TemporalRelation.BEFORE
            if left_interval[0] > right_interval[1]:
                return TemporalRelation.AFTER
            if left_interval == right_interval and left_interval[0] == left_interval[1]:
                return TemporalRelation.SAME_TIME
            return TemporalRelation.OVERLAPS

        if (
            left.kind is TemporalKind.RELATIVE
            and left.relative_to_event_id == right.event_id
            and left.relative_relation is not None
        ):
            return left.relative_relation
        if (
            right.kind is TemporalKind.RELATIVE
            and right.relative_to_event_id == left.event_id
            and right.relative_relation is not None
        ):
            inverse = {
                TemporalRelation.BEFORE: TemporalRelation.AFTER,
                TemporalRelation.AFTER: TemporalRelation.BEFORE,
                TemporalRelation.SAME_TIME: TemporalRelation.SAME_TIME,
                TemporalRelation.OVERLAPS: TemporalRelation.OVERLAPS,
            }
            return inverse[right.relative_relation]
        return TemporalRelation.INDETERMINATE

    def non_overlapping_assertions(self, event_id: str) -> tuple[ChronologyFinding, ...]:
        """Report source assertions for one event whose comparable intervals disagree.

        A finding is diagnostic, never an automatic truth-resolution decision.
        Different witnesses stay different; neither is copied into the other.
        Unrelated ordinal scales are never treated as comparable chronology.
        """

        candidates = [
            item
            for item in self.assertions_for_event(event_id)
            if item.explicit_interval is not None
        ]
        findings: list[ChronologyFinding] = []
        for left, right in combinations(candidates, 2):
            relation = self.relation(left.assertion_id, right.assertion_id)
            if relation not in {TemporalRelation.BEFORE, TemporalRelation.AFTER}:
                continue
            findings.append(
                ChronologyFinding(
                    finding_type="NON_OVERLAPPING_SOURCE_ASSERTIONS",
                    assertion_ids=(left.assertion_id, right.assertion_id),
                    event_id=event_id,
                    witness_values=(left.witness, right.witness),
                    message=(
                        "Source assertions on the same explicit order scale do not "
                        "overlap; preserve both with their witness/provenance and do "
                        "not harmonize automatically."
                    ),
                )
            )
        return tuple(findings)

    def semantic_rows(self) -> list[dict]:
        """Accessible table/linear equivalent for a future visual timeline."""

        rows: list[dict] = []
        for assertion in self.ordered_assertions():
            rows.append(
                {
                    "assertion_id": assertion.assertion_id,
                    "event_id": assertion.event_id,
                    "event": assertion.event_label,
                    "temporal_kind": assertion.kind.value,
                    "temporal": assertion.display_temporal,
                    "order_scale_id": assertion.order_scale_id,
                    "relative_to_event_id": assertion.relative_to_event_id,
                    "relative_relation": (
                        assertion.relative_relation.value
                        if assertion.relative_relation
                        else None
                    ),
                    "confidence": assertion.confidence.value,
                    "tx1": assertion.tx1,
                    "witness": assertion.witness,
                    "passage_ids": list(assertion.passage_ids),
                    "evidence_ids": list(assertion.evidence_ids),
                    "source_scope": assertion.source_scope,
                    "uncertainty": assertion.uncertainty,
                }
            )
        return rows

    def linearize(self) -> list[str]:
        lines: list[str] = []
        for row in self.semantic_rows():
            confidence = row["confidence"] + (" TX1" if row["tx1"] else "")
            witness = row["witness"] or "not specified"
            passages = ", ".join(row["passage_ids"]) or "none"
            evidence = ", ".join(row["evidence_ids"]) or "none"
            scale = (
                f"; order-scale={row['order_scale_id']}"
                if row["order_scale_id"]
                else ""
            )
            uncertainty = (
                f"; uncertainty={row['uncertainty']}" if row["uncertainty"] else ""
            )
            relation = ""
            if row["relative_relation"]:
                relation = (
                    f"; relation={row['relative_relation']} "
                    f"{row['relative_to_event_id']}"
                )
            lines.append(
                f"{row['event']} ({row['event_id']}): {row['temporal']} "
                f"[{confidence}; witness={witness}; source={row['source_scope']}"
                f"; passages={passages}; evidence={evidence}"
                f"{scale}{relation}{uncertainty}]"
            )
        return lines
