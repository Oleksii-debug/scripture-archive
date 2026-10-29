# SA-EXT-03 — reviewable study materials

This source implements a bounded author/editor workflow inside the existing builder. It is not a claim that the whole editorial programme, new languages, human source review or live deployment is complete.

## Lifecycle

- An authenticated human saves a private `study_materials` draft and can practise it locally. A direct draft save never makes the draft public.
- The author submits the saved version, states its provenance and affirms permission to publish. The submission stores an immutable snapshot. A concurrent change between validation and insertion is refused so the author can retry from the current draft. At most one version of a material is pending.
- A verified owner/editor sees the pending snapshot, source statement and answer. Approval requires explicit source and rights checks; rejection requires a note. Approval atomically supersedes the previous published version. The author can withdraw a pending or published version. The author can delete a draft and all versions after a warning.
- Public visitors see only approved snapshots. The list excludes answer and explanation; the server checks a selected answer and returns an explanation after a correct response. This practice flow is not a protected examination and should not be confused with the server-managed mission assessment.
- Authors can download their drafts and version history as private JSON. Editors can inspect the editorial history. Each submission stores author, snapshot, provenance, rights attestation, reviewer, decision, review checks and times; deleting its parent draft or account removes the related versions.

## Compatibility and operational gates

Apply migration `0011_material_review.sql` before running this source against a database. The migration adds private submission records and partial uniqueness indexes; it does not publish a material or change existing rows. Retain a tested backup and rollback plan before future production migrations. The new source uses the existing identity, materials and builder; it does not create another account system.

Older owner-published `study_materials` rows remain stored as before. Their public API response is now redacted of answer and explanation. Editing such a row makes the draft private; a reviewed snapshot can subsequently be submitted and approved through this workflow. No prior publication is silently represented as a newly reviewed snapshot.

Tests cover ownership, editor access, unverified/agent denial, origin checks, missing rights, snapshot replacement, duplicate submission, concurrent draft edits, rejection, withdrawal, rollback on a simulated database failure, public redaction, export isolation and account deletion in a disposable database. The review checkboxes record human assertions; they are not evidence that a source or licence was independently verified. Real browser/keyboard/NVDA acceptance, independent editorial review, production migration and the complete SA-EXT-03 specification remain outstanding.
