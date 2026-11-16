<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Reference composition: Named Entity Recognition & Text Classification

## Reference composition: Named Entity Recognition & Text Classification (`natural-language-processing`)

The ready system template `natural-language-processing` already solves requests like this one with Interface Components.
Start from its composition: the same components, nesting, field mapping and result round-trip. This is a summary of the template, not its full Screen: adapt it to the request, and write your own layout, copy and styling under the rules above.

- Data types: text, html
- Capabilities: token-spans, character-spans, overlapping-entities, relations, html-spans, document-classification, nested-choices, taxonomy, free-text, configurable-labels

### Component tree

In `NaturalLanguageScreen`:
- LabelPicker
- TextCanvas
- AnswerForm

### paramsSchema fields

- `textField` (dataField)
- `mode` (string)
- `questionField` (dataField)
- `toName` (string)
- `instructions` (string)
- `textTitle` (string)
- `questionTitle` (string)
- `layout` (string)
- `labels` (labels)
- `labelsName` (string)
- `labelsTitle` (string)
- `granularity` (string)
- `multipleLabels` (boolean)
- `labelMaxUsages` (integer)
- `enableRelations` (boolean)
- `relationLabels` (array)
- `relationChoice` (string)
- `defaultRelationLabels` (array)
- `choices` (labels)
- `choicesName` (string)
- `choicesTitle` (string)
- `choiceMode` (string)
- `choicesLayout` (string)
- `choicesRequired` (boolean)
- `secondaryChoices` (labels)
- `secondaryName` (string)
- `secondaryTitle` (string)
- `secondaryMode` (string)
- `secondaryLayout` (string)
- `taxonomy` (array)
- `taxonomyName` (string)
- `taxonomyTitle` (string)
- `taxonomyMultiple` (boolean)
- `taxonomyLeafsOnly` (boolean)
- `textareaEnabled` (boolean)
- `textareaName` (string)
- `textareaTitle` (string)
- `textareaPlaceholder` (string)
- `textareaRows` (integer)
- `textareaMaxSubmissions` (integer)
- `textareaRequired` (boolean)

### Params → answer fields

```js
function buildFields(cfg) {
  const fields = [];
  const choices = toChoiceItems(cfg.choices);
  if (choices.length) {
    fields.push({
      name: cfg.choicesName,
      kind: "choices",
      toName: cfg.toName,
      label: cfg.choicesTitle || "Classification",
      options: choices,
      choice: cfg.choiceMode,
      required: cfg.choicesRequired,
      requiredMessage: `Select at least one option${cfg.choicesTitle ? ` for "${cfg.choicesTitle}"` : ""}.`,
      props: { layout: cfg.choicesLayout },
    });
    const secondary = toChoiceItems(cfg.secondaryChoices);
    if (secondary.length) {
      // Classic visibleWhen="choice-selected" whenTagName=<main choices>: gated-out answers are not submitted.
      fields.push({
        name: cfg.secondaryName,
        kind: "choices",
        toName: cfg.toName,
        label: cfg.secondaryTitle || "Follow-up",
        options: secondary,
        choice: cfg.secondaryMode,
        when: { choice: { name: cfg.choicesName } },
        props: { layout: cfg.secondaryLayout },
      });
    }
  }
  const taxonomy = toTaxonomyNodes(cfg.taxonomy);
  if (taxonomy.length) {
    fields.push({
      name: cfg.taxonomyName,
      kind: "taxonomy",
      toName: cfg.toName,
      label: cfg.taxonomyTitle || "Taxonomy",
      options: taxonomy,
      multiple: cfg.taxonomyMultiple,
      props: { leafsOnly: cfg.taxonomyLeafsOnly, defaultExpandedLevels: 1 },
    });
  }
  if (cfg.textareaEnabled) {
    fields.push({
      name: cfg.textareaName,
      kind: "textarea",
      toName: cfg.toName,
      label: cfg.textareaTitle || "Answer",
      multiple: true,
      required: cfg.textareaRequired,
      requiredMessage: `Provide a ${cfg.textareaTitle ? `"${cfg.textareaTitle}" answer` : "text answer"} (required).`,
      props: {
        maxSubmissions: cfg.textareaMaxSubmissions > 0 ? cfg.textareaMaxSubmissions : undefined,
        editable: true,
        rows: cfg.textareaRows,
        showSubmitButton: cfg.textareaRows > 1,
        placeholder: cfg.textareaPlaceholder,
      },
    });
  }
  return fields;
}
```

### Result round-trip

```js
function getResults(regions, relations, context) {
  const { TextCanvas, AnswerForm } = window.InterfaceComponents;
  const list = (regions || []).filter((r) => r && typeof r === "object");
  // The helper reads `_value` or flat `_start` / `_end` / `_text` geometry.
  const spans = TextCanvas.toTextCanvasResults(list.filter(isSpan), {
    fromName: SPAN_FROM_NAME,
    toName: TEXT_TO_NAME,
  });
  // With the shell params, a follow-up whose main choice is gone is not submitted (classic visibleWhen gate);
  // validators pass no params.
  const params = context && context.params;
  const answers = AnswerForm.answersToResults(list, {
    toName: TEXT_TO_NAME,
    ...(params ? { fields: buildFields(resolveNlpConfig(params)), params } : {}),
  }).map((result) => ({
    ...result,
    origin: result.origin || "manual",
  }));
  const links = AnswerForm.toRelationResults(relations);
  return [...spans, ...answers, ...links];
}

function parseResults(results, ctx) {
  const { TextCanvas, AnswerForm } = window.InterfaceComponents;
  const cfg = resolveNlpConfig(ctx && ctx.params);
  const labelColors = Object.fromEntries(cfg.labels.map((l) => [l.name, l.color]));
  const parsed = AnswerForm.resultsToAnswers(results);
  const spans = TextCanvas.fromTextCanvasResults(parsed.rest, { labelColors });
  const byId = new Map(spans.map((r) => [r.id, r]));
  const labelsOf = (id) => (byId.get(id)?.labels || []).join(", ");
  const relations = AnswerForm.fromRelationResults(parsed.rest).map((rel) => ({
    ...rel,
    node1Label: labelsOf(rel.node1Id),
    node2Label: labelsOf(rel.node2Id),
  }));
  return { regions: AnswerForm.attachAnswers(spans, parsed), relations };
}
```
