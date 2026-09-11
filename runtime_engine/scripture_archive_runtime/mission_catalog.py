from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
import json
from typing import Any
import unicodedata

from .content import ContentRepository
from .security import ValidationError, validate_content_import


SCHEMA_VERSION = "MISSION_CATALOG_v1"
_CANONICAL_MISSION_SCHEMA = "CONTENT_NODE_SCHEMA_v1.2"
_MAX_TEXT = 4096
_MAX_ID = 128
_MAX_ITEMS = 512
_MAX_MISSIONS = 512
_WINDOWS_INVALID_FILENAME_CHARS = frozenset('<>:"/\\|?*')
_WINDOWS_RESERVED_BASENAMES = frozenset(
    {"CON", "PRN", "AUX", "NUL"}
    | {f"COM{i}" for i in range(1, 10)}
    | {f"LPT{i}" for i in range(1, 10)}
)


@dataclass(frozen=True)
class MissionAccessibility:
    keyboard_complete_equivalent: bool
    screen_reader_announcement_requirements: str
    nonvisual_equivalent: str
    focus_order: str
    prohibited_essential_modes: tuple[str, ...]

    def to_dict(self) -> dict[str, object]:
        return {
            "keyboard_complete_equivalent": self.keyboard_complete_equivalent,
            "screen_reader_announcement_requirements": self.screen_reader_announcement_requirements,
            "nonvisual_equivalent": self.nonvisual_equivalent,
            "focus_order": self.focus_order,
            "prohibited_essential_modes": list(self.prohibited_essential_modes),
        }


@dataclass(frozen=True)
class MissionCatalogEntry:
    mission_id: str
    campaign_id: str
    title: str
    mission_role: str
    estimated_time: str
    difficulty: str
    canonical_status: str
    content_revision: str
    entry_node: str
    task_count: int
    optional_count: int
    mastery_tags: tuple[str, ...]
    primary_scripture: tuple[str, ...]
    secondary_scripture: str | tuple[str, ...]
    historical_context_sources: str | tuple[str, ...]
    interpretive_sources: str | tuple[str, ...]
    textual_variant_point_count: int
    accessibility: MissionAccessibility

    def to_dict(self) -> dict[str, object]:
        return {
            "mission_id": self.mission_id,
            "campaign_id": self.campaign_id,
            "title": self.title,
            "mission_role": self.mission_role,
            "estimated_time": self.estimated_time,
            "difficulty": self.difficulty,
            "canonical_status": self.canonical_status,
            "content_revision": self.content_revision,
            "entry_node": self.entry_node,
            "task_count": self.task_count,
            "optional_count": self.optional_count,
            "mastery_tags": list(self.mastery_tags),
            "sources": {
                "primary_scripture": list(self.primary_scripture),
                "secondary_scripture": _json_source_value(self.secondary_scripture),
                "historical_context_sources": _json_source_value(self.historical_context_sources),
                "interpretive_sources": _json_source_value(self.interpretive_sources),
                "textual_variant_point_count": self.textual_variant_point_count,
            },
            "accessibility": self.accessibility.to_dict(),
        }


@dataclass(frozen=True)
class MissionCatalog:
    entries: tuple[MissionCatalogEntry, ...]

    @classmethod
    def from_indexes(
        cls,
        indexes: Iterable[Mapping[str, Any]],
        repository: ContentRepository,
    ) -> "MissionCatalog":
        if not isinstance(repository, ContentRepository):
            raise TypeError("repository must be ContentRepository")
        runtime_nodes = repository.all()
        entries: list[MissionCatalogEntry] = []
        seen_missions: set[str] = set()

        for index_number, raw_index in enumerate(indexes):
            if index_number >= _MAX_MISSIONS:
                raise ValidationError(
                    f"Mission catalog exceeds maximum mission count {_MAX_MISSIONS}"
                )
            if not isinstance(raw_index, Mapping):
                raise ValidationError("Mission index must be an object")
            validate_content_import(raw_index)
            entry = _entry_from_index(raw_index, runtime_nodes)
            if entry.mission_id in seen_missions:
                raise ValidationError(f"Duplicate mission_id {entry.mission_id}")
            seen_missions.add(entry.mission_id)
            entries.append(entry)

        entries.sort(key=lambda item: (item.campaign_id, item.mission_id))
        return cls(tuple(entries))

    def to_dict(self) -> dict[str, object]:
        campaigns: dict[str, list[dict[str, object]]] = {}
        for entry in self.entries:
            campaigns.setdefault(entry.campaign_id, []).append(entry.to_dict())
        return {
            "schema": SCHEMA_VERSION,
            "campaigns": [
                {"campaign_id": campaign_id, "missions": campaigns[campaign_id]}
                for campaign_id in sorted(campaigns)
            ],
        }

    def stable_json(self) -> str:
        return json.dumps(
            self.to_dict(),
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )

    def linearize(self) -> list[str]:
        lines: list[str] = [f"Catalog schema: {SCHEMA_VERSION}"]
        if not self.entries:
            lines.append("No canonical missions are available.")
            return lines
        for entry in self.entries:
            lines.extend(
                [
                    (
                        f"Mission {entry.mission_id} — {entry.title}; "
                        f"campaign={entry.campaign_id}; role={entry.mission_role}; "
                        f"estimated_time={entry.estimated_time}; difficulty={entry.difficulty}; "
                        f"status={entry.canonical_status}; revision={entry.content_revision}; "
                        f"tasks={entry.task_count}; optional={entry.optional_count}; "
                        f"entry={entry.entry_node}"
                    ),
                    "Mastery tags: " + _linear_items(entry.mastery_tags),
                    "Primary Scripture: " + _linear_items(entry.primary_scripture),
                    "Secondary Scripture: " + _linear_source_value(entry.secondary_scripture),
                    "Historical context sources: "
                    + _linear_source_value(entry.historical_context_sources),
                    "Interpretive sources: " + _linear_source_value(entry.interpretive_sources),
                    f"Textual variant point count: {entry.textual_variant_point_count}",
                    (
                        "Accessibility: "
                        f"keyboard_complete_equivalent={'true' if entry.accessibility.keyboard_complete_equivalent else 'false'}; "
                        "screen_reader_announcement_requirements="
                        f"{entry.accessibility.screen_reader_announcement_requirements}; "
                        f"nonvisual_equivalent={entry.accessibility.nonvisual_equivalent}; "
                        f"focus_order={entry.accessibility.focus_order}; "
                        "prohibited_essential_modes="
                        f"{_linear_items(entry.accessibility.prohibited_essential_modes)}"
                    ),
                ]
            )
        return lines


