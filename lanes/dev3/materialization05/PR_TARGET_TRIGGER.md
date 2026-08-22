# DEV-B D3 stage-05 PR-target materialization trigger

This marker creates an isolated same-repository PR event so the base-branch `pull_request_target` materializer can be tested without touching `main` or changing Gospel source truth.

Expected immutable staged payload SHA256: `ea8e4d290101a6b1c95e3718844015b90abda0964705bf24b70309fa6062c35a`.

If the runner does not execute, this transport probe is abandoned; canonical materialization must continue through the authorized bounded Contents API path.
