<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Reference composition: Video Tracking, Timeline & Classification

## Reference composition: Video Tracking, Timeline & Classification (`video-object-tracking`)

The ready system template `video-object-tracking` already solves requests like this one with Interface Components.
Start from its composition: the same components, nesting, field mapping and result round-trip. This is a summary of the template, not its full Screen: adapt it to the request, and write your own layout, copy and styling under the rules above.

- Data types: video
- Capabilities: video-bounding-box, keyframe-interpolation, timeline-labels, video-classification, configurable-labels, media-sync, audio-segments

### Component tree

In `VideoLabelingScreen`:
- LabelPicker
- MediaTransport
- VideoCanvas
- VideoCanvas
  - VideoCanvas.PlayGroup
  - VideoCanvas.TimeDisplay
  - VideoCanvas.SpeedSelector
  - VideoCanvas.Viewport
  - VideoCanvas.Timeline
  - VideoCanvas.RegionsOverlay
- AudioCanvas.Root
  - AudioCanvas.Viewport
- AnswerForm

### paramsSchema fields

- `videoField` (dataField)
- `frameRate` (number)
- `instructions` (string)
- `enableTracking` (boolean)
- `labels` (labels)
- `multipleLabels` (boolean)
- `enableTimeline` (boolean)
- `timelineLabels` (labels)
- `multipleTimelineLabels` (boolean)
- `audioTrack` (boolean)
- `audioLabels` (labels)
- `audioLabelsName` (string)
- `multipleAudioLabels` (boolean)
- `enableClassification` (boolean)
- `choices` (labels)
- `choiceMode` (string)
- `choicesHeader` (string)

### Params → answer fields

```js
function answerFields(params) {
  const choices = namedLabels(params.choices);
  if (params.enableClassification === false || !choices.length) return [];
  return [
    {
      name: CHOICE_FROM_NAME,
      kind: "choices",
      toName: VIDEO_TO_NAME,
      label: String(params.choicesHeader || "Classify the video"),
      options: choices.map((c) => ({ value: c.name, color: c.color, hotkey: c.hotkey })),
      choice: params.choiceMode === "multiple" ? "multiple" : "single",
      props: { layout: "chips" },
    },
  ];
}
```

### Result round-trip

```js
function getResults(regions, _relations, context) {
  const IC = window.InterfaceComponents;
  const list = regions || [];
  // The shell passes the current params ({ params }); validators may omit them, so fall back to the defaults.
  const defaults = withParamDefaults((context && context.params) || {});
  const results = [
    ...IC.VideoCanvas.toVideoResults(list, {
      fromName: BOX_FROM_NAME,
      toName: VIDEO_TO_NAME,
      timelineFromName: TIMELINE_FROM_NAME,
    }),
  ];
  // Serialize soundtrack segments whenever present. `audioTrack` gates the UI; validators may omit params.
  const audioRegions = list.filter(
    (r) => r.type === "labels" && (r._toName == null || r._toName === AUDIO_TO_NAME),
  );
  if (defaults.audioTrack || audioRegions.length) {
    const AudioCanvas = optionalInterfaceComponent(AUDIO_CANVAS_NAME);
    if (AudioCanvas && typeof AudioCanvas.toAudioResults === "function") {
      results.push(
        ...AudioCanvas.toAudioResults(audioRegions, {
          fromName: audioLabelsName(defaults),
          toName: AUDIO_TO_NAME,
        }),
      );
    }
  }
  results.push(
    ...IC.AnswerForm.answersToResults(list, {
      fields: answerFields(defaults),
      toName: VIDEO_TO_NAME,
      ...(context && context.params ? { params: context.params } : {}),
    }),
  );
  return results;
}

function parseResults(results, ctx) {
  const IC = window.InterfaceComponents;
  const defaults = withParamDefaults((ctx && ctx.params) || {});
  const labelColors = {};
  for (const l of [
    ...namedLabels(defaults.labels),
    ...namedLabels(defaults.timelineLabels),
    ...namedLabels(defaults.audioLabels),
  ]) {
    labelColors[l.name] = l.color || "#3b82f6";
  }
  const stampColors = (region) => {
    const labels = Array.isArray(region.labels) ? region.labels : [];
    if (!labels.length) return region;
    const existing = Array.isArray(region.colors) ? region.colors : [];
    const colors = labels.map((name, i) =>
      existing[i] && String(existing[i]).length ? existing[i] : labelColors[name] || "",
    ).filter(Boolean);
    return colors.length ? { ...region, colors } : region;
  };
  const answers = IC.AnswerForm.resultsToAnswers(results);
  const audioResults = answers.rest.filter((r) => r.type === "labels" && r.to_name === AUDIO_TO_NAME);
  const AudioCanvas = audioResults.length ? optionalInterfaceComponent(AUDIO_CANVAS_NAME) : null;
  const regions = [
    ...IC.VideoCanvas.fromVideoResults(answers.rest).map(stampColors),
    ...(AudioCanvas && audioResults.length
      ? AudioCanvas.fromAudioResults(audioResults, { labelColors, toName: AUDIO_TO_NAME }).map(stampColors)
      : []),
  ];
  return { regions: IC.AnswerForm.attachAnswers(regions, answers) };
}
```
