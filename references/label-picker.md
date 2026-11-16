<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Interface Components: LabelPicker

## Interface Components: LabelPicker

`window.InterfaceComponents.LabelPicker` is the classic `<Labels>` palette. It owns no regions — it produces the `activeLabels` you pass to a canvas, plus hotkeys (1–9 auto-assigned while the picker or canvas area is focused; explicit `hotkey` per label wins).

Props: `labels` ({ value, alias?, color?, background?, hotkey?, hint?, group?, maxUsages? }[]), `value` (selected label keys, `alias ?? value`), `onChange(selected: string[])`, `multiple`, `layout` ("bar" | "ribbon" | "sidebar" | "dropdown"), `searchable`, `showHotkeys`, `usageCounts` + `maxUsages`, `readOnly`, `hotkeys`. Compound members: `LabelPicker.Item`, `LabelPicker.Search`, `LabelPicker.Group`.

Choose `layout="ribbon"` for horizontal wrapping, `layout="bar"` for a horizontally scrolling row, or `layout="sidebar"` for a vertical list. `searchable` enables filtering by display text, value, alias, or group (automatic above 6 labels). Search covers the full list and preserves selections. Enter in the filter selects the first available matching label, skipping disabled labels and exhausted usage limits; an already selected match stays selected. Lists above 100 labels use continuous virtual scrolling in a scrolling area capped by `maxHeight` (default 320 pixels). There is no pagination; only nearby label blocks mount. Arrow keys, Home/End, and Tab can reach labels outside the rendered window. Search stays visible. Use `layout="dropdown"` for a compact trigger with a colored selection summary and a vertical popup. Single selection closes the popup; `multiple` keeps it open. Escape dismisses it and returns focus to the trigger. Filtering and continuous virtual scrolling work inside the dropdown too.

Use `LabelPicker.normalizeLabels(input)` for catalog {name, color}, classic {value, alias, ...}, or string labels. It preserves aliases, hints, hotkeys, initial selection and usage limits. `LabelPicker.labelKey(item)` returns the emitted alias/value; use it for colors and initial selections. Set `allowEmpty={false}` when editing an existing region that must retain a label (the default is true).

Use `LabelPicker.getLabelUsageCounts(regions, fromName)` to include hidden marks and every image. Enforce policies ({fromName, labels, allowEmpty, maxUsages}) using `LabelPicker.canApplyLabelChange(before, after, policies)` in screen callbacks and `onBeforeUpdate`, and `LabelPicker.collectLabelErrors(regions, policies)` at submit. Pass only the spatial regions governed by those policies, excluding answer regions. Violations in old imports remain editable, but new violations and pasted unlabeled regions are rejected.

```jsx
function LabelsBar(props) {
  const LabelPicker = window.InterfaceComponents.LabelPicker;
  const LABELS = [
    { value: "Car", color: "#2563eb" },
    { value: "Person", color: "#16a34a" },
  ];
  const [activeLabels, setActiveLabels] = React.useState([]);
  const labelColors = Object.fromEntries(LABELS.map((l) => [l.value, l.color]));

  // Relabel the selected region when the picker changes (classic behavior).
  const handleChange = (next) => {
    setActiveLabels(next);
    for (const id of props.selectedRegionIds || []) {
      props.updateRegion(id, { labels: next, colors: next.map((l) => labelColors[l]) });
    }
  };

  return (
    <LabelPicker labels={LABELS} value={activeLabels} onChange={handleChange} readOnly={props.readOnly} hotkeys={props.hotkeys} />
  );
}
```

- Keep `activeLabels` in screen state and pass the same array + `labelColors` to the canvas (so creates stamp `colors`).
- Always patch `{ labels, colors }` together when relabeling — the Regions panel has no `labelColors` fallback.
- Do NOT create regions from the picker; canvases create them.
