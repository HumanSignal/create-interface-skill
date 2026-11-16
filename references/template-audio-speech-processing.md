<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Reference composition: Speech Recognition & Audio Transcription

## Reference composition: Speech Recognition & Audio Transcription (`audio-speech-processing`)

The ready system template `audio-speech-processing` already solves requests like this one with Interface Components.
Start from its composition: the same components, nesting, field mapping and result round-trip. This is a summary of the template, not its full Screen: adapt it to the request, and write your own layout, copy and styling under the rules above.

- Data types: audio
- Capabilities: waveform-segmentation, transcription, per-region-choices, rating, configurable-labels

### Component tree

In `SegmentWorkspace`:
- AnswerForm

In `AudioSpeechScreen`:
- LabelPicker
- AudioCanvas.Root
  - AudioCanvas.Toolbar
    - AudioCanvas.PlayGroup
    - AudioCanvas.TimeDisplay
    - AudioCanvas.VolumeControl
    - AudioCanvas.SpeedSelector
    - AudioCanvas.ZoomControls
      - AudioCanvas.SettingsMenu
  - AudioCanvas.Viewport

### paramsSchema fields

- `audioField` (dataField): Audio URL field
- `instructions` (string): Instructions
- `labels` (labels): Segment labels (empty = no waveform segmentation)
- `labelsName` (string): Segment labels result name (from_name)
- `audioName` (string): Audio object name (to_name)
- `transcription` (string): Transcription
- `transcriptionName` (string): Transcription result name
- `transcriptionWhenLabel` (string): Only transcribe segments with this label (blank = all)
- `transcriptionRequired` (boolean): Require a transcription for every segment
- `transcriptionRows` (integer): Transcription rows
- `regionChoices` (array): Per-segment choices (empty = none)
- `regionChoicesName` (string): Per-segment choices result name
- `regionChoicesTitle` (string): Per-segment choices heading
- `regionChoicesMultiple` (boolean): Allow multiple per-segment choices
- `regionChoicesWhenLabel` (string): Only ask per-segment choices for this label (blank = all)
- `regionChoicesRequired` (boolean): Require a per-segment choice for every segment
- `ratingMax` (integer): Whole-file rating scale (0 = no rating)
- `ratingName` (string): Rating result name
- `ratingTitle` (string): Rating heading
- `waveHeight` (integer): Waveform height (px)

### Params → answer fields

```js
function buildFields(config) {
  const gate = (label) => (label ? { label } : undefined);
  const fields = [];
  if (config.transcription === "region") {
    fields.push({
      name: config.transcriptionName,
      kind: "textarea",
      scope: "region",
      toName: config.audioName,
      label: "Segment transcription",
      required: config.transcriptionRequired,
      requiredMessage: "Transcription is required for every segment.",
      when: gate(config.transcriptionWhenLabel),
      props: { rows: config.transcriptionRows, placeholder: "Type what is said in this segment" },
    });
  }
  if (config.regionChoices.length) {
    fields.push({
      name: config.regionChoicesName,
      kind: "choices",
      scope: "region",
      toName: config.audioName,
      label: config.regionChoicesTitle,
      options: config.regionChoices,
      choice: config.regionChoicesMultiple ? "multiple" : "single",
      required: config.regionChoicesRequired,
      requiredMessage: `Select ${config.regionChoicesTitle.toLowerCase()} for every segment.`,
      when: gate(config.regionChoicesWhenLabel),
      props: { layout: "chips" },
    });
  }
  if (config.transcription === "document") {
    fields.push({
      name: config.transcriptionName,
      kind: "textarea",
      toName: config.audioName,
      label: "Audio transcription",
      props: { rows: Math.max(config.transcriptionRows, 4), placeholder: "Type the full transcript" },
    });
  }
  if (config.ratingMax > 0) {
    fields.push({
      name: config.ratingName,
      kind: "rating",
      toName: config.audioName,
      label: config.ratingTitle,
      props: { max: config.ratingMax, allowClear: true },
    });
  }
  return fields;
}
```

### Result round-trip

```js
function getResults(regions, relations, context) {
  const { AudioCanvas, AnswerForm } = window.InterfaceComponents;
  const list = asList(regions).filter((r) => r && typeof r === "object");
  const segments = list.filter((r) => r.type === "labels" && !AnswerForm.isAnswerRegion(r));
  const spans = AudioCanvas.toAudioResults(segments, { fromName: DEFAULTS.labelsName, toName: DEFAULTS.audioName });
  // Per-region results repeat the segment's original_length by default; every result carries an origin. With the
  // shell params, answers hidden by whenLabelValue are not submitted (classic); validators pass no params.
  const params = context && context.params;
  const answers = AnswerForm.answersToResults(list, {
    toName: DEFAULTS.audioName,
    ...(params ? { fields: buildFields(resolveConfig(params)), params } : {}),
  }).map((result) => ({
    ...result,
    origin: result.origin || "manual",
  }));
  return [...spans, ...answers, ...AudioCanvas.toRelationResults(relations)];
}

function parseResults(results, ctx) {
  const { AudioCanvas, AnswerForm } = window.InterfaceComponents;
  const config = resolveConfig(ctx && ctx.params);
  const labelColors = Object.fromEntries(config.labels.map((l) => [l.name, l.color]));
  const parsed = AnswerForm.resultsToAnswers(results);
  const segments = AudioCanvas.fromAudioResults(parsed.rest, { labelColors, toName: config.audioName });
  return { regions: AnswerForm.attachAnswers(segments, parsed), relations: AudioCanvas.fromRelationResults(parsed.rest) };
}
```
