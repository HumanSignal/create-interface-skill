<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Reference composition: Video Labeling

## Reference composition: Video Labeling (`videos`)

The ready system template `videos` already solves requests like this one with Interface Components.
Start from its composition: the same components, nesting, field mapping and result round-trip. This is a summary of the template, not its full Screen: adapt it to the request, and write your own layout, copy and styling under the rules above.

- Data types: video
- Capabilities: video-bounding-box, keyframe-interpolation, timeline-labels, configurable-labels, relations

### Component tree

In `VideoLabelingScreen`:
- LabelPicker
- VideoCanvas
- VideoCanvas
  - VideoCanvas.PlayGroup
  - VideoCanvas.TimeDisplay
  - VideoCanvas.SpeedSelector
  - VideoCanvas.ZoomControls
  - VideoCanvas.Viewport
  - VideoCanvas.Timeline
  - VideoCanvas.RegionsOverlay

### paramsSchema fields

- `videoField` (dataField)
- `frameRate` (number)
- `labels` (labels)
- `timelineLabels` (labels)
- `enableTracking` (boolean)
- `enableTimeline` (boolean)
- `multipleLabels` (boolean)
- `multipleTimelineLabels` (boolean)
- `instructions` (string)
- `relationLabels` (array)

### Result round-trip

```js
function getResults(regions, relations, context) {
  const params = withDefaults(context?.params);
  return [
    ...window.InterfaceComponents.VideoCanvas.toVideoResults(regions || [], {
      fromName: TRACKS,
      toName: VIDEO,
      timelineFromName: SEGMENTS,
      frameRate: frameRate(params),
    }),
    ...window.InterfaceComponents.VideoCanvas.toRelationResults(relations || []),
  ];
}

function parseResults(results, context) {
  const params = withDefaults(context?.params);
  const objectColors = colorMap(params.labels);
  const segmentColors = colorMap(params.timelineLabels);
  const regions = window.InterfaceComponents.VideoCanvas.fromVideoResults(results || []).map((region) => ({
    ...region,
    colors: (region.labels || [])
      .map((name) => (region.type === "timelinelabels" ? segmentColors : objectColors)[name])
      .filter(Boolean),
  }));
  return { regions, relations: window.InterfaceComponents.VideoCanvas.fromRelationResults(results || []) };
}
```
