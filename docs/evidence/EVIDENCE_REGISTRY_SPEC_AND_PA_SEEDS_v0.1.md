# Evidence registry specification + PA seed set v0.1

**Date:** 2026-08-18  
**Status:** `SPEC COMPLETE / SEED RECORDS SOURCE-AUDITED`

## Evidence record model
Every reusable record must contain:
- `evidence_id`
- `entity_type`: PERSON / EVENT / PLACE / SPEAKER / RECIPIENT / PROMISE / CLAIM / CROSS_REFERENCE
- `canonical_label`
- `claim`
- `source_passage`
- `speaker_or_narrator`
- `confidence_code`: T1/T2/C1/I1/D1
- `textual_variant_flag`: none/TX1
- `chronology_scope`
- `provenance_notes`
- `accepted_semantic_forms`
- `forbidden_overclaims`
- `cross_links`
- `usable_by_campaigns`
- `source_audit_status`

## Cross-reference categories
OT↔NT and intra-canon links must use an explicit relation class:
- `EXPLICIT_QUOTATION`
- `EXPLICIT_FULFILMENT_CLAIM`
- `ALLUSION_STRONG`
- `THEMATIC_PARALLEL`
- `TYPOLOGICAL_INTERPRETATION`
- `TRADITIONAL_ASSOCIATION`
- `DISPUTED_RELATION`

A relation class may not be upgraded merely because it is familiar in tradition.

## Seed records — PA

### EV-PA-0001
- `entity_type`: EVENT
- `canonical_label`: Saul at Stephen's execution
- `claim`: Witnesses placed garments at Saul's feet, and Saul approved/consented to Stephen's death/execution.
- `source_passage`: Acts 7:58; 8:1
- `speaker_or_narrator`: Acts narrator
- `confidence_code`: T1
- `textual_variant_flag`: none
- `chronology_scope`: before the broader persecution described in Acts 8:3 and before Damascus journey in Acts 9.
- `forbidden_overclaims`: «Saul personally threw stones» is not T1 from these verses.
- `cross_links`: EV-PA-0002
- `usable_by_campaigns`: PA-01; future Stephen cases
- `source_audit_status`: SOURCE_AUDITED

### EV-PA-0002
- `entity_type`: EVENT
- `canonical_label`: Saul ravages the church
- `claim`: Saul entered houses, took men and women and committed them to prison.
- `source_passage`: Acts 8:3
- `speaker_or_narrator`: Acts narrator
- `confidence_code`: T1
- `textual_variant_flag`: none
- `chronology_scope`: after Stephen's death; before Acts 9 Damascus journey.
- `provenance_notes`: narrator claim, not later Pauline speech.
- `forbidden_overclaims`: apostles-only target; men-only target.
- `usable_by_campaigns`: PA-01; persecution corpus
- `source_audit_status`: SOURCE_AUDITED

### EV-PA-0003
- `entity_type`: EVENT
- `canonical_label`: Damascus authorization objective
- `claim`: Saul sought letters to Damascus synagogues so that people belonging to the Way, men or women, could be taken bound to Jerusalem.
- `source_passage`: Acts 9:1–2
- `speaker_or_narrator`: Acts narrator
- `confidence_code`: T1
- `textual_variant_flag`: none
- `chronology_scope`: immediately before the Damascus-road encounter.
- `cross_links`: Acts 22:5 retrospective parallel
- `forbidden_overclaims`: preaching/meeting Ananias as Saul's stated pre-journey objective.
- `usable_by_campaigns`: PA-01; PA-02
- `source_audit_status`: SOURCE_AUDITED

### EV-PA-0004
- `entity_type`: SPEAKER
- `canonical_label`: Paul retells pre-Damascus past in Acts 22
- `claim`: Paul identifies Jewish/Tarsus background and training under Gamaliel, describes zeal, persecution of the Way to death, binding men and women, and letters for Damascus to bring prisoners to Jerusalem for punishment.
- `source_passage`: Acts 22:3–5
- `speaker_or_narrator`: Paul, first-person defense speech
- `confidence_code`: T1
- `textual_variant_flag`: none
- `chronology_scope`: retrospective speech; content refers to pre-Damascus past.
- `provenance_notes`: do not flatten into anonymous Acts narrator voice.
- `usable_by_campaigns`: PA-01; PA provenance lessons
- `source_audit_status`: SOURCE_AUDITED

### EV-PA-0005
- `entity_type`: SPEAKER
- `canonical_label`: Paul retells persecution in Acts 26
- `claim`: Paul says he opposed the name of Jesus of Nazareth, imprisoned believers under chief-priestly authority, participated/approved when they were put to death, punished them in synagogues, tried to force blasphemy and pursued them to foreign cities.
- `source_passage`: Acts 26:9–11
- `speaker_or_narrator`: Paul, first-person defense speech
- `confidence_code`: T1 at proposition level
- `textual_variant_flag`: none
- `chronology_scope`: retrospective speech; refers to pre-Damascus activity.
- `provenance_notes`: exact institutional implication of translated «vote/voice» language is not encoded as T1.
- `forbidden_overclaims`: assigning a precise modern legal office solely from Acts 26:10.
- `usable_by_campaigns`: PA-01; later Paul-defense cases
- `source_audit_status`: SOURCE_AUDITED

### EV-PA-0006
- `entity_type`: CLAIM
- `canonical_label`: Paul's Galatians autobiographical persecution summary
- `claim`: Paul says he intensely/violently persecuted the church of God and tried to destroy it, while advancing in Judaism and being extremely zealous for ancestral traditions.
- `source_passage`: Galatians 1:13–14
- `speaker_or_narrator`: Paul as letter author
- `confidence_code`: T1
- `textual_variant_flag`: none
- `chronology_scope`: retrospective former-life summary.
- `provenance_notes`: independent epistolary source type from Acts narrative/speeches.
- `usable_by_campaigns`: PA-01; Galatians cases
- `source_audit_status`: SOURCE_AUDITED

### EV-PA-0007
- `entity_type`: CLAIM
- `canonical_label`: Persecution within Paul's former zeal credentials
- `claim`: Philippians 3:5–6 places «persecuting the church» within Paul's list of former identity/zeal credentials.
- `source_passage`: Philippians 3:5–6
- `speaker_or_narrator`: Paul as letter author
- `confidence_code`: T1
- `textual_variant_flag`: none
- `chronology_scope`: retrospective autobiographical argument.
- `forbidden_overclaims`: treating the phrase as praise or normative instruction to persecute.
- `usable_by_campaigns`: PA-01; Philippians cases
- `source_audit_status`: SOURCE_AUDITED

## Provenance combination rule
A synthesis node may combine EV-PA-0001…0007, but it must preserve individual sources. Familiarity never converts `Paul says in Acts 26` into `Acts 8 says`, nor an epistle claim into narrator speech.

## Chronology boundary rule
These seed records establish only explicit sequence anchors: Stephen scene → broad persecution → Damascus-bound objective, with later speeches/letters retrospectively describing the earlier period. They do not create a day-by-day chronology or date.

## Next evidence package
Build reusable records for PA-02 Damascus-road witnesses from Acts 9, Acts 22 and Acts 26, explicitly comparing what companions see/hear and preventing false harmonization.