# SA-EXT-16 / SUPPORT_ATTACHMENT_UNICODE_FILENAME — scoped terminal source receipt

**30.10.2026 — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.** Only this demonstrated support-attachment display-name spoofing defect is closed. The full parent SA-EXT-16, and all full SA-EXT-01…20 parents, remain OPEN. No claim of a fully released Scripture Archive.

## The actual finished user-facing function
The existing authenticated `POST /api/help` receives permitted PDF/DOCX/image/TXT attachments. Its canonical `safeFilename` normalization now replaces invisible formatting, Unicode direction overrides/isolates, control and separator characters (`Cc/Cf/Cs/Zl/Zp`) in **stored/displayed attachment names** with visible hyphens. Ordinary Ukrainian, Arabic and ASCII names are preserved. Original attachment bytes, MIME and signature validation, same-origin gate, rate limiting, D1 atomic receipts, support-only inbox, email delivery handling and upload limits are unchanged. This is a name-display integrity repair, not a new parser or malware scanner.

## Exact accepted GitHub main source
- [Feature PR #759](https://github.com/Oleksii-debug/scripture-archive/pull/759) **SQUASH MERGED**, feature integration `aa02312a4e84f08b7eb059ab147f9ddaf87dd61e`.
- Final source file: `app/api/help/route.ts`, Git blob `56561b0d7dcb4a1137c54b946b8211daefadb937`.
- Real-route executable regression file: `tests/help-attachment-signatures.test.mjs`, Git blob `2d094fec56bcbc7235ce9f567c9f8c7bc9de8207`.
- Independent current main readback after feature merge `a394c0506bb7da7ccf8ab34c33be4b1758d3d294`; Git compare confirmed feature SHA ancestor, `behind_by=0`, and the exact two blobs in `main`.
- Prior canonical source blob `dbb4b6bc1b8b56a3817902d81d89253a33fa03bd`; code change is exactly one sanitization statement.

## Executed qualification
1. Real old and candidate sanitizer extracted and executed from exact main/branch TypeScript in V8. **41/41 Unicode control witnesses were unsafe before and safely rendered afterward**; **3/3 ordinary Unicode names unchanged**. Tested exact source structural diff and test syntax.
2. Added **12 source-route regression cases**: 9 spoofing/control names, Ukrainian/Arabic positives and invalid PDF negative. They verify actual D1 attachment row filename and fake outgoing support metadata with no live email.
3. [Exact-head GitHub Actions #41066927898](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41066927898) **SUCCESS** on PR HEAD `911261e08a3cb208118cfcb4711bdb3078f634a8`: native Node regression suite, TypeScript contracts, ESLint, no-deployment source build, **disposable Worker/D1 end-to-end**, and canonical Python validators all green.
4. GitHub PR `merged=true`; resulting source/test files were re-read from `main` with precise blob matching.

**remaining_scoped_implementation=0; necessary_unmerged_PRs=0** for this exact defect. Reopen only for a new reproducible regression. No other Section is implicitly accepted by this work.

## Explicit unresolved product/release obligations
No production Cloudflare Sites SHA verification, real production D1 read or migration cutover, outgoing SMTP acceptance, independent live Chrome/Windows NVDA, church/academy/reader whole-product acceptance, full SA-EXT-16 security qualification, legal rights for new languages, social/dating launch, or production deployment was done. Release coordination [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297) and approved scope [#295](https://github.com/Oleksii-debug/scripture-archive/issues/295) remain authoritative.
