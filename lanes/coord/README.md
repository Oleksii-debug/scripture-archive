# R06 Swarm Coordinator Integration Lane

This directory contains coordinator-owned restart-safe state and control tooling for `r06-swarm-coord-integration`.

## Rules

- Every coordinator run must refetch live `CURRENT_HANDOFF`, issues #11–#23, relevant defect issues, branch heads, CI, and required Drive packages before producing a new snapshot.
- Snapshots are observations, not biblical/content truth and not independent QA verdicts.
- `swarm_readiness.py` is deliberately fail-closed. It cannot authorize a merge unless the snapshot explicitly records exact terminal inputs, QA acceptance, final package evidence, real Windows/WebView2 acceptance, human NVDA acceptance, and both coordinator/main merge flags.
- A lane head that advances after a pinned integration gate makes that gate stale for final readiness and requires a rerun.
- Content/source truth remains owned by the content lanes. The coordinator does not silently repair Scripture claims, witness boundaries, confidence/TX1, evidence provenance, or grading truth.
- `main` is not modified from this lane unless a later explicit exact-gate + QA authorization permits a dedicated merge step.

## Current snapshot

`SWARM_INTEGRATION_SNAPSHOT_2026-08-23T1518.json` records the initial autonomous-swarm migration checkpoint. It pins all DEV01–DEV10 ownership heads and corresponding legacy parents, current materialization gaps, semantic contract risks, QA state, and merge authorization `false`.

Use the evaluator only after the current snapshot has been independently refreshed from live sources:

```text
python lanes/coord/swarm_readiness.py lanes/coord/SWARM_INTEGRATION_SNAPSHOT_2026-08-23T1518.json
```

Exit code `0` means merge authorization is fully evidenced by the supplied snapshot. Exit code `1` means fail-closed/not authorized. Exit code `2` means malformed or unreadable input.
