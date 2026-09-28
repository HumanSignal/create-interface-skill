<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Video timelines & frame rate

## Video timelines & frame rate (FIT-2804 / FIT-2855 / FIT-2892)

Video Interface screens that map `currentTime ↔ frame` **must** recover the real frame rate on load — not only after the annotator presses Play.

### Why this matters
- Browsers expose `HTMLVideoElement.duration` on `loadedmetadata`, but **not** a reliable fps.
- A common mistake is `const fps = detectedFps || params.fps || 24` with detection that only runs once playback advances `requestVideoFrameCallback`.
- For ~29.97fps (NTSC) media, a 24fps fallback undercounts: e.g. ~14.2s → **341** frames instead of **426**. Regions whose `start_frame` / keyframes sit past 341 stay invisible until fps is detected (FIT-2855).
- Seeking can also make `duration` / estimates flicker; the timeline length must **never shrink** after the user has seen a larger total (FIT-2803).
- `probeFrameRate` briefly plays the element and restores a `currentTime` captured when the probe started. A region / outliner click during Quick View load seeks to the keyframe, then the probe restore (and a naive `timeupdate` → `currentFrame` sync) snaps the playhead back to frame 1 (FIT-2892).

### Required: use `EditorDeps.video`
The sandbox exposes:

```js
const { probeFrameRate, resolveFrameCount, estimateFrameCount } = EditorDeps.video;
```

Rules:
1. **On `loadedmetadata`**, call `await EditorDeps.video.probeFrameRate(videoEl, { fallbackFps })` (or `.then`) **before** treating `frameCount` as final. Do **not** rely on `video.play().then(() => video.pause())` alone — that often yields zero RVFC samples. Do **not** hand-roll a `requestVideoFrameCallback` fps loop for new screens.
2. Compute length with `resolveFrameCount({ durationSec, fps, regions: props.regions, previousFrameCount })` so the count (a) covers annotation start/end/keyframe frames and (b) never decreases across seeks/remounts. **Call this even while still on the 24fps fallback** — annotation coverage alone expands 341 → ≥426 for NTSC ticket videos before Play.
3. Keep showing a fallback fps label only while `detected === false`; once probed, persist the detected fps for the life of that `src`.
4. Default `paramsSchema.fps` may stay 24 as a last-resort fallback, but copy must say it is a fallback used only until probe completes — never the source of truth for NTSC/film cadences.
5. Prefer referencing `EditorDeps.video` **inside** effects/handlers (same EditorUI two-path rule): top-level `EditorDeps` access during admin-time `paramsSchema` extraction can throw.
6. **Seek intent during probe (FIT-2892)**: keep a React `currentFrame` / `desiredFrameRef` as the source of truth. Region select, outliner click, and timeline scrub update that desired frame immediately. After `probeFrameRate` resolves, **re-apply** `video.currentTime = (desiredFrame - 1) / fps`. While probe is in flight (or a user seek is pending), do **not** let `timeupdate` / RVFC overwrite `currentFrame` from a restored `currentTime` of 0.

### Drop-in replacements (migrate existing Screens)

```js
// BAD — undercounts until Play (FIT-2855)
const frameCount = Math.max(1, Math.ceil(duration * fps));

// GOOD — covers annotation frames immediately
const frameCount = EditorDeps.video.resolveFrameCount({
  durationSec: duration,
  fps,
  regions: props.regions,
  previousFrameCount: frameCountRef.current,
});
frameCountRef.current = frameCount;
```

```js
// BAD — play→pause often yields zero RVFC samples
if (video.paused && typeof video.requestVideoFrameCallback === "function") {
  video.play?.().then(() => video.pause?.()).catch(() => {});
}

// BAD — probe finishes and restores startTime; mid-load region seek snaps back to frame 1 (FIT-2892)
EditorDeps.video.probeFrameRate(video, { fallbackFps }).then((result) => {
  if (result.detected) setDetectedFps(result.fps);
});

// GOOD — probe on load, then re-apply the annotator's desired frame
EditorDeps.video.probeFrameRate(video, { fallbackFps }).then((result) => {
  if (result.detected) setDetectedFps(result.fps);
  const target = desiredFrameRef.current; // set by region/outliner/timeline seeks
  const rate = Math.max(1, Number(result.fps) || fallbackFps);
  if (video && Number.isFinite(target)) {
    video.currentTime = (Math.max(1, target) - 1) / rate;
  }
});
```

### Anti-patterns (do not ship)
- Setting `frameCount = Math.ceil(duration * fps)` or `Math.ceil(duration * 24)` with no `resolveFrameCount` / no annotation coverage.
- Hand-rolling `requestVideoFrameCallback` fps sampling (or copying older seek-safe DIY probes) instead of `probeFrameRate` — do not copy DIY `requestVideoFrameCallback` loops for new screens.
- Resetting `detectedFps` / shrinking `frameCount` on every seek or `timeupdate`.
- Clipping region draw/filter to `currentFrame <= frameCount - 1` while still on fallback fps when annotations already declare higher frames — use `resolveFrameCount` instead.
- Trusting `video.currentTime` after `probeFrameRate` without re-applying the desired region/keyframe frame (FIT-2892 snap-back to the first keyframe / frame 1 during Quick View load).
- Syncing `timeupdate` → `setCurrentFrame(1)` while probe is in flight after the annotator already selected a region.
