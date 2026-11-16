<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Interface Components: AnswerForm

## Interface Components: AnswerForm

`window.InterfaceComponents.AnswerForm` renders a declarative list of questions with the existing controls (ChoiceGroup, TaxonomyTree, TextInput, RatingControl, NumberInput, DateTimeInput, LabelPicker) and stores every answer in shell regions in exact classic Label Studio shape. **Use it whenever a screen has questions** — task-level classification, per-region answers (classic `perRegion`), per-item answers (classic `perItem`), conditional follow-ups (classic `visibleWhen` / `whenTagName` / `whenLabelValue` / `whenChoiceValue` / `whenRole`) or `required` answers. Do NOT hand-roll `_perRegion` bookkeeping, gating, or validation.

### Fields
`{ name, kind, scope?, toName?, label?, description?, required?, requiredMessage?, options?, choice?, multiple?, when?, props? }`

`required` is opt-in (FIT-3078): classic controls are optional, so set `required: true` only when the user asked for a mandatory answer.
- `name` is the LS `from_name`; `kind` → result type: "choices" → `"choices"`, "taxonomy" → `"taxonomy"`, "textarea" → `"textarea"` (`{ text: [...] }`), "rating" → `"rating"`, "number" → `"number"`, "datetime" → `"datetime"`. "labels" relabels the target region (no own result).
- `scope`: "task" (default, one answer), "region" (one per region; results share the region id and carry its geometry), "item" (one per `itemIndex`; results carry `item_index`).
- `when` (all must hold): `label` (whenLabelValue), `tagName` (region's `_fromName`), `regionType`, `role`, `choice: { name, value, selected: false for "choice-unselected" }`, `itemIndex`, `regionSelected`. Gated-out answers are hidden, not validated and not submitted (classic).
- `props` goes straight to the control (`{ layout: "radio" }`, `{ maxRating: 10 }`, `{ rows: 3 }`, `{ only: "date" }`).
- `nested: true` (choices; classic `<Choices allowNested>`): `options` are a tree (`{ value, children: [...] }`), the control is a tree and the value is a list of paths (`value.choices = [["Animal", "Cat"]]`); `when.choice` matches the leaf.
- `when.param: { name, value?, not? }` gates on Screen params (pass `params={props.params}`; at submit pass `answersToResults(regions, { fields, params })` with the `params` getResults receives as its third argument `{ params }`).
- Text (`kind: "textarea"`) commits on blur / Enter (Ctrl/Cmd+Enter when multi-row) and after a short typing pause — never per keystroke, so undo history stays clean; a pending draft is always written to the region it was typed for. `commitOn: "change"` commits every keystroke. Every other kind commits immediately.
- Accessibility: composite controls (choices, taxonomy, labels, rating, custom `render`) sit in a group named by the question and keep their own control name; text / number / datetime inputs are named by the question with no wrapping group — the question is never announced twice. Pass `props: { ariaLabel }` to rename a control.

### Props
`fields`, `regions={props.regions}`, `selectedRegionIds={props.selectedRegionIds}`, `addRegion={props.addRegion}`, `updateRegion={props.updateRegion}`, `deleteRegion={props.deleteRegion}`, `onValidationChange={props.onValidationChange}`, `readOnly={props.readOnly}`, `hotkeys={props.hotkeys}`, plus `toName`, `regionId`, `itemIndex` / `itemCount`, `showValidation`, `scopes`. Custom layouts: place fields with `<AnswerForm.Field name="..." />` inside `<AnswerForm>`, or pass a render function `{(answers) => ...}` (`answers.get(name)`, `answers.set(name, value)`, `answers.isVisible(name)`, `answers.errors`); `useAnswers()` reads the same controller inside children. Keyboard: field hotkeys only fire while that field is focused (several forms never collide); Alt+↓ / Alt+↑ move between questions of one form.

### Bulk region answers
Opt in with `bulkRegionEditing`, `mutationRevision={props.mutationRevision}` and `applyRegionTransaction={props.applyRegionTransaction}`. With two or more selected objects, only region fields stage edits; task/item fields and single-region behavior retain their existing commits. Different values show an explicit mixed state, with no first-object value copied implicitly. Edit to replace that field on every target, Clear to delete it, Reset Field to remove its draft, then Apply for one atomic history entry or Cancel. Untouched fields and answer metadata stay unchanged.

Every selected target must exist, be editable and share control/object/item binding; the whole selection is rejected for protected/prediction/unsupported regions or scope mismatch. Protected answer entries disable their field. Conditions must hold for every target after projected draft parent answers; reset a staged child whose gate no longer applies. Selection, host revision and field configuration changes discard the draft visibly. A failed host keeps the draft; missing atomic support disables Apply without sequential fallback. An explicit `regionId` keeps single-target behavior. Custom renderers receive `mixed` / `dirty`; `useAnswers().bulk` exposes `count`, `dirtyFields`, `canApply`, `reason`, `apply`, `cancel`, `clear` and `reset`. Bulk text stages locally on each keystroke, so Apply includes the last character without blur.

### Any control: `render` + kinds "pairwise" / "ranker"
PairwiseRanker / RankerBoard live in their own chunks, so AnswerForm has no built-in control for `kind: "pairwise"` (`value: { selected: "left"|"right" }`) or `kind: "ranker"` (`value: { ranker: { column: ids[] } }`): host them with `<AnswerForm.Field name render={(f) => ...}>` (or a field-level `render`). The renderer gets `{ field, value, lsValue, onChange(widget), setLsValue(ls|null), readOnly, visible, missing, labelId, hotkeys, hotkeysEnabled, theme, answerRegionId }`; AnswerForm keeps storage, `required`, `when` gating and serialization. `adapter: { toLs(widget), fromLs(ls) }` converts any custom widget value. Give the control `aria-labelledby={f.labelId}` only if it needs the question text as its own name.

`<AnswerForm.Field anchorRegionId>` (`true` = the stored answer region, or an explicit id) — or `anchorAnswers` on the form — stamps `data-region-id` on the field wrapper so shell relations can target answers.

```jsx
const PAIR_FIELDS = [
  { name: "preference", kind: "pairwise", toName: "items", label: "Which response is better?", required: true },
  { name: "rank", kind: "ranker", toName: "items", label: "Rank the responses" },
];

function PairScreen(props) {
  const { AnswerForm, PairwiseRanker, RankerBoard } = window.InterfaceComponents;
  const items = (props.task.data.items || []).map((item, i) => ({ id: String(item.id ?? i), title: String(item.title ?? item.id ?? i), body: String(item.text ?? "") }));
  return (
    <AnswerForm
      fields={PAIR_FIELDS}
      regions={props.regions}
      addRegion={props.addRegion}
      updateRegion={props.updateRegion}
      deleteRegion={props.deleteRegion}
      onValidationChange={props.onValidationChange}
      readOnly={props.readOnly}
      anchorAnswers
    >
      <AnswerForm.Field
        name="preference"
        render={(f) => (
          <PairwiseRanker items={items.slice(0, 2)} mode="pairwise" value={f.value} onChange={f.onChange} readOnly={f.readOnly} />
        )}
      />
      <AnswerForm.Field
        name="rank"
        render={(f) => <RankerBoard items={items} value={f.value || { rank: items.map((i) => i.id) }} onChange={f.onChange} readOnly={f.readOnly} />}
      />
    </AnswerForm>
  );
}

({
  default: PairScreen,
  visibilitySupport: { unsupportedKinds: ["answer"] },
  getResults(regions) {
    return window.InterfaceComponents.AnswerForm.answersToResults(regions, { fields: PAIR_FIELDS });
  },
  parseResults(results) {
    const AnswerForm = window.InterfaceComponents.AnswerForm;
    return {
      regions: AnswerForm.resultsToAnswers(results, { fields: PAIR_FIELDS }).answerRegions,
      relations: AnswerForm.fromRelationResults(results),
    };
  },
  getValidationErrors(regions) {
    return window.InterfaceComponents.AnswerForm.collectAnswerErrors(regions, PAIR_FIELDS);
  },
});
```

### Storage (what `props.regions` contains)
- Task / item answers: one region per field (+ item): `{ _kind: "answer", type: "choices", _fromName, _toName, _value: { choices: ["Positive"] }, _itemIndex? }`.
- Region answers: on the target region, `_perRegion: { sentiment: { type: "choices", value: { choices: ["Positive"] } } }`.
Export `visibilitySupport: { unsupportedKinds: ["answer"] }` so the shell never hides answer regions.

### Serialization (one-liners)
Helpers come from the AnswerForm chunk: `answersToResults(regions, { fields, toName, params?, getGeometry?, getResultExtras? })` (per-region results repeat the target's geometry and classic `original_width` / `original_height` / `image_rotation` / `original_length` from `_originalWidth` / `_originalHeight` / `_imageRotation` / `_originalLength` — nothing to add by hand), `resultsToAnswers(results, { fields })` → `{ answerRegions, perRegion, rest, orphanIds, orphans }` (`orphans: [{ id, toName, itemIndex?, reference }]` — per-region answers whose target has no geometry result of its own, e.g. answers on task messages; `reference` is the geometry the answers repeat, ready to rebuild the anchor region; with `fields` only declared from_names are answers; without them every classification result is claimed, so pass `canvasRegions: parsedCanvasRegions` / `isOwnedByCanvas(result)` / `excludeIds` when a canvas serializes its own textarea, e.g. DocumentCanvas transcriptions), `toRelationResults(relations)` / `fromRelationResults(results)`, `attachAnswers(regions, parsed)`, `isAnswerRegion(region)`, `collectAnswerErrors(regions, fields, { itemCount })`. Call them as `window.InterfaceComponents.AnswerForm.<helper>` directly inside `getResults` / `parseResults` / `getValidationErrors` — the sandbox loads every component the Screen references before it validates the module or hydrates saved results, so no `load()` / `getLoaded()` guard or fallback serializer is needed. Serialize the canvas regions with that canvas's helpers (`window.InterfaceComponents.ImageCanvas.toImageResults` / `fromImageResults`) and let AnswerForm add the answers.

```jsx
const TO_NAME = "image";
const FIELDS = [
  { name: "quality", kind: "choices", label: "Image quality", required: true, options: ["Good", "Blurry"], toName: TO_NAME },
  { name: "blur_reason", kind: "choices", label: "Why blurry?", options: ["Motion", "Focus"], toName: TO_NAME,
    when: { choice: { name: "quality", value: "Blurry" } } },
  { name: "color", kind: "choices", scope: "region", label: "Car color", options: ["Red", "Blue"], when: { label: "Car" } },
  { name: "plate", kind: "textarea", scope: "region", label: "Plate text", required: true, when: { label: "Car" } },
  { name: "confidence", kind: "rating", scope: "region", label: "Confidence" },
];

function CarScreen(props) {
  const ImageCanvas = window.InterfaceComponents.ImageCanvas;
  const AnswerForm = window.InterfaceComponents.AnswerForm;
  const [activeLabels, setActiveLabels] = React.useState(["Car"]);
  const canvasRegions = (props.regions || []).filter((r) => r._kind !== "answer");
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 12, height: "100%" }}>
      <ImageCanvas
        src={props.task.data.image}
        regions={canvasRegions}
        selectedRegionIds={props.selectedRegionIds}
        activeLabels={activeLabels}
        labelColors={{ Car: "#2563eb" }}
        fromName="label"
        toName={TO_NAME}
        readOnly={props.readOnly}
        onAddRegion={props.addRegion}
        onUpdateRegion={props.updateRegion}
        onDeleteRegion={props.deleteRegion}
        onSelectRegion={(id, opts) => props.selectRegion(id, opts)}
      />
      <AnswerForm
        fields={FIELDS}
        toName={TO_NAME}
        regions={props.regions}
        selectedRegionIds={props.selectedRegionIds}
        addRegion={props.addRegion}
        updateRegion={props.updateRegion}
        deleteRegion={props.deleteRegion}
        onValidationChange={props.onValidationChange}
        readOnly={props.readOnly}
        hotkeys={props.hotkeys}
        showValidation
      >
        {(answers) => (
          <>
            <AnswerForm.Field name="quality" />
            <AnswerForm.Field name="blur_reason" />
            {answers.target ? <h4>Selected car</h4> : <p>Select a car to describe it.</p>}
            <AnswerForm.Field name="color" />
            <AnswerForm.Field name="plate" />
            <AnswerForm.Field name="confidence" />
          </>
        )}
      </AnswerForm>
    </div>
  );
}

({
  default: CarScreen,
  visibilitySupport: { unsupportedKinds: ["answer"] },
  getResults(regions) {
    return [
      ...window.InterfaceComponents.ImageCanvas.toImageResults(regions, { fromName: "label", toName: TO_NAME }),
      ...window.InterfaceComponents.AnswerForm.answersToResults(regions, { fields: FIELDS, toName: TO_NAME }),
    ];
  },
  parseResults(results) {
    const labelColors = { Car: "#2563eb" };
    const parsed = window.InterfaceComponents.AnswerForm.resultsToAnswers(results, { fields: FIELDS });
    const boxes = window.InterfaceComponents.ImageCanvas.fromImageResults(parsed.rest, { labelColors });
    return { regions: window.InterfaceComponents.AnswerForm.attachAnswers(boxes, parsed) };
  },
  getValidationErrors(regions) {
    return window.InterfaceComponents.AnswerForm.collectAnswerErrors(regions, FIELDS);
  },
});
```

- Per-region results are classic: `{ id: <region id>, from_name: "color", to_name: "image", type: "choices", value: { x, y, width, height, rotation, choices: ["Red"] } }` next to the region's own `rectanglelabels` result with the same id.
- Multi-image: pass `itemIndex={currentImage}` and `itemCount={images.length}`; item-scoped answers serialize with `item_index`; region answers inherit the region's `_itemIndex`.
- Keep `FIELDS` at module scope (stable identity) so fields do not re-render on every keystroke.
