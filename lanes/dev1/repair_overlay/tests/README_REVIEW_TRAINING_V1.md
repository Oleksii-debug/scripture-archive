# Review Training Session v1 — candidate evidence

This bounded candidate composes the existing persisted D5/runtime review queue with the existing deterministic runtime Scheduler and the packaged keyboard/NVDA player flow.

Security boundary: the caller cannot submit a review node target. `player.start_review` and `player.finish_review` accept empty payloads only at both platform and runtime boundaries. The runtime selects the next eligible task using the existing Scheduler.

Scheduling boundary: no second scheduling policy is implemented in JavaScript or the platform projection. Due time, adjacent EXACT cooldown, session deduplication, fatigue and deterministic scoring remain runtime-owned.

Content/source boundary: this candidate does not alter D2/D3/D4 canonical content, evidence, source scopes, confidence or TX1 truth.

Accessibility boundary: training uses the existing semantic task renderer, focus path and live status; a keyboard-reachable Finish control and explicit Next Review action are added. Automated tests do not claim physical Windows 11/WebView2 or human NVDA acceptance.

Focused regression files:
- `runtime_engine/tests/test_review_training_session.py`
- `tests/test_packaged_review_queue_ui.py`
- `tests/test_packaged_review_training_contract.py`
- `tests/test_packaged_review_training_player_ui.py`
- `tests/test_packaged_review_training_static_syntax.py`
