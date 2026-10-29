# SA-EXT-16 — shared group meeting records at account deletion

**Scope:** source-only corrective implementation for [#303](https://github.com/Oleksii-debug/scripture-archive/issues/303). This is not a statement of live production erasure or legal-policy approval.

## Existing authoritative data and behavior

- `POST /api/auth?action=delete-account` requires a password-authenticated account, correct current password, same-origin request and one transactional `env.DB.batch`. It already removes the deleted user's personal progress, mission attempts, tokens, support submissions, memberships and owned groups.
- Group meetings are stored in the **existing** `group_sessions` table. `created_by` is `NOT NULL` without an account foreign key; `reflection` can include user-authored free text.
- The account-deletion batch now replaces `created_by` with the non-identifying literal `deleted-account` and clears `reflection` for **only** rows authored by the departing account. It keeps the other group's meeting date, chapter and aggregate answer counts. Deletion of an owned group cascades its associated meeting rows.
- The replacement and deletions participate in the *same batch transaction*. Failures must roll back both redaction and personal-data deletion. Other authors' meetings and notes remain unchanged.
- The account UI's Ukrainian, Russian and English descriptions distinguish retained aggregate group data from personal data and explicitly do not promise removal of historical external emails or backup copies.

## Acceptance boundaries

The checked-in unit regression covers: wrong password; simulated failure before and after shared-record redaction; full transaction rollback; preserved unrelated group/member/meeting; anonymized author and null reflection in surviving group; ownership cascade; original personal-data cleanup. Existing full-suite and disposable Worker/D1 tests must run on the actual integrated SHA before marking the section complete.

**Not addressed by this patch:** anonymous support submissions not linked to a logged-in account, emails already handed to third-party delivery, external backups/recovery/retention schedule, any quoted user information *within another person's independently authored reflection*, live D1 readback or administrative/legal deletion-request policy. These must be handled separately; do not label SA-EXT-16 TERMINAL or the site RELEASE_VERIFIED solely from this change.

**Deployment:** not performed. No automation, migration, outreach or third-party system modified.
