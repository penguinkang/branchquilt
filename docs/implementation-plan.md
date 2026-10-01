# BranchQuilt — Implementation Plan and Codex Project Prompt

**Status:** Active specification; Phase 4 alpha implemented, full v1 pending
**Deliverable:** A pnpm-installable CLI that generates a static, interactive shared-branch contribution and review workspace
**Working package/bin name:** `branchquilt` (provisional; preliminary checks found no exact npm/GitHub-name match; recheck before publishing)
**Document date:** September 29, 2026

## 1. Instructions to the implementing Codex agent

Build the product described in this document, including production code, tests, documentation, packaging, and a working example. Treat the requirements and acceptance criteria as the project contract. The commands and configuration below specify the intended interface; they do not describe an existing package.

Start by inspecting the project and its instructions. Preserve unrelated changes. Record important decisions in short architecture decision records. Implement in the milestone order below, maintaining an end-to-end working CLI after each milestone. Resolve routine implementation choices independently. Ask for clarification only when a choice materially changes scope or requires unavailable credentials. Work offline against fixtures when GitHub access is unavailable.

Do not stop at scaffolding, mock screens, or a design proposal. Finish the required v1 functionality and run its acceptance checks. Do not publish an npm package, push commits, or deploy a Pages site as part of implementation unless separately authorized. Generating release artifacts and a deployment workflow is in scope.

### Product outcome

A developer runs one command inside an existing Git repository and receives `branchquilt/index.html`. Opening that file directly reveals an interactive map of selected branch snapshots, directories, files, classes, and functions. They can see contributor ownership, select a pull request to highlight its changed-code scope, inspect its author and labels, and publish the same artifact through GitHub Pages without a backend.

The primary user is a teammate sharing a branch with several contributors while the repository contains tens of branches and PRs. Optimize for answering “What changed?”, “What should I review?”, and “Where does work overlap?” Repository structure and paired branch comparison support this workflow. Default to recent contribution activity; current-line blame is a secondary ownership lens.

### Scope boundaries

The active design is 2D: single-snapshot treemap exploration, synchronized side-by-side branch comparison, and a searchable tree/changes panel. 3D/WebGL is parked in the backlog, outside M0–M6 and all release criteria. Do not prototype or add GPU dependencies unless it is explicitly reprioritized.

Required v1 includes local Git analysis; selected local and remote-tracking branches; JavaScript/TypeScript, Python, Go, Rust, Java, C#, C, and C++ symbol extraction; GitHub PR/review enrichment; linked branch/PR timeline and scope inspection; a review queue and toggleable contextual detail panel; accessible treemap navigation; standalone HTML; directory output; caching; and a generated Pages workflow.

Defer call graphs, runtime dependencies, semantic type resolution, real-time collaboration, editing source code, test coverage ingestion, GitLab/Bitbucket, and a hosted service. “PR coverage” means changed-code scope, never test coverage. Other languages remain visible as files even when symbol parsing is unavailable.

## 2. Core semantics: avoid misleading visualizations

### 2.1 Branch snapshots and hierarchy

Use `repository → branch snapshot → directory → file → symbol → nested symbol`. A branch is a named pointer to a commit, not a directory or a complete branch-history graph. Resolve every selected ref once at build start and analyze its immutable commit SHA. Preserve the name and SHA in the output. Detached HEAD is a valid snapshot.

Default to the current committed HEAD. A branch selector provides focused analysis; an overview displays separate branch tiles. Each tile represents its own snapshot and may duplicate files present on other branches. Never label the sum across branch tiles as unique repository size. Do not check out branches or alter the user's index. Dirty/untracked files are excluded in v1 and reported clearly.

Symbols include classes, interfaces, structs, enums, methods, constructors, functions, and named function expressions where supported. Preserve lexical nesting. Do not invent classes in languages that do not have them. Go receiver methods and Rust impl blocks need language-specific containers or associations, with source scope preserved. Repeated/overloaded names must have distinct IDs.

### 2.2 Area and aggregation

Default rectangle area is UTF-8 source bytes, a consistent, additive measure across languages. Offer file-count and physical-line-count modes at directory/file level; switch back to bytes for symbol detail when those modes would imply misleading nested sums.

Store inclusive source spans for inspection, but partition each file's bytes into disjoint symbol bodies and residual segments for sizing. A symbol's aggregate weight includes its descendants; its own leaf weight excludes descendant ranges. Expose non-symbol code as “Other code” when drilling into a file or symbol. Clamp/validate malformed or overlapping parser ranges and fall back to file-level sizing when a valid partition cannot be constructed. Directories sum descendants. Empty files get a selectable minimum marker with zero actual byte weight. Never add inclusive parent and child sizes together.

### 2.3 Contributor ownership (secondary lens)

The ownership view uses Git blame's current-line authorship at the exact snapshot SHA. This is an attribution heuristic, not a measure of effort, responsibility, or overall contribution. Count physical lines, explicitly including blank/comment lines; display the metric in the legend. Mixed-author files show a dominant-author fill and proportional ownership strip in the detail panel. A directory aggregates child line counts. Ties use stable contributor IDs.

Use `.mailmap` and explicit identity mappings before aggregation. Do not merge people by display name alone or guess GitHub accounts from names. Unmapped Git authors receive separate pseudonymous IDs; emails stay out of the public artifact. GitHub user IDs identify PR authors. Only explicit or verified mappings unify Git and GitHub identities.

Assign each contributor a deterministic color from their identity, with configurable overrides. Reuse that base color for PRs by the same author. Distinguish multiple PRs from one author with number badges and border/dash patterns. Unknown/deleted authors use a neutral identity. Keep missing blame neutral; do not attribute an entire file to its last committer. Blame-incomplete files must disclose attributed and unattributed line totals.

### 2.4 PR authorship, grouping, and overlap

Each PR has exactly one submitting author; its commits can have several contributors. Keep PR author and code ownership as separate fields and display modes.

Selecting a PR highlights all mapped affected files/symbols simultaneously, dims unrelated nodes, and provides a synchronized changed-files list. A PR may touch disjoint directories, so represent its group through coordinated outlines and selection, not a false contiguous bounding rectangle. An optional “Group by PR” panel uses virtual groups referencing existing nodes. It never reparents or duplicates the canonical hierarchy for size calculations.

Multiple PRs may touch one node. Store a many-to-many relationship and show a count/stacked-border indicator. The panel lists every matching PR. Multi-selection uses author-color stripes or outlines and an explicit legend; do not average colors or silently pick a winning PR. At dense scales, use a neutral overlap badge and reveal details on selection.

### 2.5 Changed-line mapping and historical accuracy

