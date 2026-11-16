<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Interface Components: TextCanvas

## Interface Components: TextCanvas

`window.InterfaceComponents.TextCanvas` replaces classic `<Text>`, `<HyperText>` and `<Paragraphs>` with `<Labels>`: select text to create a span, nested/overlapping spans, drag the edges of the selected span to resize it, symbol / word / sentence / paragraph granularity, virtualized long documents and transcripts, transcripts synced to audio / video, relations drawn by the shell.

Props: `mode` ("text" | "html" | "paragraphs"), `text` / `html` / `paragraphs` (+ `nameKey`, `textKey`), `granularity` ("symbol" | "word" | "sentence" | "paragraph"), `regions`, `selectedRegionIds`, `onAddRegion`, `onUpdateRegion`, `onDeleteRegion`, `onSelectRegion`, `activeLabels`, `labelColors`, `fromName`, `toName`, `resizable`, `virtualize`, `onStartRelation` / `onCancelRelation` / `relationLinkingSource`, `showToolbar`, `readOnly`, `hotkeys`. Paragraphs only: `syncGroup` + `syncOffset`, `audioUrl` + `showPlayer`, `contextScroll`, `stopAtParagraphEnd`, `seekOnClick`, `onActiveParagraphsChange`, `layout` ("dialogue" | "none"), `authorFilter` / `defaultAuthorFilter` / `onAuthorFilterChange` / `showAuthorFilter`. Compound members: `TextCanvas.Root`, `.Viewport`, `.ChatView`, `.AuthorFilter`, `.Toolbar`, `.RegionsOverlay`; `TextCanvas.useController()` also exposes `focusRegion(id)` and `scrollToParagraph(index)`.

Region `type` / `_value`:
- `labels` (plain text) — `{ start, end, text }`, **code-point** offsets into the source text (classic LS, not UTF-16).
- `hypertextlabels` (html) — `{ start, end, startOffset, endOffset, globalOffsets: { start, end }, text }` where start/end are xpaths.
- `paragraphlabels` (paragraphs) — `{ start, end, startOffset, endOffset, text }` where start/end are paragraph indices as strings.

