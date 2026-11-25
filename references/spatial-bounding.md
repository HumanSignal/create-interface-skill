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
- **Drawing mode (FIT-3047):** Vertex editing must work **while the polyline is still being drawn**, before Enter / close. Render the same handles on the in-progress draft points (not only after `addRegion`). Drag a draft handle to move that point; Alt+click removes it (respect `minPoints`). A click on a draft handle must not add a new point. Alt+click on the first draft point removes it — it must **not** close or finish the path.
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
- **Never seed the region on mount** (no `useEffect` → `addRegion` "when no region exists"): the screen first renders with `regions = []` before saved results load, so a mount seed overwrites the saved ranking with the default order and marks the annotation edited (FIT-3080).
- **Render the list only from** `rankingRegion?._rankedUrls ?? defaultItems` (derived each render — the default needs no region).
- **On a user move / drop**, check the current `regions` (the same render-scope value the snippet uses — `props.regions` if you do not destructure): `addRegion` the stable region if it is missing, else `updateRegion(id, patch)`.
- `getResults` must return **at most one** result for the ranking `from_name`.
- Lazy creation means an **untouched** default order emits **no result** — do not list the ranking in `outputSchema.required` unless the user asked for it.

```js
const RANKING_REGION_ID = 'ranking-main';
const images = getField(task.data, params.imagesField ?? 'images') || [];

const rankingRegion = (regions || []).find((r) => r.id === RANKING_REGION_ID);
const orderedUrls = rankingRegion?._rankedUrls ?? images; // default derived each render — no seed

function saveRanking(patch) {
  const exists = (regions || []).some((r) => r.id === RANKING_REGION_ID); // checked at move time, not on mount
  if (!exists) {
    addRegion({ id: RANKING_REGION_ID, type: 'labels', text: 'Image ranking', labels: [], _rankedUrls: [], ...patch });
  } else {
    updateRegion(RANKING_REGION_ID, patch);
  }
}

function moveItem(fromIndex, toIndex) {
  if (readOnly || fromIndex === toIndex) return;
  const next = [...orderedUrls];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  saveRanking({ _rankedUrls: next });
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
  // no required: ["ranking"] — an untouched default order emits no result (add it only if the user asks)
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

**Bucket variant** (an "available" pool plus named buckets, e.g. *Relevant* / *Biased*; drag between, no duplicates): the same single `ranking-main` region holds one array per bucket in `_buckets`; the pool is **derived** (all items minus placed ones), never stored. Serialize **one `labels` result per bucket** with `value` = the bare id array, declared as `array` of strings in `outputSchema` — the same shape as the single-list recipe, accepted by every Label Studio version (do not use `"x-ls-type": "ranker"`: older on-prem versions reject it on Submit). (The empty `_rankedUrls` keeps the data-holder region out of the Regions panel.)

```js
const BUCKETS = ['relevant', 'biased'];
const items = getField(task.data, params.itemsField ?? 'results') || []; // string ids / URLs
const buckets = rankingRegion?._buckets ?? { relevant: [], biased: [] };
const placed = new Set(BUCKETS.flatMap((b) => buckets[b] || []));
const pool = items.filter((id) => !placed.has(id));

function moveTo(itemId, bucket, index) { // bucket === null → back to the pool
  if (readOnly) return;
  const next = {};
  for (const b of BUCKETS) next[b] = (buckets[b] || []).filter((id) => id !== itemId); // remove everywhere first
  if (bucket && next[bucket]) next[bucket].splice(index ?? next[bucket].length, 0, itemId);
  saveRanking({ _buckets: next }); // same event-time addRegion-or-updateRegion as above
}

