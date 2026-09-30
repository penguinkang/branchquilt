# Parser and attribution support — Phase 2

The package bundles Tree-sitter grammar WASM from `tree-sitter-wasms@0.1.13` and uses `web-tree-sitter@0.25.10`. Both are pinned. Parsing runs in a reusable worker with a default two-second per-file deadline; a timed-out worker is terminated and replaced. One task runs at a time in this alpha. No compiler or grammar download is needed at runtime.

| Language | Included declaration forms |
|---|---|
| JavaScript / JSX | Classes, methods, functions, named variables assigned arrow/function expressions |
| TypeScript / TSX | JavaScript forms plus interfaces and enums |
| Python | Classes and function definitions, including nested definitions |
| Go | Type declarations, functions and receiver methods (lexical position preserved) |
| Rust | Structs, enums, traits, impl containers and functions |
| Java | Classes, interfaces, enums, methods and constructors |
| C# | Classes, structs, interfaces, enums, methods and constructors |
| C / C++ | Function definitions, classes/structs and enums; no preprocessing or semantic resolution |

`.h` selects C and `.hpp` selects C++; ambiguous extensions need future override configuration. Unsupported text formats such as Markdown stay visible and can receive blame ownership. Binary data, LFS pointers, invalid UTF-8, symlinks, submodules, and files above the configured byte limit are not parsed/blamed. Parsing errors yield partial status, invalid declarations are omitted, and files remain visible.

The worker converts UTF-16 indexes to UTF-8 byte offsets. Symbols preserve lexical nesting and inclusive source ranges; area is partitioned into children and “Other code” without adding parent and child spans twice. Same-line declarations can have overlapping inclusive line ownership even though byte areas are disjoint; never sum symbol ownership to obtain file totals.

Adapters are currently defined by the extension registry and normalized syntax-node mapping in `packages/parsers/src`. Add grammar assets and license notices in the build script, extend that registry/mapping, and provide semantic fixtures. External plugin loading, explicit extension overrides, richer declaration signatures, and semantic linking of methods/types remain future work.

## Identity and ownership

Each snapshot's committed `.mailmap` is used in an isolated empty working-tree context. Uncommitted `.mailmap` edits and local extra mailmap files do not affect results. Optional `ownership.identityMappings` supplies explicit `{fromEmail,toEmail,name}` aliases. Emails are used for local normalization and hashed IDs but are not exported as identity fields. Same display names are not automatically merged. GitHub identity linking is deferred.

Blame counts all physical lines, including comments and whitespace. Shallow-boundary lines are unknown, and partial/unavailable status is retained. Symbol ownership is restricted to its source line range. Activity remains a commit/file signal and is not inferred at function level. Mixed regions use a neutral fill; contributor selection highlights matching regions and the legend lists names.

## Cache and limits

Private local parse/blame metadata is cached below the Git common directory. Parse keys include blob, grammar digest, worker digest and runtime version. Blame keys include snapshot, path, committed mailmap and explicit mappings. `--no-cache` disables reads/writes. `--ownership off` skips blame. The alpha does not yet implement LRU cache eviction, parallel worker pools, bounded history-wide symbol mapping, or the final release's performance/security budgets.
