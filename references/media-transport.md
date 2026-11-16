<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Interface Components: MediaTransport & media sync

## Interface Components: MediaTransport & synchronized media (`syncGroup`)

Classic `<Video sync="v">` + `<Audio sync="v">` + `<TimeSeries sync="v">` + `<Paragraphs sync="v">` → give every stream the SAME `syncGroup` string. Play / pause / seek / speed on any member propagates to all others; the member the user touched last leads the clock and the others are drift-corrected while playing. No state, effects or refs in the Screen.

- `VideoCanvas`, `AudioCanvas`, `TimeSeriesCanvas` accept `syncGroup` and `syncOffset` (seconds on the group timeline at which the stream's t=0 sits — use it when streams started recording at different times). Each stays fully usable without a group.
- A synced video is muted while the group contains an `AudioCanvas` (classic: only the audio is audible).
- `TimeSeriesCanvas` in a group draws the playhead as a vertical cursor, a plot click seeks the whole group, the view follows the playhead while playing, and the hover crosshair / value tooltip is shared by every TimeSeriesCanvas of the group. Time mapping: date time column → seconds since the first sample; numeric time column → `(t − first) × timeScale` (default `timeScale={1}`, i.e. the column is seconds; `timeScale={0.001}` for ms, `timeScale={1 / 250}` for sample indices at 250 Hz); `timeToSeconds` + `secondsToTime` override both.
- `window.InterfaceComponents.MediaTransport` is ONE transport for the whole group: play/pause, seek bar, time display (with the frame number when the group has a video), speed select, frame step buttons (auto when a video is present). Hotkeys are scoped to the transport (focus it): space = play/pause, ←/→ = one frame (video) or `seekStep` seconds, shift+←/→ = `largeSeekStep` seconds, Home / End.
- Props: `syncGroup` (required), `rates`, `seekStep`, `largeSeekStep`, `showFrameStep` (true | false | "auto"), `showRate`, `hotkeys`, `theme`, `ariaLabel`, `className`, `children` (custom layout).
- Compound members (usable inside `<MediaTransport syncGroup>`, or standalone with their own `syncGroup` prop): `MediaTransport.PlayButton`, `MediaTransport.Scrubber`, `MediaTransport.TimeDisplay`, `MediaTransport.RateSelect`, `MediaTransport.FrameStep`, `MediaTransport.SyncedTime` (render prop `(time, controller) => node`, throttled ~100 ms — use it for transcripts / captions that follow the media). `MediaTransport.useController()` inside a transport returns `{ playing, rate, duration, fps, hasVideo, getTime, play, pause, toggle, seek, seekBy, setRate, stepFrames, stepForward, stepBackward }`.
- Put only ONE transport per group and hide per-canvas play controls you don't need (`showToolbar={false}` on VideoCanvas keeps its timeline; AudioCanvas keeps its waveform click-to-seek). Never wire `onTimeUpdate` of one canvas into another's seek — the group already does it.

### Recipe: Synchronized multi-stream (video + audio + sensor time series + transcript)
```jsx
function MultiStreamScreen(props) {
  const IC = window.InterfaceComponents;
  const VideoCanvas = IC.VideoCanvas;
  const AudioCanvas = IC.AudioCanvas;
  const TimeSeriesCanvas = IC.TimeSeriesCanvas;
  const MediaTransport = IC.MediaTransport;
  const LabelPicker = IC.LabelPicker;
  const data = props.task.data || {};
  const GROUP = "session";
  const [activeLabels, setActiveLabels] = React.useState(["Event"]);
  const labelColors = { Event: "#f59e0b", Speech: "#3b82f6" };
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
  const transcript = Array.isArray(data.transcript) ? data.transcript : []; // [{ start, end, text }]
  return (
    <div style={{ display: "grid", gap: 12, padding: 12 }}>
      <LabelPicker
        labels={[{ value: "Event", color: "#f59e0b" }, { value: "Speech", color: "#3b82f6" }]}
        value={activeLabels}
        onChange={setActiveLabels}
      />
      <MediaTransport syncGroup={GROUP} />
      <div style={{ height: 380 }}>
        <VideoCanvas {...wire("video", "box")} src={data.video || ""} frameRate={25} syncGroup={GROUP} />
      </div>
      <AudioCanvas {...wire("audio", "speech")} src={data.audio || ""} syncGroup={GROUP} />
      <div style={{ height: 300 }}>
        <TimeSeriesCanvas
          {...wire("sensors", "event")}
          data={data.sensors}
          timeColumn="time"
          syncGroup={GROUP}
          syncOffset={Number(props.params?.sensorOffset) || 0}
        />
      </div>
      <MediaTransport.SyncedTime syncGroup={GROUP}>
        {(t, ctrl) => (
          <ol aria-label="Transcript" style={{ margin: 0, paddingLeft: 16 }}>
            {transcript.map((line) => (
              <li key={line.start}>
                <EditorUI.Button
                  type="button"
                  variant="neutral"
                  look="ghost"
                  size="smaller"
                  onClick={() => ctrl.seek(line.start)}
                  aria-current={t >= line.start && t < line.end ? "true" : undefined}
                  style={{ fontWeight: t >= line.start && t < line.end ? "var(--font-weight-semibold)" : "var(--font-weight-medium)" }}
                >
                  {line.text}
                </EditorUI.Button>
              </li>
            ))}
          </ol>
        )}
      </MediaTransport.SyncedTime>
    </div>
  );
}
```

### Custom transport layout
```jsx
function CompactTransport() {
  const MediaTransport = window.InterfaceComponents.MediaTransport;
  return (
    <MediaTransport syncGroup="session" seekStep={0.5} rates={[0.5, 1, 2]}>
      <MediaTransport.PlayButton />
      <MediaTransport.FrameStep />
      <MediaTransport.Scrubber />
      <MediaTransport.TimeDisplay />
      <MediaTransport.RateSelect />
    </MediaTransport>
  );
}
```

- Results are unchanged: each canvas still serializes its own regions (`videorectangle`, `labels`, `timeserieslabels`); sync is view state only and is never saved.
- Anti-patterns: do NOT read `currentTime` from one canvas to seek another, do NOT render a second `<video>`/`<audio>` for the same stream to "mirror" it, do NOT put two transports on one group.
