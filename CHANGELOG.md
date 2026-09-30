# Changelog

## 0.4.0-alpha.5

- Move treemap area and Linear/Log controls into a persistent lower-right overlay so scaling is always discoverable.

## 0.4.0-alpha.4

- Expanding a directory, file, class or function now subdivides that box in place, preserving the surrounding repository context.
- **Open →** remains a separate inspector action on every box.
- Full object names appear when hovering anywhere on a box, with a native title fallback.

## 0.4.0-alpha.3

- Click boxes to drill into directories, files and nested declarations; Details retains the inspector. Opening a source file from a paired map switches to that pane’s branch.
- Default child-count sizing, optional byte sizing, and linear/log scales. Counts use immediate children or top-level declarations; leaves count as one, and residual code is excluded from declaration counts.
- Full-name hover/focus tooltips and nested declaration breadcrumbs.

## 0.4.0-alpha.2

Documentation update: concise npm/pnpm and Git quick starts, common commands and map interactions. No functional changes.

## 0.4.0-alpha.1

First public alpha, combining four implementation phases:

- Offline HTML maps of committed branch snapshots, folders, files and parsed declarations.
- Contributor activity and blame views, comparison maps and floating inspectors.
- Optional read-only GitHub PR ingestion, overlapping file coverage, review facts and lifecycle lanes.
- Bounded refresh jobs, safe publication, cache revalidation, freshness cues and scheduler/Pages templates.

Known limits: PR mapping is file-level; no full branch DAG, history range brush or 3D view. Hosted Pages deployment, comprehensive accessibility and cross-platform release validation remain pending. See `docs/phase-4-delivery.md`.
