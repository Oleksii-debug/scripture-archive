# PA-02 Damascus-road evidence / witness pack v0.1

**Date:** 2026-08-19  
**Status:** `SOURCE_AUDITED / READY_FOR_CANONICAL_USE`  
**Depends on:** `EVIDENCE_REGISTRY_SPEC_AND_PA_SEEDS_v0.1.md`

## Rules
Every record preserves source witness, local wording, confidence, translation boundary and forbidden overclaim. Acts 9 narrator claims are never silently converted into Paul's Acts 22/26 speech claims. Omission in one retelling means `not stated in this cited unit`, not `did not happen`. No record uses TX1 merely for translation variation.

### EV-PA-0008
- `entity_type`: EVENT
- `canonical_label`: Damascus-road interruption — Acts 9
- `claim`: As Saul nears Damascus, a light from heaven shines around him; he falls, hears a voice asking why he persecutes the speaker, and the speaker identifies as Jesus.
- `source_passage`: Acts 9:3–6
- `speaker_or_narrator`: Acts narrator; quoted voice within narrative
- `confidence_code`: T1
- `textual_variant_flag`: none
- `chronology_scope`: after Acts 9:1–2 journey objective; before companion/blindness aftermath.
- `provenance_notes`: narrator account, not Paul's later first-person speech.
- `accepted_semantic_forms`: translation-equivalent light/fall/voice/Jesus wording.
- `forbidden_overclaims`: all companions fell; midday; direct long Gentile commission in this verse unit.
- `cross_links`: EV-PA-0003; EV-PA-0009; EV-PA-0011; EV-PA-0014
- `usable_by_campaigns`: PA-02
- `source_audit_status`: SOURCE_AUDITED

### EV-PA-0009
- `entity_type`: CLAIM
- `canonical_label`: Acts 9 companions — hearing and visibility
- `claim`: The men travelling with Saul are described as hearing a voice/sound while seeing no one.
- `source_passage`: Acts 9:7
- `speaker_or_narrator`: Acts narrator
- `confidence_code`: T1
- `textual_variant_flag`: none
- `chronology_scope`: immediately after the addressed voice in Acts 9.
- `provenance_notes`: preserve local claim; do not use it alone to settle Acts 22:9 wording.
- `accepted_semantic_forms`: hearing a voice / hearing a sound; seeing no person / seeing no one.
- `forbidden_overclaims`: companions understood every word; companions saw Jesus; this verse alone resolves Acts 22.
- `cross_links`: EV-PA-0012; EV-PA-0016
- `usable_by_campaigns`: PA-02
- `source_audit_status`: SOURCE_AUDITED

### EV-PA-0010
- `entity_type`: EVENT
- `canonical_label`: Acts 9 blindness and hand-leading
- `claim`: Saul rises unable to see; companions lead him by the hand into Damascus; he remains without sight for three days and does not eat or drink.
- `source_passage`: Acts 9:8–9
- `speaker_or_narrator`: Acts narrator
- `confidence_code`: T1
- `textual_variant_flag`: none
- `chronology_scope`: post-encounter, before Ananias visit.
- `provenance_notes`: may be compared with Acts 22:11; not imported as explicit wording into Acts 26:12–18.
- `accepted_semantic_forms`: blind/could see nothing; led by hand; three days.
- `forbidden_overclaims`: Acts 26 directly repeats all these details.
- `cross_links`: EV-PA-0013
- `usable_by_campaigns`: PA-02
- `source_audit_status`: SOURCE_AUDITED

### EV-PA-0011
- `entity_type`: EVENT
- `canonical_label`: Damascus-road retelling — Acts 22
- `claim`: Paul says that about noon near Damascus a bright heavenly light flashed around him; he fell, heard the addressed voice, and the speaker identified as Jesus of Nazareth whom he was persecuting.
- `source_passage`: Acts 22:6–10
- `speaker_or_narrator`: Paul, first-person Jerusalem speech
- `confidence_code`: T1
- `textual_variant_flag`: none
- `chronology_scope`: retrospective speech about the Damascus journey.
- `provenance_notes`: wording belongs to Paul's retelling; do not flatten into anonymous narrator voice.
- `accepted_semantic_forms`: Jesus of Nazareth / Jesus the Nazarene; translation equivalents.
- `forbidden_overclaims`: Acts 9 explicitly says “about noon”; all three use identical self-identification wording.
- `cross_links`: EV-PA-0008; EV-PA-0012; EV-PA-0013
- `usable_by_campaigns`: PA-02
- `source_audit_status`: SOURCE_AUDITED

### EV-PA-0012
- `entity_type`: CLAIM
- `canonical_label`: Acts 22 companions — light and voice boundary
- `claim`: Paul says his companions saw the light; the auditory clause is rendered in responsible translations as not hearing or not understanding the voice of the speaker.
- `source_passage`: Acts 22:9
- `speaker_or_narrator`: Paul, first-person Jerusalem speech
- `confidence_code`: D1
- `textual_variant_flag`: none
- `chronology_scope`: encounter moment.
- `provenance_notes`: translation-neutral validation required. This record does not choose a harmonizing theory for Acts 9:7 and Acts 22:9.
- `accepted_semantic_forms`: saw the light + did not hear the voice / did not understand the voice, according to responsible translation.
- `forbidden_overclaims`: one translation's English wording is the only valid canonical answer; companions definitely understood every word; an unsourced harmonization is T1.
- `cross_links`: EV-PA-0009; EV-PA-0016
- `usable_by_campaigns`: PA-02
- `source_audit_status`: SOURCE_AUDITED

