# GitHub review data

GitHub access is optional and read-only. No refs are fetched or checked out, no review is submitted, and no token is embedded in the HTML. The browser makes no API calls. PR titles, labels, user names, changed paths, review facts and lifecycle metadata are exported; comment bodies and patches are omitted.

```sh
# Public repository, using origin to identify owner/repo:
pnpm exec branchquilt build . --github required --max-prs 30
# GH_TOKEN or GITHUB_TOKEN can be supplied by your shell or secret manager:
pnpm exec branchquilt build . --github required --github-repo owner/repo --reviewer your-login
# Optional enrichment when a token exists:
pnpm exec branchquilt build . --github auto --pr-state all
```

Never put tokens in configuration or command arguments. Use the minimum repository read permissions needed for pull requests, issue timeline metadata and repository access. The implementation supports github.com only; it does not read `gh` credentials or support Enterprise API hosts. HTTP redirects are rejected, requests have timeouts, and retries are bounded. Errors omit response bodies. An inaccessible optional endpoint produces partial data rather than a claim that no reviews exist.

Configuration example (other settings keep their defaults):

```json
{"github":{"mode":"required","repo":"owner/repo","maxPRs":30,"state":"open","reviewer":"your-login"}}
```

PRs are selected by most recently updated, with an explicit cap. Individual collections are also bounded: 3,000 changed files, 1,000 reviews, 250 commits and 1,000 timeline events. Caps and endpoint failures affect completeness. `required` fails if listing or PR details cannot be read; subsidiary failures retain a partial report.

Use the persistent **PR scope** selector to choose a PR targeting or using the selected branch. Matching directories and files receive a subtle animated diagonal texture without replacing contributor colors; the PR number remains visible on larger regions. Use **Reviews** to search titles/authors/labels, prioritize a requested reviewer, select several overlapping scopes or open a PR inspector. Multiple PRs use crossed textures based on their submitter colors. Reduced-motion preferences disable animation. File matching is by path, including previous names, and remains file-level: symbol boxes are not claimed as exact PR coverage. Reviews show their commit SHA and identify older-head reviews without inferring that an approval is currently valid. Mark seen stores the current head SHA locally, with a session fallback when browser storage is unavailable; it is not a submitted review.

Activity includes up to ten PR lifecycle lanes on a shared time axis. This is an overview of returned events, not a full Git DAG or historical revision replay. Source snapshots and GitHub metadata can have different ages; inspect their SHAs before interpreting coverage. Private-repository reports contain private metadata and must be shared accordingly.

Phase 4 adds sanitized ETag caching under the Git common directory. Each response is revalidated against GitHub; stale cached results are never substituted for an API error. Cache entries are partitioned by token fingerprint and bounded by age/size. Analysis/enrichment deadlines, conservative local lock recovery, scheduled-job templates and Pages workflows are documented in [automation setup](automation.md). Hosted deployment and Windows process termination remain unverified.
