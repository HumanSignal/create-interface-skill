<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Spatial regions & ranking

### Spatial region persistence (CRITICAL)

Underscore-prefixed fields (`_start`, `_end`, `_x`, `_y`, `_width`, `_height`, etc.) are **in-memory ShellRegion state only**. They are **not** persisted and must **never** appear in `AnnotationResult.value`.

- `getResults` must explicitly map region fields to Label Studio value keys: `_start` → `value.start`, `_end` → `value.end`, `_text` → `value.text`, `_x` → `value.x`, and so on.
- Returning only `value.labels` (or copying a stale `region._value`) for span/box regions will fail save validation and causes regions to jump after Submit.
- `parseResults` must copy `value.start` / `value.end` / `value.x` / etc. back onto underscore-prefixed region fields for rendering.
- Save validation runs a spatial serialization check on NER and bbox interfaces before the interface can be saved.

### ShellRegion shape

```
{ id, type, labels: string[], colors: string[], score: number|null,
  hidden: boolean, locked: boolean, selected: boolean,
  parentId: string|null, text: string }
```

### Region Visibility and Lock State (CRITICAL)

The editor shell owns region visibility and locking. Generated screens must honor these fields every render:

- `region.hidden === true` means the shell's eye/hide controls have hidden that region. Do not render its visual mark, box, mask, span, connector, or overlay on the canvas.
- Prefer `props.visibleRegions` for canvas rendering, hit-testing, keyboard navigation, hover/selection visuals, and local selection sync. The shell already excludes hidden regions.
- Alternatively: `const visibleRegions = (props.regions || []).filter(r => !r.hidden);`
- Set `data-region-id={region.id}` on each region-owned DOM overlay so relation connectors and hidden-region sync can find anchors.
- For audio/time-span interfaces that paint on canvas or SVG: also render positioned DOM overlays from `_start`/`_end` with `data-region-id={region.id}`. Canvas fill alone is not enough for shell relation connectors (FIT-2247).
- Gate `getResults` on `type` / positional fields (`_x`… or `_start`/`_end`) — never custom tags like `_kind`. On mixed image+audio screens, keep image as `rectanglelabels` and audio as `labels`+`start`/`end` seconds (do not fake audio as percent boxes).
- Do NOT look up selection/highlight overlays from unfiltered `props.regions` — resolve them from `props.visibleRegions` (or a filtered `visibleRegions`) so a hidden selected region leaves no stale canvas chrome.
- Do NOT filter hidden regions out of `getResults`, `parseResults`, or saved state. Hidden is a view state, not deletion. Only `deleteRegion` removes a region.
- If a hidden region is selected in the side panel, keep details/outliner behavior intact, but the canvas representation must remain hidden.
- `region.locked === true` means the region can render, but drag/edit/delete controls should be disabled or ignored.

### Ctrl/Cmd multi-select + group move (FIT-2748 / FIT-2827)

- Call `props.selectRegion(id, { additive: event.ctrlKey || event.metaKey })` **once** per gesture — typically in `onPointerDown` / `startEditing`. **Never** also call `selectRegion` from `onClick` on the same box; the click fires after pointerdown and an additive toggle undoes the multi-select.
- On Ctrl/Cmd+click for move handles: select/toggle only; do not start a drag (`if (mode === "move" && additive) return`).
- On plain pointerdown on an already-selected box: move **all** currently selected unlocked regions together (read `props.selectedRegionIds` before the exclusive select, or rely on the shell preserving multi-selection when re-clicking a selected member).

### Select after create (FIT-2909)

- After `addRegion(region)` from a user drawing gesture, call `props.selectRegion(region.id)` when `props.settings?.selectAfterCreate` is true, so the host's "Select region after creating it" labeling setting is honored. Leave selection unchanged when it is false.

### Editing vector, polyline and keypoint regions (FIT-2940)

Shapes made of points (polylines / `vectorlabels`, polygons, keypoints) must be editable **by default** — the shell has no vertex editor; the screen owns it.
- Selecting a region (pointerdown on its stroke or a point, via `selectRegion`) shows vertex handles for every point of that region.
- Dragging a vertex handle moves that point; dragging the stroke/body moves the whole shape; both preview locally and commit with one `updateRegion` on pointer-up (new `points` array, never mutated in place).
- Keypoints are draggable the same way. Give handles a hit target of at least ~8px and `data-region-id`.
- Skip handles and ignore drags when `region.locked` or `props.readOnly` is true, and do not render handles for hidden regions.
- Adding/removing vertices (e.g. double-click a segment to insert, Alt+click to remove) is encouraged but must not replace plain drag editing.
- Finish an in-progress polyline with Enter or a React `onDoubleClick` handler — never by reading `event.detail` on pointer events (`PointerEvent.detail` is always `0` in Chrome, so the line can never be finished). Drop the duplicate trailing vertex the double-click's second click adds.

