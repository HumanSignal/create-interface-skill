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
- Delete is shell-owned too: the Info panel header already has a Delete control for the selected region. Do **not** render a "Delete polygon" / "Delete box" / "Delete region" / trash button inside `InfoViewer` or `OutlinerItem` (FIT-2931). Canvas keyboard/gesture deletes go through `deleteRegion`; per-point actions like removing one vertex are fine.

### Ctrl/Cmd multi-select + group move (FIT-2748 / FIT-2827)

- Call `props.selectRegion(id, { additive: event.ctrlKey || event.metaKey })` **once** per gesture — typically in `onPointerDown` / `startEditing`. **Never** also call `selectRegion` from `onClick` on the same box; the click fires after pointerdown and an additive toggle undoes the multi-select.
- On Ctrl/Cmd+click for move handles: select/toggle only; do not start a drag (`if (mode === "move" && additive) return`).
- On plain pointerdown on an already-selected box: move **all** currently selected unlocked regions together (read `props.selectedRegionIds` before the exclusive select, or rely on the shell preserving multi-selection when re-clicking a selected member).

### Select after create (FIT-2909)

- After `addRegion(region)` from a user drawing gesture, call `props.selectRegion(region.id)` when `props.settings?.selectAfterCreate` is true, so the host's "Select region after creating it" labeling setting is honored. Leave selection unchanged when it is false.

### Editing vector, polyline and keypoint regions (FIT-2940)

Shapes made of points (polylines / `vectorlabels`, polygons, keypoints) must be editable **by default** — the shell has no vertex editor; the screen owns it. Click-to-select alone is **not** editing: a selected region shows vertex handles, and annotators must be able to drag a point, drag the whole shape, and Alt+click a point to remove it. (With Interface Components on, `ImageCanvas` already does this — use it instead of hand-rolling.)

Copy these helpers unchanged (above the screen component), then wire them as shown below:

```js
// FIT-2940 point-editing helpers — copy unchanged.
const clampPct = (n) => Math.min(100, Math.max(0, Number(n) || 0));

/** Client px -> % of the element that exactly covers the image / video frame. */
function toPercentIn(el, clientX, clientY) {
  const box = el?.getBoundingClientRect?.();
  if (!box || !box.width || !box.height) return null;
  return {
    x: clampPct(((clientX - box.left) / box.width) * 100),
    y: clampPct(((clientY - box.top) / box.height) * 100),
  };
}

/** New array; the moved point keeps its other fields (vector id / prevPointId / isBezier). */
function movePoint(points, index, x, y) {
  return (points || []).map((p, i) => (i === index ? { ...p, x: clampPct(x), y: clampPct(y) } : p));
}

/** Moves every point by (dx, dy), clamped as a whole so the shape keeps its form at the edge. */
function translatePoints(points, dx, dy) {
  const list = points || [];
  if (!list.length) return list;
  const xs = list.map((p) => p.x);
  const ys = list.map((p) => p.y);
  const mx = Math.min(100 - Math.max(...xs), Math.max(-Math.min(...xs), dx));
  const my = Math.min(100 - Math.max(...ys), Math.max(-Math.min(...ys), dy));
  return list.map((p) => ({ ...p, x: p.x + mx, y: p.y + my }));
}

/** Removes one point (never below minPoints) and relinks vector prevPointId chains. */
function removePoint(points, index, minPoints) {
  const list = points || [];
  const removed = list[index];
  if (!removed || list.length <= (minPoints ?? 2)) return list;
  return list
    .filter((_, i) => i !== index)
    .map((p) =>
      removed.id != null && p.prevPointId === removed.id ? { ...p, prevPointId: removed.prevPointId ?? null } : p,
    );
}

/**
 * Start a drag from onPointerDown. mode "vertex" moves points[index]; mode "body" moves the whole shape.
 * onPreview(points) while moving and onPreview(null) at the end; onCommit(points) ONCE on pointer-up when
 * something moved (one updateRegion per gesture = one undo step). Returns false (no drag) for locked
 * regions, read-only screens, non-primary buttons, or a pointer outside the media.
 * Only the pointer that started the drag counts (a second finger / stylus is ignored), and a release
 * outside the iframe still ends the drag: pointer capture keeps events coming, and a move with no
 * button held finishes it.
 */
function beginPointDrag(event, opts) {
  const { region, points, mode, index, readOnly, toPercent, onPreview, onCommit } = opts || {};
  if (readOnly || region?.locked || (event.button ?? 0) !== 0) return false;
  const start = toPercent(event.clientX, event.clientY);
  if (!start) return false;
  event.stopPropagation?.();
  event.preventDefault?.();
  try {
    event.currentTarget?.setPointerCapture?.(event.pointerId);
  } catch (_) {
    // capture is best-effort; the window listeners below still end the drag
  }
  const pointerId = event.pointerId;
  const original = points || [];
  let next = original;
  const listeners = {};
  const finish = (commit) => {
    window.removeEventListener("pointermove", listeners.move);
    window.removeEventListener("pointerup", listeners.up);
    window.removeEventListener("pointercancel", listeners.cancel);
    onPreview(null);
    if (commit && next !== original) onCommit(next);
  };
  listeners.move = (e) => {
    if (e.pointerId !== pointerId) return;
    if (e.buttons === 0) {
      finish(true); // released outside the window: pointerup never arrived
      return;
    }
    const p = toPercent(e.clientX, e.clientY);
    if (!p) return;
    next =
      mode === "vertex"
        ? movePoint(original, index, p.x, p.y)
        : translatePoints(original, p.x - start.x, p.y - start.y);
    onPreview(next);
  };
  listeners.up = (e) => {
    if (e.pointerId === pointerId) finish(true);
  };
  listeners.cancel = (e) => {
    if (e.pointerId === pointerId) finish(false);
  };
  window.addEventListener("pointermove", listeners.move);
  window.addEventListener("pointerup", listeners.up);
  window.addEventListener("pointercancel", listeners.cancel);
  return true;
}
```

