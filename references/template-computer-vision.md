<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Reference composition: Image Object Detection & Segmentation

## Reference composition: Image Object Detection & Segmentation (`computer-vision`)

The ready system template `computer-vision` already solves requests like this one with Interface Components.
Start from its composition: the same components, nesting, field mapping and result round-trip. This is a summary of the template, not its full Screen: adapt it to the request, and write your own layout, copy and styling under the rules above.

- Data types: image
- Capabilities: bounding-box, polygon, ellipse, brush-mask, keypoint, relations, configurable-labels, image-classification, captioning

### Component tree

In `ComputerVisionScreen`:
- ImageCanvas.Group
  - LabelPicker
  - ImageCanvas.Group.Toolbar
  - ImageCanvas.Group.Items
  - ImageCanvas.Group.Pager
  - ImageCanvas.Group.Thumbnails
  - ImageCanvas
  - AnswerForm
    - AnswerForm.Field
    - LabelPicker
    - TextCanvas
  - AnswerForm

### paramsSchema fields

- `maskOverlapPolicy` (string)
- `maskOverlapScope` (string)
- `poseTemplates` (array)
- `imageField` (dataField): Image field
- `imageName` (string): Image name
- `multiImageLayout` (string): Multi-image layout
- `imageFields` (array): Multi-view image fields
- `imageNames` (array): Multi-view image names
- `imageTitles` (array): Multi-view titles
- `answersToName` (string): Answers to_name
- `instructions` (string): Instructions
- `tools` (array): Drawing tools
- `labels` (labels): Mark labels
- `labelsName` (string): Mark labels name
- `labelsTitle` (string): Mark labels heading
- `labelsMode` (string): Labels per mark
- `dynamicLabelGroups` (array): Label sets from task data
- `maxUsages` (integer): Maximum uses per label
- `toolControls` (object): Tool controls
- `controlCanRotate` (object): Rotation per control
- `controlSnap` (object): Snapping per control
- `controlSmartOnly` (object): Smart annotation per control
- `relations` (boolean): Relations
- `regionTextarea` (boolean): Per-region transcription
- `regionChoices` (labels): Per-mark choices
- `regionChoicesTitle` (string): Per-mark choices heading
- `regionChoicesMode` (string): Per-mark choices mode
- `choices` (labels): Image choices
- `choicesName` (string): Image choices name
- `choicesTitle` (string): Image choices heading
- `choicesMode` (string): Image choices mode
- `choicesRequired` (boolean): Image choices required
- `choicesScope` (string)
- `choices2` (labels): Choice group 2
- `choices2Name` (string): Choice group 2 name
- `choices2Title` (string): Choice group 2 heading
- `choices2Mode` (string): Choice group 2 mode
- `choices2Required` (boolean): Choice group 2 required
- `choices3` (labels): Choice group 3
- `choices3Name` (string): Choice group 3 name
- `choices3Title` (string): Choice group 3 heading
- `choices3Mode` (string): Choice group 3 mode
- `choices3Required` (boolean): Choice group 3 required
- `choiceScopes` (array): Choice scopes
- `textareaName` (string): Free-text answer
- `textareaTitle` (string): Free-text heading
- `textareaPlaceholder` (string): Free-text placeholder
- `textareaRows` (integer): Free-text rows
- `textareaScope` (string)
- `textareaRequired` (boolean)
- `questionFields` (array): Question fields
- `aspectLabels` (labels): Question aspect labels

### Params → answer fields

