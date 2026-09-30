# Phase 3 delivery — shared-branch PR review alpha

Version: 0.3.0-alpha.1. This advances the review workflow without claiming completion of the full release plan.

## Delivered

- Opt-in read-only GitHub ingestion using environment tokens or public access; bounded pagination, request timeouts and retries, explicit partial-data reporting.
- PR author colors, separate commit contributor lists, labels, requested reviewers, review states and reviewed commit IDs.
- Floating Reviews queue with title/author/label search and requested-reviewer prioritization. Multiple selected PRs highlight overlapping directory/file scope.
- Toggleable PR inspector, file-to-PR links, removed-file metadata, safe GitHub links and local seen-head checkpoints.
- PR lifecycle/review lanes sharing a time axis, with clickable event details. Full-viewport map and hover/focus-revealed controls remain intact.

## Validation

Unit/integration tests cover ingestion normalization, pagination caps, partial endpoints, API host boundaries, token-safe errors and rate limits, alongside existing Git, parser and ownership coverage. Chromium checks exercise overlapping scope selection, queue filtering, older-head review labels, local checkpoints and event selection with no external viewer requests. A clean pnpm consumer installation verifies the packed CLI and bundled parsing/viewer assets.

A live public-data run against the existing agency-agents checkout analyzed 239 files and requested the three most recently updated open PRs: #951–953. All three PR records were complete; the overall listing was intentionally capped and therefore partial. The local checkout is from April while retrieved PR metadata is from September 2026. No Git refs were fetched: this demonstrates ingestion, not exact revision-aligned coverage. These three PRs have one submitter, so the synthetic demo separately demonstrates multiple authors and overlapping scopes.

## Remaining work

PR coverage is file-level; exact hunk-to-symbol mapping, historical head reconstruction and uncertain rename reconciliation are not implemented. Timeline range brushing, a full branch DAG, inspector tabs, remote conditional caching, richer queue filters, Enterprise hosts and portable checkpoint export/import remain pending. Testing so far is macOS/Chromium. Scheduled refresh, Pages templates, cross-platform validation and performance/accessibility hardening are Phase 4.

The demo contains clearly labeled synthetic PRs. The agency-agents report contains live metadata captured at its displayed timestamp. Neither artifact updates itself.
