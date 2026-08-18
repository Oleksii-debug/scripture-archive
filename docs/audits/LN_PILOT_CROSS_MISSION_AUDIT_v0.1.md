# LN pilot cross-mission audit v0.1

**Campaign:** LN — «Остання ніч»  
**Audit status:** `IN_PROGRESS`  
**Date:** 2026-08-18

## Purpose

This audit begins only after all 12 pilot missions have reached `MISSION_COMPLETE / SOURCE_AUDITED`. It checks the campaign as one system rather than trusting mission-local correctness.

## Verified structural state

- Mission files present: LN-01 through LN-12.
- Completed mission count: **12/12 = 100% mission-count completion**.
- Canonical required nodes: **160**.
- Canonical optional/conditional nodes: **25**.
- Total authored canonical nodes: **185**.
- LN-12 closes the campaign at the authority-handoff threshold to Pilate and does not expand into the substantive Roman trial.
- LN-11 is the evidence-map synthesis; LN-12 is the final reconstruction/defence. Their roles are intentionally distinct.
- Platform implementation remains deferred.

## Audit dimensions

The campaign is not considered editorially closed until all dimensions below are checked across LN-01–LN-12:

1. duplicate graded claims;
2. contradictory grading across missions;
3. broken branches or unreachable completion states;
4. mismatch between required/optional status and actual learning importance;
5. retrieval dependencies and mastery coverage;
6. witness provenance consistency;
7. anti-false-harmonization consistency;
8. textual-variant `TX1` propagation;
9. mission-boundary leakage;
10. T1/T2/C1/I1/D1 classification consistency;
11. answer-validation consistency across translation-equivalent wording;
12. accessibility equivalence for ordering, evidence maps, chronology, comparison and final synthesis;
13. duplicated feedback/hint logic that creates artificial repetition;
14. campaign pacing and cognitive-load spikes;
15. final LN-12 coverage of all campaign safeguards.

## Initial findings

### A-01 — Campaign completion and role partition: PASS

LN-01–LN-10 carry narrative investigation; LN-11 converts prior claims into a provenance-aware evidence graph; LN-12 requires a source-cited final reconstruction and defence. No additional narrative corpus was introduced in LN-11 or LN-12, which prevents synthesis missions from silently creating new “facts.”

### A-02 — End boundary: PASS

The pilot ends at the transition to Pilate. Substantive Roman-trial material is explicitly deferred. This prevents LN-10/LN-12 from expanding beyond the baseline campaign identity.

### A-03 — Final synthesis vs false harmonization: PASS at design level

LN-12 explicitly allows multiple responsible reconstructions where D1 applies and forbids an unsupported exact merged chronology. This is consistent with the anti-false-harmonization rule established earlier.

### A-04 — Evidence-map accessibility: PASS at design level

LN-11 and LN-12 both define a canonical linear/nonvisual representation. A future visual board is not treated as superior to the text representation.

### A-05 — Node-count baseline drift: ACCEPTED / DOCUMENTED

The original baseline listed 72 detailed LN concepts. Canonical migration expanded them to 185 authored nodes (160 required + 25 optional/conditional). This is not treated as accidental scope inflation because the canonical schema explicitly permits one baseline concept to expand into several source-audited nodes for provenance, accessibility, retrieval and uncertainty handling. The difference must remain visible in project reporting so baseline concepts are never confused with authored nodes.

## Checks still required before `AUDIT_COMPLETE`

- Read each mission end-to-end and build a duplicate-claim matrix.
- Build a cross-mission confidence/classification register for T1/T2/C1/I1/D1/TX1.
- Trace every `later_retrieval_effect` into a later node or explicit post-campaign review queue.
- Trace every required node branch to confirm no dead ends and no branch that changes nothing.
- Compare all answer-validation wording for translation neutrality.
- Verify all TX1 references are attached before grading in every mission where used.
- Check that LN-07/LN-08/LN-09 temporal overlap does not create contradictory ordering claims.
- Check that LN-04 prediction wording and LN-09/LN-12 fulfilment wording remain source-separated.
- Check that LN-10/LN-12 do not import accusation/interrogation/verdict material after the Pilate threshold.
- Perform a dedicated NVDA/nonvisual interaction audit of all task families represented in the pilot.
- Produce an editorial defect list with severity, affected files, fix strategy and regression checks.

## Closure rule

Do not mark campaign LN as `PILOT_AUDIT_COMPLETE` merely because all 12 missions exist. Closure requires all high/critical defects to be fixed, all medium defects either fixed or explicitly accepted, and a final regression audit after changes.
