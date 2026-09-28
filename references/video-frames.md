<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Video frame rate & timeline

### Video frame rate & timeline length (CRITICAL — FIT-2803 / FIT-2855 / FIT-2892)

When a Custom Interface shows `Frame current / total` from an HTML5 `<video>`:

- **Required length API**: `EditorDeps.video.resolveFrameCount({ durationSec, fps, regions: props.regions, previousFrameCount })` — never `Math.ceil(duration * fps)` alone. Call this **even while still on the 24fps fallback** so annotation `start_frame` / `end_frame` / keyframes expand the timeline immediately (FIT-2855: ~14.2s @ 24fps → 341, but regions past 341 stay invisible until coverage expands or real fps is probed).
- **Required fps API**: on `loadedmetadata`, `await EditorDeps.video.probeFrameRate(videoEl, { fallbackFps })` (or `.then`). Do **not** hand-roll `requestVideoFrameCallback` sampling or `video.play().then(() => video.pause())` for length/fps.
- **Never shrink** the timeline after the annotator has seen a larger total. Seeking must not rewrite locked fps or collapse `frameCount` (FIT-2803: naive DIY `deltaFrames / deltaTime` after a scrub yields ~1–2 fps and collapses 341 → ~20).
- **Preserve seek intent during probe (FIT-2892)**: treat React `currentFrame` (or a `desiredFrameRef`) as authoritative while `probeFrameRate` runs. Region / outliner / keyframe clicks must set that desired frame immediately. After probe resolves, **re-apply** `video.currentTime = (desiredFrame - 1) / fps` — do not trust `video.currentTime` alone (probe restores the time it captured at start, often frame 1).

#### Use EditorDeps.video (REQUIRED)

```js
const fallbackFps = Math.max(1, Number(props.params?.fps) || 24);
const [detectedFps, setDetectedFps] = useState(null);
const fps = Math.max(1, Number(detectedFps) || fallbackFps);
const frameCountRef = useRef(1);
const desiredFrameRef = useRef(1); // FIT-2892: user seek intent (region click, scrub, etc.)
const [currentFrame, setCurrentFrame] = useState(1);

// Keep desiredFrameRef in sync whenever the annotator seeks (region select, timeline, next/prev).
function seekToFrame(frame) {
  const next = Math.max(1, Math.floor(Number(frame) || 1));
  desiredFrameRef.current = next;
  setCurrentFrame(next);
  if (videoRef.current) videoRef.current.currentTime = (next - 1) / fps;
}

// On loadedmetadata (inside an effect/handler — not top-level during paramsSchema extract):
EditorDeps.video.probeFrameRate(video, { fallbackFps }).then((result) => {
  if (result.detected) setDetectedFps(result.fps);
  // FIT-2892: re-apply user seek after probe restores its startTime snapshot
  const target = desiredFrameRef.current;
  if (video && Number.isFinite(target)) {
    video.currentTime = (Math.max(1, target) - 1) / Math.max(1, Number(result.fps) || fallbackFps);
  }
});

const frameCount = EditorDeps.video.resolveFrameCount({
  durationSec: duration,
  fps,
  regions: props.regions,
  previousFrameCount: frameCountRef.current,
});
frameCountRef.current = frameCount;
```

See the `video-timeline` skill module for BAD/GOOD drop-ins and anti-patterns.

#### Why DIY RVFC probes are forbidden for new screens

Hand-rolled `requestVideoFrameCallback` fps loops only train during continuous playback, so NTSC media stays on a 24fps `params.fps` fallback until Play — that is the FIT-2855 undercount. They also mis-sample across seeks (FIT-2803). The sandbox may wrap legacy RVFC for older Screens (FIT-2856); **new** screens must not copy those loops — use `probeFrameRate` + `resolveFrameCount` only.

#### Checklist additions for video timeline UIs

- Seeking / next / previous / timeline clicks must change `currentFrame` / `currentTime` only — not `duration`, detected fps, or `frameCount` downward.
- Always pass `previousFrameCount` into `resolveFrameCount` so the total never shrinks across seeks/remounts.
- Prefer `EditorDeps.video` inside effects/handlers (same EditorUI two-path rule).
- `paramsSchema.fps` may default to 24 as a last-resort fallback label only — never as the sole source of truth for timeline length.
- On region / outliner select during Quick View or initial load: `seekToFrame(regionStartOrKeyframe)` and re-apply that frame after `probeFrameRate` settles (FIT-2892). Do **not** let `timeupdate` / RVFC overwrite `currentFrame` back to 1 while a user seek is pending or while probe is in flight.