def _entry_from_index(
    index: Mapping[str, Any],
    runtime_nodes: Mapping[str, object],
) -> MissionCatalogEntry:
    schema = _required_text(index.get("schema_version"), "schema_version", _MAX_ID)
    if schema != _CANONICAL_MISSION_SCHEMA:
        raise ValidationError(f"Unsupported mission schema {schema}")
    revision = _required_text(index.get("content_revision"), "content_revision", _MAX_ID)
    status = _required_text(index.get("canonical_status"), "canonical_status", _MAX_TEXT)
    mission = index.get("mission")
    if not isinstance(mission, Mapping):
        raise ValidationError("mission must be an object")

    mission_id = _required_text(mission.get("mission_id"), "mission_id", _MAX_ID)
    campaign_id = _required_text(mission.get("campaign_id"), "campaign_id", _MAX_ID)
    if "-" not in mission_id or mission_id.split("-", 1)[0] != campaign_id:
        raise ValidationError("mission_id campaign prefix does not match campaign_id")

    title = _required_text(mission.get("title"), "mission.title", _MAX_TEXT)
    role = _required_text(mission.get("mission_role"), "mission.mission_role", _MAX_TEXT)
    estimated_time = _required_text(
        mission.get("estimated_time"), "mission.estimated_time", _MAX_TEXT
    )
    difficulty = _required_text(mission.get("difficulty"), "mission.difficulty", _MAX_ID)
    entry_node = _required_text(mission.get("entry_node"), "mission.entry_node", _MAX_ID)
    task_nodes = _id_list(mission.get("task_nodes"), "mission.task_nodes")
    optional_nodes = _id_list(
        mission.get("optional_nodes", []), "mission.optional_nodes", allow_empty=True
    )
    if set(task_nodes) & set(optional_nodes):
        raise ValidationError("task_nodes and optional_nodes must not overlap")
    declared_nodes = set(task_nodes) | set(optional_nodes)
    if entry_node not in set(task_nodes):
        raise ValidationError("entry_node must be a required task node")

    declared_count = index.get("node_count")
    if isinstance(declared_count, bool) or not isinstance(declared_count, int):
        raise ValidationError("node_count must be an integer")
    if declared_count != len(declared_nodes):
        raise ValidationError("node_count does not match declared mission nodes")

    node_files = index.get("node_files")
    _validate_node_files(node_files)

    actual_nodes = {
        node_id
        for node_id, task in runtime_nodes.items()
        if getattr(task, "mission_id", None) == mission_id
    }
    if actual_nodes != declared_nodes:
        missing = sorted(declared_nodes - actual_nodes)
        extra = sorted(actual_nodes - declared_nodes)
        raise ValidationError(
            f"Mission/runtime node binding mismatch; missing={missing!r}; extra={extra!r}"
        )

    primary_scripture = _text_list(
        mission.get("primary_scripture"), "mission.primary_scripture"
    )
    secondary_scripture = _source_value(
        mission.get("secondary_scripture"), "mission.secondary_scripture"
    )
    historical_sources = _source_value(
        mission.get("historical_context_sources"),
        "mission.historical_context_sources",
    )
    interpretive_sources = _source_value(
        mission.get("interpretive_sources"), "mission.interpretive_sources"
    )
    textual_variant_points = _source_value(
        mission.get("textual_variant_points"), "mission.textual_variant_points"
    )
    variant_count = (
        len(textual_variant_points)
        if isinstance(textual_variant_points, tuple)
        else (0 if textual_variant_points.casefold() == "none" else 1)
    )
    mastery_tags = _text_list(
        mission.get("mastery_tags", []), "mission.mastery_tags", allow_empty=True
    )
    accessibility = _accessibility(mission.get("accessibility"))

    return MissionCatalogEntry(
        mission_id=mission_id,
        campaign_id=campaign_id,
        title=title,
        mission_role=role,
        estimated_time=estimated_time,
        difficulty=difficulty,
        canonical_status=status,
        content_revision=revision,
        entry_node=entry_node,
        task_count=len(task_nodes),
        optional_count=len(optional_nodes),
        mastery_tags=mastery_tags,
        primary_scripture=primary_scripture,
        secondary_scripture=secondary_scripture,
        historical_context_sources=historical_sources,
        interpretive_sources=interpretive_sources,
        textual_variant_point_count=variant_count,
        accessibility=accessibility,
    )


