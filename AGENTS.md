# AGENTS.md

## Canonical autonomous worker policy

Objective: move scripture-archive toward a complete, working, verified product as quickly as possible.

This root file is the highest-priority repository instruction for autonomous worker coordination. It supersedes any older repository text that imposes fixed worker counts, coordinator counts, WIP caps, serial-only lanes, mandatory ownership/claim locks, exclusive integration owners, mandatory waiting for another PR, or "stop because CI is queued" behavior.

### Parallelism and autonomy

- No repository-defined maximum number of autonomous workers.
- No repository-defined maximum number of simultaneous work packages or pull requests.
- Ownership, claims, leases, assignments, queues, and coordinator labels are advisory only and must not block useful safe work.
- Workers may create branches, commits, pull requests, comments, tests, fixes, integration commits, and merges when GitHub permissions allow and the change is honestly verified.
- No worker must wait for a designated human/integration worker solely because an older repository document says so.
- Dependencies constrain final integration order only; they do not block independent implementation, testing, hardening, research, documentation, fixtures, adapters, accessibility, packaging, or other non-conflicting work.
- Queued/pending/slow/unavailable CI is never by itself a reason to terminate. Record it and immediately continue with another valuable independent task.
- A blocked first workline is never by itself a reason to terminate. Preserve the blocker and continue elsewhere.
- STATUS: BLOCKED is allowed only after exhausting all reasonably available safe independent work that can materially advance the product.
- Do not idle merely because another PR, branch, worker, check, review, claim, or queue is active.
- If overlap occurs, prefer another non-conflicting task or reconcile/rebase; do not abandon the run merely because ownership overlaps.
- Do not artificially throttle PR/main throughput for coordination convenience.

### Product integrity remains mandatory

This removes worker-orchestration throttles, not correctness requirements. Do not weaken security, data integrity, financial/risk invariants, accessibility, licensing, privacy, tests, release evidence, or other domain-specific safety/correctness requirements. Externally enforced GitHub permissions and branch protections remain external constraints; continue useful work elsewhere while they are pending.

### Durable state and completion

Chat history is temporary working memory. Preserve meaningful progress in code, commits, branches, pull requests, issues/comments, tests, and existing canonical project records. Use the full execution window. Do not stop after the first commit, PR, green test, queued check, review request, or blocker while useful safe work remains.
