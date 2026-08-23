# DEV10 — Stage05 exact package identity gate

Status: integration/test hardening only. This gate does not alter biblical truth, authorize `main` merge, or issue an independent audit verdict.

## Problem closed by this slice

The legacy Stage05 delivery-readiness preflight proves terminal reports, live GitHub HEAD equality, ZIP readback/CRC, materialization validation and final-input validation. Its package spec, however, names required ZIPs without independently pinning the expected immutable Drive object and SHA256. A different well-formed ZIP with the same filename/head pins could therefore satisfy orchestration-level checks before the later final intake rejects it.

DEV10 adds a stricter preflight that binds every required package to all three exact identity dimensions before the 1196 gate may run:

1. exact package filename;
2. exact immutable Drive ID;
3. exact SHA256;
4. all legacy live-head/readback/CRC/materialization/final-input checks remain mandatory.

Unexpected package evidence is also rejected so the final input set is exact, not merely a required subset.

## Schema and CLI

Input schema: `R06_STAGE05_EXACT_DELIVERY_INPUT_v1`.
Result schema: `R06_STAGE05_EXACT_DELIVERY_RESULT_v1`.

Each `specs[].required_packages[]` must contain:

- `filename`;
- `required_head_branches`;
- `expected_drive_id`;
- `expected_sha256`.

The corresponding `observations[].packages[filename]` retains the legacy evidence fields (`drive_id`, `sha256`, raw readback PASS, ZIP CRC PASS, pinned heads). Expected package identity is never auto-discovered or guessed.

Run from `runtime_engine` after constructing the observation from freshly fetched live heads and Drive readback evidence:

```text
python tools/run_stage05_exact_delivery_preflight.py exact-readiness.json --output exact-readiness-result.json
```

Exit code is `0` only when the strict identity layer and the existing delivery-readiness gate both allow the final 1196 preintegration gate. Any malformed/missing expected identity or stale/wrong package fails closed with exit code `2`.

New strict blocker codes:

- `PACKAGE_DRIVE_ID_MISMATCH`;
- `PACKAGE_SHA256_MISMATCH`;
- `UNEXPECTED_PACKAGE_EVIDENCE`;
- `EXACT_PREFLIGHT_INPUT_ERROR` for malformed CLI input.

## Dependency rule

While DEV07/08/09 remain non-terminal, this tooling may be tested on fixtures/snapshots but must not be reported as a final 1196 candidate PASS. Final execution requires freshly refetched terminal exact inputs. A stale package or stale branch pin must never be substituted as final input.