// outputSchema.properties: relevant / biased = { type: "array", items: { type: "string" }, description: "..." }
// do not include bucket names in outputSchema.required — an untouched board emits no results
function getResults(regions, relations) {
  const rankingRegion = (regions || []).find((r) => r.id === RANKING_REGION_ID);
  const bucketResults = rankingRegion?._buckets
    ? BUCKETS.map((b) => ({ id: RANKING_REGION_ID + "-" + b, from_name: b, to_name: "results", type: "labels",
        value: rankingRegion._buckets[b] || [], origin: "manual" }))
    : [];
  const relationResults = (relations || [])
    .filter((rel) => rel.node1Id && rel.node2Id)
    .map((rel) => ({ id: rel.id, from_name: "", to_name: "", type: "relation", value: {}, from_id: rel.node1Id,
      to_id: rel.node2Id, direction: rel.direction, labels: rel.labels || [] }));
  return [...bucketResults, ...relationResults];
}
function parseResults(results) {
  const allResults = results || [];
  const own = allResults.filter((r) => BUCKETS.includes(r.from_name));
  // One region for any bucket result, even an empty / mock value (SDK validator consistency check)
  const _buckets = Object.fromEntries(BUCKETS.map((b) => {
    const value = own.find((r) => r.from_name === b)?.value;
    const items = Array.isArray(value) ? value : (value?.labels ?? value?.choices ?? []);
    return [b, items];
  }));
  const regions = own.length
    ? [{ id: RANKING_REGION_ID, type: "labels", labels: [], _rankedUrls: [], _buckets }]
    : [];
  const relationResults = allResults.filter((r) => r.type === "relation");
  const regionMap = {};
  for (const region of regions) regionMap[region.id] = region;
  const relations = relationResults.map((rel) => {
    const node1 = regionMap[rel.from_id];
    const node2 = regionMap[rel.to_id];
    return {
      id: rel.id,
      direction: rel.direction || "right",
      visible: true,
      labels: rel.labels || null,
      node1Label: node1?.labels[0] || node1?.type || rel.from_id,
      node2Label: node2?.labels[0] || node2?.type || rel.to_id,
      node1Id: rel.from_id,
      node2Id: rel.to_id,
    };
  });
  return { regions, relations };
}
```

### Brush vs Polygon (CRITICAL — FIT-2898)

A toolbar tool labeled **Brush** (paint / freehand mask / semantic-segmentation brush) is **not** a polygon tool.

- Brush MUST persist as **`brushlabels`** — full-pixel RLE (`_rle`, `_originalWidth`, `_originalHeight`, `format: "rle"`) or bbox mask fields (`x`/`y`/`width`/`height` + `brushlabels`).
- **Never** implement Brush as `polygonlabels`, freehand vertex sampling, circular polygon approximation, or "one polygon segment for the entire stroke".
- **Polygon** is a separate tool: click vertices → close shape → `polygonlabels` with `points`.
- Canonical brush example: `services/lse/web/libs/editor-shell/examples/shark-brush-interface.jsx` (see also reference § Brush / RLE mask performance, FIT-2030).
- **Bitmask / multi-region (FIT-3031):** each region owns its own mask snapshot. Do not share one `_value` / `imageDataURL` / pixel buffer across regions; **New region** mints a new `id` and must not zero prior rows in the Regions panel.

### Image navigation & selection tools (FIT-3066)

Every screen that annotates an image (bitmask, brush / segmentation masks, boxes, polygons, keypoints) must render the navigation & selection tools that the classic image editor always shows, next to the drawing tools:

- **Select** (V) — selects and moves existing regions; never paints or draws. A click on a region calls `props.selectRegion(id, { additive: event.ctrlKey || event.metaKey })`; a click on empty image clears the selection.
- **Pan** (H, or hold Space / drag with the middle mouse button from any tool) — drags the zoomed image.
- **Zoom in** (Ctrl/⌘ + =) and **Zoom out** (Ctrl/⌘ + -) around the viewport center; Ctrl/⌘ + wheel zooms at the cursor. Show the current zoom % next to them.
- Zoom presets: **Fit** (Shift+1) fits the whole image in the viewport, **100%** (Shift+2) shows one image pixel per screen pixel.

A bitmask screen with only Bitmask / Eraser buttons is incomplete. Use icon buttons with `aria-label`, `title` (with the hotkey) and `aria-pressed` for the active tool.

Copy these helpers unchanged (above the screen component):

```js
// FIT-3066 image navigation helpers — copy unchanged.
const VIEW_MIN_SCALE = 0.1;
const VIEW_MAX_SCALE = 20;
const VIEW_ZOOM_STEP = 1.25;
/** scale 1 = the image fitted to the viewport; x / y = px offset of the media box inside the viewport. */
const FIT_VIEW = { scale: 1, x: 0, y: 0 };

