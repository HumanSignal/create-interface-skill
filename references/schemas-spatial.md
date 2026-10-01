<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Spatial / Image / PDF schemas

#### Multi-select image URLs (array of strings, NOT enum labels)

When the annotator picks one or more **image URLs** (or other plain strings) from task data — not named category labels — use an **array of strings without `items.enum`**. This is different from multi-checkbox **categories** (which use `items.enum`).

```js
// outputSchema
selected_images: {
  type: "array",
  title: "Selected images",
  description: "URLs of images the annotator selected",
  items: { type: "string" },
},

// getResults — MUST match platform pass-through (type labels, bare array on value)
getResults(regions, relations) {
  const regionResults = (regions || [])
    .filter((r) => r.type === "selected_images")
    .map((r) => ({
      id: r.id,
      from_name: "selected_images",
      to_name: "images",           // match your input dataField default
      type: "labels",
      value: r.labels ?? r.urls ?? [],   // bare array — NOT { choices: [...] }
      origin: "manual",
    }));
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
},

// parseResults
parseResults(results) {
  const regions = (results || [])
    .filter((r) => r.type !== "relation" && r.from_name === "selected_images")
    .map((r) => {
      const picked = Array.isArray(r.value)
        ? r.value
        : (r.value?.labels ?? r.value?.choices ?? []);
      return {
        id: r.id,
        type: "selected_images",
        labels: picked,
        colors: [],
        score: null,
        hidden: false,
        locked: false,
        selected: false,
        parentId: null,
        text: picked[0] ?? "",
      };
    });
  const relationResults = (results || []).filter((r) => r.type === "relation");
  const regionMap = {};
  for (const reg of regions) regionMap[reg.id] = reg;
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
},
```

Do **not** use `type: "choices"` with `value: { choices: [...] }` for this pattern — that is for `items.enum` multi-checkbox categories only.

#### Spatial per region — keypoints / image marks (`array` + `items.enum`)

Use the **spatial per region** row when the annotator places **keypoints, clicks, or boxes** on an image and each mark has a category from `items.enum`. outputSchema is still `type: "array"` + `items: { type: "string", enum: [...] }`, but `getResults` emits **one AnnotationResult per mark** with an object `value` containing numeric coordinates and the label key.

```js
getResults(regions, relations) {
  const regionResults = (regions || [])
    .filter((r) => r._hasCoords !== false)
    .map((region) => ({
      id: region.id,
      from_name: "keypoints",
      to_name: "image",
      type: "keypointlabels",
      value: {
        x: Number(region._x),
        y: Number(region._y),
        width: region._width ?? 1,
        keypointlabels: region.labels || [],
      },
      origin: "manual",
    }));
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
},
```

`parseResults` must handle **two input shapes** for the same `from_name`:

1. **Prompter / prediction load** — `type: "choices"`, `value: { choices: [...] }` (backend always emits this for `array + items.enum`). Expand each label to a shell region with `_hasCoords: false`. **Never throw** on `choices` when Prompter is in scope.
2. **Human save reload** — `type: "keypointlabels"` with object `value` containing numeric `x`/`y`. Copy to `_x`/`_y`, set `_hasCoords: true`. Throw only on malformed coordinates on this path.

**Anti-patterns (will fail save validation or break Prompter at runtime):**
- Strict `throw` on `type === "choices"` while keeping `items.enum` — real Prompter predictions use `choices`.
- Returning `{ regions: [] }` for choices — silent prediction loss; `validateOutputSchemaConsistency` fails on 0 regions.
- Removing `items.enum` to bypass validation — Prompter still sends a non-keypoint shape; LLM loses enum constraint.

Keep `.filter((r) => r._hasCoords !== false)` in `getResults` so unplaced Prompter labels are not serialized until the user clicks.

Example `parseResults` (Prompter categories + placed keypoints):

```js
parseResults(results) {
  const regions = [];
  for (const r of results || []) {
    if (r.type === "relation" || r.from_name !== "keypoints") continue;
    if (r.type === "choices") {
      (r.value?.choices ?? []).forEach((label, index) => {
        regions.push({
          id: r.id ? `${r.id}-prompter-${index}` : `prompter-kp-${index}`,
          type: "keypointlabels",
          labels: [String(label)],
          colors: [], score: r.score ?? null,
          hidden: false, locked: false, selected: false, parentId: null,
          text: String(label),
          _width: 1,
          _hasCoords: false,
        });
      });
      continue;
    }
    if (r.type === "keypointlabels") {
      const value = r.value;
      if (!value || typeof value !== "object") throw new Error("keypoints value must be an object");
      const x = Number(value.x);
      const y = Number(value.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error("invalid x/y");
      regions.push({
        id: r.id, type: "keypointlabels",
        labels: value.keypointlabels ?? value.labels ?? [],
        colors: [], score: r.score ?? null,
        hidden: false, locked: false, selected: false, parentId: null,
        text: (value.keypointlabels ?? value.labels ?? [])[0] ?? "",
        _x: x, _y: y, _width: value.width ?? 1, _hasCoords: true,
      });
    }
  }
  const relationResults = (results || []).filter((r) => r.type === "relation");
  const regionMap = {};
  for (const reg of regions) regionMap[reg.id] = reg;
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
},
```

Prompter/LLM JSON uses plain arrays like `{ keypoints: ["red", "blue"] }` for **categories only** — coordinates come from the human click workflow.

#### PDF OCR / bounding boxes (`array` + `items.enum` + `rectanglelabels`)

