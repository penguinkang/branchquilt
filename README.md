# BranchQuilt

See who changed what across Git branches and pull requests—in an interactive, offline HTML map.

**Requires:** Node.js 22.12+ and Git. BranchQuilt is currently an alpha.

## Run from npm

Inside the Git repository you want to visualize:

```sh
npx branchquilt@alpha build .
```

Or use pnpm:

```sh
pnpm dlx branchquilt@alpha build .
```

Open **`branchquilt/index.html`** in your browser. No server required.

To keep the tool in your project:

```sh
npm install --save-dev branchquilt@alpha
npx branchquilt build .
```

With pnpm, use `pnpm add -D branchquilt@alpha` and `pnpm exec branchquilt build .`.

## Run from Git

```sh
git clone https://github.com/penguinkang/branchquilt.git
cd branchquilt
pnpm install --frozen-lockfile
pnpm build
node dist/cli.cjs build /path/to/your/repo
```

Use pnpm 9.15.4 for this checkout. The HTML is written inside the **target repository**, at `branchquilt/index.html`.

## Common commands

Run these inside your target repository:

```sh
# Compare two existing branches
npx branchquilt@alpha build . --branch main --branch feature/my-work

# Include GitHub PRs and reviews (repository inferred from origin)
npx branchquilt@alpha build . --github required

# Refresh an existing report; suitable for a scheduled job
npx branchquilt@alpha refresh . --timeout 600 --json

# Create configuration or see all options
npx branchquilt@alpha init .
npx branchquilt@alpha build --help
```

For private GitHub repositories, supply `GH_TOKEN` or `GITHUB_TOKEN` through your environment. Scheduled jobs should use a pinned local installation; see the setup guide below.

## Explore the map

Click a box to subdivide it in place into folders, files, classes and functions. Hover to reveal **↗**, or Cmd/Ctrl+click, for details. The cursor tooltip names the object and explains its contributor color; larger boxes also show contributor badges. **Size** switches between child counts and bytes; **Linear / Log** adjusts the scale. Leaves count as one child-sized unit. Move the pointer near the top or bottom edge to reveal controls. **Reviews** highlights PR scope, **Activity** shows history, and **Search** filters files and contributors.

Analysis uses committed snapshots; uncommitted changes are excluded. PR coverage is file-level. Reports can contain private repository metadata, so review them before sharing.

[GitHub setup](https://github.com/penguinkang/branchquilt/blob/main/docs/github.md) · [Scheduled jobs & Pages](https://github.com/penguinkang/branchquilt/blob/main/docs/automation.md) · [Known limits](https://github.com/penguinkang/branchquilt/blob/main/docs/phase-4-delivery.md) · [Downloads](https://github.com/penguinkang/branchquilt/releases)

MIT licensed.