### AnnotationResult shape (returned by getResults)

```
{ id, from_name, to_name, type, value: any, origin: "manual"|"prediction"|"suggestion" }
```

`value` uses Label Studio result keys only (`start`, `end`, `text`, `labels`, `x`, `y`, `width`, `height`, type-specific `*labels` keys). Never put underscore-prefixed keys inside `value`.

### Ranking / ordering interfaces (CRITICAL)

When the interface collects a ranked or reordered list (images, items, URLs):

- **One ranking region only** — use a **stable string id** (e.g. `'ranking-main'`). **Never** `'ranking-' + Date.now()` or a new id on each reorder.
- **Never** keep item order in `useState` (`setOrder`, `setItems`, `setRankedUrls`, etc.) — duplicate rows appear on drag.
- **Never** `useEffect` that copies `regions` / `_rankedUrls` into local state.
- **Render the list only from** `rankingRegion._rankedUrls` (derived each render). Drag handlers call `updateRegion` only.
- On mount, `useEffect` seeds **once** when no region with that id exists. Include `regions` in deps.
- `getResults` must return **at most one** result for the ranking `from_name`.

```js
const RANKING_REGION_ID = 'ranking-main';
const images = getField(task.data, params.imagesField ?? 'images') || [];

useEffect(() => {
  if ((regions || []).some((r) => r.id === RANKING_REGION_ID)) return;
  addRegion({
    id: RANKING_REGION_ID,
    type: 'labels',
    text: 'Image ranking',
    labels: [],
    _rankedUrls: [...images],
  });
}, [regions, images, addRegion]);

const rankingRegion = (regions || []).find((r) => r.id === RANKING_REGION_ID);
const orderedUrls = rankingRegion?._rankedUrls ?? images;

function moveItem(fromIndex, toIndex) {
  if (readOnly || fromIndex === toIndex) return;
  const next = [...orderedUrls];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  updateRegion(RANKING_REGION_ID, { _rankedUrls: next });
}

// JSX: orderedUrls.map((url, index) => <Card key={url + ':' + index} ... />)
// useState is OK for draggedIndex / dragOverIndex only — NOT for the item list itself.
```

**outputSchema + getResults for ranking** — use the **pass-through** shape (same as multi-select image URLs). Prefer explicit `items: { type: "string" }`; bare `{ type: "array" }` is also accepted at submit.

```js
outputSchema: {
  type: "object",
  properties: {
    ranking: {
      type: "array",
      items: { type: "string" },
      description: "Ordered image URLs, most relevant first",
    },
  },
  required: ["ranking"],
},

function getResults(regions, relations) {
  const rankingRegion = (regions || []).find((r) => r.id === RANKING_REGION_ID);
  const orderedUrls = rankingRegion?._rankedUrls ?? [];
  const regionResults = orderedUrls.length ? [{
    id: rankingRegion.id,
    from_name: "ranking",
    to_name: "images",
    type: "labels",
    value: orderedUrls,
    origin: "manual",
  }] : [];
  const relationResults = (relations || [])
    .filter((rel) => rel.node1Id && rel.node2Id)
    .map((rel) => ({
      id: rel.id,
      from_name: "",
      to_name: "",
      type: "relation",
      value: {},
      from_id: rel.node1Id,
      to_id: rel.node2Id,
      direction: rel.direction,
      labels: rel.labels || [],
    }));
  return [...regionResults, ...relationResults];
}
```

### Brush vs Polygon (CRITICAL — FIT-2898)

A toolbar tool labeled **Brush** (paint / freehand mask / semantic-segmentation brush) is **not** a polygon tool.

- Brush MUST persist as **`brushlabels`** — full-pixel RLE (`_rle`, `_originalWidth`, `_originalHeight`, `format: "rle"`) or bbox mask fields (`x`/`y`/`width`/`height` + `brushlabels`).
- **Never** implement Brush as `polygonlabels`, freehand vertex sampling, circular polygon approximation, or "one polygon segment for the entire stroke".
- **Polygon** is a separate tool: click vertices → close shape → `polygonlabels` with `points`.
- Canonical brush example: `services/lse/web/libs/editor-shell/examples/shark-brush-interface.jsx` (see also reference § Brush / RLE mask performance, FIT-2030).