### EV-PA-0013
- `entity_type`: EVENT
- `canonical_label`: Acts 22 blindness, leading and Ananias
- `claim`: Paul says the brilliance left him unable to see and companions led him by the hand into Damascus; he then recounts Ananias' visit, restored sight and witness commission.
- `source_passage`: Acts 22:11–16
- `speaker_or_narrator`: Paul, first-person Jerusalem speech
- `confidence_code`: T1
- `textual_variant_flag`: none
- `chronology_scope`: immediate aftermath in retrospective speech.
- `provenance_notes`: Ananias material is explicit here; it is not explicit in Acts 26:12–18.
- `accepted_semantic_forms`: translation-equivalent blindness/leading/Ananias/witness wording.
- `forbidden_overclaims`: Acts 26:12–18 denies Ananias because it omits him.
- `cross_links`: EV-PA-0010; EV-PA-0017
- `usable_by_campaigns`: PA-02
- `source_audit_status`: SOURCE_AUDITED

### EV-PA-0014
- `entity_type`: EVENT
- `canonical_label`: Damascus-road retelling — Acts 26
- `claim`: Paul says he travelled to Damascus under chief-priestly authority; at midday a light brighter than the sun shone around him and his companions; all fell; Paul heard a voice speaking in Hebrew/Aramaic and the speaker identified as Jesus.
- `source_passage`: Acts 26:12–15
- `speaker_or_narrator`: Paul, first-person defense before Agrippa
- `confidence_code`: T1
- `textual_variant_flag`: none
- `chronology_scope`: retrospective defense speech.
- `provenance_notes`: “all fell” and language detail are explicit here and must not be imported into Acts 9/22 as if those units state them.
- `accepted_semantic_forms`: Hebrew language / Hebrew dialect / Aramaic according to translation note; brighter-than-sun equivalents.
- `forbidden_overclaims`: Acts 26:14 says companions heard nothing; all three explicitly say all fell.
- `cross_links`: EV-PA-0008; EV-PA-0015; EV-PA-0016
- `usable_by_campaigns`: PA-02
- `source_audit_status`: SOURCE_AUDITED

### EV-PA-0015
- `entity_type`: CLAIM
- `canonical_label`: Direct commission in Acts 26 road retelling
- `claim`: In Paul's Acts 26 retelling, Jesus directly commissions him as servant/witness and describes a mission to people and Gentiles.
- `source_passage`: Acts 26:16–18
- `speaker_or_narrator`: Paul quoting Jesus in first-person defense
- `confidence_code`: T1
- `textual_variant_flag`: none
- `chronology_scope`: placed within the road dialogue in this retelling.
- `provenance_notes`: compare with Acts 9 where mission information is mediated through the Ananias narrative and Acts 22 where Ananias reports witness language.
- `accepted_semantic_forms`: servant/minister; witness; sent mission; translation equivalents.
- `forbidden_overclaims`: all three witness units place the identical long commission verbatim on the road.
- `cross_links`: EV-PA-0017
- `usable_by_campaigns`: PA-02
- `source_audit_status`: SOURCE_AUDITED

### EV-PA-0016
- `entity_type`: CLAIM
- `canonical_label`: Cross-witness companion-auditory boundary
- `claim`: Acts 9:7, Acts 22:9 and Acts 26:14 do not support one unqualified universal sentence about what every companion heard/understood. The local claims and translation renderings must be preserved.
- `source_passage`: Acts 9:7; 22:9; 26:14
- `speaker_or_narrator`: mixed provenance — narrator / Paul speech / Paul speech
- `confidence_code`: D1
- `textual_variant_flag`: none
- `chronology_scope`: encounter comparison only.
- `provenance_notes`: this is an uncertainty/control record, not a harmonizing solution.
- `accepted_semantic_forms`: “the witnesses differ in wording/reporting; preserve each source”; “Acts 26 does not state companion hearing”.
- `forbidden_overclaims`: “they heard sound but not words” as the only T1 cross-witness solution without an explicitly sourced interpretive layer.
- `cross_links`: EV-PA-0009; EV-PA-0012; EV-PA-0014
- `usable_by_campaigns`: PA-02; future Acts-parallel cases
- `source_audit_status`: SOURCE_AUDITED

### EV-PA-0017
- `entity_type`: CLAIM
- `canonical_label`: Ananias / commission provenance comparison
- `claim`: Acts 9 narrates Ananias' role; Acts 22 has Paul retell Ananias' words; Acts 26:12–18 omits Ananias and presents direct road commission in Paul's speech.
- `source_passage`: Acts 9:10–19; 22:12–16; 26:16–18
- `speaker_or_narrator`: mixed provenance
- `confidence_code`: T2
- `textual_variant_flag`: none
- `chronology_scope`: comparison of narrative placement, not a forced single transcript.
- `provenance_notes`: omission is not contradiction or denial; it is a source-unit boundary.
- `accepted_semantic_forms`: narrator / Paul-retelling / direct commission contrast.
- `forbidden_overclaims`: Acts 26 states Ananias was absent from the historical event; all three contain the same quoted commission.
- `cross_links`: EV-PA-0013; EV-PA-0015
- `usable_by_campaigns`: PA-02
- `source_audit_status`: SOURCE_AUDITED

## Pack validation
- IDs EV-PA-0008…0017 are unique and continue the existing registry sequence.
- Every claim has a passage and provenance.
- Translation difference in Acts 22:9 is not mislabeled TX1.
- “not stated” is retained for Acts 26 companion hearing and Ananias omission boundaries.
- No historical chronology or institutional claim was introduced.
- All records have a linear textual representation suitable for NVDA/evidence-board fallback.