def _accessibility(value: object) -> MissionAccessibility:
    if not isinstance(value, Mapping):
        raise ValidationError("mission.accessibility must be an object")
    keyboard = value.get("keyboard_complete_equivalent")
    if keyboard is not True:
        raise ValidationError("mission accessibility must be keyboard-complete")
    announcements = _required_text(
        value.get("screen_reader_announcement_requirements"),
        "accessibility.screen_reader_announcement_requirements",
        _MAX_TEXT,
    )
    nonvisual = _required_text(
        value.get("nonvisual_equivalent"),
        "accessibility.nonvisual_equivalent",
        _MAX_TEXT,
    )
    focus_order = _required_text(
        value.get("focus_order"), "accessibility.focus_order", _MAX_TEXT
    )
    prohibited = _text_list(
        value.get("prohibited_essential_modes"),
        "accessibility.prohibited_essential_modes",
    )
    return MissionAccessibility(
        keyboard_complete_equivalent=True,
        screen_reader_announcement_requirements=announcements,
        nonvisual_equivalent=nonvisual,
        focus_order=focus_order,
        prohibited_essential_modes=prohibited,
    )


def _validate_node_files(value: object) -> None:
    files = _text_list(value, "node_files")
    if len(files) != len(set(files)):
        raise ValidationError("node_files contains duplicates")
    for name in files:
        if not name.endswith(".json"):
            raise ValidationError("node_files must contain simple JSON basenames only")
        if any(ch in _WINDOWS_INVALID_FILENAME_CHARS for ch in name):
            raise ValidationError("node_files contain a Windows-invalid filename")
        if name[-1] in {".", " "}:
            raise ValidationError("node_files contain a Windows-ambiguous filename")
        reserved_base = name.rstrip(" .").split(".", 1)[0].upper()
        if reserved_base in _WINDOWS_RESERVED_BASENAMES:
            raise ValidationError("node_files contain a Windows-reserved filename")


def _id_list(value: object, field: str, *, allow_empty: bool = False) -> tuple[str, ...]:
    items = _text_list(value, field, allow_empty=allow_empty, max_length=_MAX_ID)
    if len(items) != len(set(items)):
        raise ValidationError(f"{field} contains duplicates")
    return items


def _text_list(
    value: object,
    field: str,
    *,
    allow_empty: bool = False,
    max_length: int = _MAX_TEXT,
) -> tuple[str, ...]:
    if not isinstance(value, Sequence) or isinstance(value, (str, bytes)):
        raise ValidationError(f"{field} must be a list")
    if not allow_empty and not value:
        raise ValidationError(f"{field} must not be empty")
    if len(value) > _MAX_ITEMS:
        raise ValidationError(f"{field} has too many items")
    return tuple(_required_text(item, field, max_length) for item in value)


def _source_value(value: object, field: str) -> str | tuple[str, ...]:
    if isinstance(value, str):
        return _required_text(value, field, _MAX_TEXT)
    return _text_list(value, field)


def _json_source_value(value: str | tuple[str, ...]) -> object:
    return list(value) if isinstance(value, tuple) else value


def _linear_source_value(value: str | tuple[str, ...]) -> str:
    return _linear_items(value) if isinstance(value, tuple) else value


def _linear_items(value: Sequence[str]) -> str:
    return ", ".join(value) if value else "none"


def _required_text(value: object, field: str, max_length: int) -> str:
    if not isinstance(value, str):
        raise ValidationError(f"{field} must be a string")
    text = value.strip()
    if not text:
        raise ValidationError(f"{field} must not be empty")
    if text != value:
        raise ValidationError(f"{field} must not contain leading/trailing whitespace")
    if len(text) > max_length:
        raise ValidationError(f"{field} exceeds maximum length {max_length}")
    if any(
        unicodedata.category(char) in {"Cc", "Cs", "Zl", "Zp"}
        for char in text
    ):
        raise ValidationError(f"{field} must not contain control or line-separator characters")
    return text