For a locally available PR head, calculate the merge base of its base/head commits and compare merge-base → head. Use zero-context hunks, rename detection, explicit binary detection, and disabled external diff/text conversion. Record base, head, merge-base, diff source, and build snapshot IDs. Three-dot diff semantics are documented by [Git's diff reference](https://git-scm.com/docs/git-diff).

Parse both diff endpoints when needed. Added/modified new-side ranges map to head symbols. Deleted old-side ranges map to old symbols and appear as deletion entries or tombstones in the PR view. A pure deletion must not highlight a made-up surviving function. Renames record both paths; renames without content changes have file-level effects and zero changed lines. Binary/submodule changes have file-level effects only.

A PR detail view can show its exact head and deleted-code inventory even when that head is not a selected branch. Do not project line numbers from one commit onto a different branch snapshot. On the main branch map, use these mapping states:

- `exact`: matching analyzed endpoint/blob and path with verified line ranges.
- `file-only`: a known matching path or verified rename association, but no safe symbol mapping.
- `unmapped`: deleted/missing file, unavailable commit, ambiguous rename, or incompatible snapshot.

Historical merged PRs are historical changes, not proof that their code remains present. In v1, use file-only or unmapped historical relationships when exact matching is unavailable. Defer automatic line tracking across arbitrary later commits. Never silently upgrade uncertain mappings.

Assign a changed line to the smallest valid enclosing symbol, or file residual code. Aggregate to ancestors using unions of changed-line intervals. Keep additions/deletions separate, and do not double-count overlapping PRs in combined totals. Show “N changed lines” and “N affected files.” If showing a percentage, label it “changed surviving lines / current file lines,” count only unique new-side lines, and suppress it for inexact mappings and zero denominators.

### 2.6 Shared-branch contribution activity and review focus

Default to one selected shared branch and a bounded recent-activity window (14 days). Inventory tens of refs as lightweight metadata, but deeply parse at most the configured snapshot cap. Do not silently increase full analysis to every branch. A visible branch catalog distinguishes inventoried refs from analyzed snapshots. Offline users can select only embedded data; switching to an unanalyzed ref explains the build command needed rather than claiming live access.

Attribute commit changes to the Git author, preserve committer separately, and show co-author trailers only as declared metadata without allocating invented percentages. One PR may contain several contributors; its submitter remains a separate identity. Ownership by blame, recent commit activity, and PR authorship are distinct selectable lenses. Recent activity counts describe edits, not productivity or retained ownership. A region touched by multiple contributors uses an overlap badge and a contribution list rather than a fabricated single owner.

Provide two distinct scope measures: **activity** is the union of touched paths/symbols across selected commits, including edits later reverted; **net change** is the diff between two explicit endpoint SHAs. Commit additions/deletions may be shown as edit volume, but must not be summed into “unique changed lines.” Deduplicate commits by OID across lanes and PRs. For merge commits, show first-parent integration changes separately from original-author contributions; do not count both as independent contributed lines. Show which parent a diff uses. Root commits compare to an empty tree; missing shallow parents yield incomplete scope.

A review queue filters by target branch, explicit reviewer, requested user/team, author, draft/state, labels, recent update, and overlapping scope. Categorize PR relationships as “targets this branch,” “uses this branch as head,” or “touches matching paths”; shared paths alone do not establish ancestry or relevance. Default queue order is explicit review request first, then updated since a chosen checkpoint, then other recently updated relevant PRs; display the reason and avoid an opaque priority score. Team requests are visible, but do not infer team membership without supplied evidence.

“Since my checkpoint” means a locally recorded PR head SHA and observation time, not GitHub's read/review completion state. Require an explicit “Mark seen locally” action; opening a panel must not advance the checkpoint. Store it in browser storage when available, keyed by repository and PR, with export/import and in-memory fallback for file:// restrictions. No personal checkpoint is embedded in a shared artifact by default. If the old commit is unavailable or rewritten, explain the limitation and show current scope; never claim an exact delta. Opening a PR link lets the user perform the actual review on GitHub. The generated viewer cannot submit reviews, assign people, or synchronize team state.

### 2.7 Timeline, branch history, and time-dependent scope

Provide a linked 2D timeline with a shared time ruler: a lane for the selected branch's bounded commit history and lanes for relevant PR lifecycles. Show commit and merge markers; PR opening, draft/ready transitions, review requests/submissions/dismissals, close/reopen, merge, and observed force-push events where supplied by the source. Group unselected branches and PRs in searchable virtualized lists; render only selected/visible lanes. Default at most ten visible lanes, with explicit expansion.

Git stores a commit DAG and current refs, not a complete durable history of branch creation, renaming, deletion, or ref movement. Label branch lanes as “commits reachable from this ref at build time.” Do not turn the oldest visible commit into a branch creation date. Preserve parent edges/topological order when commit timestamps disagree; provide author and committer time in details and use committer time on the time axis. GitHub event times and locally observed ref times have distinct provenance. Never infer a missing event from a gap in collection.

A timeline range brush filters observed activity and related PRs; it does not reconstruct an arbitrary past repository state. A selected commit marker can open a snapshot only when its tree is embedded. Explicit “Compare endpoints” uses available SHAs and the paired 2D comparison. Selecting a PR bar highlights its current known scope unless a recorded historical head/base revision is available; label this distinction. A new build may preserve observed PR head/base pairs in the private cache, but previous observations are not a complete history. Retain only revision pairs needed by exported events within configured caps. Unobserved revisions, missing objects, and API truncation remain unknown.

For each selected commit/revision/range, show affected paths, available symbol effects, net additions/deletions when defined, contributor identities, and overlapping PRs, with exact/file-only/unmapped status. Reuse endpoint-specific mapping rules; never project old function spans onto today's source without evidence. Metadata-only events such as a label change have no code delta: their panel can link to known PR scope but must not imply that the event changed code. PR duration bars indicate lifecycle time, not continuous coding or review effort. A marker's size/color needs an explicit legend; default markers use uniform size and status shape rather than implying volume.

## 3. Proposed stack and package architecture

Use TypeScript in strict mode, a pnpm workspace, a maintained Node.js LTS release pinned in development/CI, and Git installed on PATH. Declare the tested Node compatibility range in `engines`. Select and lock dependency versions during the initial spike; do not rely on floating `latest` releases.

Suggested libraries: Commander for CLI parsing, Zod for runtime schemas, Octokit for GitHub REST access, `web-tree-sitter` with bundled compatible grammar WASM artifacts for parsing, D3 hierarchy/treemap for layout, React with a build-time bundler for controls, Canvas for dense rectangles, and an HTML tree/list for keyboard and screen-reader access. Vitest and Playwright are suitable test runners. These are implementation choices, not restrictions if a documented simpler solution satisfies the contract.

Tree-sitter supports Node bindings and WASM parser builds. Bundle tested runtime/grammar pairs and their licenses; users should not need a compiler or language toolchain. See [Tree-sitter bindings](https://tree-sitter.github.io/tree-sitter/using-parsers/) and [WASM parser builds](https://tree-sitter.github.io/tree-sitter/cli/build.html).

| Package | Responsibility | Allowed dependencies |
|---|---|---|
| `schema` | Versioned model, validation, migrations | No runtime app packages |
| `git` | Refs, trees, blobs, blame, local diffs | schema |
| `github` | Remote/auth resolution, PR metadata/files, throttling | schema |
| `parsers` | Worker pool, grammar registry, language adapters | schema |
| `analysis` | Hierarchy, ownership, diff mapping, aggregation | schema; ingestion/parser interfaces |
| `viewer` | Static interactive UI and layout | schema; no Node-only code |
| `generator` | Bundle viewer/data, reports, output safety | schema; built viewer assets |
| `cli` | Config, orchestration, progress, commands | All build-time packages |

Publish one user-facing `branchquilt` package first. Internal workspace packages can stay private and be bundled/copied into its distributable. Its `bin` entry must point to an executable built CLI with a Node shebang. Include viewer assets, grammar WASM, configuration schema, licenses, and workflow templates in the package allowlist. Avoid postinstall downloads and native build requirements. Test the packed tarball, not only workspace-linked execution.

## 4. Ingestion pipeline

### 4.1 Local Git

1. Discover repository root and Git/common directories; support worktrees, detached HEAD, and shallow clones.
2. Resolve explicitly selected refs and capture SHAs. Support local and already-fetched remote-tracking refs. Automatically prioritize the checked-out branch and main/master, then include other available refs up to a configurable 50-snapshot bound.
3. Enumerate tracked entries with NUL-delimited Git output and read blobs in batches. Never parse filenames by whitespace or newline.
4. Apply path exclusions before parsing/blame. Always exclude the selected output/cache paths, `.git`, dependency/vendor/build directories, and known credential files. Make additional excludes configurable. Record counts and reasons; do not export excluded sensitive paths by default.
5. Treat symlinks as entries, never follow their targets. Treat submodules as opaque commit references. Detect Git LFS pointers without fetching their content. Binary or unsupported files remain nodes with status metadata.
6. Parse eligible blobs in bounded workers. Deduplicate identical blobs across branches.
7. Run blame only on eligible text files, cache results, and normalize identities. Use porcelain output and mark shallow-boundary/unavailable attribution as incomplete.
8. Build the immutable normalized model; validate before emission.

Do not execute target-repository scripts, hooks, build tools, Git filters, or config modules. Use subprocess argument arrays without a shell, validate refs, and use end-of-options separators where supported. The build may read tracked committed source but does not write source/index/refs. Fetching is a separate explicit command; ordinary builds never silently deepen clones or fetch remote refs.

### 4.2 GitHub enrichment

Infer owner/repository/host from a selected remote, supporting SSH and HTTPS syntax. Permit explicit `--github-repo owner/repo` and host overrides for Enterprise. Strip credentials from remote URLs. Bind credentials to the configured host; do not forward them through redirects to other hosts.

Default mode `auto` enriches when usable authentication exists; otherwise it produces a local-only atlas with a diagnostic. `--github required` makes remote enrichment failures fatal; `--github off` prohibits network access. Explicit public unauthenticated access is supported with conservative limits. A cached offline result must carry its fetch timestamp and stale status.

Fetch PR identity, number, title, state, draft flag, author, labels, URL, timestamps, base/head refs and SHAs, merge SHA, changed-file counts, and file changes. Default selection is open PRs, capped at 100, with a visible truncation notice. Support closed/merged/all filters, update-since filtering, explicit PR numbers, and a configurable maximum. Determine merged status from merge metadata, not from `state=closed` alone.

Paginate every endpoint and compare fetched file counts with declared totals. GitHub's PR-files endpoint is capped at 3,000 files; pagination alone cannot exceed that limit. If local endpoints are available, recover the full diff locally. Otherwise emit partial file coverage with a diagnostic. PR issue metadata includes labels; request extra issue data only when needed. See [GitHub pull request API](https://docs.github.com/en/rest/pulls/pulls).

Do not depend on API `patch` fields being complete or present. Prefer local diffs when object availability allows. API-only patch parsing must verify ranges, mark unavailable binary/truncated data, and degrade to file-level scope. Fork heads and deleted branch refs are normal cases. `fetch` may retrieve explicitly requested PR refs/commits without checking them out, and must report unavailable objects rather than assuming success.

Apply bounded concurrency (initially four requests), rate-limit-header awareness, Retry-After handling, exponential backoff with jitter, and bounded retries. Distinguish authentication/permission errors, inaccessible repositories, primary/secondary throttling, and transient failures. Use conditional requests and validated cached responses. Never interpret permission failure as “no PRs.”

### 4.3 History and review ingestion

Walk bounded commit history with parent OIDs, author/committer identities and timestamps, subject, and explicit shallow-boundary markers. Collect branch-catalog refs independently of deep tree parsing. Default limits: 14 days of activity, 2,000 commits overall, 500 catalog refs, 1,000 events per PR, and 50 retained PR revision pairs overall. Make bounds configurable and show truncation at the affected lane and global summary. Timestamp filtering must not sever topology silently; retain boundary parent references with unavailable-detail status. Never parse every historical tree: derive file-level changes first and parse only included changed blobs under the existing byte/time budget. Bound detailed historical snapshots separately (default ten) and list those available to the offline viewer.

Paginate [PR timeline events](https://docs.github.com/en/rest/issues/timeline), [submitted reviews](https://docs.github.com/en/rest/pulls/reviews), and [current requested reviewers](https://docs.github.com/en/rest/pulls/review-requests). Normalize event IDs and deduplicate review events across sources. Store review state, actor, submission time, and reviewed commit SHA when present; omit review/comment bodies by default. Distinguish “approved at SHA X” from “approved current head.” Do not claim merge readiness or complete branch-protection compliance from review counts alone. Absent/inaccessible reviews mean unknown, not “nothing to review.” Preserve source and fetched time per collection.

Check endpoint permissions for the selected GitHub host/API version; timeline access may require issue or PR read permissions depending on the endpoint's documented support. Update doctor, token guidance, and Pages build permissions for the endpoints actually used. Keep all access read-only. Do not fetch organization membership merely to populate a reviewer filter. Explicit viewer identity is a display preference, not authentication.

### 4.4 Parser interface and language support

```ts
interface ParserAdapter {
  id: string;
  version: string;
  extensions: readonly string[];
  grammarDigest: string;
  parse(input: {
    path: string;
    sourceUtf8: Uint8Array;
    blobOid: string;
    timeoutMs: number;
  }): Promise<{
    symbols: ParsedSymbol[];
    diagnostics: ParseDiagnostic[];
    status: 'complete' | 'partial' | 'unsupported' | 'failed';
  }>;
}
```

Adapters normalize syntax into one model. Start with JS/JSX/TS/TSX and Python; complete Go, Rust, Java, C#, C, and C++ before v1 release. Per-language fixtures must cover nested scopes, methods, anonymous/named functions, decorators/annotations where applicable, generics/templates, overloads, malformed source, Unicode, CRLF, and empty files. Document supported declaration forms and known omissions for each adapter.

Store canonical byte offsets as UTF-8, end-exclusive. Lines are one-based and inclusive for displayed nonempty spans; columns are zero-based UTF-8 bytes. Binding-provided indexes may use different units: explicitly convert and test emoji/non-ASCII text before using spans for sizes or diffs. For declarations intersecting parser error regions, mark affected symbols partial or drop invalid symbols; preserve the file.

Extension mappings are primary; support explicit overrides for ambiguous extensions. Cap file size at 2 MiB and per-file parse time at two seconds by default, configurable. Terminate and replace a timed-out worker. New parser adapters must be installable as explicit trusted local packages with a documented versioned API. Disable external adapters in CI by default unless allowlisted; never auto-install plugins based on repository content.

## 5. Normalized data contract

Define JSON Schema plus generated TypeScript types and runtime validation. Use integer indexes in compact artifacts if needed, but preserve the same logical model. Example core contracts:

```ts
type ID = string;
type Completeness = 'complete' | 'partial' | 'unavailable';
type Mapping = 'exact' | 'file-only' | 'unmapped';
interface Atlas {
  schemaVersion: '1.0.0';
  generatorVersion: string;
  generatedAt: string;
  repository: { id: ID; name: string; webUrl?: string };
  snapshots: Snapshot[];
  nodes: Node[];
  contributors: Contributor[];
  ownership: Ownership[];
  pullRequests: PullRequest[];
  changes: FileChange[];
  effects: PREffect[];
  branchCatalog: BranchRef[];
  commits: CommitRecord[];
  timeline: TimelineEvent[];
  revisions: PRRevision[];
  reviewFacts: ReviewFact[];
  changeSets: ChangeSet[];
  diagnostics: Diagnostic[];
  provenance: {
    configDigest: string;
    parserVersions: Record<string, string>;
    gitVersion: string;
    githubFetchedAt?: string;
    githubStatus: Completeness;
  };
}
interface Snapshot {
  id: ID;
  ref: string;
  commitOid: string;
  rootNodeId: ID;
  purpose: 'branch' | 'pr-head' | 'pr-base' | 'history';
  shallow: boolean;
}
interface Span {
  startByte: number; endByte: number;
  startLine: number; endLine: number;
}
interface Node {
  id: ID;
  snapshotId: ID;
  parentId?: ID;
  kind: 'branch' | 'directory' | 'file' | 'symbol' | 'residual';
  name: string;
  path?: string;
  symbolKind?: string;
  language?: string;
  blobOid?: string;
  gitMode?: string; // Git tree entry mode; required on file/opaque-entry nodes
  span?: Span;
  metrics: { inclusiveBytes: number; exclusiveBytes: number; lines: number };
  parseStatus?: 'complete' | 'partial' | 'unsupported' | 'failed' | 'skipped';
}
interface Contributor {
  id: ID;
  displayName: string;
  githubUserId?: string;
  githubLogin?: string;
  color: string;
}
interface Ownership {
  nodeId: ID;
  contributorId: ID;
  lines: number;
  method: 'blame';
  status: Completeness;
}
interface PullRequest {
  id: ID;
  number: number;
  title: string;
  url?: string;
  authorId: ID;
  state: 'open' | 'closed' | 'merged';
  draft: boolean;
  labels: { name: string; color?: string; description?: string }[];
  baseRef: string; headRef: string;
  baseOid: string; headOid: string; mergeBaseOid?: string; mergeOid?: string;
  createdAt: string; updatedAt: string; mergedAt?: string;
  declaredChangedFiles?: number;
  fetchedChangedFiles: number;
  coverageStatus: Completeness;
}
interface FileChange {
  id: ID; prId: ID;
  oldPath?: string; newPath?: string;
  oldBlobOid?: string; newBlobOid?: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'typechanged';
  binary: boolean;
  additions?: number; deletions?: number;
  oldRanges: [number, number][]; // one-based inclusive; empty for no deleted lines
  newRanges: [number, number][];
  source: 'local-git' | 'github-api';
  completeness: Completeness;
}
interface PREffect {
  prId: ID; changeId: ID;
  snapshotId?: ID; nodeId?: ID;
  side: 'old' | 'new';
  mapping: Mapping;
  changedLines?: number;
  reason?: string;
}
interface BranchRef {
  id: ID; ref: string; tipOid: string; snapshotId?: ID;
  observedAt: string; historyStatus: Completeness;
}
interface CommitRecord {
  oid: string; parentOids: string[];
  authorId: ID; committerId: ID;
  authoredAt: string; committedAt: string;
  subject?: string; // redacted in anonymized export
  boundary: boolean;
}
interface TimelineEvent {
  id: ID; kind: string; // validate against a documented enum; preserve unknown kinds safely
  occurredAt?: string; observedAt: string;
  source: 'git' | 'github' | 'local-observation';
  actorId?: ID; branchRefId?: ID; prId?: ID; commitOid?: string;
  revisionId?: ID; changeSetId?: ID;
  completeness: Completeness;
}
interface PRRevision {
  id: ID; prId: ID; baseOid: string; headOid: string;
  mergeBaseOid?: string; observedAt: string;
  evidence: 'current-api' | 'cached-observation' | 'explicit-event';
  changeSetId?: ID;
}
interface ReviewFact {
  id: ID; prId: ID; actorId?: ID; teamSlug?: string;
  kind: 'requested' | 'approved' | 'changes-requested' | 'commented' | 'dismissed';
  commitOid?: string; occurredAt?: string; observedAt: string;
  source: 'reviews' | 'timeline' | 'requested-reviewers';
}
interface ChangeSet {
  id: ID; kind: 'commit-parent' | 'pr-revision' | 'endpoint-comparison';
  oldOid?: string; // absent only for explicitly identified empty-tree root diff
  newOid: string; parentIndex?: number; prRevisionId?: ID;
  changes: Omit<FileChange, 'prId'>[];
  effects: Omit<PREffect, 'prId'>[];
  completeness: Completeness;
}
interface Diagnostic {
  code: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  relatedId?: ID;
}
```

The FileChange/PREffect arrays preserve current PR compatibility; ChangeSet generalizes the same records for commits and historical revisions. A current PR change set and its compatibility projection must share record IDs and are never aggregated twice. Timeline event IDs reference ChangeSet IDs when the event has a code delta; review and lifecycle events may have none. Parent OIDs outside the history window remain explicit boundary references rather than dangling loaded-commit claims.

Generate IDs from canonical serialized tuples, not ambiguous string concatenations: repository identity; snapshot SHA plus ref/purpose; node snapshot/path/kind/span; PR host/repository/number. Treat Git object IDs as opaque algorithm-qualified values internally rather than assuming 40 characters. Symbol IDs are stable for the same snapshot, not promised across edits. Add a separate best-effort logical key for preserving focus between branches; fall back to the nearest existing path.

Required invariants: unique IDs, valid references, acyclic parent graph, one branch root per snapshot, ordered in-bounds spans, nonnegative finite metrics, exactly one PR author, valid normalized colors, and mapping evidence for every exact effect. Distinguish zero from unknown; omitted additions/deletions are unknown, not zero. Ownership sums cannot exceed eligible lines. Schema major changes require a viewer compatibility check and explicit migration or clear rejection.

## 6. CLI and configuration

### Commands

| Command | Behavior |
|---|---|
| `branchquilt init` | Write commented documentation plus a JSON config; never overwrite existing files silently |
| `branchquilt build [path]` | Analyze committed snapshots and generate HTML; path defaults to current repository |
| `branchquilt view [path]` | Build beneath the private per-worktree Git directory and open the standalone report; leave `git status` unchanged |
| `branchquilt refresh [path]` | One unattended cycle: lock → explicit configured fetch → resolve snapshots → refresh metadata → validate → replace artifact; never deploy by itself |
| `branchquilt fetch [path]` | Explicitly fetch selected refs/PR objects; no checkout, no output generation |
| `branchquilt serve [output]` | Optional loopback-only static preview server; standalone HTML also works without it |
| `branchquilt doctor [path]` | Check Git/runtime, refs, parsers, output paths, auth availability; redact secrets |
| `branchquilt cache stats\|clear` | Inspect or delete only this repository's tool-owned cache |
| `branchquilt pages init --mode actions\|branch` | Record an explicit Pages backend; install a reviewed workflow or initialize a protected BranchQuilt deployment branch |
| `branchquilt publish [path]` | Build and publish through the configured Pages backend; never modify the source worktree/index |

Support `--config`, repeatable `--branch`, `--output`, `--format single|directory`, `--github auto|required|off`, `--github-repo`, `--github-host`, repeatable `--pr`, `--pr-state`, `--since`, `--max-prs`, `--ownership blame|off`, `--exclude`, `--history-days`, `--max-commits`, `--max-events-per-pr`, `--checkpoint <sha>`, `--reviewer <login>`, `--non-interactive`, `--lock-timeout <seconds>`, `--timeout <seconds>`, `--report <path>`, `--cache-dir <path>`, `--no-cache`, `--refresh`, `--strict`, and `--json`. `--json` emits structured progress/result records without secret values. Help documents what each cap excludes. `--since` filters PR updates; `--history-days` bounds commit activity. `--checkpoint` sets an explicit net-diff baseline and requires a resolvable commit; a time brush selects observed events rather than pretending to be a commit baseline. `--reviewer` preselects a public GitHub login without embedding authentication.

Precedence: CLI → explicit/config-discovered JSON → built-in defaults. Authentication environment variables are separate from serializable config. Reject unknown keys and executable JavaScript configuration. Resolve relative paths from the repository root. Explicit output paths cannot be the repository root or arbitrary locations inside `.git`; `view` and `publish` may use only their fixed, tool-owned directory beneath the per-worktree Git directory. Refuse overwrite of unrelated files. Use a generator-owned manifest and atomic staging/rename. A failed build preserves the last good artifact.

Exit codes: `0` successful artifact, including explicitly reported nonfatal omissions; `1` build/internal failure; `2` configuration/usage failure; `3` required remote/auth failure; `4` incomplete analysis under `--strict`; `5` another run holds the lock past its timeout; `6` overall timeout. Cancellation exits nonzero with a structured cancelled result. Strict mode fails on selected requested capabilities that are incomplete, not intentional exclusions or documented unsupported-language fallbacks. Print a final summary with analyzed/skipped files, parsed symbols, attribution completeness, PR mapping quality, truncation, artifact size, and paths.

### Configuration example

```json
{
  "$schema": "./node_modules/branchquilt/config.schema.json",
  "version": 1,
  "branches": [],
  "maxSnapshots": 50,
  "maxBranches": 5,
  "output": { "directory": ".branchquilt/site", "format": "single" },
  "exclude": ["**/node_modules/**", "**/vendor/**", "**/dist/**", "**/*.min.js"],
  "parsing": { "maxFileBytes": 2097152, "timeoutMs": 2000, "workers": 4 },
  "ownership": { "mode": "blame", "useMailmap": true, "identityMappings": [] },
  "github": { "mode": "auto", "remote": "origin", "prState": "open", "maxPRs": 100 },
  "history": { "days": 14, "maxCommits": 2000, "maxRefs": 500, "maxEventsPerPR": 1000, "maxRevisions": 50, "maxSnapshots": 10 },
  "refresh": { "timeoutSeconds": 900, "lockTimeoutSeconds": 0, "staleAfterMinutes": 90 },
  "cache": { "enabled": true, "maxMiB": 1024, "githubTtlMinutes": 15 },
  "viewer": { "defaultColorMode": "activity", "defaultSizeMetric": "bytes" },
  "pages": { "mode": "actions", "branch": "gh-pages", "folder": "/" },
  "privacy": { "profile": "standard", "includeSource": false, "includeEmails": false }
}
```

### User commands after package publication

```sh
# Add to an existing repository; commit the resulting lockfile for reproducibility.
pnpm add -D branchquilt
pnpm exec branchquilt init
pnpm exec branchquilt view .

# One-time invocation; use a tested exact release in repeatable automation.
pnpm dlx branchquilt build /path/to/existing-repository

# Compare existing refs without checking them out.
pnpm exec branchquilt build . --branch main --branch origin/feature/search

# Explicitly retrieve PR objects, then include selected PRs.
pnpm exec branchquilt fetch . --pr 42 --pr 57
pnpm exec branchquilt build . --pr 42 --pr 57 --github required

# Generate a private local-only report with no remote requests.
pnpm exec branchquilt build . --github off --output branchquilt-local

# Choose one Pages backend once, then publish with one command.
pnpm exec branchquilt pages init --mode actions
# Or: pnpm exec branchquilt pages init --mode branch --branch gh-pages
pnpm exec branchquilt publish
```

The package must work through pnpm's package execution model, including installed binaries and one-time execution; see the [pnpm CLI documentation](https://pnpm.io/id/11.x/pnpm-cli).

## 7. Viewer UX and static generation

### Shared-branch workspace and contextual side panel

The primary screen is a viewport-filling map with compact persistent branch/compare controls and floating breadcrumbs. The map extends behind top/bottom controls without reserved control bands. On pointer devices, secondary edge controls reveal on hover or keyboard focus and become fully opaque; touch controls remain visible. Search, the branch/review queue, file lists, timeline/activity, and the right-side inspector open as dismissible overlays. Open the legend on first load with an explicit close control. Avoid permanent section cards, explanatory text blocks, and tables around the map; disclose detail on demand. Keep the selected branch, data freshness, and active scale visible. Branch comparison is an explicit secondary mode. PRs are selectable objects in the review queue and timeline, not artificial children of source files; the canonical code hierarchy remains unchanged.

**Selection contract:** click/tap/Enter on a function, file, directory, branch, PR, commit, or event selects it and opens its inspector. Selecting a different object replaces the panel content. Selecting the same object toggles the panel closed/open while retaining the selection highlight. The Close button and Escape close it and restore focus to the trigger; Back restores the prior selection without changing the analysis window. Use a separate chevron or “Open scope” action for expanding tree nodes or drilling into the treemap so a single click never both zooms and toggles the inspector. Branch/PR inspector “Focus branch” and “Show scope” actions explicitly change the workspace context.

The resizable inspector has **Overview**, **Changes & coverage**, and **History** tabs; a PR additionally has **Review**. Keep object name, snapshot/revision, provenance/completeness, and a compact active legend visible. Relevant content:

| Selected object | Inspector content |
|---|---|
| Function/class | Signature/name, exact file/span/snapshot, recent contributors, mapped PRs, changed-range summary, and endpoint-specific history availability |
| File/directory | Child summary, actual size/change totals, contributor breakdown, affected symbols, overlapping PRs, and activity timeline |
| Branch | Observed tip, recent contributors/commits, related PR queues, history bounds, available snapshots, and compare/focus actions |
| PR | Submitter and distinct commit contributors, labels/state, base/head revisions, scope list, overlap, reviewers, reviewed SHA, and lifecycle timeline |
| Commit/event | Actor and timestamps, parent/revision evidence, affected scope when defined, event metadata, and exact source links |

Selecting a timeline event highlights corresponding map/queue entries; selecting a code object filters a local inspector timeline without silently changing the global time brush. “Filter workspace to this scope” is a separate explicit action. Legends explain contributor versus submitter color, overlap/status patterns, changed-code scope, exact versus uncertain mappings, and comparison capacity when applicable. Show a compact scope mini-map only where it answers a question; metadata-only events display “No code change for this event.”

Keep all inspector information accessible as text/list content. Use proper tab/tabpanel semantics, predictable keyboard navigation, visible focus, and announced selection changes. Desktop panels do not trap focus; the narrow-screen modal/drawer does, restores focus on dismissal, and leaves map/timeline state intact. Use reduced-motion-aware transitions. Preserve shareable object/tab/time state in validated URL fragments, but exclude personal review checkpoints. Browser storage failure must not break basic selection or navigation.

### Screen structure and interactions

Provide a header with repository, selected ref/SHA, generation time, data freshness, and completeness badge. A control bar holds branch, color mode, area metric, search, and filters. Main content is the treemap, breadcrumb trail, and a collapsible detail panel. A legend always explains the active metric/colors and has an “Unknown” category.

- Select a directory to inspect it; its chevron or “Open scope” action zooms. Breadcrumbs return to ancestors. Double-click must not be required.
- Search paths and symbol names locally; select a result to reveal its ancestors and highlight it.
- Filter by language, path, contributor, PR author/state/label. Default filtering dims nonmatches to preserve spatial context; an explicit “Focus matches” action reflows the map.
- Toggle recent-contributor activity (default), blame ownership, PR author, language, and neutral color modes. PR mode starts with PR selection and a clear no-selection state.
- Selecting a PR synchronizes the map, changed-file list, labels, additions/deletions, and mapping-quality indicators. Provide an exact PR-head view when available.
- Hover or keyboard focus reveals a compact tooltip with PR number/title, author, state/draft, labels, timestamp, affected scope, and completeness. Multiple PRs show a bounded list plus “View all.”
- Animate tooltips and zoom for roughly 120–180 ms, with a brief hover delay. Respect `prefers-reduced-motion`, avoid motion on touch, keep tooltips inside the viewport, and support dismiss/pin with Escape/click.
- A pinned detail panel contains interactive links; hover-only tooltips never hide essential actions. Keyboard users can reach the same information through the companion tree/list.
- Persist shareable branch/path/PR/filter state in an encoded URL fragment without credentials. Validate fragments and recover from stale IDs. Do not rely on HTTP routes.

Meet WCAG AA contrast for text and controls. Color is never the only identifier: use labels, badges, and patterns. Support focus indicators, Enter/Space activation, Escape dismissal, 200% zoom, touch targets, and a usable narrow-screen stacked layout. Cap rendered rectangle labels by available area. Display a useful empty state for an empty repository, excluded files, absent PR data, or no search matches.

### Required 2D branch comparison

Provide two side-by-side panes with independently selected snapshot refs and SHAs, synchronized breadcrumbs/zoom, matching-path selection, a shared legend, and a searchable changes list. Limit active comparison to two snapshots while allowing the existing selector to choose among all analyzed branches. On narrow screens stack panes or provide an A/B switch that preserves focus. Keep the accessible tree/list as an equal navigation route.

**Stable layout versus exact area.** In comparison mode, create a union directory/file tree across the two snapshots. Size each shared file slot by the maximum bytes of that path across the pair, aggregate to directory slots, and compute one deterministic layout used in both panes. Missing paths remain explicitly labeled empty slots; present zero-byte files have separate markers. Label slot area as “comparison capacity (maximum bytes across selected snapshots).” Show actual bytes and signed byte deltas in the detail panel. Do not label shared slot area as each branch's actual size. Single-snapshot exploration retains exact byte-proportional layout. All-empty trees use an explicit list/empty state, not fabricated byte weights.

**Change semantics.** Compare selected snapshot A directly to B for added, removed, modified, unchanged, and type-changed entries; this is an endpoint comparison, distinct from a PR's merge-base diff. Use matching path, blob OID, and Git entry mode to determine equality. A mode-only change must appear changed even with identical blob content. Detect renames with recorded Git options and label them as detected associations; do not imply a permanent identity or merge ancestry. Preserve old/new slots and link them on selection. Missing directories remain navigable through the union tree.

Compare directories/files spatially; drill into a selected file's accurate per-snapshot symbol hierarchy without promising stable symbol identity across edits. Do not infer contribution or PR authorship from path matches. PR effects retain exact/file-only/unmapped evidence independently for each pane.

Use labeled badges and border patterns for change status so contributor/PR colors remain unambiguous. The changed-files list includes old/new path, status, actual byte counts, and links to each available side. Selection, filters, and PR panels update consistently. Default filtering dims matching slots without reflow; explicit focus mode recomputes the pair's shared layout once and applies it to both panes. Cache derived layouts by snapshot pair, filters, and layout version, separately from canonical source metrics.

Acceptance requires fixtures covering equal blobs, additions, deletions, detected renames, mode-only changes, differing file sizes, empty files, missing directories, Unicode paths, and incompatible PR spans. Benchmark 50,000 total nodes across both panes and keep the existing interaction targets. No GPU library or 3D renderer is required.

### Artifact modes

**Single-file mode, default:** inline compiled JS/CSS and safely escaped data in `index.html`; no runtime imports, fetches, fonts, avatars, CDNs, source maps, or external requests. Direct `file://` opening must work. Escape `<` and script terminators in embedded JSON, never interpolate repository text into executable scripts. Bundle the viewer as a self-contained script rather than an import-dependent module. Use a small inline-compatible layout path if workers are unavailable under local-file browser restrictions.

**Directory mode:** `index.html`, hashed JS/CSS, data chunks, `.nojekyll`, and manifest/report. Use relative URLs so `/repository/atlas/` works on Pages. Document that this mode requires HTTP preview; the single-file mode is the local-file deliverable. Workers and data loading are allowed only from the artifact itself.

Apply a restrictive generated CSP: no network connections in single mode; same-origin assets/connections only in directory mode; no unsafe eval; script hashes for generated inline scripts. Design tooltip positioning and styles to work under the chosen style policy, then test the actual CSP in browsers. External source/PR links are user-activated, validated HTTP(S) links with safe target behavior. Disable remote avatars by default.

Default output contains paths, symbol names/spans, counts, contributor display names, PR titles/labels, safe event types/timestamps, commit subjects, and reviewer metadata; it contains no source bodies, patches, emails, tokens, or repository filesystem root. An optional source inclusion setting must be explicit and clearly reflected in the export report. Compression may be added only with a bundled offline decoder and tested browser fallback.

## 8. Authentication, security, and privacy

Resolve credentials in order: `GH_TOKEN`, `GITHUB_TOKEN`, then opt-in GitHub CLI credential lookup for the configured host. No token flags or token fields in saved config. Do not prompt for or store tokens in browser assets. Use tokens only in build-time HTTP headers; redact them from errors, diagnostic dumps, subprocess environment exposure, and cache metadata.

For PR metadata, fine-grained tokens need Pull requests read permission for the selected repository; request other read permissions only for endpoints/features that require them. Public PR endpoints can work unauthenticated with tighter limits. Document GitHub App installation tokens for CI. See [endpoint authentication requirements](https://docs.github.com/en/rest/pulls/pulls). Git fetch credentials are handled separately by Git; never place an API token in a remote URL.

Treat repository source, filenames, Git metadata, PR titles, labels, URLs, and cached API responses as untrusted data. Render plain text through safe DOM APIs. Exclude PR bodies by default; if later supported, sanitize rendered Markdown and disallow raw HTML. Validate colors and URL schemes. Test script terminators, HTML payloads, malicious labels, and shell metacharacters in refs/paths.

Resolve and validate every write/delete path, including symlinked parents. Never follow symlinks outside the chosen output/cache root. `cache clear` only removes files under a validated tool-owned directory. Do not evaluate repository configuration or parse plugins implicitly. Restrict local preview to loopback, reject traversal, and serve only artifact files.

Cache under the Git common directory's tool-owned subdirectory by default, excluded from exports and private where the OS supports it. A build must not export auth headers, remote URL credentials, raw emails, or absolute machine paths. Keep raw blame identities local. Partition remote caches by host/repository and an opaque credential scope fingerprint; never use privileged cached responses for a different credential scope. Expire and invalidate denied access rather than quietly serving private cached results.

Provide `standard` and `anonymized` export profiles. Anonymized exports replace contributor names/logins with build-local aliases and omit PR titles, labels, links, and branch names that could reveal identities; paths and symbol names still expose code structure. Use build-local IDs to reduce identity correlation. This is data minimization, not a secrecy guarantee. Generate a field/count export report so users can review what they are publishing. No telemetry by default. The anonymized profile also removes commit subjects, reviewer/team identifiers, and event text that could identify people; preserve only safe event types, counts, and aliased actors. Private cached historical observations remain subject to the same access partitioning and export policy as current data.

## 9. Performance, caching, and reproducibility

Pipeline work in bounded batches rather than reading the whole repository into memory. Reuse parsed blobs across branch snapshots and PR endpoints. Keep parser objects inside workers and release syntax trees promptly. Limit blame concurrency separately because it is history-dependent and expensive. Support cancellation and checkpoint reusable cache entries without emitting a half-written artifact.

| Cache | Key/invalidation |
|---|---|
| Tree/ref manifest | Repository + resolved commit SHA + exclusion/config digest |
| Parsed symbols | Blob OID + language + grammar/runtime/adapter versions + parse options |
| Blame | Repository + snapshot SHA + path + blame options + mailmap/identity digest |
| GitHub response | Host/repository + credential scope + endpoint/params/API version + ETag/TTL |
| PR diff and effects | Base/head/merge-base + diff options + target snapshot + parser versions |
| History/reviews | Immutable commit facts by OID; mutable review/event collections by host/repo/credential scope and TTL; revision pairs by explicit SHAs |
| Viewer bundle | Viewer version + build options |

Use atomic cache entries, content validation, format versioning, corruption recovery, and an LRU byte budget. Force pushes invalidate SHA-dependent entries naturally; PR label/state changes require metadata refresh even if the head SHA is unchanged. Store freshness separately from analysis correctness. `--refresh` revalidates GitHub metadata; `--no-cache` neither reads nor writes caches. `refresh` is the complete scheduled cycle; the existing `build --refresh` option only revalidates remote metadata and does not fetch Git refs.

Sort canonical data and palette choices deterministically. Offer `SOURCE_DATE_EPOCH` or equivalent for repeatable timestamps. Identical inputs, tool versions, config, and captured GitHub responses should produce byte-identical output. Do not promise reproducibility against live mutable API results.

Initial benchmark targets, to be measured and adjusted through a documented baseline rather than claimed as achieved:

| Scenario | Target on documented 8-core/16-GiB reference machine |
|---|---|
| Structure + parsing, 10k eligible files / 1M lines / one ref | Cold ≤60 s, peak memory ≤1.5 GiB |
| Identical cached local rebuild | ≤10 s with zero reparses |
| One small changed file | Parse only changed blobs; reuse all unaffected parse entries |
| Blame run | Report separately by history depth; cancellable, cached, with progress |
| Viewer, 50k nodes | First usable single-file view ≤3 s on documented browser/hardware |
| Interaction after load | Typical zoom/filter p95 ≤100 ms excluding animation |
| Single-file size | Warn above 25 MiB and suggest directory mode; never silently drop data |

Use level-of-detail rendering, visible-subtree layout, spatial hit testing, and virtualized result lists. Do not create one DOM element for every symbol in a large repository. Keep ownership/PR lookup indexes compact and construct heavy indexes lazily. Include branch/PR caps in the UI so bounded analysis never looks comprehensive.

## 10. Scheduled operation and GitHub Pages integration

### Unattended refresh contract

Scheduled regeneration is a first-class v1 use case. Implement a finite `branchquilt refresh` command suitable for GitHub Actions schedules, cron, systemd timers, launchd, Windows Task Scheduler, and generic CI. The package does not contain a scheduler daemon or install/register a job automatically. Generate templates/documentation; actual scheduling is a maintainer action. Every invocation performs one cycle and exits.

`refresh` deliberately permits fetching the configured remote refs/selected PR objects; ordinary `build` remains fetch-free. Reuse the same pipeline and configuration, with a lock spanning the full refresh. Require explicit remote-tracking refs in scheduled configuration, such as `origin/team/integration`, rather than local `HEAD`, which does not advance when fetch runs. Fetch updates remote-tracking refs and explicitly configured tool-owned PR refs, never local checked-out branch tips, index, working files, or Git identity. Honor ref changes/force pushes; surface deleted branches instead of substituting another ref. Missing required selected refs fail the cycle. Pruning is limited to the explicitly selected remote-tracking/tool-owned namespaces.

Execute: validate config and output → acquire repository lock → fetch configured refs → resolve immutable SHAs → refresh GitHub collections → analyze/cache → validate export → stage → publish locally → write success report → release lock. Credentials must already be available from the CI secret store/environment or Git credential mechanism. Noninteractive mode is implied by `CI=true` or no TTY, and can be forced explicitly. It never prompts, opens a browser, launches a server, installs packages, or waits for login. Disable terminal credential prompts and interactive SSH/password fallback for fetch; fail promptly on missing auth. Keep the existing host-bound credential rules.

Scheduled config should set `github.mode=required` when review data is central; `auto` remains suitable for local exploration. Define optional source failures separately, but do not replace a previously complete remote review view with an apparently empty one after an API error. A required source refresh failure aborts promotion and preserves the last successful output. Local-only refresh is supported with `github.mode=off`. Record source-specific freshness even when a successful conditional request confirms unchanged cached data.

### Repeatability, locking, and failure recovery

Use a portable exclusive lock under the Git common directory, shared by build/fetch/refresh/cache-clear mutations. Lock metadata includes owner/run ID, host, PID, and acquisition time. Default lock wait is zero; return exit 5 with `status=locked` so schedulers can distinguish contention. Do not delete a lock based only on elapsed time; recover it only when owner death can be established, otherwise report recovery instructions. Use bounded cache-entry locks if cache entries are shared beyond one repository. Network filesystems or multiple hosts require an external single-writer policy unless distributed locking has been explicitly implemented and tested.

Default overall refresh timeout is 15 minutes, configurable. API retry/backoff and subprocess timeouts fit inside that deadline. On signals, stop workers/subprocesses, finish or discard atomic cache writes, remove only this run's staging files, and release owned locks. Hard-kill recovery cleans orphan staging data on a later run after ownership validation. Never promote incomplete output or leave a lock requiring routine manual cleanup after a normal failure.

Single-file promotion uses a same-filesystem atomic file replacement. Directory mode writes immutable versioned assets first and atomically replaces its entry HTML/manifest last; retain prior assets for a grace period so open pages cannot request deleted chunks. Do not assume replacing a populated directory is atomic across supported operating systems. For Pages, build a complete artifact and deploy only after successful validation; a failed generation must not trigger deployment. A scheduler must serialize publication for one site so an older run cannot overwrite newer data.

Compute a semantic content digest from resolved SHAs, normalized PR/review/event state, config, parser/viewer versions, and observation records that materially change the UI. Identical observations must not append duplicate history events. Exclude volatile run timestamps from the semantic digest; keep a separate artifact digest. Report `contentChanged=false` when appropriate, but still revalidate metadata and update confirmed-freshness information. Default scheduled Pages runs may publish that lightweight freshness update; skipping publication is optional and must leave the old site's displayed timestamp honest.

Keep persistent caches on recurring machines. For ephemeral CI, provide an explicit `--cache-dir`/config override in a validated private location; restore/save it only from trusted runs and keep its contents out of the published artifact. Scope keys by repository, tool/cache version, and credential scope. Losing a cache must only make a run slower or remove explicitly labeled previous observations, never fabricate continuity. Scheduled polling is a sequence of observations, not a complete force-push/ref-event audit trail.

### Freshness, reporting, and monitoring

Emit newline-delimited JSON with a stable final result when `--json` is used, plus an optional atomic `--report` file outside the published artifact. Include run ID, start/finish times, outcome (`success`, `failed`, `locked`, `cancelled`, `timeout`), exit code, source fetch/revalidation times, resolved SHAs, completeness, semantic/artifact digests, `contentChanged`, counts, cache hits, durations, and output location. Redact credentials and keep private filesystem locations out of exported HTML. Reports for failures must be independent of the last good site's files.

Display “data checked at,” generation time, per-source freshness, and a configurable stale-after threshold (example: 90 minutes for a 30-minute job). Calculate aging locally in the browser, even offline. An old static artifact can say its data is stale; it cannot know that the latest scheduled job failed unless an external status source supplies that fact. Do not claim live refresh or a guaranteed next completion time. Reopening/reloading the hosted page gets the newest deployed artifact; preserving selected node/filters in the URL supports continuity. Live polling and push updates are outside v1.

Let the host scheduler handle retries and notifications using exit codes and structured reports. Supply failure-notification guidance without storing notification secrets or sending messages from the package. A nonzero build prevents deploy, while successfully generated partial output remains clearly labeled under the chosen policy.

### Example scheduled commands and triggers

Use an exact, lockfile-installed release in a dedicated persistent checkout, with the relevant remote-tracking branch in `branchquilt.config.json`. Node/pnpm, Git credentials, and GitHub tokens must be provisioned before the job starts. Use absolute executable/working-directory paths in host scheduler templates rather than assuming a login-shell PATH. Generate Linux cron/systemd, macOS launchd, and Windows Task Scheduler instructions around the same finite command:

```sh
pnpm exec branchquilt refresh /srv/repos/team-project \
  --config /srv/repos/team-project/branchquilt.config.json \
  --branch origin/team/integration --github required \
  --non-interactive --timeout 900 --lock-timeout 0 \
  --json --report /srv/branchquilt-reports/team-project.json
```

The paths/ref above are examples to replace. Existing config discovery and CLI precedence still apply. Do not put raw tokens in command arguments or scheduler definitions. Rotate logs using the scheduler/platform; reports have bounded retention outside the output directory.

Provide a Pages workflow template combining manual dispatch and a staggered 30-minute schedule:

```yaml
on:
  workflow_dispatch:
  schedule:
    - cron: '17,47 * * * *'
concurrency:
  group: branchquilt-pages
  cancel-in-progress: false
```

This is a trigger fragment, not a full workflow. Integrate the complete build/deploy jobs described below and give the build a bounded job timeout slightly above the CLI deadline. GitHub scheduled workflows run from the default branch, use UTC by default, and may be delayed; schedules are not freshness guarantees. Document these operational limits and manual recovery through workflow dispatch. See [GitHub scheduled workflow behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

### Pages build and deployment


Require `pages init --mode actions|branch`; never infer a fallback publication method. Do not assume a default branch named `main`: detect it or require a configured source/deployment branch. Both modes generate outside the source worktree and publish only after validation.

**Actions mode.** Generate a reviewed workflow and configuration. Explain the repository setting the maintainer must enable. `publish` dispatches that workflow through the host API, reports its run URL, optionally waits, and prints the resulting Pages URL.

The build job checks out sufficient history for the requested analysis, sets up pinned Node/pnpm versions, installs with a frozen lockfile, builds `branchquilt` into a dedicated output directory, runs an artifact privacy/secret check, configures Pages, and uploads only that directory. If exact PR refs are required, fetch only the selected refs explicitly. Avoid persisting checkout credentials. Use the repository's lockfile-installed CLI rather than fetching an unpinned package on every run.

The deploy job depends on the successful build, uses the `github-pages` environment, and needs `pages: write` plus `id-token: write`. The build job needs `contents: read` and `pull-requests: read` for its enabled ingestion. Keep deploy permissions out of the analysis job where practical. Add concurrency control and show the deployment URL. These requirements follow [GitHub's custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Support configured default-branch pushes, manual dispatch, and scheduled full refresh. The scheduled template runs the explicit refresh pipeline for remote refs, PR metadata, reviews, and timeline observations, rather than rebuilding stale local HEAD. Install the tool from trusted pinned dependencies before analyzing target refs. Never deploy untrusted PR builds or use `pull_request_target` to execute fork code with secrets. A PR-validation workflow can test the tool without publishing. Pin third-party action revisions to reviewed immutable SHAs with human-readable version comments; resolve actual SHAs during implementation rather than inventing them in this plan.

**Branch mode.** Support enterprises where Actions is restricted. Generate a standalone report in the fixed tool-owned Git directory, then create a minimal deployment tree containing `index.html`, `.nojekyll`, and an ownership marker. Publish it to a dedicated configurable branch, defaulting to `gh-pages`, without checkout, index changes, or source-branch files. Refuse an existing branch without the ownership marker. Replace a managed deployment only with an exact observed-tip lease; concurrent movement fails instead of being overwritten. Keep the generated branch history bounded. Instruct the maintainer to select **Deploy from a branch**, that branch, and `/(root)`; configure it through the host API only when supported and authorized. External schedulers can invoke the same `publish` command with ordinary Git push credentials.

Do not share a BranchQuilt-managed deployment branch with another site. Existing sites must not be overwritten. GitHub repository visibility alone is not an adequate publication decision: review the export and the site's actual access settings before enabling deployment.

## 11. Suggested repository structure

```text
branchquilt/
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.base.json
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── SECURITY.md
├── packages/
│   ├── schema/src/{model,validation,migrations}.ts
│   ├── git/src/{refs,trees,blobs,blame,diff,process}.ts
│   ├── github/src/{client,auth,remotes,pulls,pagination,cache}.ts
│   ├── parsers/
│   │   ├── src/{registry,worker,pool,normalize}.ts
│   │   ├── src/adapters/
│   │   ├── grammars/
│   │   └── licenses/
│   ├── analysis/src/{hierarchy,identity,ownership,pr-mapping,metrics}.ts
│   ├── viewer/src/
│   │   ├── components/
│   │   ├── layout/
│   │   ├── timeline/
│   │   ├── inspector/
│   │   ├── review-queue/
│   │   ├── state/
│   │   ├── accessibility/
│   │   └── styles/
│   ├── generator/src/{single,directory,serialization,csp,manifest}.ts
│   └── cli/
│       ├── src/commands/
│       ├── src/{index,config,orchestrator,diagnostics}.ts
│       ├── config.schema.json
│       └── templates/
├── tests/
│   ├── fixtures/{languages,git-recipes,github,malicious}/
│   ├── integration/
│   ├── e2e/
│   ├── packaging/
│   └── benchmarks/
├── examples/{minimal,polyglot}/
├── docs/{architecture,configuration,parsers,privacy,pages,troubleshooting}.md
├── docs/adr/
├── scripts/{build-grammars,verify-package,benchmark}.ts
└── .github/workflows/{ci,release,example-pages}.yml
```

Git fixtures should be generated from deterministic recipes with fixed authors/dates rather than relying on opaque embedded `.git` directories. Root scripts should cover build, typecheck, lint, test, test:e2e, benchmark, pack verification, and aggregate check.

## 12. Milestones and detailed implementation tasks

Milestones are dependency gates, not calendar promises. M2 and M3 can proceed independently once M1 contracts exist; M4 requires both. Complete each gate before expanding scope.

### M0 — Feasibility and contract

- [ ] Check package-name availability; choose a publish name without changing the intended CLI semantics.
- [ ] Pin runtime/toolchain and evaluate packaged Tree-sitter WASM on Windows, macOS, and Linux.
- [ ] Prove a tiny viewer works through `file://` without network or import requests.
- [ ] Implement a Unicode span conversion experiment, nested-symbol partition test, and PR deletion example.
- [ ] Record decisions for area weights, activity versus ownership, PR mapping confidence, merge accounting, timeline provenance, and color identity.
- [ ] Prototype the shared-branch queue → scope → timeline → inspector flow with multi-contributor PRs and metadata-only events.
- [ ] Prototype paired 2D comparison with stable shared slots, absent-path markers, and explicit actual-size versus slot-capacity labels.

**Gate:** working spike and approved-in-code contracts; no unresolved blocker to offline HTML or bundled parsing.

### M1 — Local vertical slice

- [ ] Create workspace, schemas, CLI entrypoint, JSON config validation, and diagnostics.
- [ ] Discover repository, resolve refs, enumerate entries, batch-read blobs, and enforce output safety.
- [ ] Implement directory/file hierarchy, exclusions, special-entry handling, and byte metrics.
- [ ] Generate a standalone treemap with branch selector, breadcrumbs, search, and details.
- [ ] Add synchronized two-snapshot comparison, shared layout, endpoint-diff statuses, rename links, and missing-path states.
- [ ] Add selection/toggle inspector state and bounded commit history with a basic branch timeline.
- [ ] Add deterministic Git fixtures and an end-to-end build → local-file open test.

**Gate:** a packed CLI analyzes two refs without changing HEAD/index and opens a usable offline artifact.

### M2 — Symbols and contributor attribution

- [ ] Build parser registry, bounded workers, timeouts, blob cache, and normalized span validation.
- [ ] Add JS/TS and Python adapters, followed by the other required languages and per-language fixtures.
- [ ] Implement disjoint area partitioning and residual code nodes.
- [ ] Add blame ingestion, identity normalization, `.mailmap`, explicit GitHub mappings, and completeness.
- [ ] Add stable contributor palette, legend, ownership panel, and language fallback indicators.
- [ ] Implement recent commit contributor activity, merge deduplication, and separate net-endpoint scope.

**Gate:** every required language exposes valid representative symbols; ownership totals and nested weights pass invariants.

### M3 — GitHub PR ingestion

- [ ] Implement host-bound auth and remote parsing without persisting credentials.
- [ ] Add PR listing/detail/file pagination, labels, state filters, bounds, freshness, and rate-limit handling.
- [ ] Implement explicit PR/ref fetching and local merge-base diffs with rename/binary handling.
- [ ] Normalize API-only changes and expose missing patches, truncated results, missing objects, and shallow history.
- [ ] Ingest bounded PR timelines, review requests/submissions/dismissals, and observed revision pairs with provenance and explicit permission diagnostics.
- [ ] Add recorded API fixtures for forks, deleted authors, 403/404/429/5xx, pagination, and updated labels.

**Gate:** deterministic PR records with exactly one author and honest completeness for every failure mode.

### M4 — PR-to-code mapping and interactive groups

- [ ] Map old/new ranges to exact endpoint symbols; preserve deleted entries.
- [ ] Add exact/file-only/unmapped states and conservative cross-snapshot association.
- [ ] Build many-to-many indexes and interval-union aggregations.
- [ ] Implement PR selection, virtual groups, overlap badges, multi-selection, and exact-head view.
- [ ] Implement the linked timeline, range brush, current-versus-recorded-revision scope, and typed inspector tabs/actions.
- [ ] Add explainable review queues, explicit local checkpoints, storage fallback, and updates-since-checkpoint handling.
- [ ] Add animated focus/hover tooltips, pinned metadata panel, labels, and reduced-motion support.

**Gate:** overlapping PRs, deletion-only changes, renames, and later-edited merged PRs render without false attribution.

### M5 — Scale, security, and export

- [ ] Implement cache lifecycle, credential partitioning, corruption recovery, and force-push invalidation.
- [ ] Add visible-subtree rendering, virtual lists, compact indexes, cancellation, and benchmark reports.
- [ ] Complete single/directory bundles, CSP, atomic writes, privacy profiles, and export manifests.
- [ ] Run injection, traversal, symlink, secret-leak, offline-browser, and accessibility checks.
- [ ] Verify reproducible builds with fixed input responses/timestamp.

**Gate:** benchmark results are recorded; all security and data-integrity acceptance tests pass.

### M6 — Distribution, Pages, and release readiness

- [ ] Finish init/doctor/serve/cache/pages/refresh commands and actionable help/error text.
- [ ] Add noninteractive refresh, portable repository locking, total deadlines, structured reports, cache overrides, and last-good-output promotion.
- [ ] Provide scheduled Pages and host scheduler templates with remote-ref refresh, credential setup, concurrency, freshness, and failure guidance.
- [ ] Generate and validate a Pages workflow with separated permissions and correct artifact path.
- [ ] Test tarball installation/execution in clean OS matrix environments with no grammar compiler.
- [ ] Write quickstart, config reference, parser matrix, metric definitions, auth, privacy, Pages, and troubleshooting docs.
- [ ] Generate small and polyglot example artifacts; document actual limitations and benchmark environment.
- [ ] Produce package tarball, changelog, license inventory, and release checklist for maintainer review.

**Gate:** a new user can install, build locally, inspect PR scope, and follow the Pages guide without undocumented steps.

## 13. Testing strategy

**Unit/property tests:** schema/reference validation; area conservation; line interval unions; author identity separation; palette stability; config precedence; path safety; URL sanitization; Unicode offsets; diff parsing; API pagination; stale-cache semantics. Property-based tests should verify that nesting never creates extra bytes or changed-line counts.

**Parser tests:** snapshot normalized symbols and spans against hand-checked source fixtures for each language. Include parser errors and timeouts. Avoid snapshots that merely restate the parser's raw output without semantic assertions.

**Git integration:** build temporary repositories containing multiple branches, merges, shallow boundaries, renames, deletions, symlinks, submodules, LFS pointers, Unicode/newline filenames, dirty worktrees, empty history, and detached HEAD. Assert before/after HEAD, index, local Git configuration, and worktree status are unchanged except requested output/config files.

**PR integration:** recorded responses and local diff fixtures cover multi-author commits under one PR author, two PRs by the same author, overlapping PRs, absent patches, more than 100 files, the 3,000-file cap, force pushes, missing fork heads, stale labels, and unauthorized cache access. Required-mode errors and optional-mode diagnostics must differ predictably.

**Browser end-to-end:** Chromium, Firefox, and WebKit tests for single-file local opening and directory HTTP preview. Block network during local-file tests; assert zero attempted external requests. Exercise branch selection, drilldown, breadcrumbs, search, keyboard navigation, tooltip dismissal, touch-friendly panel access, label filters, PR overlap, URL fragments, and reduced motion. Run automated accessibility checks and a manual keyboard/screen-reader checklist.

**Security/package/CI:** hostile metadata must remain inert text; canary tokens/emails/absolute paths must never appear in exported assets. Verify allowed source inclusion separately. Install the packed tarball in a clean fixture repo on all three OS families. CI runs typecheck, lint, unit/integration tests, browser checks, package smoke tests, and bounded performance regression checks. Live authenticated GitHub tests are opt-in and never required for ordinary contributors.

**Shared-branch/timeline tests:** use a fixture with at least five contributors sharing one branch, 30 catalog branches, and 50 PRs, including multi-author PRs, direct commits, merges, reverts, overlapping scopes, force pushes, review dismissals, and old reviewed SHAs. Assert commit deduplication, activity versus net-change distinction, timestamp/topology disagreement, unavailable historical revisions, truncation badges, and no fabricated branch birth dates. Verify all object types open/toggle the inspector, panel closing restores focus, and selection remains synchronized across queue/map/timeline. Test blocked browser storage, explicit checkpoint updates, and metadata-only events with no code delta. Record whether three representative teammates can find recent contributors, review targets, and overlapping work in under two minutes; report usability findings separately from automated correctness tests.

**Scheduled-operation tests:** run two competing processes; require one writer and an explicit locked result. Exercise repeated identical runs, ref movement, PR metadata-only changes, expired auth, throttling beyond deadline, deleted branches, stale/absent caches, interrupted staging/promotion, and owner-death lock recovery. Verify no prompt/browser/server can open in noninteractive mode, failed required refresh leaves the last good artifact intact, no successful validation means no deploy, freshness does not advance after a failed source refresh, and generated scheduler templates invoke only configured remote refs. Validate single-file and directory replacement behavior on all supported operating systems.

## 14. Release acceptance criteria

| ID | Observable pass condition |
|---|---|
| A01 | Installed and one-time pnpm execution both produce an atlas in an existing Git repo. |
| A02 | Two snapshots have visible refs/SHAs and synchronized 2D comparison with stable slots, explicit capacity labels, accurate actual sizes, change statuses, and absent-path states; each drills into its own symbol hierarchy. |
| A03 | No build changes checkout/index/source; dirty work is explicitly excluded. |
| A04 | Every required language passes representative class/type/function fixtures; unsupported files remain visible. |
| A05 | Nested symbol weights conserve file bytes; residual code, Unicode, and empty files behave correctly. |
| A06 | Blame ownership uses normalized identities, stable colors, correct totals, and visible unknown/incomplete attribution. |
| A07 | Each PR has one author/color identity; commit contributors remain separate; same-author PRs have distinct badges. |
| A08 | PR grouping highlights disjoint affected nodes and exposes all overlapping PR relationships. |
| A09 | Additions, deletions, binary files, renames, and historical changes display correct mapping quality without invented symbols. |
| A10 | Tooltip and pinned panel show PR labels/metadata using mouse, keyboard, and touch, with reduced motion respected. |
| A11 | Single HTML works offline via file://; directory mode works under a non-root Pages path. |
| A12 | API bounds, pagination failures, unavailable commits, and stale data produce visible, testable completeness states. |
| A13 | No credentials/emails/source bodies/absolute roots leak under default export; hostile strings execute no code. |
| A14 | Warm builds reuse cache; changed grammar/mailmap/ref/PR metadata invalidates only appropriate layers. |
| A15 | Benchmarks meet agreed measured budgets or release notes explicitly identify and resolve the variance before release. |
| A16 | Generated Pages workflow passes validation and a maintainer-authorized demo deployment serves the artifact, or is marked externally unverified if deployment was not authorized. |
| A17 | Clean tarball installation works on Linux, macOS, and Windows without native grammar compilation. |
| A18 | Required checks pass; documentation explains caps, privacy, attribution semantics, and remaining limitations. |
| A19 | Recent multi-contributor activity, PR submitter identity, and blame ownership remain distinct; merges/shared commits are not double-counted. |
| A20 | A bounded branch/PR timeline exposes events, parents, provenance, and missing history; range activity and exact endpoint changes remain distinct. |
| A21 | Every selectable object opens/toggles an accessible inspector with relevant facts, history, scope, and legends; navigation stays synchronized. |
| A22 | Review queues show explicit relevance reasons, reviewed SHA, and local checkpoint semantics without claiming merge readiness or shared review completion. |
| A23 | The 30-branch/50-PR shared-work fixture remains usable with virtualized queues and bounded analysis; recorded usability findings inform the default flow. |
| A24 | One noninteractive refresh cycle retrieves configured remote refs and review/timeline data, produces the artifact, and exits with documented results without changing checkout/index/local branches. |
| A25 | Concurrent, failed, timed-out, and interrupted runs preserve the last good output, release/recover locks safely, and never deploy an invalid artifact. |
| A26 | Repeat runs reuse caches, detect metadata-only changes, report content digests/freshness, and do not duplicate observed timeline history. |
| A27 | Scheduled Pages and host scheduler templates are validated; stale-data indicators and failure reports remain truthful. No scheduler is installed or enabled by implementation alone. |

Implementation is complete when A01–A15 and A17–A27 pass and A16's workflow validation passes. A live deployment is a separate authorized verification, never silently claimed. Return a concise delivery report with changed components, tests actually run, benchmark measurements, artifact locations, and any externally unverified steps.

## 15. Main risks and chosen mitigations

| Risk | Planned response |
|---|---|
| Very large history makes blame slow | Separate progress/cache/concurrency; explicit ownership-off mode; report completeness |
| PR spans do not match the selected branch | Exact endpoint views; file-only/unmapped status; no speculative line projection |
| Nested symbols inflate apparent size | Disjoint byte partition with residual nodes and conservation tests |
| Large contributor sets exceed useful colors | Stable palette plus labels/patterns, filtering, and detail legends |
| Shared comparison slots can look like actual file size | Explicit capacity legend, actual byte counts/deltas, and exact single-snapshot mode |
| Grammar/runtime incompatibility | Bundle tested version pairs, licenses, and package-level smoke tests |
| Private structure becomes a public artifact | Minimal export defaults, anonymized option, export report, deliberate deployment setup |
| Static artifact becomes too large | Deduplication, size warnings, directory mode, bounded branch/PR selection |
| Optional GitHub failure looks like an empty repo | Explicit unavailable/partial/stale status and required mode |

The central success condition is that a teammate can quickly identify recent contributions, their review targets, and overlapping work on a busy shared branch, while understanding the selected snapshot/time window, what colors measure, and where history or scope is uncertain.

## 16. Reference review and naming decision

Reviewed September 29, 2026. This is a documentation and selected-source review, not a runtime audit. Reference projects inform design; do not install their skills, execute their scripts, or inherit their agent instructions as part of this project.

| Reference | Observed approach | Decision for BranchQuilt |
|---|---|---|
| [githubocto/repo-visualizer](https://github.com/githubocto/repo-visualizer) | GitHub Action producing a circle-packed SVG with extension colors, exclusions, and depth controls. Its source caps visual weights and rendered nodes. The repository is archived. | Keep simple artifact generation and clear legends. Prefer rectangular treemaps for space-efficient comparison; preserve honest size metrics and disclose analysis/render limits. |
| [cathrynlavery/repo-atlas](https://github.com/cathrynlavery/repo-atlas) | Claude Code skill for persistent repository documentation. Its Python generator writes a directory map, heuristic entrypoints, file statistics, and a Git changelog, with a freshness-check mode. | Borrow the emphasis on navigable context and regeneration. Keep deterministic analysis separate from authored explanations; do not equate language-name heuristics with AST support or add documentation generation to v1. |

The visualizer entrypoint sets local Git identity and stages its output; disabling push does not make that path read-only. BranchQuilt must leave Git configuration and index unchanged during builds. Source reviewed at [a999615](https://github.com/githubocto/repo-visualizer/tree/a999615bdab757559bf94bda1fe6eef232765f85), particularly `src/Tree.tsx`, `src/process-dir.js`, `src/index.jsx`, and `action.yml`.

Repo Atlas's generator scans the working filesystem and uses filename/content markers for entrypoints. BranchQuilt instead reads immutable Git blobs and parses symbols. Its documented language list should not be interpreted as evidence of equivalent symbol extraction. Source reviewed at [4fa8b99](https://github.com/cathrynlavery/repo-atlas/blob/4fa8b991a7fe49edccfefae95de3e90287769fff/scripts/generate_atlas.py).

The product distinction is evidence-backed exploration of branch snapshots, contributor ownership, and overlapping PR scope down to symbols in a portable HTML artifact. Keep the first-use path local-only and simple. Optional README SVG export, authored architectural notes, entrypoint hints, and freshness-check commands belong in the backlog, not the initial feature contract. If code is later reused, review and preserve its license notices; this review copies no implementation.

### Working name: BranchQuilt

“Branch” signals Git snapshots; “Quilt” suggests a map assembled from code regions and contributor patches. Use display name **BranchQuilt**, npm package/bin `branchquilt`, and default artifact folder `branchquilt/`. It does not tie the product to 3D or imply semantic dependency analysis.

| Candidate | Preliminary evidence | Decision |
|---|---|---|
| `repo-atlas` | Exact npm metadata request returned 404, but the supplied project and many GitHub repository-name results already use it. | Reject: confusing overlap even without an exact npm package. |
| `repoloom` | npm returned an existing package and GitHub returned matching repositories. | Reject. |
| `repotessera` | Exact npm metadata returned 404; GitHub repository-name search returned zero results. | Reserve as an alternative; less immediately understandable. |
| `branchquilt` | Exact npm metadata returned 404; GitHub repository-name search returned zero results; quoted web search surfaced no exact-name project. | Adopt as provisional working name. |

Registry evidence came from [the npm metadata endpoint](https://registry.npmjs.org/branchquilt); repository evidence came from [the GitHub search API](https://api.github.com/search/repositories?q=branchquilt+in:name&per_page=5). A 404/search miss is not a reservation or a guarantee of publishability. Recheck npm exact names and punctuation-similar names before release, as well as GitHub and general web usage. If necessary use a scope actually controlled by the maintainer; do not invent an organization or publish to reserve a name. No registry publication or name reservation has been performed.

## 17. Parked backlog

**3D branch layers are parked.** Preserve exploratory notes in `docs/backlog/3d-branch-layers.md`, but do not implement their old M7/B-series proposals, add Three.js, expose 3D flags, or spend M0 effort on them. Revisit only after an explicit priority change and evidence that a prototype improves task success or completion time over paired 2D maps. Compare locating cross-branch changes, finding missing files, and understanding PR scope; account for occlusion, accessibility, bundle size, and device coverage.

Other optional future work: README SVG export, human-authored architectural annotations, heuristic entrypoint hints, and a freshness-check command. None changes the active M0–M6 acceptance contract.
