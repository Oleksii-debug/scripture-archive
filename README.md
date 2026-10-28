# scripture-archive

## Current site and expanded product planning (owner decision 2026-10-28)
- The last verified handoff (2026-10-26) records a **publicly published website** at https://scripture-archive.com (Sites version 10, deployed source `3a04d12`); live site and this repository's main are separate technical authorities until exact re-verification.
- **[Expanded final product vision](docs/product/SCRIPTURE_ARCHIVE_EXPANDED_PRODUCT_VISION_2026-10-28.md)** — biblical research, Christian academy, churches, digital library, atlas, social community, events, charity, partnerships and AI.
- **[20-section roadmap & technical acceptance](docs/roadmap/SCRIPTURE_ARCHIVE_EXPANSION_SECTION_PLAN_2026-10-28.md)** — planned status, dependencies, release-first gates.
- **[Separate Christian community/dating technical specification](docs/architecture/CHRISTIAN_COMMUNITY_AND_DATING_TECHNICAL_SPEC_2026-10-28.md)** — optional adult-only, consent-based stand-alone product; no existing Scripture Archive users auto-enrolled.
- **[Documentation index](docs/EXPANSION_SCOPE_INDEX.md)**; [scope registry issue #295](https://github.com/Oleksii-debug/scripture-archive/issues/295).
- The above are **approved planning additions, not implemented feature or deployment claims**. Continue to protect existing production blockers, handoff/archives, privacy, accessibility and security.

## Historical repository bootstrap description
Pre-production, game design, scenario and structured content for Архів Писання / Scripture Archive (historical bootstrap text, not the current deployed-site status)

## Binding accessibility architecture

This repository is currently a pre-production/content and structured-scenario source; this rule does not force creation of a graphical application now.

If or when a standalone Windows client for Scripture Archive is built, its binding primary shell is **WebView2 + semantic HTML + a correctly exposed Windows UI Automation host**, with keyboard-only and NVDA operation. Narrative text, choices, state, evidence/provenance, progress and errors must remain real selectable/copyable text with semantic roles and predictable focus. No essential content or interaction may exist only in visual drawing, color, pointer state or mouse-only controls.

Adopting this rule does **not** rewrite or invalidate the existing canonical content, campaign, evidence, provenance, memory, pedagogy or validation structures. Those remain presentation-neutral sources consumed by a future accessible shell. Visual layout may be designed later; semantic accessibility and clean separation from presentation are the architectural constraint.

Physical keyboard-only NVDA acceptance is required before any future packaged Windows client may claim NVDA_VERIFIED.