```js
function answerFields(p) {
  const { answersToName } = screenConfig(p);
  const fields = [];
  const onMarks = { regionType: SPATIAL_TYPES };
  const regionChoices = toLabelItems(p.regionChoices).map((item) => ({ value: item.value }));
  if (regionChoices.length > 0) {
    fields.push({
      name: PER_REGION_CHOICE_FROM_NAME,
      kind: "choices",
      scope: "region",
      label: asString(p.regionChoicesTitle, "Mark attributes"),
      options: regionChoices,
      choice: p.regionChoicesMode === "multiple" ? "multiple" : "single",
      when: onMarks,
    });
  }
  if (p.regionTextarea === true) {
    fields.push({
      name: PER_REGION_TEXT_FROM_NAME,
      kind: "textarea",
      scope: "region",
      label: "Region transcription",
      when: onMarks,
      props: { rows: 3, placeholder: "Text for the selected region" },
    });
  }
  const slots = ["", "2", "3"].map((suffix) => ({
    choices: toLabelItems(p[`choices${suffix}`]).map((item) => ({ value: item.value })),
    name: asString(p[`choices${suffix}Name`], suffix ? { 2: "density", 3: "findings" }[suffix] : DEFAULT_CHOICE_FROM_NAME),
    title: asString(p[`choices${suffix}Title`], "Classification"),
    mode: ["single", "single-radio", "multiple"].includes(p[`choices${suffix}Mode`]) ? p[`choices${suffix}Mode`] : "single",
    required: p[`choices${suffix}Required`] === true,
  }));
  const scopes = asArray(p.choiceScopes).filter((scope) => typeof scope === "string" && scope !== "");
  for (const scope of scopes.length > 0 ? scopes : [null]) {
    for (const slot of slots) {
      if (slot.choices.length === 0) continue;
      const title = scope ? `${humanize(scope)} ${slot.title}` : slot.title;
      fields.push({
        name: scope ? `${slot.name}_${scope}` : slot.name,
        kind: "choices",
        scope: p.choicesScope === "item" ? "item" : "task",
        toName: answersToName,
        label: title,
        options: slot.choices,
        choice: slot.mode,
        required: slot.required,
        requiredMessage: p.choicesScope === "item" ? undefined : `Select a value for “${title}”.`,
        props: { layout: slot.choices.length > 4 ? "vertical" : "inline" },
      });
    }
  }
  const textareaName = asString(p.textareaName, "");
  if (textareaName) {
    fields.push({
      name: textareaName,
      kind: "textarea",
      scope: p.textareaScope === "item" ? "item" : "task",
      toName: answersToName,
      label: asString(p.textareaTitle, "Description"),
      required: p.textareaRequired === true,
      props: { rows: asNumber(p.textareaRows, 3), placeholder: asString(p.textareaPlaceholder, "") },
    });
  }
  asArray(p.questionFields)
    .slice(0, 4)
    .forEach((field, index) => {
      fields.push({
        name: `answer${index + 1}`,
        kind: "textarea",
        toName: String(field),
        label: `A${index + 1}`,
        question: true,
        props: { rows: 1, placeholder: "Answer" },
      });
    });
  return fields;
}

function itemAnswerFields(fields, item, items = [item]) {
  const indices = items.filter((entry) => entry.toName === item.toName).map((entry) => entry.itemIndex).filter((index) => index !== undefined);
  return fields.filter((field) => field.scope === "item").map((field) => ({
    ...field, scope: item.itemIndex === undefined ? "task" : "item", toName: item.toName,
    ...(indices.length ? { when: { ...field.when, itemIndex: indices } } : {}),
  }));
}
```

### Result round-trip

```js
function getResults(regions, relations, context) {
  const IC = window.InterfaceComponents;
  const list = (regions || []).filter((region) => region && typeof region === "object");
  const marks = IC.ImageCanvas.toImageResults(list, { fromName: DEFAULT_SPATIAL_FROM_NAME, toName: DEFAULT_IMAGE_NAME });
  const spans = IC.TextCanvas.toTextCanvasResults(list.filter(isTextSpanRegion), {
    fromName: DEFAULT_ASPECT_FROM_NAME,
    toName: "q1",
  });
  // Per-region answers repeat the mark's geometry and image metadata (original_width / image_rotation) by default.
  // With the shell params, answers whose question is hidden are not submitted (classic); validators pass none.
  const params = context && context.params;
  const answers = IC.AnswerForm.answersToResults(list, {
    toName: DEFAULT_IMAGE_NAME,
    ...(params ? { fields: answerFields(params), params } : {}),
  });
  return [...marks, ...spans, ...answers, ...IC.ImageCanvas.toRelationResults(relations)];
}

function parseResults(results, ctx) {
  const IC = window.InterfaceComponents;
  const list = (Array.isArray(results) ? results : []).filter(isPlainObject);
  const labelColors = labelColorsFromParams(ctx && ctx.params);
  const parsed = IC.AnswerForm.resultsToAnswers(list, {});
  const marks = IC.ImageCanvas.fromImageResults(parsed.rest, { labelColors });
  const spans = IC.TextCanvas.fromTextCanvasResults(
    parsed.rest.filter((result) => result.type === "labels"),
    { labelColors },
  );
  const regions = IC.AnswerForm.attachAnswers([...marks, ...spans], parsed).map(withScreenRegionDefaults);
  return { regions, relations: IC.ImageCanvas.fromRelationResults(list) };
}
```
