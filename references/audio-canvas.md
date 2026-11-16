<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Interface Components: AudioCanvas

## Interface Components: AudioCanvas Component

When creating audio labeling interfaces (speech tagging, diarization, audio event detection, transcript alignment), use the pre-built, dynamically-loaded **`InterfaceComponents.AudioCanvas`** component.

### CRITICAL: Access via Property (NEVER Destructure window.InterfaceComponents)
- **Component Name is AudioCanvas (NOT Audio)**: The component is strictly named **`AudioCanvas`**.
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
- **NEVER use `window.InterfaceComponents.Audio` or `InterfaceComponents.Audio`**. There is NO component named `Audio`. Attempting to access `.Audio` will fail with a 404 dynamic chunk load error.

### Why use `InterfaceComponents.AudioCanvas`
- **Off-main-thread decoding:** Decoding and peak extraction run in a dedicated Web Worker (`audio-decoder.worker.js`), preventing UI stutter and frame drops even on multi-minute audio files.
- **Zero-bloat dynamic loading:** The component and worker are fetched on-demand and cached in IndexedDB — no heavy libraries bundled in the main shell.
- **Direct Controlled Contract:** Conforms strictly to `BaseComponentProps<AudioRegion>` with pure prop control, declarative hotkeys, and full accessibility (Axe-core audited).
- **Progressive Streaming Decoder:** Full support for `decoderType="wasm-stream"` to progressively stream and decode long or large audio files chunk-by-chunk within the sandboxed iframe.
- **LSF Classic Controls Parity:** Pre-packaged with steppers (skip to start `<<`, step back `<`, step forward `>`), volume slider & mute popover, playback speed selector (`0.5x` to `2x`), zoom controls, and a settings panel with waveform amplitude (`amp`) and layer toggles (timeline, waveform, spectrogram).
- **Multichannel Audio (`splitChannels={true}`):** Renders individual audio channels in dedicated vertical tracks, properly tracking and isolating regions per audio channel (`channel: 0`, `channel: 1`, etc.).

### Decoder Options & Streaming Audio
- **Streaming Audio (`decoderType="wasm-stream"`):** For progressive stream decoding of large audio files (multi-minute or multi-hour files) or non-WAV formats via byte-range requests without main thread or memory pressure:
  ```jsx
  <AudioCanvas
    audioUrl={audioUrl}
    decoderType="wasm-stream"
    playerType="html5"
    splitChannels={false}
    stepSize={0.1}
    regions={regions}
    selectedRegionIds={props.selectedRegionIds}
    onAddRegion={props.addRegion}
    onUpdateRegion={props.updateRegion}
    onDeleteRegion={props.deleteRegion}
    onSelectRegion={(id, opts) => props.selectRegion(id, opts)}
  />
  ```
- **Supported Decoders:**
  - `"wasm-stream"`: High performance progressive stream decoding using WebAssembly audio file decoder. Best for large files or streaming audio.
  - `"webaudio"`: Standard browser WebAudio decoding. Suitable for small files / short clips.
  - `"ffmpeg"`: FFmpeg WebAssembly decoding.
  - `"none"`: HTML5 audio playback with no waveform peak decoding.

### Multichannel Audio Support (`splitChannels`)
When working with stereo, binaural, or multichannel audio (e.g. call center recordings with caller on channel 0 and agent on channel 1):
- Set `splitChannels={true}` on `<AudioCanvas />`.
- Regions drawn on a channel track carry `_value.channel` (0-based); it serializes as LS `value.channel`.

### Canonical regions (no mapping layer)
- AudioCanvas speaks the canonical region shape: `{ id, type: "labels", labels, colors, score, hidden, locked, selected, parentId, text, _value: { start, end, channel }, _fromName, _toName }`. Pass `props.regions` straight through — do NOT map to flat `start`/`end` objects.
- Created regions are stamped with `activeLabels`, `labelColors`, `fromName` and `toName`; forward them to `props.addRegion` unchanged.
- **NEVER discard unlabeled regions!** Do not write `if (!activeLabels.length) return;`. A segment drawn before picking a label is created with `labels: []`; relabel it with `props.updateRegion(id, { labels, colors })`.
- LS result: `{ id, from_name, to_name, type: "labels", value: { start, end, channel, labels: ["Speech"] } }`.

### Example: Audio Segment Labeling Screen

```jsx
function AudioLabelingScreen(props) {
  const AudioCanvas = window.InterfaceComponents.AudioCanvas;
  const LabelPicker = window.InterfaceComponents.LabelPicker;
  const LABELS = [{ value: "Speech", color: "#3b82f6" }, { value: "Noise", color: "#f97316" }];
  const labelColors = Object.fromEntries(LABELS.map((l) => [l.value, l.color]));
  const [activeLabels, setActiveLabels] = React.useState([]);
  const audioUrl = getField(props.task.data, props.params?.audioField) || "";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 16, gap: 8 }}>
      <LabelPicker labels={LABELS} value={activeLabels} onChange={setActiveLabels} hotkeys={props.hotkeys} />
      <AudioCanvas
        audioUrl={audioUrl}
        decoderType="wasm-stream"
        playerType="html5"
        splitChannels={false}
        stepSize={0.1}
        regions={(props.regions || []).filter((r) => r._toName === "audio")}
        selectedRegionIds={props.selectedRegionIds}
        activeLabels={activeLabels}
        labelColors={labelColors}
        fromName="label"
        toName="audio"
        readOnly={props.readOnly}
        theme={props.theme}
        onAddRegion={props.addRegion}
        onUpdateRegion={props.updateRegion}
        onDeleteRegion={props.deleteRegion}
        onSelectRegion={(id, opts) => props.selectRegion(id, opts)}
        hotkeys={props.hotkeys} // Automatically inherits project-level hotkey bindings and overrides
        ariaLabel="Interactive audio segment canvas"
      />
    </div>
  );
}
```

