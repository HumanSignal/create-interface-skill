<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Reference composition: Time Series Analysis

## Reference composition: Time Series Analysis (`time-series-analysis`)

The ready system template `time-series-analysis` already solves requests like this one with Interface Components.
Start from its composition: the same components, nesting, field mapping and result round-trip. This is a summary of the template, not its full Screen: adapt it to the request, and write your own layout, copy and styling under the rules above.

- Data types: timeseries, csv
- Capabilities: multi-channel, interval-tagging, instant-regions, per-region-classification, per-region-rating, lttb-downsampling, configurable-labels, media-sync

### Component tree

In `TimeSeriesLabelingScreen`:
- LabelPicker
- VideoCanvas
- MediaTransport
- TimeSeriesCanvas
  - TimeSeriesCanvas.Toolbar
  - TimeSeriesCanvas.Viewport
  - TimeSeriesCanvas.Overview
  - TimeSeriesCanvas.RegionsOverlay
- AnswerForm

### paramsSchema fields

- `csvField` (dataField)
- `timeColumn` (string)
- `timeFormat` (string)
- `timeDisplayFormat` (string)
- `sep` (string)
- `channels` (labels)
- `channelUnits` (object)
- `displayFormat` (string)
- `layout` (string)
- `showOverview` (boolean)
- `overviewChannel` (string)
- `instructions` (string)
- `labels` (labels)
- `labelsName` (string)
- `toName` (string)
- `multipleLabels` (boolean)
- `instantCreation` (string)
- `regionChoices` (labels)
- `regionChoicesName` (string)
- `regionChoicesMode` (string)
- `regionChoicesRequired` (boolean)
- `regionRating` (boolean)
- `maxRating` (integer)
- `ratingIcon` (string)
- `taskChoices` (labels)
- `taskChoicesMode` (string)
- `taskChoicesHeader` (string)
- `videoField` (dataField)
- `frameRate` (number)

### Params → answer fields

```js
function answerFields(params) {
  const p = withParamDefaults(params);
  const objectName = tsToName(p);
  const options = (list) => namedLabels(list).map((c) => ({ value: c.name, color: c.color, hotkey: c.hotkey }));
  const onRegions = { regionType: "timeserieslabels" };
  const fields = [];
  if (namedLabels(p.regionChoices).length) {
    fields.push({
      name: regionChoicesName(p),
      kind: "choices",
      scope: "region",
      toName: objectName,
      label: "Region choices",
      options: options(p.regionChoices),
      choice: p.regionChoicesMode === "multiple" ? "multiple" : "single",
      required: p.regionChoicesRequired === true,
      requiredMessage: "Choose a region choice for every labeled region. This field is required.",
      when: onRegions,
      props: { layout: "chips" },
    });
  }
  if (p.regionRating === true) {
    fields.push({
      name: RATING_FROM_NAME,
      kind: "rating",
      scope: "region",
      toName: objectName,
      label: "Region rating",
      when: onRegions,
      props: { maxRating: Number(p.maxRating) > 0 ? Number(p.maxRating) : 10, icon: p.ratingIcon || "star" },
    });
  }
  if (namedLabels(p.taskChoices).length) {
    fields.push({
      name: TASK_CHOICES_FROM_NAME,
      kind: "choices",
      toName: objectName,
      label: p.taskChoicesHeader ? String(p.taskChoicesHeader) : "Task choices",
      options: options(p.taskChoices),
      choice: p.taskChoicesMode === "multiple" ? "multiple" : "single",
      props: { layout: "chips" },
    });
  }
  return fields;
}
```

### Result round-trip

```js
function getResults(regions, _relations, ctx) {
  const IC = window.InterfaceComponents;
  const list = regions || [];
  const defaults = withParamDefaults((ctx && ctx.params) || {});
  const fromName = labelFromName(defaults);
  const toName = tsToName(defaults);
  // With the shell params, answers whose question is hidden are not submitted (classic); validators pass none.
  const answers = IC.AnswerForm.answersToResults(list, {
    toName,
    getGeometry: tsGeometry,
    ...(ctx && ctx.params ? { fields: answerFields(ctx.params), params: ctx.params } : {}),
  });
  // Stable, classic-like order: each region's choices before its rating, whatever order they were answered in.
  const first = new Map();
  answers.forEach((r, i) => first.has(r.id) || first.set(r.id, i));
  const rank = (r) => (ANSWER_ORDER.includes(r.from_name) ? ANSWER_ORDER.indexOf(r.from_name) : ANSWER_ORDER.length);
  answers.sort((a, b) => first.get(a.id) - first.get(b.id) || rank(a) - rank(b));
  return [
    ...IC.TimeSeriesCanvas.toTimeSeriesResults(list, { fromName, toName }),
    ...answers,
  ];
}

function parseResults(results, ctx) {
  const IC = window.InterfaceComponents;
  const defaults = withParamDefaults((ctx && ctx.params) || {});
  const labelColors = {};
  for (const l of namedLabels(defaults.labels)) labelColors[l.name] = l.color || "#f59e0b";
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
  const regions = IC.TimeSeriesCanvas.fromTimeSeriesResults(answers.rest).map(stampColors);
  return { regions: IC.AnswerForm.attachAnswers(regions, answers) };
}
```
