<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Reference composition: Image Labeling

## Reference composition: Image Labeling (`images`)

The ready system template `images` already solves requests like this one with Interface Components.
Start from its composition: the same components, nesting, field mapping and result round-trip. This is a summary of the template, not its full Screen: adapt it to the request, and write your own layout, copy and styling under the rules above.

- Data types: image
- Capabilities: bounding-box, polygon, ellipse, keypoint, brush, bitmask, vector, skeleton, relations, smart-annotation, multi-image, classification, transcription, per-region-attributes

### Component tree

In `ImageLabelingScreen`:
- LabelPicker
- ImageCanvas.Group
- ImageCanvas
- AnswerForm

### paramsSchema fields

- `maskOverlapPolicy` (string)
- `maskOverlapScope` (string)
- `poseTemplates` (array)
- `imageListField` (dataField)
- `imageField` (dataField)
- `labels` (labels)
- `tools` (array)
- `allowEmptyLabels` (boolean)
- `maxUsages` (integer)
- `dynamicLabelGroups` (array)
- `imageFields` (array)
- `imageLayout` (string)
- `syncViews` (string)
- `toolControls` (object)
- `controlCanRotate` (object)
- `controlSmartOnly` (object)
- `controlSnap` (object)
- `controlMaxPoints` (object)
- `vectorMinPoints` (integer)
- `vectorMaxPoints` (integer)
- `regionTextarea` (boolean)
- `transcriptionRequired` (boolean)
- `regionChoices` (labels)
- `choices` (labels)
- `choicesRequired` (boolean)
- `choicesScope` (string)
- `caption` (boolean)
- `captionScope` (string)
- `captionRequired` (boolean)
- `multipleLabels` (boolean)
- `instructions` (string)
- `drawingMode` (string)
- `pixelSnapping` (boolean)
- `vectorSkeleton` (boolean)
- `vectorClosable` (boolean)
- `smartAnnotation` (boolean)
- `relationLabels` (array)

### Params → answer fields

```js
function answerFields(params) {
  const fields = [];
  const regionChoices = window.InterfaceComponents.LabelPicker.normalizeLabels(params.regionChoices).map((label) => ({
    value: window.InterfaceComponents.LabelPicker.labelKey(label),
    label: label.value,
  }));
  if (regionChoices.length)
    fields.push({
      name: "region_attributes",
      kind: "choices",
      scope: "region",
      label: "Region attributes",
      options: regionChoices,
      choice: "multiple",
      when: { regionType: IMAGE_TYPES },
    });
  if (params.regionTextarea)
    fields.push({
      name: "transcription",
      kind: "textarea",
      scope: "region",
      label: "Region transcription",
      required: params.transcriptionRequired === true,
      when: { regionType: IMAGE_TYPES },
      props: { rows: 3 },
    });
  const choices = window.InterfaceComponents.LabelPicker.normalizeLabels(params.choices).map((label) => ({
    value: window.InterfaceComponents.LabelPicker.labelKey(label),
    label: label.value,
  }));
  if (choices.length)
    fields.push({
      name: "classification",
      kind: "choices",
      scope: params.choicesScope === "item" ? "item" : "task",
      label: "Image classification",
      options: choices,
      choice: "single",
      required: params.choicesRequired === true,
    });
  if (params.caption) fields.push({
    name: "caption", kind: "textarea", label: "Image caption",
    scope: params.captionScope === "item" ? "item" : "task",
    required: params.captionRequired === true, props: { rows: 3 },
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
  return [
    ...window.InterfaceComponents.ImageCanvas.toImageResults((regions || []).map(withImageGeometry), {
      fromName: "label",
      toName: "image",
    }),
    // With the shell params, answers whose question is hidden are not submitted (classic); validators pass none.
    ...window.InterfaceComponents.AnswerForm.answersToResults(regions || [], {
      toName: "image",
      ...(context && context.params ? { fields: answerFields(context.params), params: context.params } : {}),
    }),
    ...window.InterfaceComponents.ImageCanvas.toRelationResults(relations || []),
  ];
}

function parseResults(results, context) {
  const list = Array.isArray(results) ? results : [];
  for (const result of list) {
    if (!IMAGE_TYPES.includes(result?.type)) continue;
    for (const key of ["x", "y", "width", "height", "radiusX", "radiusY", "rotation"]) {
      const value = result.value?.[key];
      if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value))) {
        throw new Error(`Invalid image coordinate ${key}.`);
      }
    }
  }
  const parsed = window.InterfaceComponents.AnswerForm.resultsToAnswers(list, {});
  const shapes = window.InterfaceComponents.ImageCanvas.fromImageResults(parsed.rest, {
    labelColors: colorMap(context?.params),
  });
  return {
    regions: window.InterfaceComponents.AnswerForm.attachAnswers(shapes, parsed).map(withImageGeometry),
    relations: window.InterfaceComponents.ImageCanvas.fromRelationResults(list),
  };
}
```