Built in (no Screen code needed):
- **Resize**: the single selected span shows start / end handles; a drag previews locally and calls `onUpdateRegion(id, { _value, text })` ONCE on release, snapped to `granularity` (Escape cancels). Pass `onUpdateRegion={props.updateRegion}`; `resizable={false}` turns it off; `readOnly` / locked spans never show handles.
- **Granularity**: `sentence` uses Unicode sentence segmentation (Intl.Segmenter); `paragraph` = a line in text mode, a turn in paragraphs mode, a block element in html mode.
- **Long inputs**: text over ~30k characters and more than ~300 paragraphs render only the blocks near the viewport (`virtualize="auto"`); offsets and results are unchanged. A span selected elsewhere (the shell's Regions panel) is scrolled into view.
- **Transcripts** (`mode="paragraphs"`): paragraphs with `start` + `end` (or `duration`) seconds get a ▶ button (plays that paragraph and stops at its end, like classic) and a timestamp button (plays from there); with `syncGroup` the paragraph under the group playhead is highlighted (`data-active`, `aria-current`) and kept in view (`contextScroll`). `audioUrl` (+ `showPlayer`) gives a transcript its own audio without any other component. The toolbar shows an author filter when there are 2+ speakers.

- **Pass shell state straight through.** `props.regions` already uses the canonical shape, so filter it to this canvas (`r._toName === TO_NAME`) and pass it as `regions`. Wire `selectedRegionIds={props.selectedRegionIds}`, `onAddRegion={props.addRegion}`, `onUpdateRegion={props.updateRegion}`, `onDeleteRegion={props.deleteRegion}`, `onSelectRegion={(id, opts) => props.selectRegion(id, opts)}` (a `null` id clears the selection).
- **Created regions are complete.** The canvas stamps `activeLabels` → `labels`, `labelColors` → `colors`, and `fromName`/`toName` → `_fromName`/`_toName`. Do not rebuild or re-id them in the screen. Always pass the same `labelColors` map you give the LabelPicker.
- **No Delete buttons in slots.** `onDeleteRegion` is for the canvas's own delete gestures. The shell already renders Lock / Hide / Delete around `InfoViewer` and `OutlinerItem`, so those exports render content only — never a "Delete polygon" / "Delete box" / trash button (FIT-2931).
- **Never discard unlabeled regions.** If nothing is selected in the LabelPicker the region is created with `labels: []`; relabel it later with `props.updateRegion(id, { labels, colors })` (always update `colors` with `labels`).
- **Hydrate with colors.** In `parseResults`, pass `{ labelColors }` into `from*Results` (or stamp `colors` afterward). The Regions panel has no `labelColors` fallback — empty `colors` means gray chips.
- **Do not show the in-canvas LayerManager.** `showLayers` defaults to false. Leave it off (and do not mount `*.LayerManager`) — the editor-shell Outliner / Regions panel is the region list.
- Relations are shell-owned: do **not** pass `relations`, `onAddRelation` or `onDeleteRelation` to TextCanvas in a Custom Interface (the shell overlay already draws arcs from the spans' `data-region-id`). Wire `onStartRelation={(id) => props.setRelationLinkingSource?.(id)}`, `onCancelRelation={() => props.setRelationLinkingSource?.(null)}` and `relationLinkingSource={props.relationLinkingSource}`: the toolbar Relation button / Alt+click call `props.setRelationLinkingSource(selectedId)` through `onStartRelation` (the shell owns Alt+R), and the next span click (routed through `onSelectRegion`) completes it. Declare relation labels with `paramsSchema.relationLabels` — the Relations panel edits them.

```jsx
function NerScreen(props) {
  const TextCanvas = window.InterfaceComponents.TextCanvas;
  const LabelPicker = window.InterfaceComponents.LabelPicker;
  const LABELS = [{ value: "PER", color: "#f59e0b" }, { value: "ORG", color: "#8b5cf6" }];
  const [activeLabels, setActiveLabels] = React.useState([]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, height: "100%" }}>
      <LabelPicker labels={LABELS} value={activeLabels} onChange={setActiveLabels} hotkeys={props.hotkeys} />
      <TextCanvas
        mode="text"
        text={getField(props.task.data, props.params?.textField) || ""}
        granularity="word"
        regions={(props.regions || []).filter((r) => r.type === "labels" && r._toName === "text")}
        selectedRegionIds={props.selectedRegionIds}
        activeLabels={activeLabels}
        labelColors={Object.fromEntries(LABELS.map((l) => [l.value, l.color]))}
        fromName="label"
        toName="text"
        readOnly={props.readOnly}
        onAddRegion={props.addRegion}
        onUpdateRegion={props.updateRegion}
        onDeleteRegion={props.deleteRegion}
        onSelectRegion={(id, opts) => props.selectRegion(id, opts)}
      />
    </div>
  );
}
```

### Recipe: transcript follows audio (classic `<Audio sync>` + `<Paragraphs sync>`)
One `syncGroup` string on AudioCanvas, TextCanvas and ONE MediaTransport. No state, effects or time math in the Screen: the transcript highlights and scrolls itself, and its ▶ / timestamp buttons seek the audio.
```jsx
function TranscriptScreen(props) {
  const IC = window.InterfaceComponents;
  const AudioCanvas = IC.AudioCanvas;
  const TextCanvas = IC.TextCanvas;
  const MediaTransport = IC.MediaTransport;
  const LabelPicker = IC.LabelPicker;
  const data = props.task.data || {};
  const GROUP = "call";
  const LABELS = [{ value: "Complaint", color: "#ef4444" }, { value: "Resolution", color: "#10b981" }];
  const labelColors = Object.fromEntries(LABELS.map((l) => [l.value, l.color]));
  const [activeLabels, setActiveLabels] = React.useState(["Complaint"]);
  const regions = props.regions || [];
  const wire = (toName, fromName) => ({
    regions: regions.filter((r) => r._toName === toName),
    selectedRegionIds: props.selectedRegionIds,
    readOnly: props.readOnly,
    hotkeys: props.hotkeys,
    activeLabels,
    labelColors,
    fromName,
    toName,
    onAddRegion: props.addRegion,
    onUpdateRegion: props.updateRegion,
    onDeleteRegion: props.deleteRegion,
    onSelectRegion: (id, opts) => props.selectRegion(id, opts),
  });
  return (
    <div style={{ display: "grid", gap: 12, padding: 12, height: "100%", gridTemplateRows: "auto auto auto 1fr" }}>
      <LabelPicker labels={LABELS} value={activeLabels} onChange={setActiveLabels} hotkeys={props.hotkeys} />
      <MediaTransport syncGroup={GROUP} />
      <AudioCanvas {...wire("audio", "segment")} src={data.audio || ""} syncGroup={GROUP} />
      <TextCanvas
        {...wire("dialogue", "intent")}
        mode="paragraphs"
        paragraphs={Array.isArray(data.dialogue) ? data.dialogue : []}
        granularity="sentence"
        syncGroup={GROUP}
        syncOffset={Number(props.params?.transcriptOffset) || 0}
        relationLinkingSource={props.relationLinkingSource}
        onStartRelation={(id) => props.setRelationLinkingSource?.(id)}
        onCancelRelation={() => props.setRelationLinkingSource?.(null)}
      />
    </div>
  );
}
```
- `data.dialogue` items look like `{ "author": "Agent", "text": "How can I help?", "start": 1.2, "end": 3.4 }` (classic Paragraphs data). Untimed items still render and can be labeled; they just have no ▶.
- Transcript-only audio: skip AudioCanvas / MediaTransport and pass `audioUrl={data.audio}` + `showPlayer` to TextCanvas.

- Do NOT compute offsets from `window.getSelection()` yourself; TextCanvas already emits LS-exact offsets. Do NOT subscribe to the audio time to highlight paragraphs — `syncGroup` does it.
