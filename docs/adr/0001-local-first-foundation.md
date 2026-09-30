# ADR 0001: Local-first incremental implementation

Phase 1 ships an offline directory/file explorer before adding AST, GitHub, and scheduling. The core uses strict TypeScript modules under the planned package boundaries, bundled into one executable package. Internal packages remain source modules until independent builds are useful. No target-repository code is executed.

The first viewer uses D3 treemap layout with HTML controls and one visible hierarchy level, avoiding a framework dependency and preserving keyboard access. Shared maximum-byte slots align two snapshots; actual byte sizes remain separate. This first implementation is a bounded preview, not the final Canvas renderer or full-scale release.

Committed tree metadata provides file sizes without loading source or following symlinks. History is capped and commit scopes are file-level; merge commits are labeled first-parent integration and excluded from contributor colors. Symbol parsing and blame are deferred to Phase 2, and the UI says so.

The artifact embeds a compiled IIFE and JSON escaped for script contexts. It makes no network requests. Script execution is restricted by a CSP hash; inline styles are allowed for treemap geometry. Unknown capabilities and configuration are rejected rather than silently advertised. Public schema 1.0 remains a future contract; this alpha uses schema 0.1.0.

The current implementation is a vertical slice within M0/M1, not a claim that their full gates or v1 acceptance criteria are met. Parser WASM/Unicode feasibility, additional operating systems, empty-repository UX, history graph layout, and the larger-scale benchmarks remain explicit work.
