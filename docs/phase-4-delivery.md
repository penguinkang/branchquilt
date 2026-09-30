# Phase 4 delivery — reliable refresh alpha

Version: 0.4.0-alpha.1. The scheduled-run foundation is implemented; no schedule, registry release or Pages deployment was activated.

## Delivered

- `refresh` command with machine-readable success/skip/failure output, content digest, changed flag, output size and stage timings.
- Isolated analysis worker with deadline and process-tree termination; report publication happens only after successful generation. Failure and interruption preserve the previous artifact.
- Shared Git-directory lock with active-run skipping and opt-in recovery of verified dead local owners.
- Sanitized, token-partitioned GitHub ETag caching with server revalidation, analysis/remote cache byte and age eviction, and no stale-on-error fallback.
- Configurable output budget and freshness threshold. The viewer adds a stale cue within the floating Legend & info control without reserving map space.
- Large-map rendering caps visible regions at 500 per pane; omitted regions retain their layout capacity and are disclosed. All file paths remain searchable. File/symbol lists show 150 matches; PR history displays ten lanes and samples at most 200 events per lane with a notice.
- Pinned-action templates for scheduled downloadable reports and GitHub Pages, plus an absolute-path host-scheduler wrapper. Installation is isolated from the target repository, with a frozen tool lockfile and lifecycle scripts disabled.

## Validation

18 unit/integration tests passed, including ETag revalidation, credential separation, cache eviction, active/dead/foreign lock cases, deadline/interruption preservation, output budgets, stable digests and metadata-only changes. Existing Git/parser/ownership and offline-browser interaction tests passed. Workflow templates were parsed and checked structurally; shell syntax was checked locally. The package and workflow install tests exercise a clean pnpm consumer and the isolated vendored-tarball setup.

Testing environment: macOS, Node 25.8.1, pnpm 9.15.4, Chromium. The package declares Node >=22.12; this phase was not revalidated on every supported Node/OS combination.

The existing agency-agents checkout was refreshed twice, without GitHub access or ref fetching: 239 files, 272,616-byte HTML, 5.919 s and 5.863 s wall time. Analysis caches were already populated. The second run returned the same content digest and `changed: false`. These are local measurements, not universal performance guarantees. A synthetic 10,000-file / 50-PR / 300-events-per-PR report loaded in 112 ms; its tested search-and-inspect interaction took 126 ms. Rendering stayed at 500 map tiles and 2,000 timeline markers. These measurements come from one local Chromium run, without network requests.

## Limits and next release gate

Hosted Actions execution and actual Pages deployment remain unverified. Linux/Windows package checks, Windows descendant termination, a full accessibility audit, directory-format exports and privacy profiles remain open. PR coverage is still file-level; exact symbol mapping, historical revision reconstruction, range brushing and the full branch DAG remain separate feature work. The full implementation plan is not yet satisfied.

The worker deadline excludes repository/configuration preflight and final local publication. Cache size can temporarily exceed the analysis budget during a run. Hard termination during lock acquisition can leave a gate requiring manual inspection, and orphan temporary files are not automatically swept. Review these operational details in [automation setup](automation.md).

The compact demo uses synthetic PRs; the agency-agents Phase 4 artifact uses committed local history with GitHub ingestion disabled. All exported HTML remains static and offline.
