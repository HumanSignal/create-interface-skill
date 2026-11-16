<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Reference composition: Document OCR

## Reference composition: Document OCR (`document-ocr`)

The ready system template `document-ocr` already solves requests like this one with Interface Components.
Start from its composition: the same components, nesting, field mapping and result round-trip. This is a summary of the template, not its full Screen: adapt it to the request, and write your own layout, copy and styling under the rules above.

- Data types: pdf, image, document
- Capabilities: bounding-box, polygon, text-layer, transcription, configurable-labels, multi-page, document-classification, rating

### Component tree

In `DocumentOcrScreen`:
- LabelPicker
- AnswerForm
- DocumentCanvas

### paramsSchema fields

- `documentField` (dataField): Document field
- `pagesField` (dataField): Pages field
- `sourceType` (string): Document type
- `documentName` (string): Document name
- `instructions` (string): Instructions
- `drawBoxes` (boolean): Draw boxes
- `polygons` (boolean): Polygon tool
- `labels` (labels): Box labels
- `labelsName` (string): Box labels name
- `labelsTitle` (string): Box labels heading
- `labelsMode` (string): Labels per box
- `resultFormat` (string): Result format
- `transcription` (boolean): Per-box transcription
- `transcriptionRequired` (boolean): Transcription required
- `transcriptionPlaceholder` (string): Transcription placeholder
- `pageMode` (string): Page layout
- `choices` (labels): Document choices
- `choicesName` (string): Document choices name
- `choicesTitle` (string): Document choices heading
- `choicesMode` (string): Document choices mode
- `choicesRequired` (boolean): Document choices required
- `rating` (boolean): Document rating
- `ratingName` (string): Document rating name
- `ratingTitle` (string): Document rating heading
- `ratingMax` (integer): Maximum rating
- `ratingIcon` (string): Rating icon

### Params → answer fields

```js
function answerFields(p) {
  const fields = [];
  const toName = asString(p.documentName, DEFAULT_DOCUMENT_NAME);
  const choices = toLabelItems(p.choices).map((item) => ({ value: item.value }));
  if (choices.length > 0) {
    const title = asString(p.choicesTitle, "Classification");
    fields.push({
      name: asString(p.choicesName, DEFAULT_CHOICES_FROM_NAME),
      kind: "choices",
      toName,
      label: title,
      options: choices,
      choice: ["single", "single-radio", "multiple"].includes(p.choicesMode) ? p.choicesMode : "single",
      required: p.choicesRequired === true,
      requiredMessage: `Select a value for “${title}”.`,
      props: { layout: choices.length > 4 ? "vertical" : "inline" },
    });
  }
  if (p.rating === true) {
    fields.push({
      name: asString(p.ratingName, DEFAULT_RATING_FROM_NAME),
      kind: "rating",
      toName,
      label: asString(p.ratingTitle, "Rating"),
      props: {
        maxRating: asNumber(p.ratingMax, 5),
        icon: ["star", "heart", "circle"].includes(p.ratingIcon) ? p.ratingIcon : "star",
        allowClear: true,
      },
    });
  }
  return fields;
}
```

### Result round-trip

```js
function getResults(regions, relations, ctx) {
  const IC = window.InterfaceComponents;
  const list = (regions || []).filter((region) => region && typeof region === "object");
  const params = (ctx && ctx.params) || {};
  const documentName = asString(params.documentName, DEFAULT_DOCUMENT_NAME);
  const labelsName = asString(
    params.labelsName,
    params.resultFormat === "ocrlabels" ? DEFAULT_OCR_FROM_NAME : DEFAULT_LABELS_FROM_NAME,
  );
  // A box drafted before it had text reloads without _transcriptionFromName; typed text must still serialize
  // under the classic perRegion TextArea name. multiPage: always emit item_index so page survives reload (T3b).
  const boxes = IC.DocumentCanvas.toDocumentResults(list.filter(isDocumentRegion), {
    fromName: labelsName,
    toName: documentName,
    transcriptionFromName: DEFAULT_TRANSCRIPTION_FROM_NAME,
    multiPage: true,
  });
  // With the shell params, answers whose question is hidden are not submitted (classic); validators pass none.
  const answers = IC.AnswerForm.answersToResults(list, {
    toName: documentName,
    ...(ctx && ctx.params ? { fields: answerFields(ctx.params), params: ctx.params } : {}),
  });
  return [...boxes, ...answers, ...IC.DocumentCanvas.toRelationResults(relations)];
}

function parseResults(results, ctx) {
  const IC = window.InterfaceComponents;
  const list = (Array.isArray(results) ? results : []).filter(isPlainObject);
  const params = (ctx && ctx.params) || {};
  const labelColors = {};
  for (const item of toLabelItems(DEFAULT_LABELS)) labelColors[item.value] = item.color;
  for (const item of toLabelItems(params.labels)) labelColors[item.value] = item.color;
  const boxes = IC.DocumentCanvas.fromDocumentResults(list, { labelColors }).map((region) =>
    withPageFromResults(region, list),
  );
  // Results the boxes were parsed from (e.g. the per-box transcription textarea) stay with DocumentCanvas.
  const parsed = IC.AnswerForm.resultsToAnswers(list, { canvasRegions: boxes });
  const regions = IC.AnswerForm.attachAnswers(boxes, parsed).map(withScreenRegionDefaults);
  return { regions, relations: IC.DocumentCanvas.fromRelationResults(list) };
}
```
