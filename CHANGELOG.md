# Changelog

## 0.4.0-alpha.9 · unpublished

- Add a five-step first-run tour with anchored cards and animated highlights for branch context, treemap drill-down, sizing, review tools and contributor colors.
- Let users close the tour, reopen it from **Tips**, complete it, or hide it for seven days using browser-only storage.
- Respect reduced-motion preferences throughout the guided tour.
- Document a clean local-output workflow and the planned one-command Pages interface with explicit Actions and dedicated-branch modes.

## 0.4.0-alpha.8

- Add a branch-aware **PR scope** selector beside Branch and Compare.
- Overlay selected PR file scope with lightly animated diagonal texture while preserving contributor colors and stable treemap positions.
- Support crossed submitter-color textures for multiple PRs selected through Reviews, with PR badges, dimmed out-of-scope regions, tooltip explanations, and reduced-motion behavior.

## 0.4.0-alpha.7

- Automatically embed available local and remote-tracking branches, up to a configurable 50-snapshot bound; prioritize the checked-out branch and main/master.
- Keep explicit repeated `--branch` selection and add `--max-branches` for a smaller automatic set. Catalog-only refs remain visible as disabled selector entries.
- Make single-branch and branch comparison controls persistent and clearly labeled.
- Open Legend & info on first load with an **×** close button.

## 0.4.0-alpha.6

- Label contributor colors directly on sufficiently large treemap regions and explain mixed, unknown, activity, and ownership colors in the hover tooltip.
- Replace persistent **Open →** buttons with a compact **↗** action that appears on hover or keyboard focus; Cmd/Ctrl+click also opens details.
- Make full-name and color tooltips follow the pointer while staying inside the viewport.

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