/** Zoom-in limit: 20x the fitted view, or 8 screen px per image px on huge images so the 100% preset is reachable. */
function maxViewScale(naturalWidth, fittedWidth) {
  const actual = naturalWidth > 0 && fittedWidth > 0 ? naturalWidth / fittedWidth : 0;
  return Math.max(VIEW_MAX_SCALE, actual * 8);
}

function clampViewScale(scale, maxScale = VIEW_MAX_SCALE) {
  return Math.min(maxScale, Math.max(VIEW_MIN_SCALE, Number(scale) || 1));
}

/** Zoom to `scale`, keeping the viewport point (px, py) — px from the viewport's top-left — fixed on screen. */
function zoomViewAt(view, scale, px, py, maxScale = VIEW_MAX_SCALE) {
  const next = clampViewScale(scale, maxScale);
  const k = next / view.scale;
  return { scale: next, x: px - (px - view.x) * k, y: py - (py - view.y) * k };
}

/** One Zoom in (direction > 0) or Zoom out step around the viewport center. */
function zoomViewStep(view, direction, viewportEl, maxScale = VIEW_MAX_SCALE) {
  const box = viewportEl?.getBoundingClientRect?.();
  const factor = direction > 0 ? VIEW_ZOOM_STEP : 1 / VIEW_ZOOM_STEP;
  return zoomViewAt(view, view.scale * factor, (box?.width || 0) / 2, (box?.height || 0) / 2, maxScale);
}

/** "Fit" preset: the fitted media box (fittedWidth x fittedHeight at scale 1) centered in the viewport. */
function fitView(viewportEl, fittedWidth, fittedHeight) {
  const box = viewportEl?.getBoundingClientRect?.();
  if (!box) return { ...FIT_VIEW };
  return { scale: 1, x: (box.width - fittedWidth) / 2, y: (box.height - fittedHeight) / 2 };
}

/** "100%" preset: one natural image pixel per screen pixel, zoomed around the viewport center. */
function actualSizeView(view, viewportEl, naturalWidth, fittedWidth) {
  const box = viewportEl?.getBoundingClientRect?.();
  const maxScale = maxViewScale(naturalWidth, fittedWidth);
  return zoomViewAt(view, naturalWidth / fittedWidth, (box?.width || 0) / 2, (box?.height || 0) / 2, maxScale);
}

/** Zoom readout relative to the natural image size (100 at the "100%" preset). */
function zoomPercent(view, naturalWidth, fittedWidth) {
  return Math.round(((view.scale * fittedWidth) / naturalWidth) * 100);
}

function panView(view, dx, dy) {
  return { ...view, x: view.x + dx, y: view.y + dy };
}

/** Style for the media box (image + mask canvas + region overlays) — one transform moves all of them together. */
function viewTransformStyle(view) {
  return {
    position: "absolute",
    left: 0,
    top: 0,
    transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
    transformOrigin: "0 0",
  };
}

/** Client px -> natural image px through the zoomed / panned media box (its rect already includes the transform). */
function clientToNatural(mediaEl, clientX, clientY, naturalWidth, naturalHeight) {
  const box = mediaEl?.getBoundingClientRect?.();
  if (!box || !box.width || !box.height) return null;
  const x = ((clientX - box.left) / box.width) * naturalWidth;
  const y = ((clientY - box.top) / box.height) * naturalHeight;
  return { x: Math.min(naturalWidth, Math.max(0, x)), y: Math.min(naturalHeight, Math.max(0, y)) };
}

