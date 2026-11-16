<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Reference composition: Structured Data & Tables

## Reference composition: Structured Data & Tables (`structured-data`)

The ready system template `structured-data` already solves requests like this one with Interface Components.
Start from its composition: the same components, nesting, field mapping and result round-trip. This is a summary of the template, not its full Screen: adapt it to the request, and write your own layout, copy and styling under the rules above.

- Data types: table, text
- Capabilities: table-rendering, record-classification, key-value-metadata, configurable-labels

### Component tree

In `StructuredDataScreen`:
- AnswerForm
  - AnswerForm.Field

### paramsSchema fields

- `source` (string)
- `tableField` (dataField)
- `textField` (dataField)
- `toName` (string)
- `title` (string)
- `instructions` (string)
- `choices` (labels)
- `choicesName` (string)
- `choicesTitle` (string)
- `choiceMode` (string)
- `choicesLayout` (string)
- `choicesRequired` (boolean)
- `metadataRows` (integer)
- `metadataTitle` (string)
- `namePlaceholder` (string)
- `valuePlaceholder` (string)

### Params → answer fields

```js
function answerFields(params) {
  const cfg = resolveStructuredConfig(params);
  const fields = [];
  if (cfg.choices.length > 0) {
    fields.push({
      name: cfg.choicesName,
      kind: "choices",
      toName: cfg.toName,
      label: cfg.choicesTitle || "Choices",
      options: cfg.choices.map((c) => ({ value: c.name, color: c.color, hint: c.hint })),
      choice: cfg.choiceMode,
      required: cfg.choicesRequired,
      requiredMessage: `Select at least one option${cfg.choicesTitle ? ` for "${cfg.choicesTitle}"` : ""}.`,
      props: { layout: cfg.choicesLayout },
    });
  }
  for (let i = 1; i <= cfg.metadataRows; i += 1) {
    for (const [kind, placeholder] of [
      ["name", cfg.namePlaceholder],
      ["value", cfg.valuePlaceholder],
    ]) {
      fields.push({
        name: `table_${kind}_${i}`,
        kind: "textarea",
        toName: cfg.toName,
        label: `${kind === "name" ? "Name" : "Value"} ${i}`,
        multiple: true,
        props: { maxSubmissions: 1, editable: true, rows: 1, placeholder },
      });
    }
  }
  return fields;
}
```

### Result round-trip

```js
function getResults(regions, _relations, context) {
  // With the shell params, answers whose question is hidden are not submitted (classic); validators pass none.
  const params = context && context.params;
  return window.InterfaceComponents.AnswerForm.answersToResults(
    regions || [],
    params ? { fields: answerFields(params), params } : {},
  );
}

function parseResults(results) {
  const parsed = window.InterfaceComponents.AnswerForm.resultsToAnswers(results);
  return { regions: parsed.answerRegions, relations: [] };
}
```
