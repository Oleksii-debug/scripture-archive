# SA-EXT-05 — DOSSIER_RESEARCH_QUESTION_DISCOVERY — scoped terminal

**Date:** 2026-10-30  
**State:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` — **only** existing dossier research-question search, not the entire SA-EXT-05 parent section.

## Reproduced defect

The canonical `searchScriptureDossiers` searched localized dossier IDs, titles, summaries and subject types, but ignored its own already-authored and publicly shown study questions. These three genuine queries each returned **no results** on exact original source: `Які зміни імен` (uk), `Какие изменения имён` (ru), `Which name changes` (en). This made the existing source-backed Sarah dossier undiscoverable by the terms visible in its questions.

## Integrated repair and verification

- Reused the existing `public/scripture-dossiers.js` canonical graph, native `GET /dossiers` route and language-specific `prompts[lang]`; no second catalogue or unverified Scripture text.
- Added two native Node regression cases to existing `tests/dossier-search.test.mjs`: exact question-only matches in UK/RU/EN, GET filter roundtrip, real Genesis passage link, and fail-closed exclusion of another dossier's sources.
- Before change: source-executed V8 reproduction showed 0 results in all three languages. After change: source-executed V8 checks on exact branch bytes showed Sarah-only matching and no unrelated source disclosure in three languages.
- [Code PR #732](https://github.com/Oleksii-debug/scripture-archive/pull/732) **SQUASH MERGED** into `main@8c97e5ae83607ed6407382f8e14ad282c6a052a7`. Exact merged source blob `43896eff61833e64cc90a983173260ba52dcb978`; native tests blob `3d23cb828568f06c0168e8f3c325c0999b16f298`. Both read back from merged main.
- [Exact-PR-head GitHub Actions run #41061839502](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41061839502) concluded **SUCCESS** on `91b83e44d0e27e94c75418f62795f85b80968bbf`: native Node regression suite, TypeScript, lint, build, disposable local Worker/D1 integration and Python validators completed successfully.

**remaining_scoped_implementation=0; necessary_unmerged_PRs=0** for `DOSSIER_RESEARCH_QUESTION_DISCOVERY` alone.

## Not claimed

The complete **SA-EXT-05 and all twenty SA-EXT-01…20 parent sections remain OPEN**, including broader graph/research acceptance. No current public Sites deployment source SHA, authenticated browser journey, physical Windows/NVDA, editorial/full-corpus or production privacy approval was performed by this PR. No deployment, release, account data, mail, DNS or external services were changed. A new concrete defect or approved requirement is required to reopen this scoped terminal.
