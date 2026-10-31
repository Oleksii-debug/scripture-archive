## Current-source correction (2026-10-31)

> **Important:** the August 20, 2026 R05 `TEXTUAL_PREPRODUCTION_ACTIVE` snapshot retained **below** is historical. It must not override the later owner-approved product plan, GitHub main, or root `AGENTS.md`. This banner is a dated snapshot, not a floating claim that the live site matches the repository.

**Authoritative current documents:** `AGENTS.md`; [approved 20-section plan](docs/roadmap/SCRIPTURE_ARCHIVE_EXPANSION_SECTION_PLAN_2026-10-28.md); [scope index](docs/EXPANSION_SCOPE_INDEX.md); [central issue #297](https://github.com/Oleksii-debug/scripture-archive/issues/297) and [owner scope #295](https://github.com/Oleksii-debug/scripture-archive/issues/295). Live GitHub cross-check on 2026-10-31: scoped account BFCache fix [#826](https://github.com/Oleksii-debug/scripture-archive/pull/826) merged at `9457b5bb93f032b8deb455aa8964ffeb741d3f34`, and terminal receipt [#831](https://github.com/Oleksii-debug/scripture-archive/pull/831) at `4a5bbecb47c69fbb1260708e3131ae5274a02914`; later workers must refresh live main.

- There is now a real source app: `app/api/*`, `public/app.js`, `public/workspace.js`, reader, mission, community, course and editorial modules, plus CI tests. Do **not** repeat the August assertion that no app/platform source exists.
- **SA-EXT-03 and SA-EXT-04 are already CLOSED_FOR_DEVELOPMENT / TERMINAL for their approved source scope.** Formal parent receipts: [`SA-EXT-03`](docs/roadmap/SA_EXT_03_PARENT_CLOSED_FOR_DEVELOPMENT_TERMINAL_20261031.md), [`SA-EXT-04`](docs/roadmap/SA_EXT_04_PARENT_CLOSED_FOR_DEVELOPMENT_TERMINAL_20261031.md), with accepted source `main@79a8e40cee2c3eb0e0901c5b8b260cb4b0a149c9` and subsequent narrow privacy repairs retained. **The other 18 parent sections SA-EXT-01…20 remain OPEN**, including 01, 02, 05 and 16. A `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` receipt is never a complete parent closure, website release, physical NVDA acceptance, or 82-language coverage. Do not reassign 03/04 wholesale absent a concrete new defect or requirement.
- Two newly merged source improvements: [#518](https://github.com/Oleksii-debug/scripture-archive/pull/518) dossier search `main@4fff3bd6f88ae6628642d8fce3eccd2a7057307b`; [#524](https://github.com/Oleksii-debug/scripture-archive/pull/524) fully sourced narrative atlas `main@75a44e5bf461e94ed2791017c11cec2962b0f404`. Both have test evidence and scoped terminal entries in the approved plan; full sections 05/06 are not terminal. Other worker follow-up [#525](https://github.com/Oleksii-debug/scripture-archive/pull/525) also reconciles filtered dossier selections.
- **CI truth:** exact-head Node/TS/lint/build/Python can pass while the overall workflow remains RED because the disposable Wrangler Worker/D1 tests intermittently return HTTP 503. Investigate existing [draft PR #361](https://github.com/Oleksii-debug/scripture-archive/pull/361); never reinterpret a 21/22 Worker pass as full E2E PASS.
- **Unresolved release controls:** confirm actual Sites deployment SHA and access, DNS/email sender/verification/reset, safe owner Stop/Continue and scheduler, and true browser + Windows/NVDA and privacy/security acceptance before declaring production ready. Historically verified Sites v10/`3a04d12` (26 Oct) is a handoff, not proof of today's live site.
- **New scope is NOT an automatic publish authorization.** The 18+ dating project is separate, opt-in, privacy-sensitive and approved **for planning only**; never mix its user records or release it from the education site by default.

---

# Архів Писання — PROJECT STATUS

**Repository:** `Oleksii-debug/scripture-archive`  
**Date:** 2026-08-20  
**Project phase:** `TEXTUAL_PREPRODUCTION_ACTIVE`  
**Production authorized:** `NO`  
**Canonical content schema:** v1.2  
**Developer round:** `DEV R05 CORRECTIVE RESUBMISSION / INDEPENDENT AUDIT PENDING`  
**Latest independent state consumed:** `AUDIT R05 PRECHECK = BLOCKED / PRE-R05-005 HIGH`  
**Pilot editorial status:** `PILOT_AUDIT_IN_PROGRESS`

## R05 result
R05 closes the developer side of all five AUDIT R04 defects, then consumes the R05 GitHub precheck findings PRE-R05-001..005 before package resubmission.

### AUD-R04-001 — pedagogy/H7
- All 29 LN-02/LN-03 target nodes have node-specific success/partial/failure feedback.
- H1–H7 are progressive and H7 presents an actual answer/evidence explanation before guided progression.
- `mastery_mode` records guided completion after answer reveal.

### AUD-R04-002 — validator depth
- Validator rejects placeholder H7, known generic feedback, bulk-identical effective feedback, invalid retrieval/confidence/TX1 data and overlay errors.
- Effective-node validation applies correction/overlay layers before semantic-shape checks.
- Executable fixtures cover GOOD, BAD-placeholder rejection, overlay-repair PASS and PRE-R05 correction-consumption regressions.
- Static validation is explicitly not treated as semantic audit.

### AUD-R04-003 — TX1 traceability
- Named textual-critical note traceability exists for Luke 22:19–20 and covenant wording in Matthew 26:28 / Mark 14:24.
- Existing Mark rooster and Luke 22:43–44 TX1 chains are retained.
- No originality verdict is required for gameplay.

### AUD-R04-004 — retrieval terminals
- Ambiguous pseudo-campaign destinations from R04 are replaced with named `REVIEW_QUEUE` destinations.
- Whole-pilot retrieval register v0.8 uses explicit terminal classes.

### AUD-R04-005 — throughput
Source-safe useful-unit count before proactive legacy overlays: **170**:
- 29 audited-target node repairs;
- 48 newly canonicalized LN nodes;
- 93 deterministic evidence provenance records (77 LN + 16 accepted PA-02).

Additionally, stricter R05 validation exposed latent weak/generic pedagogy in 63 older JSON canonical nodes. R05 preserves their historical base records and applies an explicit allowed-field pedagogy overlay with canonical precedence.

## R05 GitHub precheck closure
PRE-R05-001..004 are corrected by explicit semantic/evidence sidecars:
- LN11-N01 / EVR-R05-0061: project-defined campaign sequence = C1, not T1;
- LN11-N02/N03/N07 + EVR-R05-0062/0063/0067: John 18:10 and Luke 22:50 both preserve right-ear provenance; Luke 22:51 is healing-specific in the assigned comparison;
- LN11-N04 / EVR-R05-0064: Mark rooster wording is TX1-qualified before grading;
- LN11-N09 / EVR-R05-0069: Luke 22:66 remains a direct witness-local anchor, while merged cross-Gospel chronology is D1/not established.

PRE-R05-005 developer closure:
- `tools/validate_canonical_missions_and_nodes.py` now consumes semantic corrections inside the primary effective-node path **before** pedagogy overlays;
- it also consumes the evidence correction layer and validates effective evidence records;
- deterministic PRE-R05 contracts cover the six named LN-11 nodes and six matching EVR records;
- `tools/test_r05_effective_canonical_state.py` proves positive consumption and rejects broken TX1/D1 sidecar states.

Effective precedence is explicit:
1. base canonical node;
2. semantic correction;
3. pedagogy overlay.

Evidence precedence is base evidence record → evidence correction.

PRE-R05-005 is **developer-closed / independent audit pending**; this file does not self-issue audit PASS.

## LN normalization milestone
Developer-normalized total: **185/185 = 100%**.

Format split is explicit:
- 154 nodes are machine-readable JSON canonical records under 10 mission indexes;
- 31 nodes are the independently accepted normalized Markdown v1.1 layer for LN-07/LN-08.

This project does **not** claim 185 JSON nodes. Independent accepted baseline remains **108/185** until the corrected R05 package passes independent audit.

New R05 canonical missions:
- LN-06 — 16/16;
- LN-10 — 15/15;
- LN-11 — 17/17.

## Whole-pilot developer QA target for corrected R05
- 10 mission indexes;
- 154 JSON canonical nodes;
- 6 semantic corrections;
- 63 pedagogy overlays;
- 1 evidence index / 93 evidence records / 6 evidence corrections;
- PRE-R05 node targets 6/6;
- PRE-R05 evidence targets 6/6;
- main validator errors = 0;
- legacy validator fixtures PASS/REJECT/PASS as designed;
- PRE-R05 effective-state positive/negative regression PASS;
- no production website/app/platform code created.

## Evidence / PA lane
`R05_EVIDENCE_PROVENANCE_REGISTRY_v0.1` contains **93** deterministic records:
- 77 LN;
- 16 PA-02.

PA authored/source-audited developer baseline remains PA-01 + PA-02 = **30 canonical nodes**. PA-03 is not claimed authored in R05.

## Accessibility state
All R05 canonical mechanics retain labelled linear/nonvisual equivalents. Ordering uses numeric or move-up/move-down alternatives. TX1/uncertainty/result state is textual. Final runtime focus behavior remains untested because production implementation is not authorized.

## Next role after package delivery
`AUDITOR` — independently verify corrected DEV R05, including PRE-R05-001..005, exact effective-state validator behavior, 185/185 normalization split, evidence registry, package↔GitHub fidelity and Drive readback. Until that package is delivered and handoff is updated, the workflow remains in R05 and must not start R06.
