# SA-EXT-10 — PUBLIC_READING_CANONICAL_CHAPTER_LIMITS — source-scoped terminal record (2026-10-30)

**Decision: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.** Only the established public reading-counter canonical book/chapter-boundary defect is closed for repeated feature development; the complete **SA-EXT-10 parent section remains OPEN**, as do SA-EXT-01…20. A newly demonstrated regression or an approved new requirement may be separately tracked.

## Verified source result

- Functional PR: https://github.com/Oleksii-debug/scripture-archive/pull/744 — **squash merged**.
- Exact feature integration SHA: `68d63d956d63ca0f25f595fb7cda7264476387e7`. Later observed descendant main: `16926cca4bd81e6d267f635c597be110fada3823` (the feature SHA remains in history; live main may advance).
- Exact accepted PR head: `0fb74f7f8be5b1e31abf66669fd35493d3a9f05a`.
- Production-route source: `app/api/community/route.ts`, observed merged-main blob `0db28637f33a7005e53b2b86945224e881b43ac6`.
- Existing route regression: `tests/community-read-availability.test.mjs`, observed merged-main blob `ad9fc16ea49e739d5a9f7837b89974b47234cf22`.
- Existing POST integration fixture: `tests/community-agent-finish-atomic.test.mjs`, observed merged-main blob `dabeab1a382c52357c34d7f4cdfd17aec1545ad9`.

## Functionality delivered in one existing platform

Canonical public `GET /api/community` derives legitimate book/chapter bounds from existing `public/data/catalog.json`, matching the private account reading authority. A book that does not exist or a chapter beyond the maximum supported local edition is **not** presented as completed reading: the existing error response remains a non-disclosing HTTP 503 rather than a false HTTP 200 counter. Regression cases include nonexistent book, `GEN:51`, `JOL:5`, and valid `JOL:4` from an approved Ukrainian edition. Existing D1 read-only behavior, privacy controls, account/mission authorities, and unrelated source modules are unchanged. No competing book catalogue, server, route, or database was introduced.

## Execution evidence and limits

- Hosted exact-head Actions: https://github.com/Oleksii-debug/scripture-archive/actions/runs/41064822640 — **completed SUCCESS**, actual native Node suite, TypeScript, ESLint, source build, disposable Worker/D1 integration, and Python validator steps all succeeded.
- Independently reproduced preceding regression against the genuine historical source in an isolated V8 harness: `GEN:51` and `XYZ:1` previously counted as one; canonical valid `GEN:50` and `JOL:4` counted as one. This isolated check is **not** a replacement for native Node/Worker/D1.
- Merged-main source/test readback was inspected by blob identity and the feature SHA was confirmed as an ancestor of the observed main SHA.
- **Not verified:** actual installed Cloudflare Sites SHA, live authenticated browser journey, production D1 records, Windows artifact, physical NVDA, or production SMTP delivery. No production publish or migration is authorized by this receipt.

**Scoped closure:** `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0` for **this exact source defect**, not for SA-EXT-10 or the platform. Existing owner boards #295, #297 and #78 govern remaining approved implementation. No further whole-section duplicate work should be assigned on the basis of this receipt.
