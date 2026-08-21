# R06 DEV1 — Platform / Windows / Constructor lane

Base GitHub HEAD: `bbc681db9701fa39dbe757dda8f2e341ea4e3c5b`.

This lane is intentionally isolated from `main` and from DEV2–DEV5. The immutable first implementation slice is stored in `source_parts/` and reconstructs to SHA-256 `51a31a8840b57850c8d4d0fc714b124445f3b3155daea083817c3570e0b80e0e`. Pre-integration fixes are readable under `repair_overlay/` and are applied by `.github/workflows/r06-dev1-platform.yml` before tests/build.

The repair overlay closes DEV1-side cross-lane mismatches found by PRE-INTEGRATION AUDIT 01: CLAIM_EVIDENCE uses `{claim,evidence[]}`, COMPOSITE_MULTI_STEP uses `{step_id:value}`, platform renderer/editor slots cover SPEAKER_RECIPIENT / PARALLEL_WITNESS_COMPARE / OT_NT_LINK, and `RuntimeEngineContractAdapter` explicitly maps the stable `scripture.transport.v1` frontend boundary to DEV5 `runtime.v1` player commands without duplicating DEV5 grading/mastery/scheduler logic.

The Windows build script now emits `r06_platform/dist/ScriptureArchive-R06-DEV1.exe` plus SHA/size metadata. GitHub-hosted Actions runs on 2026-08-21 currently fail before any workflow step is allocated (`steps: []`), so no remote Windows EXE is claimed verified until an actual runner executes the job. Local Linux validation of the repaired materialized source is recorded in the canonical DEV1 lane package.

Do not merge this draft lane mechanically. Dedicated integration must reconcile the final DEV5 grading contracts and DEV2–DEV4 content packages first.
