# DEV06 player-memory integration contract

Status: integration-ready DEV06 contract. This file does not change grading truth or biblical content.

## Runtime hook points

1. **Fresh process/session** — create the active `Session` through `PlayerMemoryService.start_session`. This closes a previously persisted open session as `restart_recovery`, preserving an adjacent-session boundary. Explicit duplicate `session_id` values are rejected before the current session is closed.
2. **Restore** — call `restore_memory(...)`, then start a new active session. Do not keep writing into the restored session: that would erase the distinction needed for adjacent-session EXACT cooldown.
3. **Task load** — call `record_task_loaded(...)` with only explicit canonical `passage_keys` / `passage_refs` and an explicit campaign ID when available. Do not parse or invent passage identity from display wording.
4. **Correct result** — call `record_correct(...)`. The node itself is an exact identity for a future repeat; if canonical data explicitly identifies an EXACT-equivalent ID, pass that stable identity too. Do not infer equivalence from prompt wording.
5. **Mastery consequence** — call `enqueue_review(...)` for each deterministic `MasteryConsequence`. If a validated `VARIANT` / `CROSS_CONTEXT` candidate exists, the scheduler may prefer it; DEV06 never fabricates one.
6. **Save** — `serialize_memory(...)` persists retained session history, rollups, review queue, fatigue, attempts, campaign/passages/evidence exposure and preserves unrelated settings/keymap/draft/accessibility payload supplied as `base_state`.
7. **Scheduler** — when no explicit adjacent set is supplied, `Scheduler` derives it from the immediately previous retained session and blocks only `EXACT`. For an EXACT candidate it checks both the candidate node ID and any explicit `paired_exact_node_id`; a supplied pair cannot mask an adjacent-session repeat of the candidate itself. Validated variants/cross-context remain eligible.

## Cross-lane reconciliation

DEV05 owns `RuntimeApplication`, grading/provenance and per-visit hint counters. DEV06 therefore does not overwrite DEV05's live `application.py` changes. Integration should wire the hook points above into the newer DEV05 application rather than replace it with an older base copy.

Persisted `Attempt.independent` now has an enforced DEV06 invariant: it can only remain `true` when `used_hints == 0`. Any H1–H7 use serializes/restores as guided (`independent=false`). A zero-hint attempt explicitly marked non-independent remains non-independent, so the persistence layer does not invent independence. Legacy contradictory persisted attempts are normalized deterministically while preserving the historical hint count. This aligns stored attempt evidence with the current `MasteryEngine` rule without taking ownership of DEV05 grading truth.

DEV05 has separately hardened player branch navigation after QA defect #65. DEV06 must not reintroduce caller-selected target-node routing while integrating the state repository. Defect #70 remains cross-lane until DEV05 also stops creating contradictory in-memory H1–H5 attempt flags before persistence.

## Persistence safety

- schema v3 migrates v0/v1/v2 forward;
- state history is not constrained by the 2,000-key transport/content-import DTO limit;
- state JSON remains bounded to 64 MiB;
- atomic replace + fsync remains in use;
- a corrupt primary cannot overwrite a known-good backup during a later save;
- explicit recovery points are retained with a bounded count;
- delete-progress preserves profile/settings/keymap/accessibility by default and leaves a recovery point;
- player-memory restore is transactional at the in-memory boundary: nested state is decoded into a temporary `PlayerMemory` first, and the caller's live memory object is replaced only after the entire nested structure decodes successfully;
- repository import supplies a semantic decoder/session validator before the current disk state is replaced, so syntactically valid but codec-invalid imports leave the current persisted state intact;
- `PlayerStateRepository.restore` prepares decoded memory + the new session before mutating the caller's live `PlayerMemory`, so a duplicate requested session ID or nested decode failure cannot partially replace live memory;
- persisted history key ↔ embedded `node_id` mismatch, duplicate mastery concept IDs, duplicate review queue IDs and duplicate persisted session IDs fail closed instead of silently collapsing/aliasing identity;
- legacy non-empty mastery mappings are accepted only when their concept-key identity is internally consistent, and normalize into the current concept-keyed in-memory representation.

## Non-goals

This lane does not decide biblical correctness, source provenance, grading propositions, task variants, Windows/NVDA acceptance, or final integration PASS.

## High-level adapter

`PlayerStateRepository` packages the required restore/start-session/save lifecycle and preserves non-memory state. Integrators should prefer this boundary over directly reusing a deserialized `Session` after process restart.
