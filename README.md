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

By default, BranchQuilt embeds the checked-out branch, main/master, and the other locally available branch or remote-tracking refs, up to 50 snapshots. Use `--max-branches 10` to lower that bound, or repeat `--branch` to build an exact set.

To keep the tool in your project:

```sh
npm install --save-dev branchquilt@alpha
npx branchquilt build .
```

With pnpm, use `pnpm add -D branchquilt@alpha` and `pnpm exec branchquilt build .`.

## Keep generated output out of Git

The current alpha writes `index.html` and an ownership marker inside its output directory. Use a hidden directory and exclude it locally so builds do not change shared `.gitignore` or appear in `git status`:

```sh
exclude_file="$(git rev-parse --git-path info/exclude)"
grep -qxF '/.branchquilt/' "$exclude_file" || printf '\n/.branchquilt/\n' >> "$exclude_file"
pnpm exec branchquilt build . --output .branchquilt/site
```

The planned `branchquilt view` command will make this automatic by writing beneath the repository's private Git directory and opening the report. It is not available in the current alpha.

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

# Automatically include at most 20 available branches
npx branchquilt@alpha build . --max-branches 20

# Include GitHub PRs and reviews (repository inferred from origin)
npx branchquilt@alpha build . --github required

# Refresh an existing report; suitable for a scheduled job
npx branchquilt@alpha refresh . --timeout 600 --json

# See all implemented options
npx branchquilt@alpha build --help
```

For private GitHub repositories, supply `GH_TOKEN` or `GITHUB_TOKEN` through your environment. Scheduled jobs should use a pinned local installation; see the setup guide below.

## Explore the map

The first-run **Tips** tour points to the main controls; close it, complete it, or hide it for seven days. Click a box to subdivide it in place into folders, files, classes and functions. Hover to reveal **↗**, or Cmd/Ctrl+click, for details. The cursor tooltip names the object and explains its contributor color; larger boxes also show contributor badges. Choose a branch’s **PR scope** to overlay its changed files with animated diagonal texture while retaining contributor colors. Select several PRs from **Reviews** to see overlaps. **Size** switches between child counts and bytes; **Linear / Log** adjusts the scale. Leaves count as one child-sized unit. Move the pointer near the top or bottom edge to reveal secondary controls. **Activity** shows history, and **Search** filters files and contributors.

Analysis uses committed snapshots; uncommitted changes are excluded. PR coverage is file-level. Reports can contain private repository metadata, so review them before sharing.

## Publish on GitHub Pages

BranchQuilt will offer two explicit publication modes: **Actions** for standard GitHub repositories and **branch** for environments where Actions is restricted. The planned interface is `branchquilt pages init --mode actions|branch`, followed by one `branchquilt publish` command. These commands are not available in the current alpha; today, use the reviewed Actions template or the branch-source procedure in the publishing guide. Neither design requires generated HTML on the source branch.

[GitHub setup](https://github.com/penguinkang/branchquilt/blob/main/docs/github.md) · [Scheduled jobs & Pages](https://github.com/penguinkang/branchquilt/blob/main/docs/automation.md) · [Known limits](https://github.com/penguinkang/branchquilt/blob/main/docs/phase-4-delivery.md) · [Downloads](https://github.com/penguinkang/branchquilt/releases)

MIT licensed.
