from __future__ import annotations

import copy
from typing import Any, Iterable

from .service import (
    HISTORY_SCHEMA,
    MAX_HISTORY_DEPTH,
    SNAPSHOT_SCHEMA,
    AuthoringService,
)


TRANSACTION_SCHEMA = "scripture.authoring-transaction.v1"
TRANSACTION_CATEGORY = "authoring_transactions"


class RecoverableAuthoringService(AuthoringService):
    """Constructor V2 service with restart-recoverable multi-record mutations.

    ``JsonFileStore`` makes each individual JSON record replacement atomic, but
    Constructor V2 operations span several records (draft, undo/redo history and
    safety snapshots).  A crash between those writes used to allow history to
    advance while the draft remained at the previous revision.  This subclass
    records the complete intended post-mutation state first and replays it
    idempotently on startup.  The intent is deleted only after every component
    has been persisted.
    """

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._recover_pending_mutations()

    def save_draft(self, draft: Any) -> dict[str, Any]:
        draft = self._envelope(draft)
        stored = self.store.get_json("drafts", draft["draft_id"])
        now = int(self.clock())
        if stored is not None:
            expected = int(stored.get("revision", 1))
            if int(draft.get("revision", expected)) != expected:
                raise ValueError("stale draft revision; reload before saving")
            created_at = int(stored.get("created_at", now))
            revision = expected + 1
            base_identity = stored.get("base_identity") or draft.get("base_identity")
        else:
            created_at = int(draft.get("created_at", now))
            revision = max(1, int(draft.get("revision", 1)))
            base_identity = draft.get("base_identity")

        out = copy.deepcopy(draft)
        out.update({
            "status": "DRAFT",
            "created_at": created_at,
            "updated_at": now,
            "revision": revision,
            "base_identity": base_identity,
        })
        self._protect_identity(out)
        out.setdefault("change_record", []).append({
            "timestamp": now,
            "action": "save_draft",
            "revision": revision,
        })

        history = None
        if stored is not None:
            history = self._history_with_prior(out["draft_id"], stored)
        self._commit_mutation(out["draft_id"], out, history=history)
        return copy.deepcopy(out)

    def restore_snapshot(self, draft_id: str, snapshot_id: str) -> dict[str, Any]:
        current = self.load_draft(draft_id)
        snapshot = self._load_snapshot(draft_id, snapshot_id)
        safety = self._build_snapshot(
            current,
            label="Automatic safety snapshot before snapshot restore",
        )
        history = self._history_with_prior(draft_id, current)
        restored = self._build_restored_draft(
            current,
            snapshot["draft"],
            "restore_snapshot",
            snapshot_id,
        )
        self._commit_mutation(
            draft_id,
            restored,
            history=history,
            snapshots=[safety],
        )
        return copy.deepcopy(restored)

    def undo(self, draft_id: str) -> dict[str, Any]:
        current = self.load_draft(draft_id)
        state = self._history_state(draft_id)
        if not state["undo"]:
            raise ValueError("nothing to undo")
        target = state["undo"].pop()
        state["redo"].append(self._json_copy(current))
        state["redo"] = state["redo"][-MAX_HISTORY_DEPTH:]
        history = self._normalized_history(draft_id, state)
        restored = self._build_restored_draft(current, target, "undo")
        self._commit_mutation(draft_id, restored, history=history)
        return copy.deepcopy(restored)

    def redo(self, draft_id: str) -> dict[str, Any]:
        current = self.load_draft(draft_id)
        state = self._history_state(draft_id)
        if not state["redo"]:
            raise ValueError("nothing to redo")
        target = state["redo"].pop()
        state["undo"].append(self._json_copy(current))
        state["undo"] = state["undo"][-MAX_HISTORY_DEPTH:]
        history = self._normalized_history(draft_id, state)
        restored = self._build_restored_draft(current, target, "redo")
        self._commit_mutation(draft_id, restored, history=history)
        return copy.deepcopy(restored)

    def rollback_version(self, draft_id: str, version_id: str) -> dict[str, Any]:
        current = self.load_draft(draft_id)
        version = self._load_version(draft_id, version_id)
        target = self._json_copy(version.get("candidate") or {})
        if target.get("draft_id") != draft_id:
            raise ValueError("version draft identity mismatch")
        target.pop("publish_manifest", None)
        target.pop("publish_change_record", None)
        target.pop("canonical_mutation_performed", None)

        safety = self._build_snapshot(
            current,
            label="Automatic safety snapshot before version rollback",
        )
        history = self._history_with_prior(draft_id, current)
        restored = self._build_restored_draft(
            current,
            target,
            "rollback_version",
            version_id,
        )
        self._commit_mutation(
            draft_id,
            restored,
            history=history,
            snapshots=[safety],
        )
        return copy.deepcopy(restored)

    def _history_with_prior(self, draft_id: str, prior: dict[str, Any]) -> dict[str, Any]:
        state = self._history_state(draft_id)
        state["undo"].append(self._json_copy(prior))
        state["undo"] = state["undo"][-MAX_HISTORY_DEPTH:]
        state["redo"] = []
        return self._normalized_history(draft_id, state)

    def _normalized_history(self, draft_id: str, state: dict[str, Any]) -> dict[str, Any]:
        out = self._json_copy(state)
        out.update({"schema": HISTORY_SCHEMA, "draft_id": draft_id})
        out["undo"] = list(out.get("undo", []))[-MAX_HISTORY_DEPTH:]
        out["redo"] = list(out.get("redo", []))[-MAX_HISTORY_DEPTH:]
        return out

    def _build_restored_draft(
        self,
        current: dict[str, Any],
        target: Any,
        action: str,
        reference_id: str | None = None,
    ) -> dict[str, Any]:
        target = self._envelope(target)
        if target["draft_id"] != current["draft_id"]:
            raise ValueError("restore draft identity mismatch")
        out = self._json_copy(target)
        now = int(self.clock())
        out["status"] = "DRAFT"
        out["created_at"] = int(current.get("created_at", now))
        out["updated_at"] = now
        out["revision"] = int(current.get("revision", 1)) + 1
        out["base_identity"] = current.get("base_identity") or out.get("base_identity")
        record = {
            "timestamp": now,
            "action": action,
            "revision": out["revision"],
        }
        if reference_id:
            record["reference_id"] = reference_id
        out.setdefault("change_record", []).append(record)
        self._protect_identity(out)
        return out

    def _build_snapshot(self, draft: dict[str, Any], *, label: str) -> dict[str, Any]:
        snapshot_id = "snapshot-" + self.id_factory()
        self._validate_id(snapshot_id, "snapshot id")
        return {
            "schema": SNAPSHOT_SCHEMA,
            "snapshot_id": snapshot_id,
            "draft_id": draft["draft_id"],
            "draft_revision": draft.get("revision", 1),
            "created_at": int(self.clock()),
            "label": self._label(label),
            "draft": self._json_copy(draft),
        }

    def _commit_mutation(
        self,
        draft_id: str,
        draft: dict[str, Any],
        *,
        history: dict[str, Any] | None = None,
        snapshots: Iterable[dict[str, Any]] = (),
    ) -> None:
        self._validate_id(draft_id, "draft id")
        transaction = {
            "schema": TRANSACTION_SCHEMA,
            "draft_id": draft_id,
            "draft": self._json_copy(draft),
            "history": self._json_copy(history) if history is not None else None,
            "snapshots": self._json_copy(list(snapshots)),
        }
        # Write-ahead ordering is the invariant: no component write occurs before
        # the complete recovery intent itself is durable.
        self.store.put_json(TRANSACTION_CATEGORY, draft_id, transaction)
        self._apply_transaction(transaction)
        self.store.delete(TRANSACTION_CATEGORY, draft_id)

    def _recover_pending_mutations(self) -> None:
        for draft_id in sorted(self.store.list_keys(TRANSACTION_CATEGORY)):
            self._validate_id(draft_id, "draft id")
            transaction = self.store.get_json(TRANSACTION_CATEGORY, draft_id)
            self._apply_transaction(transaction)
            self.store.delete(TRANSACTION_CATEGORY, draft_id)

    def _apply_transaction(self, transaction: Any) -> None:
        draft_id, draft, history, snapshots = self._validate_transaction(transaction)
        if history is not None:
            self.store.put_json("authoring_history", draft_id, history)
        for snapshot in snapshots:
            self.store.put_json(
                "authoring_snapshots",
                snapshot["snapshot_id"],
                snapshot,
            )
        # Draft is deliberately written last. If any earlier component write is
        # interrupted, the durable transaction remains and startup completes the
        # same intended revision before the Constructor can be used again.
        self.store.put_json("drafts", draft_id, draft)

    def _validate_transaction(
        self,
        transaction: Any,
    ) -> tuple[str, dict[str, Any], dict[str, Any] | None, list[dict[str, Any]]]:
        if not isinstance(transaction, dict) or transaction.get("schema") != TRANSACTION_SCHEMA:
            raise ValueError("invalid persisted authoring transaction")
        draft_id = transaction.get("draft_id")
        self._validate_id(draft_id, "draft id")

        draft = self._envelope(transaction.get("draft"))
        if draft.get("draft_id") != draft_id:
            raise ValueError("authoring transaction draft identity mismatch")
        self._protect_identity(draft)

        history = transaction.get("history")
        if history is not None:
            if (
                not isinstance(history, dict)
                or history.get("schema") != HISTORY_SCHEMA
                or history.get("draft_id") != draft_id
                or not isinstance(history.get("undo"), list)
                or not isinstance(history.get("redo"), list)
            ):
                raise ValueError("invalid authoring transaction history")
            history = self._normalized_history(draft_id, history)

        raw_snapshots = transaction.get("snapshots")
        if not isinstance(raw_snapshots, list):
            raise ValueError("invalid authoring transaction snapshots")
        snapshots: list[dict[str, Any]] = []
        seen: set[str] = set()
        for raw in raw_snapshots:
            if not isinstance(raw, dict) or raw.get("schema") != SNAPSHOT_SCHEMA:
                raise ValueError("invalid authoring transaction snapshot")
            snapshot_id = raw.get("snapshot_id")
            self._validate_id(snapshot_id, "snapshot id")
            if snapshot_id in seen:
                raise ValueError("duplicate authoring transaction snapshot")
            seen.add(snapshot_id)
            if raw.get("draft_id") != draft_id:
                raise ValueError("authoring transaction snapshot identity mismatch")
            embedded = self._envelope(raw.get("draft"))
            if embedded.get("draft_id") != draft_id:
                raise ValueError("authoring transaction snapshot draft identity mismatch")
            snapshots.append(self._json_copy(raw))

        return draft_id, self._json_copy(draft), history, snapshots
