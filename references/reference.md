<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# create-labeling-interface — Reference

Companion to the `create-labeling-interface` skill orchestrator
(`.agents/skills/create-labeling-interface/SKILL.md`). **Read only the sections
you need** for this request — do not load the whole file by default.

Authoritative code/docs still win over this file if they disagree: see the skill
orchestrator’s “Authoritative references”.

---

## Schemas & sample data — when to load what

Use this gate before writing JSX that touches `task.data`.

| Situation | Load next |
|---|---|
| Screen reads any `task.data` field (`getField`, `task.data.*`) | This section + **`inputSchema`** below |
| Scaffolding a simple text/label classifier from scratch | Then [examples.md](examples.md) — Text Classification (includes `inputSchema` + `task.json`) |
| Image / multi-image / audio / PDF / custom field names | Stay in **`inputSchema`** + **Preview sample data** below; adapt the example’s pattern (do not pull examples.md unless you want the full module) |
| UI is pure controls with **no** task payload | `inputSchema` / sample data optional; skip examples.md for I/O |

**Why both schema and sample matter**

- `inputSchema` → Data I/O field list (without it: **0 FIELDS / No schema defined**).
- Sample data (`task.json` / `data_sample` / `generate_sample_data`) → INPUT EXAMPLE + Preview content (without it: **`{}`** and empty Preview).

**How sample data is usually populated**

| Path | Mechanism |
|---|---|
| Create with Agent | After code validates, call `generate_sample_data` |
| Develop Locally / SDK | Sibling `task.json` or `sample.json` (sync/preview loads it) |
| REST API | `data_sample` on create/update |

---

## Audio Waveform & InterfaceComponents.AudioCanvas

> [!NOTE]
> `InterfaceComponents` (such as `AudioCanvas` and `useComponentHotkeys`) are gated behind the `fflag_interfaces_components` feature flag. When the flag is off (default in production/staging), custom audio interfaces use `EditorDeps.audioDecoder.WasmStreamingDecoder` directly.

For audio labeling interfaces when `fflag_interfaces_components` is enabled, use the pre-built, dynamically loaded **`InterfaceComponents.AudioCanvas`** (`const AudioCanvas = window.InterfaceComponents.AudioCanvas;`).

### CRITICAL: Access via Property (NEVER Destructure window.InterfaceComponents)
- The component is strictly named **`AudioCanvas`**.
- **ALWAYS access via direct property lookup:**
  ```js
  const AudioCanvas = window.InterfaceComponents.AudioCanvas;
  ```
- **NEVER destructure `window.InterfaceComponents`:**
  ```js
  // WRONG - NEVER DO THIS:
  const { AudioCanvas } = window.InterfaceComponents;
  ```
  `window.InterfaceComponents` is a specialized dynamic loading Proxy. Destructuring breaks the proxy trap linkage and leads to runtime errors or loading failures!
- **NEVER** use `InterfaceComponents.Audio` or `window.InterfaceComponents.Audio`. There is no `.Audio` export — attempting to access `.Audio` causes a 404 dynamic chunk load error.
- **Streaming & Decoder Options**: Pass `decoderType="wasm-stream"` to `AudioCanvas` for progressive WebAssembly stream decoding of long audio files or non-WAV formats. Supported `decoderType`: `"wasm-stream"`, `"webaudio"`, `"ffmpeg"`, `"none"`.

### Raw Streaming Decoder (`EditorDeps.audioDecoder.WasmStreamingDecoder`)

For low-level custom audio interfaces requiring direct control of waveforms or streaming audio data without thread locks, CSP violations, or CORS errors, `EditorDeps.audioDecoder.WasmStreamingDecoder` is also available.

### Class API Specification
```javascript
class WasmStreamingDecoder {
  constructor(audioUrl) {
    this.src = audioUrl;
    this.sampleRate = number;   // e.g. 44100
    this.channelCount = number; // e.g. 2
    this.duration = number;     // duration in seconds
    // Multidimensional chunks array: chunks[channelIndex][chunkIndex] -> Float32Array
    // Accessing chunks dynamically fetches and decodes the requested chunk from the parent.
    this.chunks = Float32Array[][];
  }

  // Initializes the decoder (fetches metadata). Returns a Promise.
  async init() {}

  // Asynchronously decodes the audio. Returns a Promise.
  async decode() {}

  // Set the visible viewport in seconds to prefetch chunks.
  setVisibleRange(startSeconds, endSeconds) {}

  // Event listener registration ("chunkLoaded" is emitted when a chunk completes decoding).
  on(eventName, callback) {}
  off(eventName, callback) {}

  // Clean up resources when the component unmounts.
  dispose() {}
}
```

### Usage Pattern
Always initialize the decoder inside a `useEffect` and clean it up via `.dispose()` on component unmount. Trigger a state update or force re-render when the `"chunkLoaded"` event fires.

```jsx
const AudioWaveformScreen = (props) => {
  const audioUrl = props.task.data.audio_url;
  const [decoder, setDecoder] = useState(null);
  const [tick, setTick] = useState(0); // Trigger re-render on new chunks
  const [viewport, setViewport] = useState({ start: 0, end: 10 });

  useEffect(() => {
    if (!EditorDeps || !audioUrl) return;

    const dec = new EditorDeps.audioDecoder.WasmStreamingDecoder(audioUrl);
    
    const onChunk = () => {
      setTick(t => t + 1); // Force React update to redraw canvas
    };

    dec.on("chunkLoaded", onChunk);
    
    dec.init().then(() => {
      setDecoder(dec);
      dec.setVisibleRange(viewport.start, viewport.end);
    });

    return () => {
      dec.off("chunkLoaded", onChunk);
      dec.dispose();
    };
  }, [audioUrl]);

  // When viewport changes (e.g. scroll or zoom)
  useEffect(() => {
    if (decoder) {
      decoder.setVisibleRange(viewport.start, viewport.end);
    }
  }, [decoder, viewport]);

  if (!decoder) return <div>Loading audio metadata...</div>;

  // Render waveform from decoder.chunks[channelIndex][chunkIndex]
  // ...
  return <div />;
};
```

### Shell relation anchors (FIT-2247)

Painting spans only on a `<canvas>` / SVG waveform updates the Regions panel after Create Relation, but **connector lines will not appear** unless each region also has a positioned DOM overlay with `data-region-id={region.id}` sized from `_start` / `_end` against the visible timeline (same pattern as wearable-activity). Do not draw relation SVG yourself — `ShellRelationsOverlay` owns connectors. On pan/zoom, bump `data-shell-layout-epoch` so the overlay recomputes.

## Default component props (`DynamicScreenProps`)

The `default` export receives this shape (from
`services/lse/web/libs/editor-shell/src/types/dynamic-screen.ts:37`):

```typescript
interface DynamicScreenProps {
  // ─── Read state ─────────────────────────────────────
  task: { id: number; data: Record<string, unknown> };
  regions: ScreenRegion[];
  relations: ScreenRelation[];
  selectedRegionIds: Set<string>;
  readOnly: boolean;
  interfaces: Set<string>;
  initialResults: AnnotationResult[];
  hotkeys?: Record<string, string>;      // active project-level key bindings and user remappings
  params: Record<string, unknown>;       // merged paramsSchema defaults + admin overrides

  // ─── Mutation callbacks (controlled-component model) ─
  addRegion(region: ScreenRegion): void;
  updateRegion(id: string, patch: Partial<ScreenRegion>): void;
  deleteRegion(id: string): void;
  selectRegion(id: string | null, options?: { additive?: boolean }): void;
  // FIT-2748 / FIT-2827: pass { additive: true } for Ctrl/Cmd multi-select.
  // Call selectRegion once per gesture (not both onPointerDown and onClick).
  // Shell preserves multi-selection when re-clicking a selected member (group move).

  addRelation(relation: ScreenRelation): void;
  deleteRelation(id: string): void;
  rotateRelationDirection(id: string): void;
  toggleRegionVisibility(id: string): void;
  toggleRegionLock(id: string): void;
}
```

