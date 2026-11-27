<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Interface Components: TimeSeriesCanvas

## Interface Components: TimeSeriesCanvas

`window.InterfaceComponents.TimeSeriesCanvas` replaces classic `<TimeSeries>` + `<TimeSeriesLabels>`: stacked channels, brush-to-zoom overview, drag to create ranges, click-with-modifier for instants, large-series downsampling.

Props: `channels` ({ id, name, color, data: [[x, y], ...] }[]), `regions`, `selectedRegionIds`, `onAddRegion`, `onUpdateRegion`, `onDeleteRegion`, `onSelectRegion`, `activeLabels`, `labelColors`, `fromName`, `toName`, `showChannelSelector`, `showToolbar`, `showZoomControls`, `downsampleThreshold`, `initialXDomain` + `onXDomainChange`, `syncGroup` + `syncOffset` + `timeScale`, `showHoverTooltip`, `largeStep`, `readOnly`, `hotkeys`. Compound members: `TimeSeriesCanvas.Root`, `.Viewport`, `.Toolbar`, `.ZoomControls`, `.ChannelSelector`, `.RegionsOverlay`, `.SyncCursor`, `.HoverTracker`.

Built in: hover crosshair with every channel's value (`TimeSeriesCanvas.HoverTracker`); with a region selected ←/→ grow it one sample (classic `ts:grow-left` / `ts:grow-right`), alt+←/→ shrink, shift = `largeStep` samples; without a selection the arrows pan. With `syncGroup` (see the media-transport module) the group playhead is drawn as a cursor (`TimeSeriesCanvas.SyncCursor`), a plot click seeks the video / audio, and several TimeSeriesCanvas of one group share the crosshair. Seconds = time since the first sample (date column) or `(t − first) × timeScale` (numeric column).

Region: `type: "timeserieslabels"`, `_value: { start, end, instant }` in the units of the time column (numbers, or the original time strings when the column is a date format). Label key: `value.timeserieslabels`.

- **Pass shell state straight through.** `props.regions` already uses the canonical shape, so filter it to this canvas (`r._toName === TO_NAME`) and pass it as `regions`. Wire `selectedRegionIds={props.selectedRegionIds}`, `onAddRegion={props.addRegion}`, `onUpdateRegion={props.updateRegion}`, `onDeleteRegion={props.deleteRegion}`, `onSelectRegion={(id, opts) => props.selectRegion(id, opts)}` (a `null` id clears the selection).
- **Created regions are complete.** The canvas stamps `activeLabels` → `labels`, `labelColors` → `colors`, and `fromName`/`toName` → `_fromName`/`_toName`. Do not rebuild or re-id them in the screen. Always pass the same `labelColors` map you give the LabelPicker.
- **No Delete buttons in slots.** `onDeleteRegion` is for the canvas's own delete gestures. The shell already renders Lock / Hide / Delete around `InfoViewer` and `OutlinerItem`, so those exports render content only — never a "Delete polygon" / "Delete box" / trash button (FIT-2931).
- **Never discard unlabeled regions.** If nothing is selected in the LabelPicker the region is created with `labels: []`; relabel it later with `props.updateRegion(id, { labels, colors })` (always update `colors` with `labels`).
- **Hydrate with colors.** In `parseResults`, pass `{ labelColors }` into `from*Results` (or stamp `colors` afterward). The Regions panel has no `labelColors` fallback — empty `colors` means gray chips.
- **Do not show the in-canvas LayerManager.** `showLayers` defaults to false. Leave it off (and do not mount `*.LayerManager`) — the editor-shell Outliner / Regions panel is the region list. When the user asks for a region list in the Screen, build it with `RegionList` wired to the shell props (see the RegionList module), not `showLayers`.

```jsx
function SensorScreen(props) {
  const TimeSeriesCanvas = window.InterfaceComponents.TimeSeriesCanvas;
  const rows = props.task.data?.readings || [];
  const channels = [
    { id: "temp", name: "Temperature", color: "#ef4444", data: rows.map((r) => [r.time, r.temp]) },
    { id: "hum", name: "Humidity", color: "#3b82f6", data: rows.map((r) => [r.time, r.humidity]) },
  ];
  const [activeLabels, setActiveLabels] = React.useState(["Anomaly"]);
  return (
    <TimeSeriesCanvas
      channels={channels}
      regions={(props.regions || []).filter((r) => r.type === "timeserieslabels")}
      selectedRegionIds={props.selectedRegionIds}
      activeLabels={activeLabels}
      labelColors={{ Anomaly: "#f97316" }}
      fromName="label"
      toName="ts"
      readOnly={props.readOnly}
      onAddRegion={props.addRegion}
      onUpdateRegion={props.updateRegion}
      onDeleteRegion={props.deleteRegion}
      onSelectRegion={(id, opts) => props.selectRegion(id, opts)}
    />
  );
}
```
