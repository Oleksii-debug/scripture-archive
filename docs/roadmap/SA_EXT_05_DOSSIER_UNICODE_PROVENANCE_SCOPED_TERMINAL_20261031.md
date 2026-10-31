# SA-EXT-05 / DOSSIER_VISIBLE_PROVENANCE — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

Date 2026-10-31. This **does not** close the whole SA-EXT-05 parent; only the reproduced visible-source Unicode defect is terminal.

## Defect and implementation
The existing `public/scripture-dossiers.js::validateDossierGraph` rejected some bidi/control characters but accepted Unicode format characters and visually blank script fillers U+00AD/U+034F/U+115F/U+1160/U+180E/U+2800/U+3164/U+FFA0 in Bible book titles and public dossier names, summaries and prompts. Escaping HTML did not make these labels semantically visible for reading and NVDA. Since both canonical dossier and atlas links are constructed from the validated graph, misleading source labels could accompany actual Scripture links.

Strengthened this **same existing** shared graph preflight; now it rejects Unicode format controls and blank script fillers before materializing any dossier or atlas links. Existing source graph, canonical passages, study questions, legitimate visible Cyrillic and genuine Braille cells remain. No new index/database/server.

`tests/dossier-provenance-unicode-controls.test.mjs` extends real catalog / dossier / atlas negative fixtures over 8 new controls × 3 locale book labels and 3 dossier multilingual fields, confirms untrusted graph produces error with **no reader/dossier links**, and ensures source nodes restored after tests.

## Proof
- Functional PR #957: https://github.com/Oleksii-debug/scripture-archive/pull/957 — **squash MERGED**.
- Feature merged source `main@cbbd1a4d38b2b6a2a1ea64abd3a34412d401b764`, verified after PR merge.
- Source blob `1113bba060a8dc81b7a4828b99147e5cccc0cf08`, regression blob `b30b13363a52726415fd924fce9bb46929ea8ec2`.
- Exact PR-head `d352710d8495df0b8c0437592ab9b229dab1e20f`.
- Exact-head GitHub Actions https://github.com/Oleksii-debug/scripture-archive/actions/runs/41201960188 **SUCCESS** — native Node **3390 PASS/0 FAIL/1 SKIP**, Worker/D1 **24 PASS/0 FAIL**, Python **2 PASS**, TS/lint/build PASS.

`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_feature_PRs=0`; `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Only reopen upon concrete defect or approved new requirement. Full SA-EXT-05 remains OPEN; physical NVDA, Windows, live deployed site SHA, further external provenance/archaeological evidence are not verified. No production deployment/migration/real user data/cron/email/payment changed.