/** Classic image keymap -> "select" | "pan" | "zoomIn" | "zoomOut" | "fit" | "actual", or null. Ignores typing. */
function imageNavAction(event) {
  const target = event.target;
  const tag = target?.tagName;
  if (target?.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return null;
  const mod = event.ctrlKey || event.metaKey;
  if (mod && (event.key === "=" || event.key === "+")) return "zoomIn";
  if (mod && event.key === "-") return "zoomOut";
  if (mod || event.altKey) return null;
  if (event.shiftKey && event.code === "Digit1") return "fit";
  if (event.shiftKey && event.code === "Digit2") return "actual";
  if (event.shiftKey) return null;
  const key = String(event.key || "").toLowerCase();
  if (key === "v") return "select";
  if (key === "h") return "pan";
  return null;
}
```

Wiring — the viewport is an `overflow: hidden` box; the media box inside it is sized to the fitted image and holds the `<img>`, the mask `<canvas>` and every `data-region-id` overlay, so one transform zooms and pans all of them:

```jsx
const viewportRef = useRef(null);
const mediaRef = useRef(null);
const [tool, setTool] = useState("bitmask"); // "select" | "pan" | "bitmask" | "eraser" (+ your other drawing tools)
const [view, setView] = useState(FIT_VIEW);
const [spaceHeld, setSpaceHeld] = useState(false);
// fitted = { width, height } of the image fitted into the viewport at scale 1 (contain); natural = image size.
const maxScale = maxViewScale(natural.width, fitted.width);
useEffect(() => setView(fitView(viewportRef.current, fitted.width, fitted.height)), [fitted.width, fitted.height]);

useEffect(() => {
  // Space belongs to text fields and to focused buttons / checkboxes / options (keyboard activation).
  const ownsSpace = (t) =>
    t?.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(t?.tagName) ||
    !!t?.closest?.("button, a[href], summary, [role=button], [role=checkbox], [role=radio], [role=switch], [role=option], [role=tab]");
  const onKeyDown = (e) => {
    if (e.code === "Space" && !ownsSpace(e.target)) {
      e.preventDefault(); // hold Space to pan from any tool
      setSpaceHeld(true);
      return;
    }
    const action = imageNavAction(e);
    if (!action) return;
    e.preventDefault(); // Ctrl/⌘ + = / - must not zoom the whole page
    if (action === "select" || action === "pan") setTool(action);
    else if (action === "zoomIn" || action === "zoomOut")
      setView((v) => zoomViewStep(v, action === "zoomIn" ? 1 : -1, viewportRef.current, maxScale));
    else if (action === "fit") setView(fitView(viewportRef.current, fitted.width, fitted.height));
    else setView((v) => actualSizeView(v, viewportRef.current, natural.width, fitted.width));
  };
  const onKeyUp = (e) => e.code === "Space" && setSpaceHeld(false);
  const onBlur = () => setSpaceHeld(false); // the keyup never arrives once the window loses focus
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
  };
}, [fitted.width, fitted.height, natural.width, maxScale]);

// Ctrl/⌘ + wheel zooms at the cursor. A native non-passive listener is required to preventDefault.
// Re-run when the image size is known: the viewport may mount after a loading state.
useEffect(() => {
  const el = viewportRef.current;
  if (!el) return;
  const onWheel = (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const box = el.getBoundingClientRect();
    const scaleBy = Math.exp(-e.deltaY * 0.0015);
    setView((v) => zoomViewAt(v, v.scale * scaleBy, e.clientX - box.left, e.clientY - box.top, maxScale));
  };
  el.addEventListener("wheel", onWheel, { passive: false });
  return () => el.removeEventListener("wheel", onWheel);
}, [fitted.width, fitted.height, maxScale]);

