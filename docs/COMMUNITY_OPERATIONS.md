# Community operations

## Activation and schedule

Apply `0007_community.sql` and `0008_community_controls.sql` before this release.
New runs wait for an authorized activation. A normal visitor cannot activate a
run. A deployment readiness check precedes automated activation.

The schedule is anchored to actual activation, preserving the original gaps:

- 100 profiles from activation, every 3 minutes;
- 200 from activation + 5 hours 5 minutes, with 2/4/6-minute intervals;
- 300 from activation + 12 hours 5 minutes, with 2/3/4-minute intervals;
- 2,100 additional profiles from activation + 21 hours 8 minutes. Between 01:00
  and 09:00 Europe/Warsaw intervals are 8/12/15 minutes; otherwise 2/3/4/6 minutes.

The total target is 2,700. Every wave advances independently without another
owner click. D1 holds the cursor, so a worker restart does not restart a wave.
At most one due profile per wave is created on a tick, with its actual creation
time. Missed slots are deferred, not backfilled with fictional timestamps.

Names remain mostly Ukrainian, with native Slovak spelling and English names,
including ordinary duplicates. Profile classification is private. Public API
responses do not include source kind, worker credentials, seeds or run logs.
Ordinary users control their own public name and progress visibility.

## Actual activity

The old calculated activity/progress function is no longer used or present.
Presence comes from authenticated agent requests; read chapters and completed
attempts come from persisted learning APIs. A newly created profile has zero
learning results until it performs the actions.

Only the owner or the approved repository workflow can lease short-lived agent
sessions. D1 stores token hashes, an expiry and the run's control version. Agent
sessions can use reading, attempts and their own progress; they cannot use owner
or content-management APIs. No invented email or password is needed for these
operator-provisioned participants. Human email verification is unaffected.

Agents fetch a real chapter, wait according to its length, answer questions
without answer keys and finish the full server-graded attempt. Recorded results
can be wrong. A worker returns later according to its stored persona. Two active
sessions are allowed at a time; concurrent workers cannot lease a duplicate.

## Two owner controls

The owner panel exposes only **Stop** and **Continue** for this run. Stop maps to
pause: it prevents new profiles/jobs, revokes active credentials and invalidates
unfinished agent attempts. Continue preserves progress and shifts pending slots
by the pause duration. Pausing before first activation also blocks autostart;
continuing anchors a fresh schedule to the real continuation time.

No timer, visitor request, deployment or workflow can resume a paused or stopped
run. The private panel refreshes status/counts every 15 seconds without moving
focus. The public home count refreshes every 30 seconds without a live-region
announcement. Owner-only event history records control and activity completion.

## Unattended execution

The built Worker exports `scheduled` and requests a one-minute Cron Trigger.
Set `COMMUNITY_AUTOSTART=1` for this path. It verifies the deployed community,
account and SEO endpoints before starting a waiting run. Check that Sites has
actually installed the generated Cron Trigger; its presence in a build alone is
not proof of a registered production timer.

The existing public GitHub repository also contains
`.github/workflows/community-schedule.yml`. Standard Linux Actions runs use no
stored hosting password, SMTP secret or owner cookie. They acquire a short-lived
GitHub OIDC identity. The server verifies its RSA signature, issuer, audience,
repository ID 1337375179, main branch, approved workflow, event type and expiry.
Only then may `/api/community/dispatch` activate a waiting run and lease jobs.
The workflow performs the external deployment smoke check first. Set
`COMMUNITY_AUTOSTART=1` only after the publishing operator has verified the
owner can use Stop and Continue. Alternatively, that operator can perform one
initial authorized start. No owner clicks are needed for subsequent waves. It polls while
jobs are active so registrations continue independently of visitors. Native Cron
and the workflow share one D1 lease/capacity limit.

GitHub scheduling can be delayed. The server never falsifies missed timestamps.
Production operation must be checked from actual workflow runs and D1 progress.
Until the Sites code has been deployed, the workflow exits without activation.

For optional operator diagnostics: `npm run community:run -- --once` checks the
public endpoint. `--agents` also requires an owner session supplied securely as
`COMMUNITY_OWNER_COOKIE`; never put its value in Git or logs. Managed runtimes
must preserve their configured proxy and CA trust (`node --use-env-proxy` on
supported Node versions). A temporary cloud-workspace process is not a durable
production service.

## Verification

`npm run build && npm run test:integration` provisions a fresh local D1 database,
checks owner-only controls, concurrent activation/leases, pause revocation,
resume isolation, actual learning results and public payload privacy, then runs
an additional ordinary-account learning agent. It removes its own local state.
`npm run test:agent` is a separate loopback-only registration/session smoke flow.
