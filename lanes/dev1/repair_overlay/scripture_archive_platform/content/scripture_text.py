from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any


AUTHORITY_FILE = "engwebu_authority.json"
VPL_FILE = "engwebu_vpl.txt"
EXPECTED_VPL_SHA256 = "8cac735abda379045fa2c5f43217410ad47a45ac592f3801116ab0da41a810d8"
PREVIOUS_ARCHIVE_SHA256 = "6442f15ee3b4360786c9cd0996ea3af8f3124744a61b7a9bd69e77ac5deab397"
PREVIOUS_VPL_SHA256 = "71c2ea1ecba86b62871b0e818c4302ea0a559a5cb9643ff05197a6243836fc2f"
RECONCILIATION_EVIDENCE_RUN_ID = 36339116656
RECONCILIATION_EVIDENCE_ARTIFACT_ID = 10938503238
EXPECTED_REAUDIT_LINE_SHA256 = {
    "DAN 11:20": "1cc07bb46873f69f5ac5fc4ccbd8a7421050b47a9190884469e1f2440f712505",
    "DAN 11:21": "3abcf45188d972154b0487254761e97d7b5e4737205059466b08f1041f69611d",
    "DAN 11:24": "f2528239a871d53e1bcdf8cb1599ba96c2ccc80b054cee85f20c4e28e9721b21",
    "DAN 4:26": "4853da560105ac8a433a2f3a39edcb8a6b50834f529949ef92364be93a7ef965",
    "DAN 9:11": "2f7e353340fa88c7f2991a183e966d788f5e70fb20807161de360f90980abd85",
    "DNG 11:20": "f96c876d09dd389b5e97f0704cfb17ef934c079ff94e1adafabe0216d1904993",
    "DNG 11:21": "dfc14f96b8317bd7677581923112fec5004550ced966d657ea4c62e827ff2211",
    "DNG 11:24": "52a4e37b8e7ab4ad7c96dcf0d988c89c0a2238574b75388445985ba8812f8db8",
    "DNG 4:26": "8d06e8040c311cdf3c966d5b72aac806035f687a954a8adc1d048a222f7d2e33",
    "DNG 9:11": "df351b0d3cefd895869c3064551bf1cc3485aed368e0a74a1be08fbc6dec6c1f",
}
CATALOG_SCHEMA = "scripture.library.text-catalog.v1"
CHAPTER_SCHEMA = "scripture.library.chapter.v1"
SEARCH_SCHEMA = "scripture.library.text-search.v1"