Wiring (region points stored as % in `_points` — use your field, e.g. `_vertices` for `vectorlabels`; a keypoint is a one-point shape dragged in `"body"` mode). Keep this layout: `mediaRef` is one positioned box sized to the rendered image / video frame, and the SVG and the handle layer are **siblings** inside it — a `<span>` placed inside `<svg>` never renders, so handles must not go there:

```jsx
const [dragPreview, setDragPreview] = useState(null); // { id, points } during a gesture
const visibleRegions = props.visibleRegions ?? (props.regions || []).filter((r) => !r.hidden);
const toPercent = (x, y) => toPercentIn(mediaRef.current, x, y);
const pointsOf = (r) => (dragPreview?.id === r.id ? dragPreview.points : r._points || []);
const colorOf = (r) => (r.colors || [])[0] || "#ef4444";
const editable = (r) => !props.readOnly && !r.locked;
const minPointsOf = (r) => (r._closed ? 3 : 2); // polygons keep 3 points, polylines 2
// selectedRegionIds is a Set — use .has(), not .includes().
const isSelected = (r) => props.selectedRegionIds?.has(r.id);
const dragOpts = (r, mode, index) => ({
  region: r, points: r._points || [], mode, index, readOnly: props.readOnly, toPercent,
  onPreview: (pts) => setDragPreview(pts ? { id: r.id, points: pts } : null),
  onCommit: (pts) => props.updateRegion(r.id, { _points: pts }),
});
const svgPoints = (r) => pointsOf(r).map((p) => p.x + "," + p.y).join(" ");

<div ref={mediaRef} style={{ position: "relative" }}>
  <img src={imageUrl} alt="" draggable={false} style={{ display: "block", width: "100%" }} />

  {/* Shapes: the painted line (relation anchor) + a wide invisible hit line for select + move. */}
  <svg viewBox="0 0 100 100" preserveAspectRatio="none"
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
    {visibleRegions.map((r) => (
      <g key={r.id}>
        <polyline data-region-id={r.id} points={svgPoints(r)} fill="none" stroke={colorOf(r)} strokeWidth={2}
          vectorEffect="non-scaling-stroke" style={{ pointerEvents: "none" }} />
        <polyline data-point-edit="" points={svgPoints(r)} fill="none" stroke="transparent" strokeWidth={14}
          vectorEffect="non-scaling-stroke"
          style={{ pointerEvents: "stroke", cursor: editable(r) ? "move" : "default", touchAction: "none" }}
          onPointerDown={(e) => {
            const additive = e.ctrlKey || e.metaKey;
            props.selectRegion(r.id, { additive }); // select ONCE per gesture; no onClick select
            if (!additive) beginPointDrag(e, dragOpts(r, "body"));
          }} />
      </g>
    ))}
  </svg>

  {/* Vertex handles: an HTML layer next to the SVG (fixed px hit target; SVG circles in a % viewBox are too small to grab). */}
  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    {visibleRegions.filter((r) => isSelected(r) && editable(r)).map((r) =>
      pointsOf(r).map((p, i) => (
        <span key={r.id + ":" + (p.id ?? i)} data-point-edit="" aria-hidden="true"
          style={{ position: "absolute", left: p.x + "%", top: p.y + "%", width: 12, height: 12,
            transform: "translate(-50%, -50%)", borderRadius: "50%", boxSizing: "border-box",
            background: "var(--color-neutral-background)", border: "2px solid " + colorOf(r),
            cursor: "grab", touchAction: "none", pointerEvents: "auto" }}
          onPointerDown={(e) => {
            if (e.altKey) { // Alt/Option+click removes the point
              e.stopPropagation();
              const next = removePoint(r._points, i, minPointsOf(r));
              if (next !== r._points) props.updateRegion(r.id, { _points: next }); // no-op at the minimum
              return;
            }
            beginPointDrag(e, dragOpts(r, "vertex", i));
          }} />
      )),
    )}
  </div>
</div>
```

- The drawing tool's click handler must ignore clicks that started on a shape or handle: `if (e.target.closest?.("[data-point-edit]")) return;` — otherwise selecting or dragging a region also adds a point to a new draft.
- Render shapes and handles from `props.visibleRegions` only (no handles for hidden regions); handles carry no `data-region-id` (one anchor per region).
- Adding vertices (e.g. double-click a segment to insert) is encouraged but must not replace plain drag editing.
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
