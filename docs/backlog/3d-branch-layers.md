# Backlog — 3D branch-layer exploration

**Status: PARKED. Not scheduled or authorized by the active implementation prompt.**

Build and validate 2D branch comparison first. Do not add Three.js, GPU infrastructure, 3D configuration, prototypes, or test requirements to M0–M6. The material below preserves exploratory design notes, not active implementation requirements. The former M7 and B-series gates are historical proposals only.

Revisit only after explicit reprioritization and evidence that users need to compare more than two branches spatially. First test whether a prototype improves task success or completion time over synchronized 2D maps for locating cross-branch changes, inspecting PR scope, and finding absent files. Visual appeal alone is not a sufficient reason to ship it. Account for occlusion, accessibility, offline bundle size, and device support before scheduling work.

### Optional 3D branch-layer view

Use a 2.5D model: each selected branch snapshot occupies a horizontal treemap plane at a distinct Z position. X/Y encode code structure; Z encodes branch-layer order only, not time, ancestry, divergence, or code quantity. Show ref names and commit SHAs beside layers. Start with two to five branches and a restrained orthographic/isometric camera. Flat rectangles on separated planes are sufficient; building-height extrusion is deferred because it would compete with the branch axis.

**Comparison layout.** Independent treemaps move files when sizes change and make cross-branch comparison difficult. For aligned comparison, construct a union directory/file hierarchy across selected snapshots and assign each path the maximum byte size observed across those snapshots. Sum those per-file maxima to size directories, then compute one shared deterministic X/Y layout for all layers. Render each existing file inside its common slot; show actual snapshot bytes in its panel and a labeled occupancy indicator. Empty slots mean the path is absent on that branch. Explain that slot area represents comparison capacity, not that branch's exact size. Preserve exact per-snapshot areas in the ordinary 2D view.

Align directory/file paths first. A shared path is a comparison key, not evidence of common authorship, unchanged contents, or continuous file identity. Use blob equality to mark identical contents. Show verified renames as explicit links; never silently fuse paths. Symbol alignment across edited snapshots is not required for M7: selecting a file opens its accurate snapshot-specific symbol view. The existing exact/file-only/unmapped PR rules still apply.

**Interactions.** Provide orbit, pan, zoom, Reset camera, top/front/isometric presets, layer spacing, reorder, visibility, and isolate-layer controls. All controls must have keyboard-accessible HTML equivalents. Selecting a file highlights its matching path on visible layers; selecting a PR highlights its mapped effects on each layer and retains mapping-quality badges. Draw cross-layer connectors only for the current selection, with labels explaining path matches versus verified renames. Do not draw a whole-repository web of edges. Missing files have explicit ghost-slot markers when selected. Branch ordering is user-controlled and does not imply a Git ancestry graph.

Use opaque active-layer geometry, outlines, and isolate/hide controls to manage occlusion; avoid depending on stacked transparency. Raycast only visible/selectable geometry, distinguish dragging from clicking, and never select through an opaque foreground layer accidentally. Synchronize selection, filters, colors, PR panels, and breadcrumbs across 2D/3D. Preserve semantic state when switching views; add only validated bounded camera/layer settings to URL fragments. Keep tooltips as safe HTML overlays, and offer the same metadata in the accessible tree/list. Disable automatic camera motion under reduced-motion settings.

**Rendering architecture.** Add `viewer/src/renderers/{canvas2d,webgl3d}` behind a shared renderer interface for mount, resize, scene updates, selection, picking, and dispose. Use Three.js with its WebGL renderer; the current renderer requires WebGL 2, so feature-detect it and provide a clear 2D fallback. Batch file rectangles with instanced geometry, render only visible hierarchy levels, limit labels to focused/selected nodes, cap device pixel ratio, and render on demand when idle. See the official [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html) and [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) references.

Keep the normalized analysis schema renderer-independent. Derive a comparison scene containing layout slot IDs, bounds, snapshot-to-node references, missing-slot flags, and selection-only links. Cache this by selected snapshot IDs, layout version, and metric. Do not write GPU buffers or camera state into canonical source metrics. Dispose geometries, materials, render targets, listeners, and animation loops on teardown. Handle context loss/restoration and preserve selection when falling back; follow [WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).

**Static packaging.** Support `viewer.include3D` (default false) and `viewer.defaultView` (`2d` by default; `3d` requires inclusion). A 3D-enabled standalone HTML must embed the renderer and work via file:// without module imports, remote assets, or new network permissions. Initialize WebGL only when the user opens 3D. Directory mode may load a bundled same-origin renderer chunk. Include renderer bytes in artifact size warnings. Unsupported/disabled WebGL, software-rendering limits, or repeated context loss must leave the complete 2D experience usable.

**Feasibility and performance gate.** Benchmark two and five layers, including a scene with 50,000 visible file instances total, on documented hardware/browser combinations. Initial targets are p95 camera frame time ≤33 ms and selection feedback ≤100 ms after scene load. Record GPU/browser, scene counts, resource estimates, initialization time, and added artifact size. Reduce detail or visible layers with a visible notice when a device cannot meet the budget; never drop underlying analysis data. The M0 prototype should demonstrate a real comparison benefit through a small fixture containing added, removed, renamed, and modified files before investing in M7.

### M7 — Optional WebGL branch comparison

- [ ] Implement the union-path comparison layout with stable shared slots, missing-file markers, and honest area labels.
- [ ] Add the shared renderer interface, instanced WebGL geometry, picking, level of detail, and resource disposal.
- [ ] Implement camera/layer controls, selected-path links, synchronized PR highlighting, and accessible HTML controls.
- [ ] Add standalone/directory 3D packaging, feature detection, context-loss recovery, and state-preserving 2D fallback.
- [ ] Test real branch fixtures with additions, removals, renames, identical blobs, conflicting changes, and uncertain PR mapping.
- [ ] Benchmark two/five layers, measure artifact overhead, and document supported devices and practical limits.

**Gate:** 3D criteria B01–B05 pass. Do not claim 3D support from the M0 prototype alone.

### Additional acceptance criteria for the optional 3D release

| ID | Observable pass condition |
|---|---|
| B01 | Two to five branch planes have labeled refs/SHAs and identical X/Y slots for matching paths, with absent paths visibly distinguishable. |
| B02 | Selection, contributor/PR colors, filters, and PR mapping confidence agree between 2D and 3D; selected-only links do not imply unverified history. |
| B03 | Camera/layer controls, accessible list, metadata panel, reduced motion, and state-preserving fallback work without requiring pointer-only interaction. |
| B04 | 3D-enabled single-file and Pages artifacts work offline/as hosted; unavailable or lost WebGL context causes no loss of access to the code map. |
| B05 | Recorded two/five-layer benchmarks meet the agreed targets or an explicitly documented lower-detail mode meets them; artifact overhead and tested GPU coverage are published. |