class BundledScriptureText:
    """Fail-closed, read-only view of the exact bundled WEBU VPL source bytes."""

    def __init__(self, data_dir: Path | None = None):
        self.data_dir = Path(data_dir) if data_dir is not None else Path(__file__).resolve().parent / "data"
        self.vpl_path = self.data_dir / VPL_FILE
        self.authority_path = self.data_dir / AUTHORITY_FILE
        self._authority = self._load_authority()
        self._available = self._verify_vpl()
        self._records: list[dict[str, Any]] | None = None
        self._chapters: dict[tuple[str, int], list[dict[str, Any]]] | None = None

    @property
    def available(self) -> bool:
        return self._available

    def _load_authority(self) -> dict[str, Any]:
        try:
            data = json.loads(self.authority_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise ValueError("bundled WEBU authority manifest unavailable") from exc
        if data.get("schema") != "scripture.webu.bundled-authority.v1":
            raise ValueError("unexpected WEBU authority schema")
        if data.get("translation_id") != "engwebu" or data.get("source_tier") != "TX1":
            raise ValueError("unexpected WEBU authority identity")
        if data.get("vpl_sha256") != EXPECTED_VPL_SHA256 or data.get("runtime_network_required") is not False:
            raise ValueError("WEBU authority is not the pinned offline corpus")
        if data.get("source_snapshot_status") != "AUDITED_PINNED_SNAPSHOT":
            raise ValueError("WEBU authority must identify the bundled source as an audited pinned snapshot")

        upstream = data.get("upstream_monitoring")
        if not isinstance(upstream, dict) or upstream.get("status") != "MATCH_PINNED_AUTHORITY":
            raise ValueError("WEBU authority must bind the last verified upstream source to the bundled snapshot")
        if (
            upstream.get("observed_vpl_sha256") != EXPECTED_VPL_SHA256
            or upstream.get("observed_archive_sha256") != data.get("archive_sha256")
            or upstream.get("changed_reference_count") != 0
            or upstream.get("added_reference_count") != 0
            or upstream.get("removed_reference_count") != 0
            or upstream.get("changed_references") != []
        ):
            raise ValueError("invalid WEBU upstream source-identity state")

        reaudit = data.get("source_reaudit")
        if not isinstance(reaudit, dict) or reaudit.get("status") != "SOURCE_IDENTITY_RECONCILED":
            raise ValueError("WEBU source re-audit evidence is missing")
        if reaudit.get("independent_audit_claimed") is not False:
            raise ValueError("WEBU source identity reconciliation cannot claim independent audit")
        if (
            reaudit.get("evidence_run_id") != RECONCILIATION_EVIDENCE_RUN_ID
            or reaudit.get("evidence_artifact_id") != RECONCILIATION_EVIDENCE_ARTIFACT_ID
            or reaudit.get("previous_archive_sha256") != PREVIOUS_ARCHIVE_SHA256
            or reaudit.get("previous_vpl_sha256") != PREVIOUS_VPL_SHA256
            or reaudit.get("changed_reference_count") != len(EXPECTED_REAUDIT_LINE_SHA256)
            or reaudit.get("added_reference_count") != 0
            or reaudit.get("removed_reference_count") != 0
            or reaudit.get("changed_references") != list(EXPECTED_REAUDIT_LINE_SHA256)
            or reaudit.get("current_line_sha256") != EXPECTED_REAUDIT_LINE_SHA256
        ):
            raise ValueError("invalid WEBU source re-audit evidence identity")
        return data

    def _verify_vpl(self) -> bool:
        try:
            raw = self.vpl_path.read_bytes()
        except OSError as exc:
            raise ValueError("bundled WEBU VPL unavailable") from exc
        actual = hashlib.sha256(raw).hexdigest()
        if actual != EXPECTED_VPL_SHA256:
            raise ValueError("bundled WEBU VPL SHA-256 mismatch")
        return True

    @staticmethod
    def _bounded_text(value: Any, name: str, max_length: int) -> str:
        if not isinstance(value, str):
            raise ValueError(f"{name} must be string")
        value = value.strip()
        if not value or len(value) > max_length or any(ord(ch) < 32 for ch in value):
            raise ValueError(f"invalid {name}")
        return value

    def _ensure(self) -> None:
        if self._records is not None:
            return
        records: list[dict[str, Any]] = []
        chapters: dict[tuple[str, int], list[dict[str, Any]]] = {}
        book_order: list[str] = []
        text = self.vpl_path.read_text(encoding="utf-8-sig")
        for line_number, line in enumerate(text.splitlines(), 1):
            parts = line.split(" ", 2)
            if len(parts) != 3 or ":" not in parts[1]:
                raise ValueError(f"invalid WEBU VPL row {line_number}")
            book = parts[0]
            chapter_s, verse_s = parts[1].split(":", 1)
            if not chapter_s.isdigit() or not verse_s.isdigit():
                raise ValueError(f"invalid WEBU VPL reference at row {line_number}")
            chapter = int(chapter_s); verse = int(verse_s); verse_text = parts[2]
            if not book or len(book) > 4 or chapter < 1 or verse < 1:
                raise ValueError(f"invalid WEBU VPL coordinates at row {line_number}")
            if book not in book_order:
                book_order.append(book)
            row = {
                "book": book,
                "chapter": chapter,
                "verse": verse,
                "reference": f"{book} {chapter}:{verse}",
                "text": verse_text,
                "text_state": "present" if verse_text else "source_empty",
                "translation_id": "engwebu",
                "source_tier": "TX1",
            }
            records.append(row)
            chapters.setdefault((book, chapter), []).append(row)
        if len(records) != int(self._authority.get("vpl_rows") or -1):
            raise ValueError("WEBU VPL row count does not match authority")
        if book_order != list(self._authority.get("book_codes") or []):
            raise ValueError("WEBU book order does not match authority")
        empty = sum(1 for row in records if row["text_state"] == "source_empty")
        if empty != int(self._authority.get("empty_text_rows") or -1):
            raise ValueError("WEBU source-empty row count does not match authority")
        self._records = records
        self._chapters = chapters

    def catalog_projection(self) -> dict[str, Any]:
        return {
            "bundled_full_bible_text": self.available,
            "text_provider_available": self.available,
            "scripture_text": {
                "translation_id": "engwebu",
                "translation_name": self._authority["translation_name"],
                "source_tier": "TX1",
                "license": self._authority["license"],
                "source_site": self._authority["source_site"],
                "vpl_sha256": EXPECTED_VPL_SHA256,
                "runtime_network_required": False,
                "source_snapshot_status": self._authority["source_snapshot_status"],
                "upstream_monitoring": dict(self._authority["upstream_monitoring"]),
                "source_reaudit": dict(self._authority["source_reaudit"]),
            },
        }

    def catalog(self) -> dict[str, Any]:
        self._ensure()
        assert self._chapters is not None and self._records is not None
        books = []
        for code in self._authority["book_codes"]:
            chapter_numbers = sorted(ch for (book, ch) in self._chapters if book == code)
            books.append({"code": code, "chapter_count": len(chapter_numbers), "chapters": chapter_numbers})
        return {
            "schema": CATALOG_SCHEMA,
            **self.catalog_projection()["scripture_text"],
            "verse_rows": len(self._records),
            "source_empty_rows": int(self._authority["empty_text_rows"]),
            "books": books,
        }

    def chapter(self, book: Any, chapter: Any) -> dict[str, Any]:
        self._ensure()
        assert self._chapters is not None
        book_code = self._bounded_text(book, "book", 4).upper()
        if isinstance(chapter, bool) or not isinstance(chapter, int) or not 1 <= chapter <= 200:
            raise ValueError("chapter must be integer 1..200")
        rows = self._chapters.get((book_code, chapter))
        if rows is None:
            raise ValueError("chapter not present in bundled WEBU source")
        return {
            "schema": CHAPTER_SCHEMA,
            "translation_id": "engwebu",
            "source_tier": "TX1",
            "book": book_code,
            "chapter": chapter,
            "verses": [dict(row) for row in rows],
            "source_empty_rows": sum(1 for row in rows if row["text_state"] == "source_empty"),
        }

    def search(self, query: Any, *, limit: Any = 50) -> dict[str, Any]:
        self._ensure()
        assert self._records is not None
        q = self._bounded_text(query, "query", 128)
        if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= 100:
            raise ValueError("limit must be integer 1..100")
        needle = q.casefold()
        matches = [dict(row) for row in self._records if row["text"] and needle in row["text"].casefold()]
        return {
            "schema": SEARCH_SCHEMA,
            "translation_id": "engwebu",
            "source_tier": "TX1",
            "query": q,
            "total": len(matches),
            "results": matches[:limit],
        }
