<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Interface Components: shared contract

## Interface Components: shared contract

`window.InterfaceComponents` exposes pre-built, lazily loaded Label Studio components. Use them instead of hand-rolling canvases, pickers, and form controls. Components are **fully controlled**: they render what you pass and report every change through callbacks — the shell (`props.regions` + `props.addRegion`/`updateRegion`/`deleteRegion`/`selectRegion`) stays the single source of truth.

### Prefer Interface Components (do not reinvent)
When a component below covers the need, **use it on the first artifact**. Do not build choice chips with `EditorUI.Button` / raw `<button>`, star ratings with button rows, confidence with `<input type="range">`, explanations with `<textarea>`, category filter buttons for a taxonomy, custom HTML tables / `draggable` rows for ranking, or invent custom region types (`sentiment-selection`, `confidence-value`, …). Persist answers with `upsertControlRegion` (or the control's `to*Result` helpers) as standard LS result types (`choices`, `taxonomy`, `ranker`, `number`, `rating`, `textarea`, …).

| Annotator need | Use |
|---|---|
| Single / multi label classification, sentiment, aspects | `ChoiceGroup` |
| Star / Likert / numeric score | `RatingControl` |
| Number or confidence slider | `NumberInput` (`slider`) |
| Free-text / explanation / notes | `TextInput` (`multiline` when needed) |
| Date / time | `DateTimeInput` |
| Hierarchical labels **or** flat category filters for ranking | `TaxonomyTree` (flat list = one-level tree; do not hand-roll button chips) |
| A/B preference | `PairwiseRanker` |
| Rank / order a list (images, search hits, cards) | `RankerBoard` |
| Label palette driving a canvas | `LabelPicker` |
| Image / video / audio / text / PDF / time-series marks | matching `*Canvas` |

**Escape hatch (only when the user iterates):** Hand-roll or extend beyond these components **only after** a follow-up asks for something the component cannot do (e.g. per-row flag columns RankerBoard does not expose, a novel layout RankerBoard/TaxonomyTree lack). First ship with `TaxonomyTree` + `RankerBoard` (or the matching row above); then `artifact_str_replace` / rewrite for the gap. Do **not** invent a custom ranker/taxonomy on the first pass because plan answers said "filter then rank" or "images".

`EditorUI.Typography` / `Button` / `Badge` are **chrome only** (titles, hints, incidental actions like "Link selected"). Never use them to collect annotation values when an Interface Component exists.

### Access
- Read components by property: `const ImageCanvas = window.InterfaceComponents.ImageCanvas;`. Available: `LabelPicker`, `ChoiceGroup`, `TaxonomyTree`, `TextInput`, `NumberInput`, `DateTimeInput`, `RatingControl`, `PairwiseRanker`, `RankerBoard`, `AnswerForm`, `RegionList`, `ImageCanvas`, `VideoCanvas`, `AudioCanvas`, `TimeSeriesCanvas`, `TextCanvas`, `DocumentCanvas`, `MediaTransport` (one play/seek/speed transport for streams that share a `syncGroup`). Any other name renders an "Unknown interface component" error box.
- Compound members resolve lazily: `<LabelPicker.Item />`, `<ImageCanvas.Toolbar />`, `<AudioCanvas.Viewport />` work before the chunk has loaded.
- Non-component exports (LS result helpers, hooks, manifests) resolve on the component (`window.InterfaceComponents.ImageCanvas.toImageResults`) and top-level (`window.InterfaceComponents.toImageResults`). **Before the sandbox validates the module or hydrates saved results it loads every chunk the Screen source names** — any `window.InterfaceComponents.<Component>` reference (JSX, getResults, parseResults, anywhere) — so the helpers are synchronously callable from `getResults` / `parseResults` / `getValidationErrors`, including the very first `parseResults` call. Write the full `window.InterfaceComponents.<Component>.<helper>` path inside the function body (no aliases, no module-scope destructuring). If a component name is computed at runtime, list it in the module export: `requiredComponents: ["AnswerForm"]`.
- Runtime-only code (effects, handlers) can still load a chunk explicitly:
  ```js
  const mod = await window.InterfaceComponents.load("ImageCanvas"); // whole chunk module
  window.InterfaceComponents.isLoaded("ImageCanvas");                // synchronous boolean
  ```
- Components render a skeleton while their chunk loads; never gate your screen on a loading flag of your own.

### Canonical region model (every canvas)
```
{
  id, type,                 // type = the Label Studio RESULT type ("rectanglelabels", "labels", "videorectangle", ...)
  labels: string[], colors?: string[],
  score: number | null, hidden: boolean, locked: boolean, selected: boolean,
  parentId: string | null, text: string,
  _value: { ...LS value WITHOUT the label key },  // exact LS geometry
  _fromName?, _toName?,     // LS from_name / to_name
  _itemIndex?,              // LS item_index: item of a multi-image object (ImageCanvas itemIndex / Group); absent = 0
  _originalWidth?, _originalHeight?               // image/video natural size where LS needs it
}
```
Canvas props: `regions`, `selectedRegionIds` (Set), `readOnly`, `onAddRegion(region)`, `onUpdateRegion(id, patch)`, `onDeleteRegion(id)`, `onSelectRegion(id | null, { additive })`, `activeLabels`, `labelColors`, `fromName`, `toName`, `hotkeys`.

### Region colors (Regions panel contract)
The shell's **Regions panel** paints chips from `region.colors[0]` only — it has **no** `labelColors` fallback (unlike canvases, which call `getRegionColor(region, labelColors)`). Empty `colors` → gray chips even when the canvas looks correct.

**Always stamp `colors`:**
1. Pass the same `labelColors` map to the canvas **and** to `from*Results` in `parseResults` (e.g. `fromImageResults(results, { labelColors })`, `fromAudioResults`, `fromTextCanvasResults`, `fromDocumentResults`). Canvases stamp `colors` on create when `labelColors` is set.
2. On relabel: `updateRegion(id, { labels, colors: labels.map((l) => labelColors[l]).filter(Boolean) })` — never update `labels` alone.
3. Do **not** force `colors: []` in `parseResults` helpers when labels exist.
4. `parseResults(results, ctx?)` may receive `{ params }` (same object as `props.params`); build `labelColors` from `ctx?.params` + your defaults so customized ontologies hydrate with the right colors.

Several questions, per-region / per-item answers or conditional follow-ups: use **AnswerForm** (declarative fields, classic perRegion storage and serialization). Value controls (ChoiceGroup, TaxonomyTree, TextInput, NumberInput, DateTimeInput, RatingControl, PairwiseRanker, RankerBoard) use `ControlBaseProps` (no region mutation APIs) and are controlled by `value` / `onChange`. Store their answer as ONE classification region per `fromName` whose `_value` is the complete LS value (`{ choices: [...] }`, `{ text: [...] }`, `{ rating: 4 }`, `{ number: 7 }`, `{ datetime: "2024-01-31" }`, `{ taxonomy: [[...]] }`, `{ selected: "left" }`, `{ ranker: { ... } }`) and `labels: []` (choices also mirror the selection into `labels`).

**outputSchema ↔ result type:** JSON Schema `integer`/`number` alone maps to LS `number`. Controls that emit a different classic type must set `"x-ls-type"` on that field — e.g. RatingControl → `"x-ls-type": "rating"`, PairwiseRanker → `"pairwise"`, RankerBoard → `"ranker"`, TaxonomyTree → `"taxonomy"` (even when the field is a JSON Schema `array` of paths). Without the marker, preview validation reports `has type "rating" but expected "number"` (or `taxonomy` vs `labels`).

### Label Studio results (getResults / parseResults)
**Use the component serialization helpers** (see "Serialization helpers" below) — they reproduce classic LS output exactly (key order, `original_width`, `item_index`, per-region answers). Hand-write a serializer only for regions no component owns; the reference below is that fallback. Write the label key back into `value` (the shell's default serializer only knows `value.labels`, which is wrong for `rectanglelabels` etc.):
```js
const LS_LABEL_KEYS = {"rectanglelabels":"rectanglelabels","polygonlabels":"polygonlabels","multipolygonlabels":"multipolygonlabels","cuboidlabels":"cuboidlabels","poselabels":"poselabels","ellipselabels":"ellipselabels","keypointlabels":"keypointlabels","brushlabels":"brushlabels","vectorlabels":"vectorlabels","bitmasklabels":"bitmasklabels","ocrlabels":"ocrlabels","labels":"labels","hypertextlabels":"hypertextlabels","paragraphlabels":"paragraphlabels","timeserieslabels":"timeserieslabels","timelinelabels":"timelinelabels","videorectangle":"labels","videovector":"labels","videomasks":"labels","choices":"choices"};

function toLsResult(r) {
  const value = { ...(r._value || {}) };
  const labelKey = LS_LABEL_KEYS[r.type];
  if (labelKey) value[labelKey] = r.labels || [];
  const result = { id: r.id, from_name: r._fromName, to_name: r._toName, type: r.type, value, origin: "manual" };
  if (r._originalWidth != null) result.original_width = r._originalWidth;
  if (r._originalHeight != null) result.original_height = r._originalHeight;
  if (r.score != null) result.score = r.score;
  if (typeof r._itemIndex === "number") result.item_index = r._itemIndex;
  return result;
}

function fromLsResult(res) {
  const value = { ...(res.value || {}) };
  const labelKey = LS_LABEL_KEYS[res.type];
  const labels = labelKey && Array.isArray(value[labelKey]) ? value[labelKey] : [];
  if (labelKey && labelKey !== "choices") delete value[labelKey];
  return {
    id: res.id, type: res.type, labels, score: res.score ?? null,
    hidden: false, locked: !!res.readonly, selected: false, parentId: res.parent_id ?? null,
    text: labels.join(", "), _value: value, _fromName: res.from_name, _toName: res.to_name,
    _originalWidth: res.original_width, _originalHeight: res.original_height,
    ...(typeof res.item_index === "number" ? { _itemIndex: res.item_index } : {}),
  };
}

({
  // ...
  getResults(regions, relations) { return regions.map(toLsResult); },   // + serialize relations
  parseResults(results) { return (results || []).filter((r) => r.type !== "relation").map(fromLsResult); },
})
```
Coordinates stay exactly as LS stores them (percent of the natural image/video size, seconds for audio, code-point offsets for text). Never convert to pixels in `_value`.

### Serialization helpers (use them in getResults / parseResults)
| Component | Helpers (`window.InterfaceComponents.<Component>.<helper>`) |
|---|---|
| ImageCanvas | `toImageResults(regions, { fromName, toName, originalWidth?, originalHeight? })`, `fromImageResults(results, { labelColors? })` — rectangle / polygon / ellipse / keypoint / brush; non-image regions/results are skipped; **pass `labelColors` so hydrated regions carry `colors` for the Regions panel** |
| VideoCanvas | `toVideoResults(regions, options)`, `fromVideoResults(results)` — stamp `colors` after parse from your label map (helper does not take `labelColors` yet) |
| AudioCanvas | `toAudioResults(regions, options)`, `fromAudioResults(results, { labelColors?, toName? })` (pass `toName` — the Audio object name — whenever another object has spans, e.g. Text NER `labels`; parses `parentID`, keeps same-id per-region results it does not claim on the region and writes them back, and keeps a multi-entry TextArea `text` array as-is), `createAudioRegion({ start, end, labels, originalLength? })` — segments drawn on the canvas or added through the controller are stamped with `_originalLength` (seconds) once the duration is known, serialized as classic `original_length` |
| TimeSeriesCanvas | `toTimeSeriesResults(regions, options)`, `fromTimeSeriesResults(results)` — stamp `colors` after parse from your label map |
| TextCanvas | `toTextCanvasResults(regions, options)`, `fromTextCanvasResults(results, { labelColors?, toName? })` (pass `toName` — the Text / HyperText / Paragraphs object name — when the config also has Audio `labels`) |
| DocumentCanvas | `toDocumentResults(regions, options)`, `fromDocumentResults(results, { labelColors? })` (a multi-entry TextArea `text` array is kept as-is on round-trip; `_transcription` shows the entries joined by newlines) |
| AnswerForm | `answersToResults(regions, { fields, toName, params? })` (per-region results repeat the target's geometry and `original_width` / `original_height` / `image_rotation` / `original_length` from `_originalWidth` / … — override with `getResultExtras`), `resultsToAnswers(results, { fields } \| { canvasRegions } \| { isOwnedByCanvas } \| { excludeIds })` → `{ answerRegions, perRegion, rest }` (without `fields` every classification result is claimed — pass `canvasRegions` when a canvas owns e.g. its transcription textarea), `attachAnswers(regions, parsed)`, `collectAnswerErrors(regions, fields, { params })`, `isAnswerRegion(region)` |
| Relations (every canvas chunk + AnswerForm) | `toRelationResults(relations, { regionIds? })` → classic `{ id?, type: "relation", from_id, to_id, direction, labels }` from shell `{ node1Id, node2Id, direction, labels }`; `fromRelationResults(results)` → shell relations for `parseResults`. Call through any loaded chunk, e.g. `InterfaceComponents.ImageCanvas.toRelationResults(relations)` — never hand-write the mapping |
| Value controls | `to…(value, { fromName, toName, id? })` → one LS result or `null` (empty value); `from…(result)` → the control's `value` for `parseResults`. `ChoiceGroup.toChoicesResult` / `fromChoicesResult` (flat string[]; nested allowNested paths → TaxonomyTree or AnswerForm nested:true), `TaxonomyTree.toTaxonomyResult` / `fromTaxonomyResult` (string[][] paths), `TextInput.toTextAreaResult` / `fromTextAreaResult` (string[]), `NumberInput.toNumberResult` / `fromNumberResult` (number \| null), `DateTimeInput.toDateTimeResult` / `fromDateTimeResult` (string \| null), `RatingControl.toRatingResult` / `fromRatingResult` (number \| null), `PairwiseRanker.toPairwiseResult` / `fromPairwiseResult` ("left" \| "right" \| null), `PairwiseRanker.toRankingResult` / `fromRankingResult` (ordered ids), `RankerBoard.toRankerResult` / `fromRankerResult(result, name?)` (`{ column: ids[] }`; pass the board's `name` when it differs from `from_name`) |

Compose them: canvases serialize their own regions, AnswerForm adds the answers, and relations come from `toRelationResults` (or the shell appends them when getResults emits none). The shell calls `getResults(regions, relations, { params })` — validators call it with two arguments, and Save validation round-trips every `outputSchema` key as an id-less, ungated Prompter prediction. So gate answers only when `ctx.params` is present — `answersToResults(regions, { toName, ...(ctx && ctx.params ? { fields: buildFields(ctx.params), params: ctx.params } : {}) })` — and parse with `resultsToAnswers(results, {})`; passing `fields` on the validation path drops gated answers and region answers without a target, failing `Annotation round-trip validation failed` (details in the AnswerForm skill). Example — boxes plus per-region and task-level answers, with no hand-written serializer:
```jsx
// Each option list is written once: the field spec and its outputSchema enum both read the constant.
const QUALITY_OPTIONS = ["Good", "Blurry"];
const COLOR_OPTIONS = ["Red", "Blue"];
const FIELDS = [
  { name: "quality", kind: "choices", label: "Image quality", options: QUALITY_OPTIONS, toName: "image" },
  { name: "color", kind: "choices", scope: "region", label: "Car color", options: COLOR_OPTIONS },
];

function Screen(props) {
  const ImageCanvas = window.InterfaceComponents.ImageCanvas;
  const AnswerForm = window.InterfaceComponents.AnswerForm;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 12, height: "100%" }}>
      <ImageCanvas
        imageUrl={props.task.data.image}
        regions={(props.regions || []).filter((r) => r._kind !== "answer")}
        selectedRegionIds={props.selectedRegionIds}
        activeLabels={["Car"]}
        fromName="label"
        toName="image"
        readOnly={props.readOnly}
        onAddRegion={props.addRegion}
        onUpdateRegion={props.updateRegion}
        onDeleteRegion={props.deleteRegion}
        onSelectRegion={(id, opts) => props.selectRegion(id, opts)}
      />
      <AnswerForm
        fields={FIELDS}
        toName="image"
        regions={props.regions}
        selectedRegionIds={props.selectedRegionIds}
        addRegion={props.addRegion}
        updateRegion={props.updateRegion}
        deleteRegion={props.deleteRegion}
        onValidationChange={props.onValidationChange}
        readOnly={props.readOnly}
      />
    </div>
  );
}

({
  default: Screen,
  visibilitySupport: { unsupportedKinds: ["answer"] },
  outputSchema: {
    type: "object",
    properties: {
      label: { type: "array", items: { type: "string", enum: ["Car", "Person"] } },
      quality: { type: "string", enum: QUALITY_OPTIONS },
      color: { type: "string", enum: COLOR_OPTIONS },
    },
  },
  getResults(regions, relations, ctx) {
    return [
      ...window.InterfaceComponents.ImageCanvas.toImageResults(regions, { fromName: "label", toName: "image" }),
      ...window.InterfaceComponents.AnswerForm.answersToResults(regions, {
        toName: "image",
        ...(ctx && ctx.params ? { fields: FIELDS, params: ctx.params } : {}),
      }),
    ];
  },
  parseResults(results) {
    const labelColors = { Car: "#2563eb", Person: "#16a34a" };
    const parsed = window.InterfaceComponents.AnswerForm.resultsToAnswers(results, {});
    const boxes = window.InterfaceComponents.ImageCanvas.fromImageResults(parsed.rest, { labelColors });
    return { regions: window.InterfaceComponents.AnswerForm.attachAnswers(boxes, parsed) };
  },
  getValidationErrors(regions) {
    return window.InterfaceComponents.AnswerForm.collectAnswerErrors(regions, FIELDS);
  },
})
```

### Anti-patterns
- **Do NOT** hand-write a serializer for regions a component owns — call its helpers. **Do NOT** guard helpers with `isLoaded()` / `getLoaded()` fallbacks in getResults / parseResults: referenced chunks are loaded before those run.
- **Do NOT** copy a component's internals (pointer math, waveform drawing, drag handling, ranker row DnD, taxonomy expand/collapse) into the screen.
- **Do NOT** keep a parallel React copy of regions; derive everything from `props.regions`.
- **Do NOT** render a region / segment / layer list in the Screen (no `RegionList`, no hand-written side list). The shell's Regions panel owns listing, selection, visibility, locking, deletion and relation linking; per-region inputs go in `AnswerForm` (`scope: "region"`) for the selected region.
- **Do NOT** invent props. Unknown props are ignored silently — check the component's module for its real props.
- **Do NOT** hand relations to a canvas component (`relations`, `onAddRelation`, `onDeleteRelation`). Relations are shell-owned: the shell draws, creates (`props.setRelationLinkingSource(id)`), labels and serializes them; canvases only expose one `data-region-id` per painted region and route clicks through `onSelectRegion`.
- **Do NOT** ship a first artifact with hand-rolled taxonomy chips or a custom ranking table when `TaxonomyTree` / `RankerBoard` cover the ask — wait for a user iteration that needs something those components cannot do.