Use this pattern when the annotator draws **bounding boxes on a PDF or document** (OCR region labeling). Same dual-shape `parseResults` contract as keypoints, but serialize with `type: "rectanglelabels"` and `value: { x, y, width, height, rectanglelabels: [...] }` (optional `text` for transcription).

Sample task data: use `/static/interface-agent-assets/nara-written-document-analysis.pdf` on a `document` or `pdf` dataField.

```js
getResults(regions, relations) {
  const regionResults = (regions || [])
    .filter((r) => r._hasCoords !== false)
    .map((region) => ({
      id: region.id,
      from_name: "regions",
      to_name: "document",
      type: "rectanglelabels",
      value: {
        x: Number(region._x),
        y: Number(region._y),
        width: Number(region._width),
        height: Number(region._height),
        rectanglelabels: region.labels || [],
        text: region.text || "",
      },
      origin: "manual",
    }));
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
},

parseResults(results) {
  const regions = [];
  for (const r of results || []) {
    if (r.type === "relation" || r.from_name !== "regions") continue;
    if (r.type === "choices") {
      (r.value?.choices ?? []).forEach((label, index) => {
        regions.push({
          id: r.id ? `${r.id}-prompter-${index}` : `prompter-box-${index}`,
          type: "rectanglelabels",
          labels: [String(label)],
          colors: [], score: r.score ?? null,
          hidden: false, locked: false, selected: false, parentId: null,
          text: String(label),
          _hasCoords: false,
        });
      });
      continue;
    }
    if (r.type === "rectanglelabels") {
      const value = r.value;
      if (!value || typeof value !== "object") throw new Error("regions value must be an object");
      const x = Number(value.x);
      const y = Number(value.y);
      const width = Number(value.width);
      const height = Number(value.height);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
        throw new Error("invalid bbox coordinates");
      }
      regions.push({
        id: r.id, type: "rectanglelabels",
        labels: value.rectanglelabels ?? value.labels ?? [],
        colors: [], score: r.score ?? null,
        hidden: false, locked: false, selected: false, parentId: null,
        text: value.text ?? (value.rectanglelabels ?? [])[0] ?? "",
        _x: x, _y: y, _width: width, _height: height, _hasCoords: true,
      });
    }
  }
  const relationResults = (results || []).filter((r) => r.type === "relation");
  const regionMap = {};
  for (const reg of regions) regionMap[reg.id] = reg;
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
},
```

UI rules for PDF OCR interfaces:
- Declare every `containerRef` with `useRef(null)` before use in JSX.
- Do **not** use `<embed type="application/pdf">` — the sandbox CSP blocks plugin/object embeds (`default-src 'none'`). Render PDFs with `window.pdfjsLib.getDocument(url).promise`, then `page.render({ canvasContext, viewport })` on a `<canvas>`. `window.pdfjsLib` is preloaded in the sandbox bundle. Same-origin `/static/interface-agent-assets/…` URLs are fetched via the sandbox fetch bridge (pdf.js cannot fetch them directly from the null-origin iframe due to CORS).
- Resolve root-relative task URLs with `new URL(path, window.__parentUrl)` when `path` starts with `/`.
- Place the bbox overlay `div` absolutely over the canvas (same wrapper) using `_x/_y/_width/_height` percentages (0–100).
- Use `<button type="button">` for label pickers. Guard `props.readOnly` before `addRegion` / `updateRegion`. Skip `region.hidden` in overlay renderers.

#### Brush masks (`brushlabels` — FIT-2898)

When the UI exposes a **Brush** tool (paint stroke / freehand mask / semantic segmentation brush), `getResults` must emit **`type: "brushlabels"`** — never `polygonlabels`.

Full-pixel RLE shape (preferred for true masks):

```js
getResults(regions, relations) {
  const regionResults = (regions || [])
    .filter((r) => r.type === "brush" || r.type === "brushlabels")
    .map((region) => ({
      id: region.id,
      from_name: "masks",
      to_name: "image",
      type: "brushlabels",
      value: {
        format: "rle",
        rle: region._rle || [],
        brushlabels: region.labels || [],
      },
      origin: "manual",
      original_width: region._originalWidth,
      original_height: region._originalHeight,
    }));
  // ...relations as usual
  return regionResults;
}
```

**Commit strokes once (FIT-2942):** paint the in-progress stroke on a local/offscreen canvas while the pointer moves, then encode the mask and call `addRegion` **once** on pointer-up (or `updateRegion` with a **new** `_rle` array / `_imageDataURL` when extending or erasing the selected mask). Never push points into an existing array in place.
- **Never create an empty stub region on pointerdown** (`addRegion` with an empty mask, `_pixelCount: 0`) and fill it later with `updateRegion` — a new region does not exist until the stroke has painted pixels. Start a new region only on pointer-up, and skip `addRegion` when the stroke painted nothing.
- **The region is the source of truth.** Store the committed mask (`_rle` or `_imageDataURL`) and any derived stats (e.g. `_pixelCount`) on the region in that same commit. `getResults` must serialize from region fields only — never from a module-level or ref mask cache, which goes stale on undo/redo, task switches and Node-side validation.
- Release the stroke from the canvas's own `onPointerUp` / `onPointerCancel` (with `setPointerCapture` on pointerdown), not from a `window` listener registered once in `useEffect(..., [])` — that listener closes over the first render's state.
- If a screen still calls `addRegion` on pointerdown and again on pointer-up with the same id, the shell **replaces** the region (so the full stroke is kept) rather than dropping the second call or suffixing the id; do not rely on it for new code.

BBox-style brush masks may use `x`/`y`/`width`/`height` + `brushlabels` instead of RLE. Polygon tools stay on `polygonlabels` + `points` and must not reuse the Brush label.
