# AGENTS.md

## Local worker tests when GitHub Actions is queued (2026-10-10)

Before waiting for hosted CI, contributors with a Python environment should run the existing repository validators through `python -m pytest -q tests` on the exact local checkout. The pytest adapter delegates to the original `tools/test_*.py` scripts; it must not be counted as an independent duplicate validation suite. In a permitted isolated environment, if pytest is unavailable, `python -m pip install -r requirements-test.txt` supplies only the optional test dependency; never silently install on user/production machines, incur paid services, or treat a missing dependency or a collection with 0 tests as PASS. Without pytest, run each existing standalone validator by its documented direct Python command and explicitly state their real outcomes. Do not represent a synthetic smoke/adapter test as whole-product qualification; final CI, artifacts, rights and deployment evidence remain distinct.


## Repository development policy

Objective: move scripture-archive toward a complete, working, verified product as quickly as possible.

This policy supersedes older repository guidance that restricts staffing, imposes fixed work-in-progress limits or serial work lanes, makes assignments exclusive, or requires waiting for other pull requests or CI.

### Parallelism and autonomy

- The repository places no limit on the number of contributors.
- No repository-defined maximum number of simultaneous work packages or pull requests.
- Ownership, claims, leases, assignments, queues, and coordinator labels are advisory only and must not block useful safe work.
- Contributors may publish and merge verified changes within their GitHub permissions.
- Continue independent work while an assigned integrator is unavailable.
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

Record progress in commits, pull requests, issues, tests and the project's existing records. Continue independent work while checks or reviews are pending.
