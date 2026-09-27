# scripture-archive
Pre-production, game design, scenario and structured content for Архів Писання / Scripture Archive

## Binding accessibility architecture

This repository is currently a pre-production/content and structured-scenario source; this rule does not force creation of a graphical application now.

If or when a standalone Windows client for Scripture Archive is built, its binding primary shell is **WebView2 + semantic HTML + a correctly exposed Windows UI Automation host**, with keyboard-only and NVDA operation. Narrative text, choices, state, evidence/provenance, progress and errors must remain real selectable/copyable text with semantic roles and predictable focus. No essential content or interaction may exist only in visual drawing, color, pointer state or mouse-only controls.

Adopting this rule does **not** rewrite or invalidate the existing canonical content, campaign, evidence, provenance, memory, pedagogy or validation structures. Those remain presentation-neutral sources consumed by a future accessible shell. Visual layout may be designed later; semantic accessibility and clean separation from presentation are the architectural constraint.

Physical keyboard-only NVDA acceptance is required before any future packaged Windows client may claim NVDA_VERIFIED.
