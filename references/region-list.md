<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Interface Components: RegionList

Controlled temporal companions: `RegionList.FilterControls({regions,value,onChange,groupBy,onGroupByChange})` edits a shared filter; `RegionList.TemporalSummary({regions,filter,frameCount,currentFrame,onSeekFrame,maxSamples})` renders occupied-track density with bounded samples. Share the filter with VideoCanvas.regionFilter and grouping with timelineGroupBy. Neither changes canonical annotations. These controls may accompany an existing region list; the shell still owns its primary Regions panel.

## Region lists: use the shell's Regions panel

**Do not render a region / segment / layer list inside a Screen** — neither `window.InterfaceComponents.RegionList` nor a hand-written one. The shell's right-side **Regions panel** already owns region listing, selection (Ctrl/Cmd/Shift+click multi-select), visibility, locking, deletion and relation linking for every modality. A second list inside the Screen duplicates that UI and state handling and the two drift apart.

### What to do instead
- Pass the shell props to the canvases (`regions` / `visibleRegions`, `selectedRegionIds`, `selectRegion`, `updateRegion`, `deleteRegion`, `relationLinkingSource`) and the Regions panel lists everything they paint. Relation anchors stay on the canvases (`data-region-id`).
- **Stamp `region.colors`** (pass `labelColors` into the canvas and into `from*Results` / relabel patches). The Regions panel reads `region.colors[0]` only — unlike `RegionList`, it has no `labelColors` fallback, so empty `colors` shows gray chips while the canvas still looks correct.
- **Selection from the panel already navigates the canvases**: `ImageCanvas.Group` switches to the image that owns the selected mark, `DocumentCanvas` scrolls to its page, `TextCanvas` scrolls the span into view, and `VideoCanvas` seeks to a selected video region's start.
- For players that do not follow selection on their own (`AudioCanvas`, `TimeSeriesCanvas`), add a small effect that reacts to a *newly* selected region and seeks / zooms only when it is out of view (a click on the canvas itself is already in view) — see the example.
- Per-region questions (transcription, per-segment choices) belong in `AnswerForm` with `scope: "region"`: it targets the single selected region, so it works with selections made from the Regions panel. Never put per-region inputs inside list rows.
- While the shell is linking (`props.relationLinkingSource` set), a short status line such as "Click the region to link to (Esc cancels)" is fine; the link action itself lives in the Regions panel.

```jsx
const EMPTY = new Set();

// Rendered inside AudioCanvas.Root: a segment selected from the shell's Regions panel seeks the player to it.
function FollowSelection({ screen }) {
  const player = window.InterfaceComponents.AudioCanvas.useController();
  const selected = screen.selectedRegionIds instanceof Set ? screen.selectedRegionIds : EMPTY;
  const prevRef = useRef(EMPTY);
  useEffect(() => {
    const previous = prevRef.current;
    prevRef.current = selected;
    for (const id of selected) {
      if (previous.has(id)) continue;
      const value = (screen.regions || []).find((r) => r.id === id)?._value;
      if (!value || !Number.isFinite(value.start)) continue;
      const now = player.currentTime || 0;
      if (now < value.start || now > value.end) player.seek(value.start);
      break;
    }
  }, [selected]);
  return null;
}

function TranscriptionScreen(props) {
  const AudioCanvas = window.InterfaceComponents.AudioCanvas;
  const AnswerForm = window.InterfaceComponents.AnswerForm;
  return (
    <AudioCanvas.Root
      audioUrl={props.task.data.audio}
      regions={(props.regions || []).filter((r) => r._toName === "audio")}
      selectedRegionIds={props.selectedRegionIds}
      activeLabels={["Speech"]}
      fromName="label"
      toName="audio"
      readOnly={props.readOnly}
      onAddRegion={props.addRegion}
      onUpdateRegion={props.updateRegion}
      onDeleteRegion={props.deleteRegion}
      onSelectRegion={(id, opts) => props.selectRegion(id, opts)}
    >
      <AudioCanvas.Toolbar>
        <AudioCanvas.PlayGroup />
        <AudioCanvas.TimeDisplay />
      </AudioCanvas.Toolbar>
      <AudioCanvas.Viewport />
      <FollowSelection screen={props} />
      <AnswerForm
        fields={[{ name: "transcript", kind: "textarea", scope: "region", label: "Segment transcript" }]}
        toName="audio"
        regions={props.regions || []}
        selectedRegionIds={props.selectedRegionIds}
        addRegion={props.addRegion}
        updateRegion={props.updateRegion}
        deleteRegion={props.deleteRegion}
        readOnly={props.readOnly}
        emptyRegionHint="Select a segment (on the waveform or in the Regions panel) to transcribe it."
      />
    </AudioCanvas.Root>
  );
}

({ default: TranscriptionScreen });
```

### RegionList reference (existing code only)
`window.InterfaceComponents.RegionList` still exists for Screens that already use it. When editing such a Screen, prefer removing the list in favor of the shell's Regions panel. Its props mirror the shell: `regions`, `selectedRegionIds`, `onSelectRegion`, `onUpdateRegion`, `onDeleteRegion`, `relationLinkingSource` + `onStartRelation`, `readOnly`, `hotkeys`, `labelColors`, `filter`, `groupBy`, `sortBy`, `onFocusRegion`, `renderItem` (wrap rows in `<RegionList.Item region={region}>`; building blocks `RegionList.Label`, `RegionList.Summary`, `RegionList.Actions`), and `RegionList.useController()` inside its children. Optional controlled members: `RegionList.FilterControls` (`regions`, `value` + `onChange` filter spec, `groupBy` + `onGroupByChange`; viewing preferences only, never region updates) and `RegionList.TemporalSummary` (`regions`, `filter`, `frameCount`, `currentFrame`, `onSeekFrame`, `maxSamples`; occupied-track density for video timelines). It never renders `data-region-id`.
