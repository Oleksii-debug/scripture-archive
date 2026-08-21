# Scripture Archive R06 DEV5 runtime engine

UI-neutral Python runtime for game state, grading, branching, mastery, scheduling, player memory, persistence, evidence and accessibility semantics.

The package intentionally has no WebView, Windows API, pywebview or frontend dependency. `RuntimeApplication.handle()` is the stable `runtime.v1` JSON-safe command boundary for the integration lane.

Run tests from this directory:

```bash
python -m unittest discover -s tests -v
```