### Dark Mode Auto-Detection (`theme="auto"`)
- `AudioCanvas` defaults to `theme="auto"`.
- It dynamically detects dark mode from the closest ancestor element, `document.body`, or `document.documentElement` (such as `[data-theme="dark"]`, `[data-color-scheme="dark"]`, or `.dark` class).
- When a user toggles Dark Mode in the Label Studio shell, `AudioCanvas` updates its toolbar, canvas timeline, and waveform colors immediately without remounting or redecoding audio.

### Composable Architecture: Slots & Compound Components
For complete flexibility, `AudioCanvas` supports both slot injection and full compound layout composition:

#### 1. Slot Injection (`slots` prop)
Inject custom buttons, overlays, or tools without changing the default layout:
```jsx
<AudioCanvas
  audioUrl={audioUrl}
  regions={regions}
  selectedRegionIds={props.selectedRegionIds}
  slots={{
    // Injects custom action buttons into the toolbar (receives the imperative controller)
    toolbarActions: (ctrl) => (
      <EditorUI.Button type="button" variant="neutral" look="ghost" size="smaller" aria-label="Replay" onClick={() => ctrl.seek(0)}>
        <EditorUI.Icons.ArrowCounterClockwise size={16} />
      </EditorUI.Button>
    ),
    // Injects custom overlay above the canvas viewport
    viewportOverlay: (ctrl) => (
      ctrl.playing ? <div className="live-indicator">LIVE</div> : null
    ),
  }}
  {...handlers}
/>
```

#### 2. Compound Components (`AudioCanvas.Root`, `AudioCanvas.Toolbar`, `AudioCanvas.Viewport`)
Re-arrange, omit, or replace parts while preserving the high-performance decoding and rendering core. Members: `AudioCanvas.Root`, `.Viewport`, `.Toolbar`, `.PlayGroup`, `.TimeDisplay`, `.VolumeControl`, `.SpeedSelector`, `.ZoomControls`, `.SettingsMenu`:
```jsx
<AudioCanvas.Root
  audioUrl={audioUrl}
  regions={regions}
  selectedRegionIds={props.selectedRegionIds}
  {...handlers}
>
  {/* Custom layout with top toolbar */}
  <AudioCanvas.Toolbar>
    <AudioCanvas.PlayGroup />
    <AudioCanvas.TimeDisplay />
    <MyCustomFilterDropdown />
    <AudioCanvas.ZoomControls>
      <AudioCanvas.SettingsMenu />
    </AudioCanvas.ZoomControls>
  </AudioCanvas.Toolbar>

  {/* Memoized canvas viewport - experiences 0 React re-renders during playback */}
  <AudioCanvas.Viewport />
</AudioCanvas.Root>
```

#### 3. Headless Controller Hook (`AudioCanvas.useController`)
Access imperative controls and micro-subscriptions anywhere inside the `AudioCanvas` hierarchy:
```jsx
function CustomAudioControls() {
  const ctrl = AudioCanvas.useController();
  return (
    <div style={{ display: "flex", gap: "var(--spacing-tighter)" }}>
      <EditorUI.Button type="button" variant="neutral" look="ghost" size="smaller" aria-label={ctrl.playing ? "Pause" : "Play"} onClick={ctrl.togglePlay}>
        {ctrl.playing ? <EditorUI.Icons.Pause size={16} weight="fill" /> : <EditorUI.Icons.Play size={16} weight="fill" />}
      </EditorUI.Button>
      <EditorUI.Button type="button" variant="neutral" look="outlined" size="smaller" onClick={() => ctrl.seek(ctrl.currentTime + 5)}>
        +5s
      </EditorUI.Button>
    </div>
  );
}
```

### Synchronized with video / time series / transcript (`syncGroup`)
Give AudioCanvas the same `syncGroup` as a `VideoCanvas` / `TimeSeriesCanvas` and they play, pause, seek and change speed together (the video is muted so only the audio is heard); clicking the waveform seeks the whole group. Add ONE `window.InterfaceComponents.MediaTransport` with that `syncGroup` for a shared transport, and `MediaTransport.SyncedTime` for a transcript that follows the audio — see the media-transport module. `syncOffset` shifts a stream that started later.

### Hotkey Governance & Overrides
- `DynamicScreenProps` provides `props.hotkeys` from project preferences. Passing `hotkeys={props.hotkeys}` enables end-to-end hotkey governance.
- Components use `useComponentHotkeys` internally so actions (`playPause`, `zoomIn`, `zoomOut`, `deleteRegion`) automatically resolve overrides, normalize chords, and suppress shortcuts while typing in form inputs.
- Custom screens can also directly use `const useComponentHotkeys = window.InterfaceComponents.useComponentHotkeys;` with `assignedHotkeys: props.hotkeys` to define bespoke scoped shortcuts that respect input suppression and project overrides.
- To customize a specific hotkey while keeping project bindings: `hotkeys={{ ...props.hotkeys, playPause: "k" }}`.

### Anti-Patterns
- **CRITICAL: NEVER use `window.InterfaceComponents.Audio` or `InterfaceComponents.Audio`.** The component is strictly named **`AudioCanvas`**. There is no `.Audio` export; attempting to access `.Audio` throws a 404 dynamic chunk loading failure.
- **Do NOT** decode audio on the main thread via synchronous `AudioContext.decodeAudioData` during component render.
- **Do NOT** drop unlabeled regions with `if (!activeLabels.length) return;`.
- **Do NOT** duplicate play/pause, stepper, speed, or volume buttons inside custom UI panels when `AudioCanvas` already provides standard controls and declarative hotkeys.
