# Implementation phases

## Phase 1 — Local executable preview (implemented)

- Bundled pnpm-compatible CLI: build, init, doctor.
- Validated JSON configuration; committed tree reads, automatic branch discovery bounded at 50 snapshots.
- Files, directories, symlinks, submodules, configurable exclusions.
- Standalone offline HTML, safe metadata rendering, guarded output replacement.
- Two-pane shared-slot comparison, mode/content differences, detected rename list.
- Viewport-filling map with floating controls, overlay search (also `/`), on-demand Files/Activity/Legend panels, folder drilldown, and a toggleable inspector.
- Explicit notices for dirty worktrees, shallow history, unsupported future capabilities.
- Git integration tests and browser interaction checks; clean tarball installation smoke test.

This is a usable alpha, not completion of all M0/M1 details. Output is single-file only. This Phase 1 description is historical; Phase 2 adds AST parsing and blame. Phase 3 adds optional live GitHub ingestion; Phase 4 adds refresh and deployment templates. History is an ordered scrollable activity list rather than a graphical time-axis/DAG with range brushing. File lists show up to 150 matches and require narrowing the search beyond that. The first renderer is HTML rather than Canvas.

## Phase 2 — Symbols and contributor evidence (implemented alpha)

Bundled WASM grammars, normalized nested symbols and byte spans, timeout isolation, residual-area accounting, snapshot mailmaps, explicit identity aliases, blame ownership, parse/blame caches, and named contributor filtering are implemented. See [delivery notes](phase-2-delivery.md) and [parser support](parsers.md) for tests and remaining limits. The single worker and local metadata cache are initial implementations; Phase 4 adds eviction; parallel pools, richer syntax coverage and cross-platform checks remain open.

## Phase 3 — GitHub and shared-branch review (implemented alpha)

Read-only github.com ingestion, PR lifecycle lanes on a shared time axis, review requests and review commit IDs, overlapping file scopes, requested-reviewer ranking, and browser-local seen-head checkpoints are available. See [delivery notes](phase-3-delivery.md). Coverage is file-level and does not imply exact function-level changes. Historical revision replay, range brushing, Enterprise hosts and richer review queue filters remain open.

## Phase 4 — Hardening and unattended delivery (implemented alpha)

Isolated refresh workers, bounded analysis/enrichment runs, atomic publication, active-run skipping, conservative dead-lock recovery, sanitized conditional GitHub caches, byte/age eviction, content digests, stage timings, output budgets, freshness warnings and bounded map rendering are implemented. Report-only and Pages workflow templates plus a host-scheduler wrapper ship with the package. See [delivery notes](phase-4-delivery.md) and [setup](automation.md).

This is not the full release gate. Hosted workflow/deployment execution, Windows/Linux validation, full accessibility audit, directory artifacts, privacy profiles, exact PR-symbol mapping, range brushing and the full branch DAG remain pending. No scheduled job or deployment has been activated.

## Validation record

Record actual checks and limitations in the phase delivery report. The full implementation plan remains the release contract; unchecked features are not considered complete just because the first phase works.
