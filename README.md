# BranchQuilt

An offline code map for teams sharing branches: inspect committed files, compare snapshots, and explore recent contributions in a portable HTML document.

**Phase 4 alpha is implemented.** Refresh jobs now have isolated workers, deadlines, safe publication, conservative lock recovery, conditional GitHub caching and freshness indicators. Read-only PR review overlays and local syntax/blame analysis remain available. See [automation setup](docs/automation.md), [GitHub usage](docs/github.md), [phase status](docs/phase-status.md), and the [complete implementation plan](docs/implementation-plan.md). 3D remains [parked](docs/backlog/3d-branch-layers.md).

## Install the alpha

```sh
pnpm add -D branchquilt@alpha
pnpm exec branchquilt build .
# Or run without adding a dependency:
pnpm dlx branchquilt@alpha build /path/to/repository
```

The first release is `0.4.0-alpha.1`. The `alpha` tag is intentional: this is a preview, not a stable release. Read the [known limits](docs/phase-4-delivery.md) before unattended use. Downloadable packages are also available from [GitHub Releases](https://github.com/penguinkang/branchquilt/releases).

## Run from this checkout

Requires Node.js 22.12+ and Git. Dependencies and pnpm are pinned.

```sh
pnpm install --frozen-lockfile
pnpm build
node dist/cli.cjs build /path/to/repository --branch main --branch team/integration
```

Open the generated `branchquilt/index.html` directly in a browser. It needs no server or network. Only committed snapshots are analyzed; the target checkout and index are not changed.

```sh
node dist/cli.cjs init /path/to/repository
node dist/cli.cjs doctor /path/to/repository
node dist/cli.cjs build /path/to/repository --history-days 30 --max-commits 100 --json
node dist/cli.cjs refresh /path/to/repository --timeout 600 --json
pnpm demo
```

`init` writes `branchquilt.config.json` without overwriting existing configuration. `build --help` lists the supported alpha interface. The larger plan includes future options that this version deliberately rejects. GitHub access is opt-in: `--github required` reads public data or uses `GH_TOKEN` / `GITHUB_TOKEN`; `auto` skips without a token.

## Package locally

```sh
pnpm build
pnpm pack --pack-destination work
# In a separate consumer project, using the actual absolute tarball path:
pnpm add -D /absolute/path/to/branchquilt-0.4.0-alpha.1.tgz
pnpm exec branchquilt build .
```

The npm alpha and GitHub release use the same packaged artifact. Local tarball installation is useful for isolated testing.

## Verify

```sh
pnpm exec playwright install chromium
pnpm check
```

The browser tests open the artifact using `file://`, check navigation/comparison/inspector/history, a 10,000-file case, and assert no external requests. Integration tests exercise real Git histories, exclusions, malicious metadata, and output safety. Current local verification is macOS/Chromium; cross-platform release validation remains pending.

## Interpretation

Single-branch area is committed bytes. Two-branch comparison uses shared maximum-byte slots; each pane displays actual sizes. Switch between recent non-merge commit activity and current-line blame ownership. Neither measures productivity. Mixed-author regions are neutral; use Search → Contributor or the named legend to highlight someone. Open a supported source file to explore nested declarations and residual code. Commit history is bounded and file-level; it does not reconstruct branch creation dates or historical function identity.

The alpha exports paths, file metadata, contributor display names, commit subjects, and timestamps. It excludes raw source, author emails, and common credential paths by default. Review metadata before sharing a report. A build lock prevents simultaneous writers; verified dead local owners can be recovered with `--recover-lock`. Foreign or malformed locks require manual inspection. Scheduled report and Pages templates are supplied but are not activated automatically.