// Capture phase: panning wins over the shape / vertex-handle drags underneath the pointer.
function onViewportPointerDownCapture(e) {
  if (tool === "pan" || spaceHeld || e.button === 1) {
    e.preventDefault();
    e.stopPropagation(); // shapes and handles must not start a drag or select while panning
    let last = { x: e.clientX, y: e.clientY };
    const move = (ev) => {
      // Read the delta now: React runs the updater later, after `last` has moved on.
      const dx = ev.clientX - last.x;
      const dy = ev.clientY - last.y;
      last = { x: ev.clientX, y: ev.clientY };
      setView((v) => panView(v, dx, dy));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }
}

function onViewportPointerDown(e) {
  // Shapes and vertex handles (FIT-2940, `data-point-edit`) select / drag themselves: never select or paint twice.
  if (e.target.closest?.("[data-point-edit]")) return;
  const point = clientToNatural(mediaRef.current, e.clientX, e.clientY, natural.width, natural.height);
  if (!point) return;
  if (tool === "select") {
    const hit = hitTestRegion(point); // your mask pixel / shape hit test in natural px (visible regions only)
    props.selectRegion(hit ? hit.id : null, { additive: e.ctrlKey || e.metaKey });
    return;
  }
  startStroke(point); // bitmask / brush / eraser painting, unchanged
}

// JSX
<div role="toolbar" aria-label="Image tools" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
  <button aria-label="Select" title="Select (V)" aria-pressed={tool === "select"} onClick={() => setTool("select")}>…</button>
  <button aria-label="Pan" title="Pan (H)" aria-pressed={tool === "pan"} onClick={() => setTool("pan")}>…</button>
  {/* drawing tools: Bitmask, Eraser, … */}
  <button aria-label="Zoom out" title="Zoom out (Ctrl/⌘ + -)" onClick={() => setView((v) => zoomViewStep(v, -1, viewportRef.current, maxScale))}>…</button>
  <span aria-live="polite">{zoomPercent(view, natural.width, fitted.width)}%</span>
  <button aria-label="Zoom in" title="Zoom in (Ctrl/⌘ + =)" onClick={() => setView((v) => zoomViewStep(v, 1, viewportRef.current, maxScale))}>…</button>
  <button aria-label="Fit to view" title="Fit (Shift+1)" onClick={() => setView(fitView(viewportRef.current, fitted.width, fitted.height))}>…</button>
  <button aria-label="Actual size (100%)" title="100% (Shift+2)" onClick={() => setView((v) => actualSizeView(v, viewportRef.current, natural.width, fitted.width))}>…</button>
</div>
<div ref={viewportRef} onPointerDownCapture={onViewportPointerDownCapture} onPointerDown={onViewportPointerDown}
  style={{ position: "relative", overflow: "hidden", flex: 1, cursor: tool === "pan" || spaceHeld ? "grab" : undefined }}>
  <div ref={mediaRef} data-shell-layout-epoch={`${view.scale}:${view.x}:${view.y}`}
    style={{ ...viewTransformStyle(view), width: fitted.width, height: fitted.height }}>
    {/* <img>, mask <canvas> (width/height = natural size, CSS size 100%), data-region-id overlays */}
  </div>
</div>
```

- Map every pointer event with `clientToNatural(mediaRef.current, …)` (or the FIT-2940 `toPercentIn(mediaRef.current, …)`). `getBoundingClientRect()` already includes the zoom and pan, so never divide by the un-zoomed fitted size — strokes would land in the wrong place after zooming.
- Pan runs in the capture phase and stops propagation, so a shape under the pointer never drags while panning. Give every shape / handle that has its own `onPointerDown` the `data-point-edit` attribute so the viewport skips it (no double select, no stroke on a shape).
- Pass `maxScale` to every zoom call: the 100% preset of a very large image needs more than 20x the fitted view.
- Let the toolbar wrap (`flexWrap: "wrap"`): the labeling panel is narrow, and a single-row toolbar (or a fixed toolbar `height`) clips the zoom presets out of view.
- Brush / eraser size stays in natural px; draw its cursor at `brushSize * (rect.width / natural.width)` screen px.
- Keep the `data-shell-layout-epoch` attribute so the shell's relation connectors follow the zoomed image.
