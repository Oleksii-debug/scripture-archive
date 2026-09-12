# PEDAGOGICAL QUALITY GATE v1

Status: R06 report-first quality contract  
Scope: `CONTENT_NODE_SCHEMA_v1.2` authored content  
Source authority: unchanged; this gate never decides biblical truth

## Purpose

Structural JSON validity is not enough for Scripture Archive. A node can contain every required field and still be pedagogically weak if feedback is generic, the hint ladder does not progressively narrow the task, mastery/retrieval semantics are incoherent, or multiple stable IDs merely repeat the same learning event.

This gate adds a separate pedagogical-quality layer without conflating it with source audit.

## Non-negotiable distinction

The analyzer distinguishes:

- **BLOCKER** — a mechanically provable pedagogical contract failure, such as a missing H1–H7 step, placeholder feedback, collapsed outcome feedback, or a guided reveal that is not reflected in mastery semantics.
- **WARN** — a review signal, such as an identical hint ladder across many nodes or a duplicate prompt+answer fingerprint. WARN does **not** prove that the node is filler, source-wrong, or invalid; a human/source-aware reviewer must decide.
- **INFO** — inventory/context only.

No finding automatically changes `AUTHORED`, `SOURCE_AUDITED`, or `AUDITOR_ACCEPTED` state.

## Mechanical BLOCKER checks

The v1 analyzer checks that:

1. `hints` is an object containing exactly H1–H7;
2. each hint is non-empty and non-placeholder-like;
3. a hint ladder does not collapse several steps into identical wording;
4. success, partial, and failure feedback are substantive and outcome-specific;
5. `why_this_node_exists`, `skill_target`, `knowledge_target`, and the functional nonvisual equivalent are substantive rather than placeholders;
6. mastery domains are explicit;
7. a guided H7/reveal is represented in `mastery_mode` so assisted success is not silently recorded as independent mastery;
8. retrieval scheduling fields are explicit;
9. the normalized player prompt is not identical to the accepted answer.

These checks are pedagogical mechanics, not source exegesis.

## WARN review signals

The analyzer reports, without auto-repairing:

- identical complete H1–H7 ladders reused across multiple stable IDs;
- normalized `player_prompt + accepted_answer` duplicates across stable IDs, as a signal for possible wording-only EXACT inflation;
- identical success/partial/failure feedback sets reused across multiple nodes;
- heavily reused generic hint templates that do not obviously narrow the specific node;
- non-explicit `spaced_retrieval` values.

A WARN may be legitimate. For example, two nodes can intentionally share a feedback structure while targeting different source evidence. The report therefore lists exact node IDs and leaves source-aware adjudication to the author/auditor.

## Pedagogical intent preserved

The final game must retain the complete learning loop:

`learning purpose -> source-bounded prompt -> learner response -> deterministic grading -> substantive outcome feedback -> progressive hints -> independent/guided mastery distinction -> retrieval scheduling -> later validated variation/context transfer`.

The gate must not encourage shorter or easier content merely to satisfy metrics. It is specifically intended to detect filler, generic scaffolding, and accidental duplicate learning events while preserving source-safe depth.

## EXACT / VARIANT / retrieval governance

The project rule remains authoritative:

- wording-only paraphrase is `EXACT`;
- `VARIANT` requires a genuinely validated change of form, evidence use, or cognitive operation rather than cosmetic wording;
- `PASSAGE_REVISIT`, `CROSS_CONTEXT`, and `SYNTHESIS` remain distinct retrieval categories;
- successful exact tasks are not randomly repeated in adjacent sessions;
- weak knowledge returns earlier, preferably through another validated form;
- scheduler/mastery state is deterministic and never invented by an LLM.

The v1 duplicate fingerprint is only a discovery signal. It does not automatically assign any of these categories.

## Report-first rollout

The initial GitHub workflow runs with `--fail-on none` for the corpus inventory while unit tests still fail on analyzer regressions. This is intentional: introducing the tool must not retroactively relabel existing authored content without review.

After the inventory is read, high-confidence mechanical findings can be repaired node-by-node and selected BLOCKER classes may then be promoted into mandatory CI. WARN heuristics remain review signals unless a future authoritative rule explicitly promotes them.

## Accessibility

Pedagogy is incomplete if the learning operation is inaccessible. Every node must retain a functional nonvisual equivalent, keyboard-complete operation, textual feedback, and a way to understand the evidence/mastery/next-action state without relying on spatial arrangement, color, drag-and-drop, graphics, or speech audio.

Application TTS, when present, is additional presentation. It never replaces the semantic text/NVDA learning path.

## Output governance

The JSON/Markdown report records:

- files/schema files scanned;
- nodes analyzed;
- exact findings and severity;
- duplicate fingerprints and stable IDs;
- the existing `canonical_status` inventory as read from files.

It explicitly does not claim biblical/source correctness, independent audit acceptance, authored/source-audited count promotion, or automatic content repair.
