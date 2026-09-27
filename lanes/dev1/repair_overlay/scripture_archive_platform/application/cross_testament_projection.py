from __future__ import annotations

from collections.abc import Mapping
import unicodedata

from runtime_engine.scripture_archive_runtime.cross_testament import project_cross_testament
from runtime_engine.scripture_archive_runtime.evidence import EvidenceRuntime


SCHEMA = "scripture.research.cross-testament.v1"
MAX_LINKS = 512
MAX_LINEAR_LINES = 4096
MAX_LIST_ITEMS = 1024
MAX_TEXT = 512

_OT_BOOKS = (
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
    "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah",
    "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Songs", "Isaiah", "Jeremiah",
    "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum",
    "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
)
_NT_BOOKS = (
    "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians",
    "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy",
    "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude",
    "Revelation",
)
# The independently accepted D4 relation shards author Psalms references with
# the singular book token "Psalm". Keep that exact canonical token explicit
# here; do not normalize source records or admit arbitrary aliases.
_CANONICAL_BOOK_ALIASES: Mapping[str, str] = {"Psalm": "OT"}

BOOK_TESTAMENTS: Mapping[str, str] = {
    **{book: "OT" for book in _OT_BOOKS},
    **{book: "NT" for book in _NT_BOOKS},
    **_CANONICAL_BOOK_ALIASES,
}


def _bounded_text(value: str, field: str) -> None:
    if not isinstance(value, str):
        raise ValueError(f"{field} must be text")
    if len(value) > MAX_TEXT:
        raise ValueError(f"{field} exceeds packaged text bound")
    if any(
        unicodedata.category(character).startswith("C")
        or character in {"\u2028", "\u2029"}
        for character in value
    ):
        raise ValueError(f"{field} contains unsafe Unicode control text")


def _validate_value(value: object, field: str, *, depth: int = 0) -> None:
    if depth > 8:
        raise ValueError(f"{field} exceeds packaged nesting bound")
    if isinstance(value, str):
        _bounded_text(value, field)
        return
    if value is None or isinstance(value, (bool, int)):
        return
    if isinstance(value, list):
        if len(value) > MAX_LIST_ITEMS:
            raise ValueError(f"{field} exceeds packaged list bound")
        for index, item in enumerate(value):
            _validate_value(item, f"{field}[{index}]", depth=depth + 1)
        return
    if isinstance(value, dict):
        if len(value) > 64:
            raise ValueError(f"{field} exceeds packaged object bound")
        for key, item in value.items():
            _bounded_text(key, f"{field}.key")
            _validate_value(item, f"{field}.{key}", depth=depth + 1)
        return
    raise ValueError(f"{field} contains unsupported packaged value")


def _relation_scoped_runtime(runtime: EvidenceRuntime) -> EvidenceRuntime:
    """Copy only explicit Cross-Testament relation support into a read-only snapshot.

    The canonical runtime also contains evidence for unrelated research surfaces.
    Those records are not Cross-Testament inputs merely because they share the same
    EvidenceRuntime. Keep every explicit relation, every evidence-backed endpoint,
    and every record that names a passage explicitly declared by a relation. The
    unchanged generic projector then retains its strict validation for all relevant
    support, while unrelated mixed-provenance evidence cannot block this surface.
    """
    if not isinstance(runtime, EvidenceRuntime):
        raise TypeError("runtime must be an EvidenceRuntime")

    relation_passage_ids = {
        passage_id
        for relation in runtime.relations.values()
        for passage_id in relation.passage_ids
    }
    endpoint_evidence_ids = {
        endpoint_id
        for relation in runtime.relations.values()
        for endpoint_id in (relation.source_id, relation.target_id)
        if endpoint_id in runtime.evidence
    }

    scoped = EvidenceRuntime()
    for evidence_id, record in sorted(runtime.evidence.items()):
        supports_relation_passage = any(
            passage.passage_id in relation_passage_ids
            for passage in record.passage_refs
        )
        if evidence_id in endpoint_evidence_ids or supports_relation_passage:
            scoped.add_evidence(record)

    for relation_id in sorted(runtime.relations):
        scoped.add_relation(runtime.relations[relation_id])

    for evidence_id in sorted(runtime.unlocked):
        if evidence_id in scoped.evidence:
            scoped.unlock(evidence_id)
    return scoped


def project_packaged_cross_testament(runtime: EvidenceRuntime) -> dict[str, object]:
    """Return the bounded read-only OT↔NT projection used by the packaged app.

    Testament classification is an explicit allowlist. The canonical runtime owns
    relation truth and provenance; this boundary never synthesizes links from
    topics, entities, chronology, or prose similarity.
    """
    projection = project_cross_testament(
        _relation_scoped_runtime(runtime),
        book_testaments=BOOK_TESTAMENTS,
        unlocked_only=True,
    )
    structured = projection.to_dict()
    links = structured.get("links")
    if not isinstance(links, list) or len(links) > MAX_LINKS:
        raise ValueError("Cross-Testament link count exceeds packaged bound")
    linear = projection.linearize()
    if len(linear) > MAX_LINEAR_LINES:
        raise ValueError("Cross-Testament linear view exceeds packaged bound")
    _validate_value(structured, "cross_testament")
    _validate_value(linear, "cross_testament.linear")
    return {
        "schema": SCHEMA,
        "projection_schema": structured["schema"],
        "status": structured["status"],
        "links": links,
        "linear": linear,
        "read_only": True,
        "evidence_scope": "unlocked_only",
        "truth_owner": "D5/runtime",
    }
