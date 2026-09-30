# Refresh and publishing

BranchQuilt 0.4.0-alpha.1 is runnable by an existing scheduler. It does not install a daemon, create a schedule, fetch Git refs, change the checkout, or publish a site when building a report.

## Local refresh

```sh
pnpm exec branchquilt refresh /absolute/path/to/repo --timeout 600 --json
pnpm exec branchquilt refresh /absolute/path/to/repo --github required --max-prs 30 --json
```

`build` and `refresh` use the same isolated build worker. `refresh` returns a successful `status: skipped` result if another local build owns the lock; `build` reports that as an error. An analysis/GitHub deadline, worker failure or oversize report leaves the previous HTML intact. Publishing uses an atomic file replacement after the worker succeeds. JSON success includes content digest, changed flag, byte size, duration and stage timings. The digest ignores generation/retrieval timestamps and cache counters; successful unchanged runs still update their freshness timestamp. Failures exit 1 and write a JSON error to stderr. Skip/success exit 0; configuration or command usage errors also exit nonzero.

The deadline covers the isolated worker, including Git subprocesses, parsing and API retries. Repository/configuration preflight and final local file publication occur outside that timer. External schedulers should also impose a run-wide timeout. SIGINT/SIGTERM stop the worker process group on macOS/Linux; Windows uses taskkill to stop descendants (not yet verified on Windows).

Use `--recover-lock` to recover a lock whose recorded hostname matches this host and whose PID is verifiably dead. An active PID, even if reused, is never taken over. Foreign-host, malformed or pre-Phase-4 locks require manual inspection. A killed process during the brief lock acquisition can leave `build.lock.gate`; inspect it manually. Do not delete locks based solely on age. Cache/lock state lives under the Git common directory, so worktrees share the exclusion lock.

`examples/automation/refresh.sh` accepts absolute executable and repository paths. Adapt it for cron, launchd or systemd with a controlled PATH for Node and Git, environment-provided tokens, output logging and the desired cadence. The wrapper enables verified-dead-lock recovery. For example, a cron entry after you choose to install it:

```cron
17 */6 * * * /absolute/path/to/refresh.sh /absolute/path/to/branchquilt /absolute/path/to/repo >> /absolute/path/to/branchquilt-refresh.log 2>&1
```

Keep tokens out of arguments, configuration and logs. Refresh reads the refs already present in the clone. If those must advance, arrange a separate trusted fetch step; BranchQuilt never moves your working branch.

## Budgets, cache and freshness

```json
{
  "runtime": {
    "timeoutSeconds": 600,
    "maxOutputBytes": 67108864,
    "staleAfterMinutes": 1440
  },
  "cache": {
    "enabled": true,
    "maxBytes": 134217728,
    "maxAgeDays": 30
  }
}
```

The cache budget is split equally between analysis and GitHub metadata. Eviction removes old entries and retains newer entries within each budget; analysis cleanup occurs at job completion and can temporarily exceed its budget during work. GitHub cache entries retain only ingestion fields and ETags, omit source patches/comment bodies/emails, and partition by token fingerprint. Every cache hit requires an authenticated conditional request (or public request for the public partition); errors do not silently serve stale results. `--no-cache` disables both caches. Source control's private cache files are not included in the exported report or workflow artifacts. Hard termination can leave temporary cache/run files; routine eviction covers completed cache entries only.

The static viewer evaluates age against `staleAfterMinutes` when opened and once per minute. Legend & info indicates staleness, and each GitHub snapshot retains its own fetched timestamp. No background network polling occurs. A new HTML artifact must be opened/reloaded after refresh. Fresh generation time does not mean the local branch tip is current with origin.

## GitHub Actions setup

Choose **one** template: `examples/automation/report.yml` retains a downloadable report for seven days; `pages.yml` also supports Pages publication. They are examples outside `.github/workflows` and are not active jobs.

For reproducible scheduled runs, use a pinned, isolated tool bundle in the target repository. The following vendored-tarball setup works independently of registry access to BranchQuilt; alternatively pin the exact npm version `0.4.0-alpha.1` in the dedicated tool manifest and generate its lockfile.

1. Build and pack this BranchQuilt checkout with `pnpm build` and `pnpm pack --pack-destination work`.
2. Create a dedicated `.branchquilt-tool/` directory in the target repository. Copy the tarball there. Add the manifest below, then run `pnpm --dir .branchquilt-tool install --lockfile-only --ignore-scripts --ignore-workspace` to produce its lockfile. Commit the manifest, lockfile and tarball if you choose to activate a workflow. Do not commit `node_modules`.
3. Exclude `.branchquilt-tool/**` in `branchquilt.config.json`. Configure the desired branches, history and PR bounds. The template fixes output to `branchquilt/`.
4. Copy the chosen workflow into `.github/workflows/`. Run its manual trigger first and inspect the generated report before enabling publication.

```json
{
  "name": "branchquilt-automation-tool",
  "private": true,
  "packageManager": "pnpm@9.15.4",
  "dependencies": {"branchquilt": "file:./branchquilt-0.4.0-alpha.1.tgz"}
}
```

The template copies this dedicated directory into the runner's temporary directory, installs with a frozen lockfile and lifecycle scripts disabled, and uses the installed CLI to analyze the checkout. It never installs the target project's dependencies or runs its build scripts. Ensure the tool directory contains only the reviewed bundle and manifest/lockfile. Full Git history is checked out, checkout credentials are not persisted, actions are pinned by commit, jobs have timeouts, and builds are serialized. Only the refresh step receives the read-only GitHub token. PR event triggers are deliberately absent; the schedule runs the default-branch workflow and manual runs should use a trusted branch. Remote metadata caches are not uploaded to shared Actions caches; fresh hosted runners start cold.

For Pages, select GitHub Actions as the Pages source and set repository variable `BRANCHQUILT_PUBLISH=true` only after reviewing the report's disclosure and intended audience. The deployment job requires a successful build, uses the `github-pages` environment and receives only Pages-write and OIDC permissions. Repository names, paths, contributor names, commit subjects and PR metadata can be private even though source and tokens are omitted. A private repository does not by itself establish that a Pages site has the intended audience restrictions.

The templates follow GitHub's [custom Pages workflow guidance](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). GitHub [scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) are not an exact-time freshness guarantee; the viewer's stale indicator remains useful if a run is delayed or fails. Template validation covers YAML and workflow structure locally, not a hosted execution or actual deployment.
