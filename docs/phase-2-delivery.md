# Phase 2 delivery — symbols and contributor evidence

Version `0.2.0-alpha.1` adds local syntax symbols, ownership and filtering to the existing offline viewer.

Implemented:

- Bundled grammars for JavaScript/JSX, TypeScript/TSX, Python, Go, Rust, Java, C#, C and C++.
- Worker-isolated parsing with timeout recovery, UTF-8 span normalization, nested declaration maps and residual byte accounting.
- Snapshot-specific blame and committed `.mailmap`, explicit identity mappings, shallow-boundary uncertainty, and per-symbol ownership.
- Parse/blame caching and CLI switches for cache/ownership control.
- Activity/ownership modes, neutral mixed-author regions, contributor selector and a named legend.
- Source file → class/function drilldown with exact spans and ownership details.

Validation: strict TypeScript/build checks; eight unit/integration test groups including ten grammar fixtures, Unicode spans, byte conservation, malformed source, timeouts, committed mailmap isolation and warm-cache equivalence; offline Chromium interactions including function inspection and contributor filtering; clean tarball installation with packaged grammar assets. Generated artifacts contain no external network requests.

This phase is a working alpha increment, not full v1 completion. Parser fixtures establish representative support rather than exhaustive language conformance. External parser plugins, parallel workers, cache eviction, full accessibility/performance budgets, cross-platform verification and advanced symbol history remain incomplete. GitHub reviews, graphical history and scheduled refresh are next phases. See `docs/parsers.md` for scope and limitations. No package was published and no job or deployment was enabled.
