# Phase 1 delivery — local executable preview

Implemented in the BranchQuilt repository on September 29, 2026. Version: `0.1.0-alpha.1`. No package publication, deployment, or scheduled job activation was performed.

## Available now

The packaged CLI builds a standalone HTML report from one to five committed Git refs. It provides directory/file treemaps, paired branch comparison with shared positions and honest size labels, detected rename listings, path search, explicit folder drilldown, toggleable detail inspection, recent contributors, and a bounded commit activity list with file-level change scope. It reads symlink metadata without following targets and excludes common credential/dependency paths.

Output generation escapes untrusted metadata and uses a script-hash CSP with no network access. Dedicated output directories and ownership markers prevent accidental overwriting of unrelated HTML. A basic repository build lock prevents simultaneous writers. Interrupted-lock recovery is not automated yet.

## Checks actually completed

- Strict TypeScript check and bundled CLI/viewer build.
- Five unit/integration tests covering immutable ref analysis and unchanged Git state, unusual filenames, exclusions, output path/ownership safety, byte aggregation, mode changes, CLI behavior, and config validation.
- Chromium `file://` browser test covering zero external requests, paired maps, search, folder drilldown, inspector toggling, commit selection, Escape dismissal, and hostile metadata rendering.
- A built npm tarball installed into a fresh consumer repository with pnpm; its installed binary successfully generated a two-snapshot report.
- Screenshot inspection of the generated interface.

Local environment: macOS on ARM64, Node 22.23.2, pnpm 9.15.4. Minimum Node is 22.12 because of the CLI dependency. The pnpm lockfile pins resolved dependency versions.

## Not yet verified or implemented

No claim of full M0/M1 or v1 completion: the AST/WASM feasibility work, syntax symbols, blame, identity reconciliation, GitHub ingestion, review queue, graphical timeline/range brush, scheduled refresh, directory output, Pages workflow, full accessibility audit, performance budgets, Firefox/WebKit, and Linux/Windows verification remain pending. Current commit author display uses raw Git author identity; mailmap normalization is Phase 2. The public release schema is not final.

The current code intentionally rejects required GitHub mode and unsupported config rather than pretending to deliver these features. The activity list is not a complete historical branch/ref audit trail. Full phase order and scope are tracked in `docs/phase-status.md` and the implementation plan.

## Next phase

Prove bundled parser/runtime compatibility and Unicode byte offsets, then add symbol adapters, span partitioning, blob caches, and contributor normalization/blame. Maintain the offline artifact and package tests throughout.
