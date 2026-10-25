# Community operations

Migration `0007_community.sql` creates the public community store and the registration-run state. The first request to `/api/community`, the home-page summary, or the owner analytics page initializes the run once. Subsequent requests materialize registrations whose scheduled time has passed, so a restart does not reset the sequence.

The run contains four independent waves in the `Europe/Warsaw` time zone:

- 100 registrations beginning at activation, every 3 minutes;
- 200 registrations from 08:00, with repeating 2, 4, and 6 minute intervals;
- 300 registrations from 15:00, with repeating 2, 3, and 4 minute intervals;
- 1,500 registrations from 00:03 on the next day, with longer intervals from 01:00 to 09:00.

Generated community identities live in `community_members`, separately from password accounts. They cannot sign in and have no fabricated email address or password. The internal source field is omitted from public responses. The owner analytics response reports real accounts and generated participants separately.

The owner can send authenticated same-origin `POST /api/community` requests with `pause`, `resume`, or `stop`. Resuming shifts pending registration times by the pause duration. The run log records these actions and completed waves.

Public names are deterministic and intentionally include ordinary duplicates. The distribution is approximately 72% Ukrainian, 16% Slovak, and 12% English. Slovak spelling and diacritics are preserved. Public activity is deterministic for each five-minute window, follows Warsaw morning and evening peaks, and slows overnight.

Real accounts remain private by default. A person must separately enable first name, last name, and learning-progress visibility in the account screen before those fields can appear in the community. Email addresses and sensitive profile fields never appear in the public community API.