The screen does not own `regions` — the shell does. To create or change a
region, call the appropriate mutation callback. The shell will validate the
change (via `onBeforeUpdate`, undo stack) and re-render with updated
`props.regions`.

`ScreenRegion` (the in-memory shape):

```typescript
interface ScreenRegion {
  id: string;
  type: string;             // "choices" | "labels" | "rectangle" | "polygonlabels" | …
  labels: string[];
  colors: string[];
  score: number | null;
  hidden: boolean;
  locked: boolean;
  selected: boolean;
  parentId: string | null;
  text: string;             // human-readable summary for the outliner panel
  // Underscore-prefixed keys are passed through and preserved.
  [key: `_${string}`]: unknown;
}
```

Honor shell-owned region state when rendering:

- `hidden: true` means the shell's eye / hide-all controls have hidden the
  region. Do not render its visual mark, box, mask, span, connector, or overlay
  on the canvas.
- Use `const visibleRegions = (props.regions || []).filter((r) => !r.hidden);`
  for canvas rendering and hit-testing. Do not filter hidden regions out of
  `getResults`, `parseResults`, or saved state; hidden is view state, not
  deletion.
- `locked: true` means the region can render, but drag/edit/delete controls
  should be disabled or ignored.

When you need to attach screen-specific data to a region (e.g. a span's
character offsets, a polygon's coordinates, a custom property), put it under
an underscore-prefixed key — `_start`, `_end`, `_metadata`, etc. The shell
preserves these untouched.

### Text span / NER offset rules

NER interfaces must treat character offsets as first-class region data. Store
absolute JavaScript string offsets into the exact source text under `_start`
and `_end`, with `_end` exclusive. Also store the selected source text under
`_text` when creating/parsing a span, because `getResults(regions, relations)`
does not receive `task` or `params`.

Never render NER highlights by re-finding `region.text`, `region._text`, or
the entity label with `text.indexOf(...)` during render. That works for the
first match and breaks for repeated entities, repeated labels, punctuation,
normalization, and later spans. It also breaks if offsets are calculated from
the already-rendered chunks instead of from the original task text.

For every NER/span interface:

- Use saved `_start` / `_end` as the source of truth for rendering,
  selection, editing, and serialization.
- Sort valid spans by `_start`, then render with a single `cursor` over the
  original source string. Slice plain text from `cursor` to `start`, then the
  highlighted text from `start` to `end`, then set `cursor = end`.
- Filter hidden regions out of the visual span list (`!region.hidden`) so the
  shell's hide-all and per-region eye controls hide the highlight while leaving
  the source text visible as plain text.
- Filter or explicitly handle invalid spans (`start < 0`, `end <= start`,
  `end > text.length`). For overlapping spans, either reject them in
  `onBeforeUpdate` or render only the non-overlapping sequence with a clear
  deterministic rule.
- If an upstream agent/model returns entity text without offsets, resolve the
  offsets once in source order with `indexOf(entityText, cursor)` and store
  them immediately. Do not call bare `indexOf(entityText)`, and do not
  recalculate offsets on every render. If a match cannot be resolved
  unambiguously, mark it for review instead of guessing.
- When creating regions from `window.getSelection()`, do not calculate offsets
  from `container.textContent`, `innerText`, or `range.cloneRange().toString()`
  over rendered markup. Visible label badges inside `<mark>` elements become
  extra DOM text, so the second selection can shift by the length of the first
  badge. Render original source text in child elements with a `data-source-start`
  attribute and compute anchor/focus offsets from the nearest source-text
  element only.
- In `getResults`, serialize Label Studio text span results with
  `type: "labels"` and `value: { start, end, text, labels }`, taking
  `text` from `_text` or from the source slice captured when the region was
  created.
- In `parseResults`, copy `value.start`, `value.end`, and `value.text` back
  to `_start`, `_end`, and `_text`; reuse the incoming result `id`.
- **Persistence rule:** underscore-prefixed fields (`_start`, `_end`, `_x`, …)
  exist only on in-memory `ScreenRegion` objects. `AnnotationResult.value` must
  use Label Studio keys (`start`, `end`, `x`, `y`, …) — never `_start` in
  `value`. Incomplete `getResults` (e.g. only `value.labels`) fails platform
  save validation for spatial interfaces and causes displaced regions after Submit.
  Before finishing a NER/bbox interface, mentally verify save would pass the
  spatial serialization check: `getResults` maps every positional `_` field you
  use in `addRegion` / `updateRegion`.

Canonical highlight renderer:

```jsx
function renderNerText(sourceText, regions, selectedRegionIds, selectRegion) {
  const text = String(sourceText ?? "");
  const spans = (regions || [])
    .map((region) => ({
      region,
      start: Number(region._start),
      end: Number(region._end),
    }))
    .filter(({ region, start, end }) =>
      !region.hidden &&
      Number.isInteger(start) &&
      Number.isInteger(end) &&
      start >= 0 &&
      end > start &&
      end <= text.length
    )
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const nodes = [];
  let cursor = 0;

  spans.forEach(({ region, start, end }) => {
    if (start < cursor) return; // overlapping span; reject earlier if the UI disallows overlaps
    if (cursor < start) {
      nodes.push(
        <span key={`text-${cursor}-${start}`} data-source-start={cursor}>
          {text.slice(cursor, start)}
        </span>
      );
    }
    const selected = selectedRegionIds?.has(region.id);
    nodes.push(
      <mark
        key={region.id}
        data-region-id={region.id}
        role="button"
        tabIndex={0}
        aria-label={(region.labels ?? [])[0] ?? "Entity"}
        onClick={() => selectRegion(region.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectRegion(region.id);
          }
        }}
        style={{
          background: selected ? "#fde68a" : region.colors?.[0] ?? "#bfdbfe",
          borderRadius: 3,
          padding: "0 2px",
          cursor: "pointer",
        }}
      >
        <span data-source-start={start}>{text.slice(start, end)}</span>
        <span aria-hidden="true" style={{ marginLeft: 4, userSelect: "none", pointerEvents: "none" }}>
          {(region.labels ?? [])[0] ?? "Entity"}
        </span>
      </mark>
    );
    cursor = end;
  });

  if (cursor < text.length) {
    nodes.push(
      <span key={`text-${cursor}-end`} data-source-start={cursor}>
        {text.slice(cursor)}
      </span>
    );
  }

  return nodes;
}
```

Selection offset helper for NER UIs:

```jsx
function getSourcePointOffset(node, offset) {
  let el = node?.nodeType === 3 ? node.parentElement : node;
  while (el && !el.getAttribute?.("data-source-start")) {
    el = el.parentElement;
  }
  if (!el) return null;
  const sourceStart = Number(el.getAttribute("data-source-start"));
  if (!Number.isFinite(sourceStart)) return null;
  return sourceStart + offset;
}

function getSelectionOffsets() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const anchor = getSourcePointOffset(selection.anchorNode, selection.anchorOffset);
  const focus = getSourcePointOffset(selection.focusNode, selection.focusOffset);
  if (anchor == null || focus == null || anchor === focus) return null;
  return { start: Math.min(anchor, focus), end: Math.max(anchor, focus) };
}
```

Before considering a generated NER interface complete, test with repeated text,
for example `Alice met Bob. Alice called Bob.`, and verify each highlight
lands on the intended occurrence.


## Styling and Theme Guidelines (Light & Dark Mode Support)

All generated custom interfaces **must** seamlessly support both Light Mode and Dark Mode. The sandboxed iframe automatically sets the `data-color-scheme="dark"` (or `"light"`) attribute on the `<html>` and `<body>` elements, mirroring the host application's active theme.

### Styling Rules
1. **Never hardcode light or dark background/text colors in inline styles:**
   - ❌ **Do not** write inline styles like `style={{ background: "#fff", color: "#000" }}` or `style={{ background: "#f3f4f6" }}`. These styles will remain bright white/light even when the app is switched to Dark Mode, resulting in poor contrast, bad readability, and a broken experience.
   - Use semantic styling via CSS classes and CSS custom properties (variables) instead.
2. **Define a `<style>` block with CSS variables:**
   - Embed a CSS stylesheet in your JSX (via a `<style>` element rendered inside the root element of your component) containing classes that define component styling.
   - Declare colors as CSS custom properties (variables) under your root class, and override them when `html[data-color-scheme="dark"]` is active.
   - **Example:**
     ```css
     .my-interface-root {
       --bg-color: #ffffff;
       --text-color: #1f2937;
       --border-color: #e5e7eb;
       --btn-bg: #f9fafb;
       --btn-selected-bg: #eef2ff;
       --btn-selected-border: #4f46e5;
       
       background-color: var(--bg-color);
       color: var(--text-color);
     }
     
     html[data-color-scheme="dark"] .my-interface-root {
       --bg-color: #121210;
       --text-color: #f3f4f6;
       --border-color: #374151;
       --btn-bg: #1f2937;
       --btn-selected-bg: #312e81;
       --btn-selected-border: #6366f1;
     }
     
     .my-interface-btn {
       background: var(--btn-bg);
       border: 1px solid var(--border-color);
       color: var(--text-color);
       cursor: pointer;
     }
     
     .my-interface-btn--selected {
       background: var(--btn-selected-bg);
       border-color: var(--btn-selected-border);
     }
     ```
3. **No custom sidepanels / duplicate UI:**
   - The LSE screen already features native sidebars for outliners and inspectors. **Do not** generate a custom sidebar or sidepanel structure (like a list of regions or a separate details form) inside your main component canvas.
   - Duplicate list controls or custom panels inside the main screen clutter the view and are notoriously difficult to style consistently across light/dark modes.
   - Instead, map these details onto the native slots via `OutlinerItem` and `InfoViewer` sibling exports.
4. **JS-based theme detection (when CSS is insufficient):**
   - For canvas drawing contexts (e.g. bounding box outline colors), charts, or external libraries where styling cannot be controlled via CSS variables, use a React hook to dynamically monitor theme changes via a `MutationObserver`.
   - **Standard Hook Implementation:**
     ```jsx
     function useColorScheme() {
       const detect = () => {
         if (typeof document !== "undefined") {
           const scheme = document.documentElement?.getAttribute?.("data-color-scheme") 
                       || document.body?.getAttribute?.("data-color-scheme");
           if (scheme === "dark" || scheme === "light") return scheme;
         }
         if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)")?.matches) {
           return "dark";
         }
         return "light";
       };
       const [scheme, setScheme] = React.useState(detect);
       React.useEffect(() => {
         const observer = new MutationObserver(() => setScheme(detect()));
         if (document.documentElement) {
           observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-color-scheme"] });
         }
         return () => observer.disconnect();
       }, []);
       return scheme;
     }
     ```


## Map design elements to shell slots

The editor-shell renders fixed slots around the canvas. When a design includes
patterns that map onto these slots, render them via the matching optional
export — don't re-implement them inside the default component.

| Pattern in the design | Where it goes | Skill export |
|---|---|---|
| List of all regions / spans / labels | Regions outliner panel | `OutlinerItem` |
| Detail editor for the *selected* region (severity, notes, tags, range, etc.) | Region info panel | `InfoViewer` |
| Compact per-task card (data-manager grid view) | Data manager grid cell | `GridCell` |
| Extra controls after Submit/Update/Skip | Bottom bar | `BottomBarExtra` |
| Per-task summary stats (counts, coverage, metadata) | (no slot) | Render inline in the canvas, or rely on data-manager / dashboards |

Why this matters:
- The shell already handles selection, scrolling, keyboard navigation,
  panel resize, and **per-region Lock / Hide / Delete chrome** for these
  slots (FIT-2142 / FIT-2246). Re-rendering region rows in the canvas
  duplicates state with the shell's outliner and breaks shell features
  (filter, hide, lock, multi-select). Putting Lock/Hide/Delete buttons
  inside `OutlinerItem` / `InfoViewer` duplicates the shell chrome.
- A single design's "right sidebar with tabs for summary / list /
  inspector" almost always splits cleanly: list → `OutlinerItem`,
  inspector → `InfoViewer`, summary → either drop or move to a thin
  in-canvas strip.
- `OutlinerItem` and `InfoViewer` receive full `DynamicScreenProps` plus
  the region, so they can mutate via `addRegion` / `updateRegion` /
  `deleteRegion` for *content* edits. They are real React components in
  the same module, not isolated stubs — but leave Lock/Hide/Delete UI to
  the shell.

**Tiebreaker rule.** If the UI is per-region and the user needs it next to
*every* region, it's `OutlinerItem`. If it's about the *currently
selected* region, it's `InfoViewer`. If it's about the whole annotation,
it stays in the canvas.

## Optional exports

All sibling exports are optional. Add only the ones the interface needs.

### `getResults(regions, relations) => AnnotationResult[]`

Serializes the screen's regions/relations to Label Studio annotation results
on save. Without it, the shell falls back to a default mapping that handles
basic `choices`/`labels` cases but rarely matches a custom interface's intent.

> [!IMPORTANT]
> **Relations Serialization Rule:** Always accept `relations` as the second argument and serialize them back into the returned array. If you omit them (or if the custom `getResults` does not return `type: "relation"` results), the editor-shell will fall back to automatically serializing the active shell relations, but it is highly recommended to explicitly serialize relations in `getResults` to ensure full control over `from_name` and other custom properties.

```jsx
function getResults(regions, relations) {
  const regionResults = regions.map((r) => ({
    id: r.id,
    from_name: "label",            // must match a key in outputSchema
    to_name: "text",                // task data field name
    type: "choices",
    value: { choices: r.labels },
    origin: "manual",
  }));

  // Preserve relation results
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

### `parseResults(results) => { regions, relations? }`

Inverse of `getResults`. Called when an existing annotation is opened; populates
the initial `regions` array. Make it idempotent — it re-runs on every
`initialResults` change (task switches, undo, version reload). Never generate
fresh region IDs; reuse `r.id` from the input. To prevent relation results from
being swallowed or misinterpreted as regions, always filter out `r.type === "relation"`
when mapping regions.

> [!IMPORTANT]
> **Relations Deserialization Rule:** Always parse and return `relations` inside the returned object. While the editor-shell has a core fallback to reconstruct and backfill relations from `initialResults` if `relations` is missing or empty, it is critical that your custom interface returns the parsed relations to maintain consistency and avoid relying on fallback mechanisms.

```jsx
function parseResults(results) {
  const regions = (results || [])
    .filter((r) => r.type === "choices")
    .map((r) => ({
      id: r.id,
      type: "choices",
      labels: r.value.choices ?? [],
      colors: ["#999"],
      score: r.score ?? null,
      hidden: false,
      locked: false,
      selected: false,
      parentId: null,
      text: (r.value.choices ?? [])[0] ?? "",
    }));

  // Reconstruct relations
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
}
```

### Multi-select image URLs (`array` of strings, no `items.enum`)

Use this when the annotator selects **one or more image URLs** (or other plain strings) from task data — not named category labels from a params labels list. The platform infers one of three array kinds per property and rejects any other `getResults`/`parseResults` shape:

| Inferred kind | outputSchema | getResults `type` | getResults `value` |
|--------|--------------|-------------------|------------------|
| **Pass-through** | `array`, `items: { type: "string" }` (no `enum`) | `"labels"` | **bare array** `["url1", "url2"]` or `{ labels: [...] }` |
| **Multi-checkbox** | `array`, `items: { type: "string", enum: [...] }` | `"choices"` | `{ choices: ["A", "B"] }` (one aggregated region) |
| **Spatial per region** | `array`, `items: { type: "string", enum: [...] }` | `"keypointlabels"` (or `"rectanglelabels"`, text `"labels"`) | **one result per mark**: object with numeric coords + label key |
| Single category | `string` + `enum` | `"choices"` | `{ choices: ["Positive"] }` |

```jsx
const outputSchema = {
  type: "object",
  properties: {
    selected_images: {
      type: "array",
      items: { type: "string" },
      description: "URLs of images the annotator selected",
    },
  },
  required: ["selected_images"],
};

function getResults(regions, relations) {
  const regionResults = (regions || [])
    .filter((r) => r.type === "selected_images")
    .map((r) => ({
      id: r.id,
      from_name: "selected_images",
      to_name: "images",
      type: "labels",
      value: r.labels ?? r.urls ?? [],
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
}

function parseResults(results) {
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
}
```

`validateInterface()` rejects interfaces that use `value.choices` for the image-picker schema shape. Do not copy the single-choice `choices` pattern for image pickers.

### Ranking / reorder (`array` pass-through, one region)

Use when the annotator **reorders a list** (images, items, URLs) via drag-and-drop. Same pass-through serialization as multi-select image URLs: one stable region (`ranking-main`), order in `_rankedUrls`, **at most one** result from `getResults`.

| Field | Value |
|-------|-------|
| outputSchema | `ranking: { type: "array", items: { type: "string" } }` — prefer explicit `items`; bare `{ type: "array" }` also works |
| getResults `type` | `"labels"` |
| getResults `value` | bare ordered URL array `["url1", "url2", ...]` |

```jsx
const RANKING_REGION_ID = "ranking-main";

const outputSchema = {
  type: "object",
  properties: {
    ranking: {
      type: "array",
      items: { type: "string" },
      description: "Ordered image URLs, most relevant first",
    },
  },
  required: ["ranking"],
};

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

function parseResults(results) {
  const result = (results || []).find((r) => r.from_name === "ranking");
  const orderedUrls = result
    ? (Array.isArray(result.value) ? result.value : (result.value?.labels ?? []))
    : [];
  const regions = orderedUrls.length
    ? [{ id: RANKING_REGION_ID, type: "labels", labels: [], _rankedUrls: orderedUrls }]
    : [];
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
}
```

Never keep item order in `useState` — render from `rankingRegion._rankedUrls` only. See the ranking UI rules in CreateInterfaceModal for drag-and-drop patterns.

### Spatial per region — keypoints / image marks (`array` + `items.enum`)

Use the **spatial per region** row when the annotator **clicks on an image** (keypoints, boxes, polygons) and each mark has a category from `items.enum`. The platform infers **`spatial_per_region`** when `getResults` emits one result per mark whose `value` is an object with numeric coordinates and a label key — distinct from **multi-checkbox** (`enum_choices`) and **image URL pickers** (`pass_through`).

```jsx
function getResults(regions, relations) {
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
}
```

**`parseResults`** must handle **two input shapes** for the same `from_name`:

1. **Prompter / saved prediction** — `type: "choices"`, `value: { choices: ["red", "blue"] }` (categories only; backend `output_to_ls_regions` always emits this for `array + items.enum`). Expand each label into a shell region with **`_hasCoords: false`** so labels appear in the UI until the annotator clicks to place them. **Do not throw** on `choices` for spatial fields.
2. **Human annotation reload** — `type: "keypointlabels"` (or your spatial type) with `value: { x, y, width, keypointlabels: [...] }`. Copy coords to `_x` / `_y`, set `_hasCoords: true`. Throw only on malformed numeric coordinates here.

**Do not** use strict `throw` on `type === "choices"` when Prompter is enabled — real predictions use the same shape as save-time validation mocks. **Do not** return `{ regions: [] }` for choices (silent data loss). **Do not** remove `items.enum` to bypass validation.

`getResults` should keep `.filter((r) => r._hasCoords !== false)` so label-only Prompter regions are not serialized until the user places them.

Example `parseResults` for keypoints (Prompter + manual):

```jsx
function parseResults(results) {
  const regions = [];
  for (const r of results || []) {
    if (r.type === "relation" || r.from_name !== "keypoints") continue;

    // Prompter path: categories only, no coordinates yet
    if (r.type === "choices") {
      const labels = r.value?.choices ?? [];
      labels.forEach((label, index) => {
        regions.push({
          id: r.id ? `${r.id}-prompter-${index}` : `prompter-kp-${index}`,
          type: "keypointlabels",
          labels: [String(label)],
          colors: [],
          score: r.score ?? null,
          hidden: false,
          locked: false,
          selected: false,
          parentId: null,
          text: String(label),
          _width: 1,
          _hasCoords: false,
        });
      });
      continue;
    }

    // Saved keypoint path: full coordinates required
    if (r.type === "keypointlabels") {
      const value = r.value;
      if (typeof value !== "object" || value == null) {
        throw new Error("keypoints result value must be an object with x/y");
      }
      const x = Number(value.x);
      const y = Number(value.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        throw new Error("keypoints result has invalid x/y coordinates");
      }
      regions.push({
        id: r.id,
        type: "keypointlabels",
        labels: value.keypointlabels ?? value.labels ?? [],
        colors: [],
        score: r.score ?? null,
        hidden: false,
        locked: false,
        selected: false,
        parentId: null,
        text: (value.keypointlabels ?? value.labels ?? [])[0] ?? "",
        _x: x,
        _y: y,
        _width: value.width ?? 1,
        _hasCoords: true,
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
}
```

On click, store coordinates on underscore-prefixed region fields (`_x`, `_y`, `_width`, `_hasCoords: true`) — same persistence rule as NER `_start`/`_end`.

### Multi-control image bbox — boxes + per-region text + task rating + checkboxes

Use this recipe when the user asks for **image bounding boxes** together with **per-region description**, a **task-level star rating (1–5)**, and **task-level multi-checkbox flags** in one Custom Interface. This prompt pattern is common and fails Playground validation when the module mixes serialization contracts.

**One outputSchema field = one serialization contract.** Spatial bbox labels, task-level ratings, and task-level checkbox groups must each map to a distinct `getResults` / `parseResults` branch — never store task-level rating or odd flags on each bbox's `regionData`.

| UI control | `outputSchema` | `getResults` | Storage / notes |
|------------|----------------|--------------|-----------------|
| Bbox labels (Person/Car/Vehicle) | `array` + `items: { type: "string", enum: [...] }` | `type: "rectanglelabels"`, `value: { x, y, width, height, rectanglelabels, text? }` | One shell region per box with `_x`, `_y`, `_width`, `_height`, `_hasCoords: true`. Per-region description in `_description` → `value.text`. |
| Per-region description | (optional) carried in bbox `value.text` | included on each `rectanglelabels` result | Plain string on `_description` — **not** `{ text: "…" }` objects. |
| Image quality (1–5 stars) | `type: "integer"` (or `number`) with `minimum: 1`, `maximum: 5` | `type: "number"`, `value: { number: rating }` | **Task-level** hidden region (`task-image-rating`) with `_rating`. **Not** `array` of strings. |
| Odd-image checkboxes | `array` + `items.enum` (multi-checkbox) | **one** aggregated `type: "choices"`, `value: { choices: [...] }` | **Task-level** hidden region (`task-odd-flags`) with `_oddFlags`. Separate from bbox results. |

**`to_name` for round-trip:** `validateInterface()` mocks Prompter output with `to_name: "data"`. Use `to_name: "data"` on every `getResults` entry (or match your `inputSchema` target consistently) so annotation round-trip validation passes.

**`parseResults` must handle every `from_name` that `getResults` emits:**

1. **`boxes`** — dual shape like keypoints/PDF OCR: Prompter `type: "choices"` (categories only, `_hasCoords: false`) **and** saved `type: "rectanglelabels"` with full coordinates.
2. **`image_quality`** — `type: "number"` → restore hidden rating region with `_rating`.
3. **`odd_flags`** — `type: "choices"` → restore hidden checkbox region with `_oddFlags` / `labels`.
4. Filter `r.type === "relation"` before building regions; serialize relations in `getResults(regions, relations)`.

**Do not** (these produce a common validation failure loop when mixed):

- Model star rating as `array` + `items.enum` of `"1"`…`"5"` strings.
- Serialize rating from `regions[0].regionData` or store rating on each bbox.
- Use `type: "choices"` for rating while `outputSchema` declares `integer`/`number`.
- Declare `regionSchema` field types that contradict runtime shapes (e.g. `annoText: string` but store `{ text: "" }` objects).
- Use `string` + `enum` for bbox labels when drawing rectangles — use `array` + `items.enum` (spatial per region).
- Omit `data-region-id={region.id}` on bbox overlay elements when the interface supports relations.

**Canonical passing module:** `services/lse/web/apps/labelstudio/src/pages/Interfaces/__tests__/fixtures/multi-control-image-bbox-valid.jsx` — copy its `outputSchema`, `getResults`, `parseResults`, and task-level region patterns when implementing this prompt.

**Agent prompt template:**

```
Create a Custom Interface (Screen.jsx) for image bounding-box annotation with these requirements:

1. Labels: Person, Car, Other Vehicle — draw rectangles on task.data.image.
2. Per-region description: when a box is selected, show a textarea; persist as plain string in rectangle value.text (not nested objects).
3. Task-level image quality: 1–5 star rating stored in a dedicated hidden region (NOT on each region's regionData).
4. Task-level odd-image flags: multi-checkbox (Blurry, Occluded, Unusual lighting, Corrupted, Other anomaly).

outputSchema contracts (must pass validateInterface round-trip):
- boxes: array + items.enum → spatial per region → getResults emits type rectanglelabels with { x, y, width, height, rectanglelabels, text }
- image_quality: integer 1–5 → getResults emits type number with { number: rating }
- odd_flags: array + items.enum → getResults emits ONE type choices result with { choices: [...] }
- parseResults for boxes MUST handle Prompter type choices (categories only, _hasCoords false) AND saved rectanglelabels.
- Use to_name: "data" on all getResults entries.

Do NOT use regionData object shapes that contradict regionSchema. Put data-region-id on bbox overlays. Include paramsSchema, inputSchema, getValidationErrors, and onValidationChange when required fields are enforced.
```

### Brush / RLE mask performance (FIT-2030)

**Brush ≠ Polygon (FIT-2898).** A UI tool labeled Brush must emit `brushlabels` (pixel mask / RLE). Never implement Brush as freehand `polygonlabels`, circular vertex fans, or "one polygon segment for the entire stroke". Polygon remains click-vertices → close → `polygonlabels` + `points`.

Full-pixel `brushlabels` masks use RLE arrays (`_rle`, `_originalWidth`, `_originalHeight`).
Decoding RLE is expensive — **never decode the same mask on every `mousemove`**.

Canonical optimized example:
`services/lse/web/libs/editor-shell/examples/shark-brush-interface.jsx`

Required patterns for brush canvases with many regions:

1. **Mask decode cache** — `useRef(new Map())` keyed by `region.id + rle fingerprint`.
   Invalidate when `regions` changes (new task or committed edit).
2. **Live drag previews** — store `_offsetX` / `_offsetY` in a ref and repaint the overlay
   canvas. Call `updateRegion` **once** on pointer-up with the final shifted RLE.
   Do **not** call `updateRegion` on every pointer move during drag.
3. **Throttle hover hit-tests** — wrap `findRegionAtPoint` in `requestAnimationFrame`
   so decoding masks for hover runs at most once per frame.
4. **Commit strokes once** — accumulate brush strokes on an offscreen canvas during draw;
   encode RLE and `addRegion` only on pointer-up (not per point).

The editor-shell also treats `_offsetX` / `_offsetY`-only `updateRegion` patches as
**transient** (no undo snapshot or draft write per frame) for interfaces that still
sync offsets through the shell during drag.

### `paramsSchema` (JSON Schema)

Project-level configuration form. Renders as a settings panel in Labeling
Settings; resolved values are passed to the screen as `props.params`.

```jsx
const paramsSchema = {
  type: "object",
  properties: {
    labels: {
      type: "array",
      items: { type: "string" },
      title: "Labels",
      default: ["Positive", "Negative", "Neutral"],
      description: "Categories the annotator can choose from",
    },
    textField: {
      type: "string",
      title: "Text field",
      description: "Task data field containing the text to classify",
      default: "text",
    },
  },
  required: ["labels", "textField"],
};
```

### `outputSchema` (JSON Schema)

Declares what each annotation produces. **Required for Prompter (auto-labeling)
integration.** Each property key must match the `from_name` used in
`getResults`.

**Required fields:** Any control the user must fill in (textarea, choices,
keypoints they must place, etc.) MUST appear in `outputSchema.required`. Preview,
submit, and update validate against that list — a UI-only asterisk or `required`
prop in JSX is **not** enough. Draft autosave does **not** block on outputSchema
(partial work-in-progress is allowed). Omitting a field from `required` means the
platform treats it as optional even when the screen UI looks mandatory.

```jsx
const outputSchema = {
  type: "object",
  properties: {
    sentiment: {
      type: "string",
      enum: ["Positive", "Negative", "Neutral"],
      description: "Overall sentiment of the text",
    },
  },
  required: ["sentiment"],
};
```

For values that depend on `paramsSchema`, use `$param` **and** include an inline
`enum` (or `items.enum` for arrays) with the default option names:

```jsx
const outputSchema = {
  type: "object",
  required: ["sentiment"],
  properties: {
    sentiment: {
      type: "string",
      enum: ["Positive", "Negative", "Neutral"], // required for choices inference
      $param: "labels",                            // links to paramsSchema.labels
    },
  },
};
```

**Critical:** If `getResults` emits `type: "choices"`, the field
**must** have an inline `enum` (string fields) or `items.enum` (array fields)
in `outputSchema`. A bare `$param` reference without inline enum makes the
platform infer `textarea`, which blocks Submit with *"has type choices but
expected textarea"*. The `$param` alone does not satisfy validation — it only
links admin-configurable labels to the schema; the inline enum is what tells
the editor the result kind. System templates must keep `manifest.json`
`output_schema` and `Screen.jsx` `outputSchema` enums in sync.

### `inputSchema` (JSON Schema)

**Load when:** the screen consumes `task.data` (see **Schemas & sample data** above).

Declares which `task.data` fields the interface reads. Drives import validation,
Data I/O mapping, and Prompter input shape.

Each consumed field must be a property with **`type: "dataField"`**. Mirror
keys and `default` values from the corresponding `paramsSchema` entries
(e.g. `textField`, `imageField`).

```js
const inputSchema = {
  type: "object",
  properties: {
    textField: {
      type: "dataField",
      dataType: "string",
      default: "text",
      description: "Task data field containing the text to classify",
    },
    imageField: {
      type: "dataField",
      dataType: "string",
      default: "image",
      description: "Task data field containing the image URL",
    },
    imagesField: {
      type: "dataField",
      dataType: "array",
      default: "images",
      description: "Array of image URLs in task.data",
    },
  },
};
```

Rules:

- Property keys match `paramsSchema` (e.g. `textField`), not the raw task-data key alone.
- `dataType` is required: `"string"`, `"number"`, `"array"`, or `"object"`. URL/image lists use `"array"`. Numeric ID columns (pin IDs, user IDs, SKUs) use `"number"` — CSV import auto-types numeric columns as integers.
- `paramsSchema` field-mapping params store column **names** (`type: "dataField"` or `"string"`); value types belong here in `inputSchema.dataType` only — never put `type: "int"`/`"number"` on `*Field` params in `paramsSchema`.
- `default` is the key in `task.data` (e.g. `"text"` → `task.data.text`).
- Include a `description`.
- Sample-data keys **must** use those `default` paths — never `textField` / `image1` when default is `text` / `images`.
- One array dataField → one array at that path: `{ "images": [url1, url2] }`.

**Worked module + `task.json`:** [examples.md](examples.md) — Text Classification
(only load when scaffolding that pattern).

### Preview sample data

Applies to Interface Builder `generate_sample_data`, SDK `task.json` /
`sample.json`, and API `data_sample`:

- Keys = every `dataField` **`default`** path in `inputSchema` / `paramsSchema`.
- Prefer `/static/interface-agent-assets/...` for media (e.g. `nasa-earthrise-lro.jpg`).
- Image arrays: **`.jpg` only** (never `.mp4` / `.mp3` in an image list).
- Video / audio fields: `.mp4` / `.mp3` respectively.
- The host may rewrite mismatched media URLs to the declared modality.

### `GridCell` (component)

Compact card renderer for the data manager grid view. Targets ~200×150px.
Display-only — no buttons, no inputs (the grid handles `onClick`).

```jsx
const GridCell = ({ task, params, onClick }) => {
  const text = getField(task.data, params?.textField) ?? "";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }}
      style={{ padding: 12, cursor: "pointer", overflow: "hidden" }}
    >
      <div style={{ fontSize: 12, color: "#64748b" }}>Task #{task.id}</div>
      <div style={{ fontSize: 14, marginTop: 4, lineHeight: 1.4 }}>
        {String(text).slice(0, 120)}
      </div>
    </div>
  );
};
```

### `OutlinerItem`, `InfoViewer`, `BottomBarExtra`

- `OutlinerItem` — custom **content** renderer for each region in the regions
  panel. Receives `DynamicScreenProps & { region, index }`.
- `InfoViewer` — custom **content** renderer for the selected region.
  Receives `DynamicScreenProps & { region }`.
- **Shell-owned actions (FIT-2142 / FIT-2246):** the editor-shell wraps
  `OutlinerItem` with Lock + Hide, and wraps `InfoViewer` with Lock + Hide +
  Delete. Do **not** render Lock / Hide / Unlock / eye / Delete / "Delete Span"
  controls inside these slots — that duplicates chrome in Regions and Info
  panels (especially common on generated Audio interfaces). Export content
  only (label, time range, notes, field editors).
- `BottomBarExtra` — extra controls *after* the shell's Submit/Update/Skip.
  The **only** sanctioned place a screen may call `submitAnnotation()`,
  `skipTask()`, etc. Receives `DynamicScreenProps & BottomBarActions`.
  If you show required-field error counts here, reuse the same helper as
  `getValidationErrors` / `onValidationChange` — BottomBarExtra alone does
  **not** disable shell Submit/Update (BROS-1379).

### `onBeforeUpdate(regions, change) => boolean | RegionChange | void`

Pre-mutation hook — return `false` to reject, a modified `RegionChange` to
alter, or `void` to allow. Runs on every region/relation mutation. Keep it
cheap.

### `regionSchema` / `structure`

Optional metadata for the data manager and the Interface Overview panel. Add
when you have time; the interface works without them.

### `hotkeys` (Dynamic Project Hotkeys Manifest)

Declares custom remappable keyboard shortcuts for the interface. When this interface is used by a project, these shortcuts are dynamically registered in the project's Hotkey Settings (`/user/account/hotkeys?project=<id>`), allowing annotators to customize keybindings per-project without modifying code.

```javascript
hotkeys: {
  name: "DocumentReview",
  title: "Document Review Shortcuts",
  description: "Shortcuts for annotating, reviewing, and approving documents",
  actions: {
    approve: {
      id: "approve",
      label: "Approve Document",
      defaultHotkey: "ctrl+enter",
      description: "Mark current document as approved",
      scope: "canvas", // "canvas" | "component" | "global"
    },
    flagReview: {
      id: "flagReview",
      label: "Flag for Review",
      defaultHotkey: "f",
      description: "Flag task for senior review",
      scope: "canvas",
    },
  },
}
```

In your component, consume `props.hotkeys` with `window.InterfaceComponents.useComponentHotkeys`:
```javascript
const useComponentHotkeys = window.InterfaceComponents.useComponentHotkeys;

function MyScreen(props) {
  useComponentHotkeys({
    componentName: "DocumentReview",
    actions: {
      approve: () => handleApprove(),
      flagReview: () => handleFlag(),
    },
    assignedHotkeys: props.hotkeys, // Resolves user remappings from project settings
    readOnly: props.readOnly,
  });
  // ...
}
```

## Validation criteria

The editor's `validateInterface()` (`interface-utils.ts`) blocks save on:

- Compile error (Sucrase reject — usually TypeScript leftover or stray `import`).
- Undefined component — JSX references a `<PascalCase>` component that isn't
  defined anywhere in the file.
- Module missing `default` function export.
- **`validateArrayOutputSerialization`** — `getResults` must match the inferred
  array output kind for each `outputSchema` property:
  - **`pass_through`** — bare array or `{ labels: [...] }`, `type: "labels"`.
  - **`enum_choices`** — `{ choices: [...] }`, `type: "choices"` (multi-checkbox).
  - **`spatial_per_region`** — one result per spatial mark with object
    `value` containing numeric coordinates and the label key (`keypointlabels`,
    `{ start, end, labels }`, etc.).
- **`validateSpatialRegionSerialization`** — round-trip fixture checks that
  `getResults` copies every positional `_` field (`_x`, `_y`, `_start`, `_points`, …) into
  `value`, and `parseResults` does not silently drop malformed coordinates.
  Per mark type, `value` must include the matching label key (`keypointlabels`,
  `rectanglelabels`, `brushlabels`, `polygonlabels`, `ellipselabels`, or `labels` for NER).
  Brush marks use `x`/`y`/`width`/`height` for bounding-box masks, or `format: "rle"` with
  an `rle` array for full pixel masks. Polygons require `points` (array of `[x, y]` pairs).
  Ellipses require `x`, `y`, `radiusX`, and `radiusY`.
- **`validateStaticEncodedCoordSource`** — static scan of source for
  `label + "@" + x + "," + y` patterns in `getResults` / `parseResults`.
- **`validateAnnotationRoundTrip`** — `getResults` ↔ `parseResults` consistency,
  including rejection of encoded coord strings in round-trip fixtures.
- **`validateOutputSchemaConsistency`** — every `outputSchema` property key is
  handled in `getResults` / `parseResults`; Prompter mock results must not crash
  `parseResults` or return zero regions.
- **`validateShellValidationReporting`** — when the interface shows custom
  required-field errors (canvas banners, `BottomBarExtra`, or a
  `collectValidationErrors` helper), the module must export
  `getValidationErrors(regions, relations, params)` **and** call
  `props.onValidationChange?.(errors)` from a `useEffect` on region/form
  changes. Local error UI alone does not gate shell Submit/Update.

The Interface Builder AI agent loop runs the same checks via
`validateInterfaceInSandbox()` (evaluates the module, then runs array/spatial
serialization validators — not just iframe round-trip). **Do not claim
"validation passed" in chat**; only platform validation after artifact changes
counts.

### Runtime outputSchema validation (labeling + preview)

After the interface is saved, `validateResultsForCustomInterface` (editor-shell;
mirrors Python `validate_result_against_output_schema`) runs on submit/update and
in Interface Builder preview:

| Surface | When | Behavior |
|---|---|---|
| **Submit / Update** | User clicks Save or Update | `assertValidOutputResults` throws; Submit/Update disabled with tooltip via `outputValidationErrorsAtom` (fed by `onValidationChange`, `getValidationErrors`, and `outputSchema`); Ctrl+Enter blocked |
| **Draft autosave** | Debounced `onSaveDraft`, annotation switch flush, history flush | **Not** gated on outputSchema — partial/incomplete drafts persist so users can switch tasks and return |
| **Interface Builder preview** | Read-only `onPreviewOutputChange` polling of `getResults()` | Shows `OutputSchemaValidationBanner`; does **not** POST drafts — only the labeling stream writes drafts |

Rules enforced (same three array kinds as FIT-1846, plus required-field checks):

- **`outputSchema.required`** — missing `from_name`, or present-but-empty values
  (e.g. textarea with `value.text: ""`) produce errors like
  `Missing required output field "notes"` or `Required output field "notes" is empty`.
- **Array kinds** — `pass_through`, `enum_choices`, `spatial_per_region` must match
  `getResults` serialization (wrong `type` or `label@x,y` strings fail).
- **`$param` resolution** — enums resolved from merged project params at validation time.

When authoring, list every mandatory output field in `outputSchema.required` and
ensure `getResults` always emits non-empty values for them before the user can
submit or update.

Save-time `validateInterface()` warns (does not block) on:

- Missing `getResults` — fallback serialization may not match your intent.
- Missing `parseResults` — saved annotations may not load back correctly.
- Missing `outputSchema` — auto-labeling won't work.
- Missing `paramsSchema` — interface won't be configurable per project.
- `getResults`/`parseResults` crash when given empty inputs.
- **Accessibility basics** — clickable non-button elements (`<div>`,
  `<span>`, `<canvas>`, etc.) with `onClick` but without `role`, `tabIndex`,
  and keyboard handler (`accessibility_basic_check`). See the **Accessible click
  targets** hard rule above.

A non-trivial interface should ship `getResults`, `parseResults`,
`outputSchema`, and `paramsSchema` together — they reference each other
(property keys, `$param` references, from_name values) and are easier to
keep consistent if written as a unit.

## Converting a Claude Design bundle

Claude Design (claude.ai/design) handoffs are a common input. A bundle is a
gzipped tar archive served from `https://api.anthropic.com/v1/design/h/<id>`
containing Babel-standalone HTML/JSX prototypes. The output target is the
same single JSX module described above — this section covers what's
specific to that source.

### Fetch and unpack

The URL returns `application/gzip`, which `WebFetch` will mishandle. Pull it
directly:

```bash
DESIGN_URL='https://api.anthropic.com/v1/design/h/<id>'
mkdir -p /tmp/claude-design && cd /tmp/claude-design
curl -L "$DESIGN_URL" -o design.tar.gz
tar -xzf design.tar.gz
```

### Bundle layout

```
<project-name>/
├── README.md                 # boilerplate handoff instructions
├── chats/chat*.md            # design conversation — read first; intent lives here
└── project/
    ├── index.html            # entry — defines load order of src/*.jsx
    ├── colors_and_type.css   # CSS custom properties (--color-sand-100, etc.)
    ├── fonts/                # web fonts
    ├── assets/icons/*.svg    # icon sprite
    └── src/*.jsx             # components — global scope, no import/export
```

Read `chats/chat*.md` before the source. It records the user's intent and
where they landed after iterating, and disambiguates which knobs are real
configuration (→ `paramsSchema`) vs. demo conveniences (→ drop) and what
the labeling output should be (→ drives `getResults` and `outputSchema`).

### Conversion mapping

| Claude Design source | Custom Interface output |
|---|---|
| Multiple `<script type="text/babel" src="src/*.jsx">` tags | Concatenate into one file in the order listed in `index.html` (primitives → leaves → root component last). Globals declared via `/* global X */` comments resolve naturally once concatenated. |
| `ReactDOM.createRoot(...).render(<App/>)` at the bottom of `app.jsx` | **Drop.** The shell mounts the default export. |
| `React.useState`, `React.useEffect`, etc. | Keep as `React.foo` or rewrite to bare `useState` — both are injected globals. |
| `window.TWEAK_DEFAULTS` + `<TweaksPanel>` + `__activate_edit_mode` / `__deactivate_edit_mode` postMessage | Translate the defaults to `paramsSchema` (each tweak key becomes a property with its default as `default:`). **Delete** the panel UI and the postMessage listener — that's a Claude Design host contract, not Label Studio's. Project-level configuration renders from `paramsSchema` in Labeling Settings. |
| Top-level mock data (`INITIAL_SPANS`, `T_SECONDS`, video URL, signal arrays) | Decide per constant: data that varies per task → read from `props.task.data` via `getField`; static fixtures (severity color tables, channel definitions) → keep inline; deterministic synthetic data (PRNG signals) → keep only if the demo must work without real data, otherwise replace with task data. |
| Local region state (`const [spans, setSpans] = useState(INITIAL_SPANS)`) | Read from `props.regions`; mutate via `addRegion` / `updateRegion(id, patch)` / `deleteRegion(id)`. **Reuse existing `region.id` — never regenerate inside render.** Domain fields (severity, notes, start/end seconds, channel id) go under underscore-prefixed keys (`_severity`, `_notes`, `_startSec`, `_endSec`, `_channelId`); `region.text` is the human label for the outliner panel. |
| Ranking / reorder UI (`useState` for item order) | One region (`ranking-main`). **Render list from `rankingRegion._rankedUrls` only** — no `useState` for order/items and no `useEffect` syncing regions into state (causes duplicate rows on drag). Seed once with `addRegion`; reorder with `updateRegion` only. `useState` OK for `draggedIndex` / drag UI chrome only. |
| NER/text span mock data (`INITIAL_ENTITIES`, highlighted words, extracted entity strings) | Convert each entity to a region with absolute `_start` / `_end` offsets into the original task text and `_text` equal to `text.slice(start, end)`. Do not use `text.indexOf(entity.text)` during render; repeated entities will highlight the wrong occurrence. |
| Image click / keypoint mock data (pins on a photo, bbox corners) | One region per mark with `_x`, `_y`, `_width`, `_hasCoords: true`. `getResults` emits one `keypointlabels` (or `rectanglelabels`) result per mark with `value: { x, y, keypointlabels: [...] }`. Never aggregate coordinates into `"label@x,y"` strings or a single bare array. |
| `<link rel="stylesheet" href="colors_and_type.css">` | Inline the `:root { --color-...: ...; }` block as a `<style>` element rendered inside the component. The iframe cannot reach the parent's stylesheets and the relative path won't resolve. |
| `@font-face` rules pointing at `fonts/*.woff` | Drop. Substitute system stack: `font-family: ui-sans-serif, system-ui, sans-serif`. |
| `<img src="assets/icons/foo.svg">` and the `Icon` global | Inline each used SVG as a tiny React component (string literal in JSX) or via `dangerouslySetInnerHTML`. Sandbox `connect-src` will not resolve relative asset paths. |
| `getResults` / `parseResults` / `outputSchema` | Not present in the bundle — author them based on the spans/regions the design produces and what the chat transcript says the labeling output should be. |

### Gotchas specific to Claude Design

- **React 18 vs. 17.** Bundles target React 18; the LSE sandbox provides
  React 17. Strip the `createRoot` call (you're not booting anyway), and
  avoid `useId` and concurrent-only APIs.
- **`document.documentElement.setAttribute("data-color-scheme", ...)`** for
  dark mode targets the *iframe* document, not the parent. Keep it only if
  the inlined CSS variables actually reference `data-color-scheme`;
  otherwise remove. Don't expect this to theme the host.
- **CDN `<script>` tags in `index.html`** are informational — the sandbox
  already provides React. Never try to inject `<script>` from inside the
  module.
- **Region ID stability.** `INITIAL_SPANS` typically uses hard-coded IDs
  (`s1`, `s2`). After `parseResults` runs, IDs come from saved annotation
  results. For *new* regions created in event handlers, mint a stable ID
  once (`crypto.randomUUID()` or `\`span-${Date.now()}-${i}\``); never inside
  render.
- **`/* eslint-disable */` and `/* global ... */` headers** at the top of
  every source file — strip them; they're prototype scaffolding.
- **`window.parent.postMessage(...)`** for edit-mode handshakes — strip.
- **No redundant sidebar event/region lists.** Rely on the platform's native Regions sidebar panel for selection, visibility toggle, and deletion. Keep the custom interface sidebar simple (e.g. only label palette and details of the currently selected event) instead of duplicating the region lists.

## Streaming Audio & Video Waveform Interfaces

When generating custom interfaces that render waveforms for large audio (or video) streams, use the platform's progressive `WasmStreamingDecoder` (available inside the sandbox via `EditorDeps.audioDecoder.WasmStreamingDecoder`). Follow these strict guidelines to ensure high performance and avoid crash/thread-lock fallbacks:

### Guidelines & Rules
1. **Never use heavy Web Audio API fallbacks:**
   - ❌ **Do not** write fallback code that fetches the entire audio file and calls `AudioContext.decodeAudioData()`. This defeats the purpose of streaming and causes memory leaks and out-of-memory crashes on large files.
2. **Compute chunk indices and offsets mathematically in \(O(1)\):**
   - ❌ **Do not** loop from `0` to `chunks.length` to build a cumulative sample offsets array. Reading from the Proxy array elements eagerly triggers `load-chunk` messages for all off-screen/non-visible chunks.
   - instead, calculate chunk offsets mathematically using the known metadata properties (`duration`, `sampleRate`, `samplesPerChunk`):
     - `totalSamples = Math.round(decoder.duration * decoder.sampleRate)`
     - `chunkIndex = Math.floor(globalSampleIndex / samplesPerChunk)`
     - `offsetInChunk = globalSampleIndex % samplesPerChunk`
3. **Register the visualizer options on the parent decoder:**
   - Ensure the parent-side `SandboxedShell` is passed the options tracking zoom and scroll position via the `WasmStreamingDecoder` constructor, which automatically filters out-of-bounds chunks on visible range updates.
4. **Debounce range updates:**
   - Wrap `decoder.setVisibleRange(start, end)` in a debounced effect (e.g. 120ms timeout) so that scroll/drag interactions do not flood the postMessage boundary.
5. **Dynamically auto-normalize peak amplitude globally:**
   - Audio streams can have very low amplitude/volume. To prevent the waveform from jumping/shrinking when scrolling or zooming, calculate the maximum peak amplitude globally across all currently loaded chunks (e.g., stepping through Float32Arrays with a step of 256 for O(N/256) performance) rather than only the visible viewport.
6. **Separate Multi-Channel Rendering & Labeling:**
   - If the task requires separate channel identification, read the channel count from `decoder.channelCount` (defaulting to 1 when the decoder is not yet ready).
   - Render a separate timeline track/lane and waveform canvas per channel index (`decoder.chunks[channelIndex]`).
   - Tag the corresponding channel index on the region object (e.g. `_channel` in-memory).
   - In `getResults`, serialize the channel identifier to `value.channel = Number(r._channel ?? 0)`.
   - In `parseResults`, deserialize and restore `_channel` from `value.channel`.
7. **Timeline Navigation Options:**
   - If building zoomable/scrollable timeline visualization, prefer scroll-prevention wheel zoom (`Alt / Ctrl / Meta + Wheel` centering on the mouse cursor) and panning (`Shift + Wheel` or horizontal trackpad scroll) using native listeners to avoid browser scroll conflicts.
8. **Track Height:**
   - When rendering waveform tracks, ensure default track height is large enough (e.g., `120px` to `150px`) to keep peak features legible. Avoid very small tracks unless explicitly requested.
9. **Limit Maximum Zoom Duration for Performance:**
   - For long audio/video files, cap the maximum timeline viewable span (`viewEnd - viewStart`) at 10 minutes (600 seconds). Enforcing this limit in zoom adjustments, fit operations, and initial loading ensures the interface is never forced to download and decode excessive chunk ranges at once.
10. **Interactive Click-to-Seek vs Drag-to-Create & Paging Viewport:**
    - To allow users to click anywhere on the waveform lanes to seek, track pointer down coordinates and timestamp in `onPointerDown`. In `onPointerUp`, if pointer movement is minimal (e.g. < 5px) and duration is short (e.g. < 250ms), seek to the clicked timestamp instead of creating a region.
    - If a region is created, skip creation if no label is active.
    - Implement a paging-style viewport shift: when the playhead (`currentTime`) reaches the end of the viewport (`viewEnd`), shift the viewport over so the playhead starts from the beginning of the next viewport window, maintaining high performance by minimizing canvas redraw frequency. Same paging applies when playhead goes backward or on manual out-of-bounds seeking.

### Canonical Waveform Sample Extraction
```javascript
function sampleFromChunks(channelChunks, decoder, fromSample, toSample, columns) {
  if (!channelChunks || !channelChunks.length) return null;
  const totalSamples = Math.round(decoder.duration * decoder.sampleRate);
  const samplesPerChunk = decoder.samplesPerChunk || decoder.sampleRate * 10;
  const span = Math.max(1, toSample - fromSample);
  const peaks = new Array(columns);
  let hasData = false;

  const sampleAt = (globalIdx) => {
    if (globalIdx < 0 || globalIdx >= totalSamples) return 0;
    const chunkIndex = Math.floor(globalIdx / samplesPerChunk);
    const offsetInChunk = globalIdx % samplesPerChunk;
    const chunk = channelChunks[chunkIndex];
    if (!chunk) return 0;
    return chunk[offsetInChunk] || 0;
  };

  for (let col = 0; col < columns; col++) {
    const a = fromSample + Math.floor((col / columns) * span);
    const b = fromSample + Math.floor(((col + 1) / columns) * span);
    let mn = 1;
    let mx = -1;
    const step = Math.max(1, Math.floor((b - a) / 256));
    for (let s = a; s < b; s += step) {
      const v = sampleAt(s);
      if (v < mn) mn = v;
      if (v > mx) mx = v;
      if (v !== 0) hasData = true;
    }
    if (mx < mn) {
      mn = 0;
      mx = 0;
    }
    peaks[col] = { min: mn, max: mx };
  }
  return hasData ? peaks : null;
}
```
