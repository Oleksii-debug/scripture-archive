# R06 DEV1 — Platform / Windows / Constructor lane — FINALPREP02

Historical base: `bbc681db9701fa39dbe757dda8f2e341ea4e3c5b`. FINALPREP02 starts from live DEV1 tip `0d30126393894f6fb2a30cff15ca4ef17bf527e1` and remains isolated from `main` until the dedicated integration cycle.

The historic immutable base is still retained under `source_parts/` for recovery, but FINALPREP02 changes are readable under `repair_overlay/`, and the canonical lane package contains the fully resolved readable `r06_platform` source plus per-file hashes. Integration must use the resolved FINALPREP02 package/source state, not cherry-pick historical opaque chunks.

DEV1 consumes the exact shared `ANSWER_DTO_v1` descriptors used by DEV5 FINALPREP02. All 14 current task types have renderer/editor slots; deterministic grading/mastery/scheduling remain DEV5-owned. Public runtime submissions are validated fail-closed before crossing the DEV1→DEV5 adapter boundary.

Current D2/D3/D4 package-shape presentation check is 1196/1196 mapped without unsupported task-type/DTO errors. This is DEV1 presentation-contract evidence, not source audit or auditor acceptance.

Windows packaging remains reproducible through `packaging/build_windows.ps1`. GitHub-hosted Actions previously terminated before recording workflow steps, so a Windows artifact is only verified if a real Windows run/build and WebView2 launch evidence exists. Human NVDA acceptance must never be inferred from automated semantic tests.

Do not merge this lane mechanically. Exact final branch HEAD, resolved-source hash, package hash and Windows-artifact status are recorded in `DEV_LANE_SCRIPTURE_R06_D1_FINALPREP_02.zip` and its Drive handoff/readback evidence.
