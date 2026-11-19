<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Interface Components: ImageCanvas

## Interface Components: ImageCanvas

`window.InterfaceComponents.ImageCanvas` replaces classic `<Image>` with `<RectangleLabels>`, `<PolygonLabels>`, `<EllipseLabels>`, `<KeyPointLabels>`, `<BrushLabels>`, `<BitmaskLabels>`, `<VectorLabels>` and `<MagicWand>`. Zoom/pan (ctrl/⌘ + wheel zooms at the cursor; a plain wheel scrolls the page), rotation handles, vertex editing, crosshair, brightness/contrast, grid and hotkeys are built in.

Props: `imageUrl`, `regions`, `selectedRegionIds`, `onAddRegion`, `onUpdateRegion`, `onDeleteRegion`, `onSelectRegion(id | null, { additive })`, `activeLabels`, `labelColors`, `fromName`, `toName`, `tools`, `activeTool` + `onToolChange`, `brushSize`, `keypointSize`, `vectorClosable`/`vectorMinPoints`/`vectorMaxPoints`, `magicWandThreshold`/`magicWandBlurRadius`, `crossOrigin`, `crosshair`, `showRegionLabels`, `zoomOnWheel`, `initialZoom`/`minZoom`/`maxZoom`, classic `<Image>` options `smoothing`, `grid`/`gridSize`/`gridColor`, `negativeZoom`, `zoomBy`, `defaultZoom` ("fit" | "original" | "auto"), `zoomControl`, `rotateControl`, `zoomToSelected`, plus `showToolbar`, `toolbarOrientation` (`"vertical"` compact rail on the left — default; `"horizontal"` floating bar on top — set it when the user asks for a horizontal / top toolbar), `grid` / `crosshair` (initial state of the toolbar's own toggles — leave off unless asked), `showLayers` (default false — leave off; shell Outliner owns the region list), `showImageControls`, `itemIndex`, `view` + `onViewChange`, `relationLinkingSource`, `onImageLoad({ width, height })`, `readOnly`, `hotkeys`. Compound members: `ImageCanvas.Root`, `.Viewport`, `.Toolbar`, `.Tool` (one tool button), `.ToolOptions` (options of the active tool: brush size, Magic Wand tolerance / CORS status), `.BrushSize`, `.ViewOptions` (grid + crosshair toggles), `.ZoomControls`, `.ImageControls` (brightness/contrast), `.LayerManager` (Storybook/debug; default off — shell Outliner owns the region list; windowed; double-click zooms), `.RegionsOverlay`, plus `ImageCanvas.Group` for several images (below).

**outputSchema** for the labels `fromName` (one LS result per mark: `rectanglelabels`, `polygonlabels`, `keypointlabels`, …): declare it as an array of label categories, `"label": { "type": "array", "items": { "type": "string", "enum": [...labels] } }` — written in JS as `label: { type: "array", items: { type: "string", enum: [...labels] } }` (add `$param: "labels"` to `items` when the labels come from params). Never a single-choice `{ type: "string", enum }` (expects `choices` and rejects spatial results); geometry lives in each result's `value`, so the schema only lists the categories. Answers about a mark (AnswerForm `scope: "region"`) get their own top-level properties; see the AnswerForm skill for serializing them so Save validation passes.

For manual mask editing, compose `<ImageCanvas.MaskTools />` (included in the default canvas) and pass the shell's `mutationRevision` plus `applyRegionTransaction` for compound changes. `brushShape` chooses circle/square; `maskDrawingMode` chooses freehand, line, polygon or lasso. Corresponding `onBrushShapeChange` and `onMaskDrawingModeChange` callbacks support controlled configuration. Area drafts support Enter, Escape and draft undo. `maskOverlapPolicy` defaults to allow; exclude skips all competing occupancy, overwrite removes only touched editable pixels in the same command and protects hidden/locked masks. `onMaskOverlapPolicyChange` supports controlled policy. `maskOverlapScope` is image, control (default), or label (shared labels inside a control), always scoped to one image/item. Whole-instance move/merge conflicts reject instead of clipping. Erasing only changes the target. Existing overlaps are retained until an explicit operation changes them. MaskTools previews four-connected clicked-background/all-background/hole fills and explicit-survivor merge/split. Hidden masks participate. Split preserves single-pixel islands, inherits answers, keeps references on the chosen original-ID component and never duplicates relations. Cancel and stale revisions commit nothing. Missing atomic capability blocks compound changes explicitly; single standalone painting remains available.

Large brush and bitmask commits serialize their existing classic RLE or PNG payloads in a cancellable worker. Input pixel buffers remain available to the preview; successful batches publish atomically through the host callback. Cancellation or worker failure does not publish a partial result. The pending status remains visible during preparation; do not promise a fixed 4K/8K latency without measuring the actual image dimensions and browser.

Threshold painting uses `maskThreshold` and `onMaskThresholdChange(value|null)`: intensity `{mode:'intensity',range:[min,max]}`, RGB `{mode:'rgb',red:[min,max],green:[min,max],blue:[min,max]}` or HSV `{mode:'hsv',hue:[min,max],saturation:[min,max],value:[min,max]}`. Intensity is rounded Rec709 source luma; intensity/RGB use 0–255, hue 0–360, saturation/value 0–100, all inclusive. Hue min>max wraps across red. Optional `alphaMin` is 1–255 (default1); transparent source pixels are excluded. Null disables filtering. ToolOptions includes range controls and a source-pixel eyedropper. The predicate intersects each manual paint/erase footprint before mask ownership; display brightness/contrast never change eligibility. Pixel-access failures explain unavailability while leaving unfiltered manual drawing usable. ToolOptions also provides Show eligible pixels and preview opacity: a display-only whole-image overlay and count using the same original-pixel predicate before mask ownership. It follows zoom/pan/rotation, is independent of brightness/contrast, never intercepts drawing or persists in results, and remains inspectable in read-only mode when a threshold exists. Generation yields between bounded tiles; source/config changes, disabling and unmounting cancel stale work.

For polygon editing, compose `<ImageCanvas.PolygonTools />` (creation is included in the default canvas; selected operations appear in the canvas-owned Info portal). A circular/square polygon brush creates, adds or erases a continuous swept footprint, using existing `brushSize` in natural-image pixels and `brushShape` plus their controlled callbacks. Release, review and Apply once; cancel leaves annotations unchanged. Keyboard: Space begins, arrows move one source pixel (Shift: ten), Enter prepares and Escape cancels. Cancellable worker preparation supports up to 4096 samples and 500 source-pixel diameter; oversized strokes reject without partial commits. Creation uses the atomic transaction path; host side effects attached only to onAddRegion must also be handled there. Creation requires the Polygon tool to be active so the host supplies polygon labels and control binding; Add/Erase can edit selected polygons in Select mode and retain the selected instance. No shadow or animation is applied. Union, subtract, intersection and split keep simple boundaries in classic `polygonlabels` where metadata permits, and preserve holes/islands or extended part metadata as versioned `multipolygonlabels`; choose an explicit target, then review and Apply. Union remaps consumed IDs; subtract/intersection preserve cutter regions. Extend/erase capture an area. Boundary replacement preserves exact endpoints and the untouched forward-ring complement; ordinary straight polylines are supported, branched/curved paths reject explicitly. Coarseness uses `freehandTolerance` natural pixels. Every operation requires the atomic host capability, respects protection, cancels safely and survives native serialization. Invalid topology, empty outputs, point-touch-only multipart boundaries and legacy split shape/label conversion reject with reasons instead of silently flattening geometry. Comments and discussion functionality belong to the host, outside these components.

For persisted vector stacking, include `<ImageCanvas.OrderingControls />` in a Root composition, or use the existing LayerManager. Pass host `mutationRevision` and `applyRegionTransaction`; without both the controls explain the missing atomic capability and never fall back to sequential updates. Tab and Enter operate the buttons. Bring forward/backward moves each selected block one unselected neighbor; bring to front/back moves the selection to the end while retaining its relative order. Scope includes rectangles, polygons, multipart polygons, ellipses, keypoints and vector paths on the current image. Raster masks remain below vectors. Protected selections reject; unselected protected neighbors never change. Hidden vectors keep their place in the stack. Geometry, IDs, answers, relations and selection are untouched. Finite `_zIndex` values mirror native `meta.imageCanvas = {version:1,zIndex}`, preserving unrelated metadata; absent ranks use original input indices, equal ranks retain input order. Unknown metadata versions stay opaque and cannot be reordered. Numerically ambiguous moves reject without changes; an end move may remain available. Native save/reload retains ranks, while exporters that ignore this optional metadata do not promise stacking. Reuse existing hide/lock/focus, class colors, labels and regionStyle opacity for inspection. Do not imply mask ownership or mixed raster/vector stacking.

For display-only pointer integrations, pass `onImagePointerMove(point)`. It reports unsnapped natural-source pixels as `{x,y}` through the existing zoom/pan/rotation transform, including read-only viewing. The optional second argument `{scale}` is the current CSS-pixels-per-source-pixel scale for screen-sized display effects. A null point clears hover outside the loaded image, on pointer leave, source reset and unmount. It never creates or edits annotations; a composing multi-sensor interface remains responsible for verifying calibration and exact source identity.

For camera and other coordinate adapters, optional `transformImagePoint(point, context)` maps natural source-pixel coordinates for drawing/geometry only; masks, pan and raw hover retain their normal behavior. Optional `onGeometryHandleSelection(selection | null)` observes the current vertex, resize or control handle without owning annotations; use it to route adapter-specific keyboard operations and clear the target on null. Adapters that render their own controls as image regions can use `regionGestureMode="translate"` to reserve body pointer modifiers and bypass additive selection or implicit path topology gestures; omit it for standard ImageCanvas behavior.

For already-aligned ordinary raster overlays, pass `overlayLayers={[{id, label, imageUrl, visible: true, opacity: 0.5}]}` and `onOverlayLayersChange={setOverlayLayers}`. Keep this controlled array in local React state, never in annotation results; order is back to front below annotations. Each image must have exactly the base image's natural dimensions. Mismatched images are hidden with a status; no registration, resizing or geospatial transform is performed. Zoom, pan, rotation and image adjustments apply to all layers together. Overlay pixels are never read by annotation tools or exported. Visibility/order/opacity controls remain available in read-only mode, but are disabled without a change callback. Loading errors have independent Retry controls and never disable the base image. Per-layer `crossOrigin` accepts `"none"` (default), `"anonymous"` or `"use-credentials"`; the server must support a requested CORS mode. The standard canvas includes overlay controls; custom compositions must include `<ImageCanvas.OverlayControls />` inside `ImageCanvas.Root`. Omit overlays unless the task explicitly supplies aligned image layers; do not treat separate Group images as registered overlays.

Polygon/polyline Tool options expose `pathDrawingMode` (`"click"` default or `"freehand"`), `freehandTolerance` (default 1 natural-image px) and `boundarySnapping` (false default; true or `{tolerance: 8}` in CSS screen px). Omit these props for local toolbar state, or wire their matching `onPathDrawingModeChange`, `onFreehandToleranceChange` and `onBoundarySnappingChange` callbacks for a controlled Screen. Snapping prefers vertices, then straight edges, shows a target ring and temporarily bypasses on Alt; pixel snapping remains independent. Only visible active-image polygons, rectangle corners/edges, straight vector segments/vertices and keypoints participate. Protected neighbors can be targets because coordinates are copied; later edits do not move them. Curved edges, persistent shared topology and automatic shared-edge tracing are not implemented.

Freehand capture supports closed polygons and new straight open polylines; skeletons and existing vector extensions remain point-by-point. Drag, release into the local draft, then Enter/double-click/Finish path to commit once; Escape cancels, Undo/Redo removes/restores a captured stroke. Pan preserves a released draft; another tool cancels an unfinished freehand draft. Coarseness is an endpoint-preserving simplification bound: the sampled path (after snapping and image-boundary clipping) remains within that many natural-image pixels of the simplified result. Snapped samples stay pinned. Source crossings/overlapping retraces and invalid closed rings reject visibly before commit; if simplification alone would invalidate a valid path, the original sampled path is kept. No holes/multipart geometry or Boolean operations are introduced.

Tools are pluggable: pass exactly the ones the project needs in `tools` (each has a scoped hotkey). Map classic controls to tools:
| classic control | tool | hotkey | result type |
|---|---|---|---|
| RectangleLabels | "rectangle" | R | "rectanglelabels" |
| RectangleLabels (three-point) | "rectangle3point" | Shift+R | "rectanglelabels" |
| PolygonLabels | "polygon" | P | "polygonlabels" |
| Named pose (native extension) | "pose" | Shift+J | "poselabels" |
| Projected cuboid (native extension) | "cuboid" | Shift+C | "cuboidlabels" |
| EllipseLabels | "ellipse" | E | "ellipselabels" |
| KeyPointLabels | "keypoint" | K | "keypointlabels" |
| VectorLabels | "vector" | Shift+P | "vectorlabels" |
| BrushLabels | "brush" (+ "eraser") | B / Shift+E | "brushlabels" |
| BitmaskLabels | "bitmask" (+ "eraser") | Shift+B | "bitmasklabels" |
| MagicWand | "magicWand" | W | "brushlabels" |
Always available (classic Image parity, FIT-3066): "select" (V) and "pan" (H / Space-drag) tool buttons, plus `ImageCanvas.ZoomControls` — zoom in / out (Ctrl/⌘+= / Ctrl/⌘+-), the % readout and the zoom presets Fit (Shift+1) and Actual size 100% (Shift+2); Shift+Z zooms to the selection. The default toolbar renders all of them. Keep them in every image screen, including segmentation (bitmask / brush): do not pass `showToolbar={false}` without composing your own toolbar, and a composed toolbar must include `<ImageCanvas.Tool tool="select" />`, `<ImageCanvas.Tool tool="pan" />` and `<ImageCanvas.ZoomControls />`.

Editing with the select tool: drag shapes; rectangles/ellipses have resize + rotate handles; polygons and vectors show vertex handles (drag), midpoint handles (click or drag to insert a vertex; a click on an edge also inserts), Alt/Option-click a vertex to remove it (polygons keep 3 points), or click a vertex and press Backspace. Drag a selected brush/bitmask mask to move it. Each gesture emits ONE `onUpdateRegion` (undo-friendly). Brush / bitmask strokes continue the selected mask region of the same type (a new mask is created and selected otherwise); the eraser erases from the selected mask. **To start a second object / mask as its own Regions-panel row, clear selection first** (or use a **New region** control that calls `props.selectRegion(null)` and does **not** reuse the previous id) — otherwise the next stroke continues the selected mask (classic BitmaskLabels parity). Never hand-roll a second bitmask by mutating a shared `_value.imageDataURL` / `_pixelCount` that earlier regions still reference (FIT-3031). Prefer `ImageCanvas` with `tools={["bitmask","eraser"]}` over a custom paint canvas. The Magic Wand: click a pixel and drag right/down (more) or left/up (less) to change the tolerance, release to create a `brushlabels` mask (added to the selected brush region if any). It needs readable pixels: same-origin/data URLs work; other hosts need CORS (`crossOrigin="anonymous"`) — otherwise the tool disables itself and shows why.

Scoping: `toName` hides regions whose `_toName` names another object (regions without `_toName`, or with a comma list containing it, stay); `itemIndex` shows only that item of a multi-image object (a region's item is `_itemIndex`, absent = 0). Both compose; `scopeRegions={false}` disables them. Relations are shell-owned: pass `relationLinkingSource={props.relationLinkingSource}` so the target mark can be clicked with any tool; start linking with `props.setRelationLinkingSource(selectedId)`, never with `props.addRelation` from a private flow.

Region `type` / `_value` (percent of the natural image, like classic LS):
- `rectanglelabels` — `{ x, y, width, height, rotation }`
- `polygonlabels` — `{ points: [[x, y], ...], closed: true }`
- `poselabels` — optional named-pose native extension `{version:1,template:{id,name},joints:[{id,name,x,y,visibility}],edges:[{id,from,to}]}`. Enable `tools={["pose"]}` and provide `poseTemplates` with unique named joint IDs, layout x/y percentages in 0..100 and fixed connections. Optionally control `poseTemplateId` with `onPoseTemplateChange`. Drag a placement box; the annotation snapshots the template, so future template edits do not alter it. Select it to edit joint handles or whole-pose bounds. `ImageCanvas.Info` edits visible/occluded/absent states and restores an absent joint through explicit image placement. Visible/occluded retain finite coordinates; absent stores both x/y as null while retaining identity and connections. UI hiding remains independent. Names/IDs/connectivity survive transforms, copy, host undo and native reload. No automatic pose detection. Native JSON is the supported export; converters that cannot retain these semantics reject explicitly. Future versions remain opaque/protected.
- `cuboidlabels` — optional projected 2D cuboid native extension `{version:1,corners:[{id,x,y}],edges:[{id,from,to,visibility}]}`. Enable `tools={["cuboid"]}`; drag a front rectangle, then click the rear top-left corner. IDs c0–c7 and e0–e11 remain fixed through crossing handles, moves and view rotation. The front and rear four-corner cycles connect corresponding corners. Every corner has finite image-percentage coordinates; projected coincidences/crossings are allowed, with at least three non-collinear points overall. There is no 3D/camera inference. Edge visibility is explicitly `"visible"` (solid) or `"occluded"` (dashed); use `<ImageCanvas.CuboidControls />` in custom compositions to edit it (included in standard Tool options). Escape cancels creation; Select edits corners and whole-object bounds. No corner insertion/removal is allowed. Use the regular native result helpers, per-region answers and host history; native JSON preserves all corner/edge semantics and unsupported converters reject. Unknown versions are opaque/read-only and blocked on host submission.
- `multipolygonlabels` — versioned native extension `{ version: 1, parts: [{ outer: [[x,y], ...], holes: [[[x,y], ...], ...] }] }`. Each region ID owns every part and hole; coordinates are percentages in unrotated natural-image space. Rings are open, simple and nonzero; holes lie strictly inside their outer, filled part interiors cannot overlap, and a nested island is a separate part inside a hole. Valid winding normalizes to positive outer and negative hole shoelace area (image Y points down). Use `normalizeMultipolygonValue` before authoring; bounds, hit testing and transforms are available through `multipolygonBounds`, `pointInMultipolygon` and `transformMultipolygonValue`. Classic flat polygons retain their original contract. Unknown or malformed native versions hydrate as protected opaque results and serialize exactly, but the host rejects unsupported submission; do not flatten them. Native JSON preserves topology; unsupported converters explicitly reject it. Rendering and creation controls depend on the installed ImageCanvas version; do not invent a classic PolygonLabels fallback.
- `ellipselabels` — `{ x, y, radiusX, radiusY, rotation }`
- `keypointlabels` — `{ x, y, width }`
- `brushlabels` — `{ format: "rle", rle: number[] }` (the region also carries `_rle`)
- `vectorlabels` — `{ vertices: [{ id, x, y, prevPointId, isBezier, controlPoint1?, controlPoint2? }], closed }` (classic VectorRegion; keep vertex objects as they are)
- `bitmasklabels` — `{ imageDataURL: "data:image/png;base64,..." }` (black pixels on a transparent image-sized PNG)
Created regions carry `_originalWidth`/`_originalHeight`; serialize them as `original_width`/`original_height`. `image_rotation` is the image's *current* view rotation, written into every result as classic does — `ImageCanvas.toImageResults` (and AnswerForm per-region results) read it from the mounted canvas, falling back to the region's `_imageRotation`; geometry is always in unrotated image space. On an `itemIndex` canvas they also carry `_itemIndex` → serialize as top-level `item_index` (and read it back in parseResults).
Classic unlabeled shape results (`rectangle`, `polygon`, `ellipse`, `keypoint`, `brush`, `vector`, `bitmask` — `<Rectangle>` + `<Labels>` configs, most ML backend predictions) are NOT dropped: `ImageCanvas.fromImageResults` maps them to the `*labels` type, merges the `labels` result sharing the id (value `{ ...geometry, labels }`), and records `_resultType` / `_shapeFromName`; `ImageCanvas.toImageResults` writes the same shape + `labels` pair back. Use those helpers rather than filtering on `*labels` types.

Drawing: `drawingMode="auto"` accepts drag and click-start/click-finish rectangles and ellipses. Use `"drag"` or `"click"` to constrain it, or add `"rectangle3point"` (Shift+R) to place the first edge and height of a rotated rectangle. `drawingMode="three-point"` also applies to the regular rectangle tool. `snap="pixel"` snaps geometry to natural-image pixels. Escape cancels unfinished gestures. `canRotate={false}` disables region rotation independently of view `rotateControl`.

Group editing: drag empty image space with Select to marquee-select; Shift/Ctrl/Cmd adds to the selection. Move, resize and rotate selected shapes together (Shift snaps rotation to 15 degrees). Locked/readonly regions cannot change. Wire `onUpdateRegions={props.updateRegions}` and `onSelectRegions={props.selectRegions}` for atomic updates. The shell also attaches batch operations to existing `updateRegion` / `selectRegion` callbacks, so saved screens passing these callbacks directly retain one undo entry per group gesture. Portable hosts should provide both batch callbacks.

Vectors: `vectorCurves` (default true, controlled with `onVectorCurvesChange`) enables Bezier handles and curve conversion; `vectorSkeleton` enables branching from existing vertices while preserving classic `prevPointId` connections. Ctrl/Cmd-click points to select a subset for moving, scaling, rotating or deleting. With the vector tool, click an open endpoint to continue its path. Alt-click a segment to split/reopen it. Alt-drag a Bezier handle disconnects it persistently. `regionStyle` sets strokeColor, fillColor, strokeWidth, fillOpacity, selectedFillOpacity, opacity, pointSize, pointStyle ("circle" | "rectangle"), pointSizeEnabled and pointSizeDisabled. `regionStyles` overrides these per control name. Mask labels and OCR are shown with `showRegionLabels`; OCR comes from AnswerForm's per-region textarea answers.

Label policy: `allowEmpty={false}` requires a label before creation, including per-control overrides in `controlOptions`. The default remains true. Pair it with LabelPicker policies in the Screen mutation hooks to guard relabeling and paste.

Precision and history: Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z undo/redo unfinished polygon/vector vertices. Pan preserves the draft; switching to another drawing tool finishes a valid draft. Shift-resize preserves aspect ratio and Alt-resize keeps the center fixed. Pixel snapping uses pixel centers for keypoints and edges for boundaries. `controlOptions` overrides canRotate, snap, vectorCurves, vectorSkeleton, vectorClosable, vectorMinPoints, vectorMaxPoints and smartOnly by control name; creation uses `fromName`, editing uses each region's own control. `settings.enableSmoothing` and `settings.invertedZoom` supply defaults for `smoothing` and `invertedZoom`. Two-finger scrolling pans a zoomed image and yields to page scrolling at its edges.

Display-only `invert` reverses photograph colors after brightness/contrast without changing annotation colors or source pixels used by brushes, threshold and camera projection. It defaults to false.

Display/loading: set `width`, `height`, `maxWidth`, `maxHeight`, `horizontalAlignment` ("left" | "center" | "right") and `verticalAlignment` ("top" | "center" | "bottom"). Hide controls independently with `selectionControl`, `brightnessControl`, `contrastControl`, `zoomControl` and `rotateControl`. Bitmask defaults to pixelated rendering unless `smoothing` is explicit. Images share a bounded credential-aware download cache with progress, retry and direct-image fallback. `preloadImages` prefetches URLs; Group's `preloadCount` (default 3) preloads adjacent items. `preserveView` (default true) retains each image's view and uncontrolled brightness/contrast.

Smart annotation: compatible interactive models are discovered through the authenticated sandbox host and existing SAM feature flag. Use positive points (click), negative points (Alt-click) or box prompts. Suggestions remain previews until accepted (Shift+Alt+Enter); reject, cancel and retry are available. Changing image/label/tool discards stale responses. Shift+Alt+A toggles smart mode. `smart={false}` disables it; `smart={{ enabled: true, taskId, backendId }}` selects a backend. Portable embeds can supply `smart={{ taskId, request }}`: the typed `ImageSmartRequester` handles discover/predict/cancel with an AbortSignal, returning bindings or Label Studio results. Keep credentials, model API requests and postMessage handlers out of Screen code. Read-only canvases never request predictions.

Image result helpers preserve all generic Labels siblings of a split shape, including control names, scores, readonly flags, metadata and custom value fields. Geometry edits update every sibling. Continue using AnswerForm helpers for per-region answers; image conversion does not duplicate these results.

Smart prompt markers can be removed with a click or Enter/Space. Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z undo/redo transient prompts while smart mode is active; outside drawing sessions the shell owns annotation history. `smartOnly` automatically activates an available model and prevents manual region creation even when model discovery fails. Existing regions can still be selected and edited. Hide smart controls to annotate the image under the flyout, and Show smart controls to reopen it without disabling smart mode.

- **Pass shell state straight through.** `props.regions` already uses the canonical shape, so filter it to this canvas (`r._toName === TO_NAME`) and pass it as `regions`. Wire `selectedRegionIds={props.selectedRegionIds}`, `onAddRegion={props.addRegion}`, `onUpdateRegion={props.updateRegion}`, `onDeleteRegion={props.deleteRegion}`, `onSelectRegion={(id, opts) => props.selectRegion(id, opts)}` (a `null` id clears the selection).
- **Created regions are complete.** The canvas stamps `activeLabels` → `labels`, `labelColors` → `colors`, and `fromName`/`toName` → `_fromName`/`_toName`. Do not rebuild or re-id them in the screen. Always pass the same `labelColors` map you give the LabelPicker.
- **No Delete buttons in slots.** `onDeleteRegion` is for the canvas's own delete gestures. The shell already renders Lock / Hide / Delete around `InfoViewer` and `OutlinerItem`, so those exports render content only — never a "Delete polygon" / "Delete box" / trash button (FIT-2931).
- **Never discard unlabeled regions.** If nothing is selected in the LabelPicker the region is created with `labels: []`; relabel it later with `props.updateRegion(id, { labels, colors })` (always update `colors` with `labels`).
- **Hydrate with colors.** In `parseResults`, pass `{ labelColors }` into `from*Results` (or stamp `colors` afterward). The Regions panel has no `labelColors` fallback — empty `colors` means gray chips.
- **Do not show the in-canvas LayerManager.** `showLayers` defaults to false. Leave it off (and do not mount `*.LayerManager`) — the editor-shell Outliner / Regions panel is the region list.

```jsx
function BoxScreen(props) {
  const ImageCanvas = window.InterfaceComponents.ImageCanvas;
  const LabelPicker = window.InterfaceComponents.LabelPicker;
  const LABELS = [{ value: "Car", color: "#2563eb" }, { value: "Person", color: "#16a34a" }];
  const labelColors = Object.fromEntries(LABELS.map((l) => [l.value, l.color]));
  const [activeLabels, setActiveLabels] = React.useState([]);
  const imageRegions = (props.regions || []).filter((r) => r._toName === "image");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <LabelPicker labels={LABELS} value={activeLabels} onChange={setActiveLabels} hotkeys={props.hotkeys} />
      <ImageCanvas
        imageUrl={getField(props.task.data, props.params?.imageField) || ""}
        tools={["rectangle", "polygon"]}
        regions={imageRegions}
        selectedRegionIds={props.selectedRegionIds}
        activeLabels={activeLabels}
        labelColors={labelColors}
        fromName="label"
        toName="image"
        readOnly={props.readOnly}
        hotkeys={props.hotkeys}
        onAddRegion={props.addRegion}
        onUpdateRegion={props.updateRegion}
        onDeleteRegion={props.deleteRegion}
        onSelectRegion={(id, opts) => props.selectRegion(id, opts)}
      />
    </div>
  );
}
```

Segmentation (classic BrushLabels + MagicWand, or BitmaskLabels) and vector paths use the same wiring — only `tools` (and the per-tool props) change:
```jsx
function SegmentationScreen(props) {
  const ImageCanvas = window.InterfaceComponents.ImageCanvas;
  const LabelPicker = window.InterfaceComponents.LabelPicker;
  const LABELS = [{ value: "Sky", color: "#0ea5e9" }, { value: "Road", color: "#f97316" }];
  const labelColors = Object.fromEntries(LABELS.map((l) => [l.value, l.color]));
  const [activeLabels, setActiveLabels] = React.useState(["Sky"]);
  const imageRegions = (props.regions || []).filter((r) => r._toName === "image");
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <LabelPicker labels={LABELS} value={activeLabels} onChange={setActiveLabels} hotkeys={props.hotkeys} />
      <ImageCanvas
        imageUrl={getField(props.task.data, props.params?.imageField) || ""}
        tools={["magicWand", "brush", "eraser", "pan"]}
        magicWandThreshold={15}
        crossOrigin="anonymous"
        smoothing={false}
        regions={imageRegions}
        selectedRegionIds={props.selectedRegionIds}
        activeLabels={activeLabels}
        labelColors={labelColors}
        fromName="tag"
        toName="image"
        readOnly={props.readOnly}
        hotkeys={props.hotkeys}
        onAddRegion={props.addRegion}
        onUpdateRegion={props.updateRegion}
        onDeleteRegion={props.deleteRegion}
        onSelectRegion={(id, opts) => props.selectRegion(id, opts)}
      />
    </div>
  );
}
```

```jsx
function LaneScreen(props) {
  const ImageCanvas = window.InterfaceComponents.ImageCanvas;
  const imageRegions = (props.regions || []).filter((r) => r._toName === "image");
  return (
    <ImageCanvas.Root
      imageUrl={getField(props.task.data, props.params?.imageField) || ""}
      tools={["vector", "polygon", "pan"]}
      vectorClosable={false}
      vectorMinPoints={2}
      zoomToSelected
      regions={imageRegions}
      selectedRegionIds={props.selectedRegionIds}
      activeLabels={["Lane"]}
      labelColors={{ Lane: "#eab308" }}
      fromName="lanes"
      toName="image"
      readOnly={props.readOnly}
      hotkeys={props.hotkeys}
      onAddRegion={props.addRegion}
      onUpdateRegion={props.updateRegion}
      onDeleteRegion={props.deleteRegion}
      onSelectRegion={(id, opts) => props.selectRegion(id, opts)}
    >
      <div style={{ display: "flex", gap: 8, padding: 4 }}>
        <ImageCanvas.Tool tool="select" />
        <ImageCanvas.Tool tool="vector" label="Lane" />
        <ImageCanvas.Tool tool="polygon" />
        <ImageCanvas.Tool tool="pan" />
        <ImageCanvas.ToolOptions />
        <ImageCanvas.ZoomControls />
      </div>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <ImageCanvas.Viewport />
      </div>
    </ImageCanvas.Root>
  );
}
```
Vector result: `{ type: "vectorlabels", value: { vertices: [{ id: "p1", x: 10, y: 20, prevPointId: null, isBezier: false }, { id: "p2", x: 30, y: 25, prevPointId: "p1", isBezier: false }], closed: false, vectorlabels: ["Lane"] } }`. Bitmask result: `{ type: "bitmasklabels", value: { imageDataURL: "data:image/png;base64,...", bitmasklabels: ["Sky"] } }`.

Result example: `{ id, from_name: "label", to_name: "image", type: "rectanglelabels", original_width: 1024, original_height: 768, image_rotation: 0, value: { x: 10, y: 20, width: 30, height: 15, rotation: 0, rectanglelabels: ["Car"] } }`.

- Do NOT convert `_value` to pixels; the canvas already renders % geometry at any zoom.
- Do NOT add your own wheel/drag listeners on top of the canvas; use `zoomOnWheel` / tools.
- Do NOT decode or re-encode `rle` / `imageDataURL` / vector vertices yourself; round-trip them untouched.
- Do NOT enable `"magicWand"` for images you cannot serve with CORS; it disables itself with a message.

### Selected-region geometry: `ImageCanvas.Info`

`ImageCanvas.Info` is content for an existing Info panel, usable outside ImageCanvas.Root. Pass `region` (or null), `readOnly`, the current `mutationRevision` and the exact guarded `applyRegionTransaction` callback from the production `InfoViewer` slot. It edits supported geometry through atomic region updates; unavailable atomic capability leaves inspection available with a reason. It does not own annotation state or invent a second controller. Optional `imageWidth`/`imageHeight` supply natural source dimensions; `className`, `ariaLabel` and `theme` customize presentation. Optional controlled `selectedHandle`/`onSelectHandle` coordinate the inspected geometry handle; a composing Interface owns that state and its editor/region scope. These are Info props, not ImageCanvas root props. The named exports are `ImageCanvasInfo` and `ImageCanvasInfoProps`.

Info edits rectangle bounds/rotation, ellipse center/radii/rotation, keypoint position/radius, polygon and multipart vertices, vector anchors and existing Bezier handles, named pose joint coordinates/visibility, and cuboid corners/edge visibility. All geometry targets are visible as labeled rows rather than a point-selection dropdown. Coordinates and dimensions are displayed and entered in source-image pixels (fractional pixels allowed), while saved geometry stays in classic percentage coordinates; rotation is degrees. Supply natural image dimensions through Info props or region original dimensions; editing is disabled when dimensions are unknown. Enter/blur commits a numeric edit; Apply geometry commits a multi-field draft, including explicit X/Y when restoring an absent pose joint. Pass the inspected control's `canRotate` and `snap` restrictions; pixel snapping needs natural dimensions.

For selected mask/polygon operations and point actions, render the same `ImageCanvas.Info` inside the existing canvas and pass `container={infoMountElement}`. This optional Info prop portals content into the sibling InfoViewer while retaining the canvas editing providers; null renders nothing until the slot mounts. Add/erase polygon brush, boundary refinement, Boolean operations and multipart splitting share the existing capture, preview, Apply/Cancel and history path. Route mount elements by the production `slotInstanceId` plus region ID, clean up on unmount, and retain a keyed Info instance for each selected region belonging to that canvas. Pass `container={mount ?? null}` while the slot is replaced so coordinate-row selection survives edits and undo. Never use task IDs or parse mutation revisions. See `storybook/imageInfoPreview.tsx` for the thin adapter. Explicit-prop geometry-only use still works outside the canvas. Default has no Info panel and omits selected-region editing panels; polygon brush creation remains available with the active Polygon tool. `PolygonTools` accepts `mode="all"` (backward-compatible default), `"create"`, or `"selection"` for custom compositions. These are compound-member props, not root props.

Inside its canvas portal, Info also renders brush/PNG mask add/erase tool routing, hole filling, selected-mask background filling/picking, splitting, and multi-mask merging with shared preview/Apply/Cancel. `MaskTools` accepts `mode="all"` (default), `"canvas"` for overlap policy and unselected background creation, or `"selection"` for Info operations. It does not duplicate pixel payloads or annotation state. Info omits stacking/order controls. Point coordinates use compact # / X px / Y px tables with selected-row highlighting and keyboard-accessible row selectors. Bounding boxes, ellipses and keypoints use the same table styling for position, dimensions/radii and rotation. Named joints, corners and curve handles retain their labels. Batch panels render once per selection and retain capability, lock and read-only guards. Each vector anchor exposes eligible straight/curve conversion, and each pose joint exposes on-image placement alongside its numeric coordinates and visibility. Full coverage is documented in ImageCanvas/README.md.

Keep selected-region geometry in Info. Canvas view settings (zoom, pan, display rotation, brightness, contrast, overlays), creation settings (active tool, brush size, threshold, snapping and pose template), and mask overlap policy remain in their existing canvas controls. Region IDs, bindings, labels and domain fields are separate contracts: use LabelPicker and AnswerForm for classes, attributes and OCR transcription. The shell already supplies Hide/Lock/Delete. Raster masks receive inspection rather than pixel-array form fields. Protected or unsupported regions remain inspectable and cannot be changed.

```jsx
export function InfoViewer(props) {
  const ImageCanvas = window.InterfaceComponents.ImageCanvas;
  return (
    <ImageCanvas.Info
      region={props.region}
      readOnly={props.readOnly}
      mutationRevision={props.mutationRevision}
      applyRegionTransaction={props.applyRegionTransaction}
      imageWidth={props.region?._originalWidth}
      imageHeight={props.region?._originalHeight}
    />
  );
}
```

The slot shares the canvas's current revision and guarded callback, preserving host validation and one undo entry; never replace it with sequential update callbacks. Compose `<ImageCanvas.Toolbar showRegionControls={false} />` when Info supplies selected pose/cuboid adjustments. This defaults to true for existing consumers and is also supported by ToolOptions and PoseControls. False hides selected-region pose/cuboid editors and their selection-only popover; pose-template creation and vector drawing curves remain available. The explicit `ImageCanvas.PoseControls` remains available for custom compositions. Info supplies straight/curve conversion on each eligible vector point row and on-image placement for every named pose joint. This is a compound-member option, not a root prop. The `Components/ImageCanvas → In editor` preview uses the production InterfaceEditorHarness and native result helpers. Keep this Storybook-only harness out of runtime imports. Its in-memory save/reload is not server or iframe-loader validation, and its shared outliner accessibility findings remain visible separately from Info checks.

### Multiple images: `ImageCanvas.Group`
Use the group for grids, pagers, galleries and side-by-side comparisons — never a read-only `<img>` grid, and never N independent canvases with N toolbars. It is a controlled provider: pass `regions`, `selectedRegionIds`, the region callbacks, `tools`/`activeTool`/`onToolChange`, `activeLabels`, `labelColors`, `fromName` ONCE; every item canvas shares them and one toolbar drives the active item. Drawing happens on the active item only (the first click on another item activates it). Selecting a region from the outliner switches to its item.

- `items`: `[{ id, imageUrl, toName?, itemIndex?, title? }]`. **Several objects** (mammogram views, before/after): give every item its own `toName`. **One multi-image object** (classic `<Image valueList>`, pages): set the group's `toName` and omit it on items — `itemIndex` defaults to the position and marks carry `_itemIndex` → `item_index`.
- `layout`: `"grid"` (offscreen items mount lazily; `columns`, `lazy`) | `"single"` (active item only) | `"custom"` (only your children). `activeItem` + `onActiveItemChange` (item id) are optional.
- `sync`: `"none"` | `"zoom"` | `"zoom+pan"` — shares zoom (relative to fit) and the center (% of the image) between items of any size. Rotation is never synced.
- Members: `ImageCanvas.Group.Toolbar` (children: compose `ImageCanvas.Tool` / `ImageCanvas.ZoomControls`), `ImageCanvas.Group.Items` (renders the layout; `itemHeight`, `itemProps`), `ImageCanvas.Group.Item` (`id`; any ImageCanvas prop overrides the shared one for that item; children are ImageCanvas parts or `({ item, active, regionCount, activate }) => ...`), `ImageCanvas.Group.Pager` and `ImageCanvas.Group.Thumbnails` (region-count badges; Ctrl/Cmd+←/→ switch items), `ImageCanvas.Group.useController()` → `{ items, activeItem, setActiveItem, next, prev, regionCounts, itemForRegion, focusRegion }` (inside the group).

Grid of views, each its own object:
```jsx
function ViewsScreen(props) {
  const ImageCanvas = window.InterfaceComponents.ImageCanvas;
  const data = props.task.data;
  const items = [
    { id: "left_cc", imageUrl: getField(data, "img1") || "", toName: "left_cc", title: "Left CC" },
    { id: "right_cc", imageUrl: getField(data, "img2") || "", toName: "right_cc", title: "Right CC" },
  ];
  return (
    <ImageCanvas.Group
      items={items}
      layout="grid"
      columns={2}
      regions={(props.regions || []).filter((r) => r._toName === "left_cc" || r._toName === "right_cc")}
      selectedRegionIds={props.selectedRegionIds}
      tools={["rectangle", "ellipse"]}
      activeLabels={["Mass"]}
      labelColors={{ Mass: "#dc2626" }}
      fromName="finding"
      readOnly={props.readOnly}
      hotkeys={props.hotkeys}
      relationLinkingSource={props.relationLinkingSource}
      onAddRegion={props.addRegion}
      onUpdateRegion={props.updateRegion}
      onDeleteRegion={props.deleteRegion}
      onSelectRegion={(id, opts) => props.selectRegion(id, opts)}
    />
  );
}
```

Pager + thumbnails over one multi-image object (`item_index`):
```jsx
function GalleryScreen(props) {
  const ImageCanvas = window.InterfaceComponents.ImageCanvas;
  const urls = getField(props.task.data, "images") || [];
  const items = urls.map((url, i) => ({ id: "img-" + i, imageUrl: url, title: "Image " + (i + 1) }));
  return (
    <ImageCanvas.Group
      items={items}
      layout="single"
      toName="image"
      fromName="label"
      tools={["rectangle", "polygon"]}
      regions={(props.regions || []).filter((r) => r._toName === "image")}
      selectedRegionIds={props.selectedRegionIds}
      onAddRegion={props.addRegion}
      onUpdateRegion={props.updateRegion}
      onDeleteRegion={props.deleteRegion}
      onSelectRegion={(id, opts) => props.selectRegion(id, opts)}
    >
      <ImageCanvas.Group.Toolbar />
      <ImageCanvas.Group.Pager />
      <div style={{ height: 520, display: "flex" }}>
        <ImageCanvas.Group.Items />
      </div>
      <ImageCanvas.Group.Thumbnails />
    </ImageCanvas.Group>
  );
}
```
Serialize with `item_index`: `if (typeof r._itemIndex === "number") result.item_index = r._itemIndex;` and parse `_itemIndex: res.item_index`.

Synced comparison (zoom + pan follow the active view):
```jsx
function CompareScreen(props) {
  const ImageCanvas = window.InterfaceComponents.ImageCanvas;
  const data = props.task.data;
  return (
    <ImageCanvas.Group
      items={[
        { id: "before", imageUrl: getField(data, "before") || "", toName: "before", title: "Before" },
        { id: "after", imageUrl: getField(data, "after") || "", toName: "after", title: "After" },
      ]}
      layout="grid"
      columns={2}
      sync="zoom+pan"
      tools={["rectangle", "pan"]}
      fromName="change"
      regions={props.regions || []}
      selectedRegionIds={props.selectedRegionIds}
      onAddRegion={props.addRegion}
      onUpdateRegion={props.updateRegion}
      onDeleteRegion={props.deleteRegion}
      onSelectRegion={(id, opts) => props.selectRegion(id, opts)}
    />
  );
}
```

Custom layout — place items anywhere, override props per item, compose parts:
```jsx
function MainAndReferenceScreen(props) {
  const ImageCanvas = window.InterfaceComponents.ImageCanvas;
  const data = props.task.data;
  const items = [
    { id: "main", imageUrl: getField(data, "image") || "", toName: "image", title: "Main" },
    { id: "ref", imageUrl: getField(data, "reference") || "", toName: "reference", title: "Reference" },
  ];
  function RegionJump() {
    const group = ImageCanvas.Group.useController();
    const first = (props.regions || [])[0];
    return first ? (
      <EditorUI.Button type="button" variant="neutral" look="outlined" size="smaller" onClick={() => group.focusRegion(first.id)}>
        Go to first mark
      </EditorUI.Button>
    ) : null;
  }
  return (
    <ImageCanvas.Group
      items={items}
      layout="custom"
      tools={["rectangle"]}
      fromName="label"
      regions={props.regions || []}
      selectedRegionIds={props.selectedRegionIds}
      onAddRegion={props.addRegion}
      onUpdateRegion={props.updateRegion}
      onDeleteRegion={props.deleteRegion}
      onSelectRegion={(id, opts) => props.selectRegion(id, opts)}
    >
      <ImageCanvas.Group.Toolbar />
      <RegionJump />
      <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 12, height: 520 }}>
        <ImageCanvas.Group.Item id="main" />
        <ImageCanvas.Group.Item id="ref" readOnly>
          {({ item, regionCount }) => (
            <>
              <ImageCanvas.Viewport />
              <small>{item.title}: {regionCount} marks</small>
            </>
          )}
        </ImageCanvas.Group.Item>
      </div>
    </ImageCanvas.Group>
  );
}
```
- Do NOT render one ImageCanvas per image with its own toolbar and tool state; use the group.
- Composed children replace the default layout, so always include `<ImageCanvas.Group.Toolbar />` next to `ImageCanvas.Group.Pager` / `ImageCanvas.Group.Items` — a pager without it leaves annotators with no Pan / Zoom / Fit (FIT-3082). Classification over images uses the group too: pass `tools={[]}` when nothing is drawn.
- Do NOT filter regions to the first view; pass every view's regions — the group scopes them per item.
