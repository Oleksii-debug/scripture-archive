# Coordinated Sites release

Target: `appgprj_6adba6f0bc2c819188f35474ce925793`, Scripture Archive,
public access, https://scripture-archive.com/.

The owner supplied live source commit
`75e325781a74a8b6b2d8f4c0238e8425fdda41c3` (Site version 9) and a parallel media
commit `73de4674355b3d222ff6223be1a52310092129b3` containing two MP4 and two final
PDF files. Preserve that media work. Do not replace its `public/home.js` with the
older full GitHub template: the new `public/app.js` inserts the community counts
into a home template that lacks them. Preserve media CSS while merging styles.
No media or home template was edited in this community workline.

Use the official Sites workflow: get current site; create a short-lived source
write credential in the publishing chat; sync the internal source repository;
merge this GitHub main commit without force; build and test; package with the
Sites helper; save a version with the exact pushed source commit; deploy; poll
status to succeeded. GitHub main and internal Sites main are distinct repos.

## Required migration and runtime checks

Apply all SQL migrations 0000 through 0008 that are not already recorded.
New community migrations: `0007_community.sql`, `0008_community_controls.sql`.
The latter pauses legacy runs and adds leases, revocable scoped agent sessions
and activation tracking; no public deployment should run without it.

- `DB`: real production D1 binding.
- `APP_BASE_URL` and `NEXT_PUBLIC_SITE_URL`: https://scripture-archive.com.
- `AUTH_TEST_MODE`: absent in production.
- `TRUST_PLATFORM_AUTH=1` only on the confirmed native Sites gateway, which must
  strip/replace client identity headers and have no untrusted direct Worker
  ingress. This enables the owner's native ChatGPT sign-in at `/editor` without
  weakening password account verification. Keep it absent on ordinary hosting.
- Native scheduled operation: confirm the generated one-minute Cron Trigger was
  actually registered; use `COMMUNITY_AUTOSTART=1` for that path.
- If Sites does not register user Cron Triggers, the approved GitHub Actions
  workflow provides an independent runner after deployment. Arm the initial run
  with `COMMUNITY_AUTOSTART=1` only after checking owner Stop/Continue, or perform
  one authorized initial activation as part of deployment. It needs OIDC
  `id-token: write`, not stored secrets. Never activate mass activity before its
  external readiness checks pass.

Owner controls are two buttons, Stop and Continue. All waves run automatically;
a paused run must remain paused after a redeploy, timer tick or workflow restart.
Private run logs/classification must not be exposed in public pages or APIs.

## Verify after deployment

Check `/`, `/community`, `/help`, `/account`, `/robots.txt`, `/sitemap.xml`,
`/api/community?public=summary`, owner access and Stop/Continue. Verify no new
profile is created by an unauthenticated visit before activation. Then verify
an authorized scheduled/workflow tick, a real agent result and immediate pause
revocation. Confirm both MP4 and both final PDF from the media commit still work.
Public release and week-long operation remain unverified until these checks pass.

SMTP/GA4/Search Console are separate existing worklines; do not claim real email
receipt or Google setup from this community release's local tests.
