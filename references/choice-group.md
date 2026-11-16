<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Interface Components: ChoiceGroup

## Interface Components: ChoiceGroup

`window.InterfaceComponents.ChoiceGroup` replaces classic `<Choices>`. Controlled by `value` (string[] of `alias ?? value`) + `onChange(selected: string[])`; `choice` = "single" | "single-radio" | "multiple"; `layout` = "radio" | "checkbox" | "chips" | "cards" | "dropdown" (classic "select"/"inline"/"vertical" accepted); `required`, `showHotkeys`, `readOnly`, `hotkeys`. Compound members: `ChoiceGroup.Item`, `ChoiceGroup.Card`. Default classification / sentiment to `choice="single"` unless the user asked for multi-label.

Result: `{ type: "choices", from_name, to_name, value: { choices: ["Positive"] } }`. Helpers: `ChoiceGroup.toChoicesResult` / `fromChoicesResult` (flat `string[]`).

**Nested choices (classic `<Choices allowNested>`):** ChoiceGroup is flat — `fromChoicesResult` flattens path arrays to their leaf (data loss). Keep paths with **TaxonomyTree** (`taxonomy` result) or **AnswerForm** `kind: "choices"` + `nested: true` (stores `[["Parent","Leaf"]]` in `value.choices`, matching classic allowNested).

```jsx
function upsertControlRegion(props, { fromName, toName, type, value, labels = [] }) {
  const existing = (props.regions || []).find((r) => r._fromName === fromName && r.type === type);
  const isEmpty = value == null || Object.values(value).every((v) => v == null || (Array.isArray(v) && v.length === 0) || v === "");
  if (isEmpty) {
    if (existing) props.deleteRegion(existing.id);
    return;
  }
  if (existing) {
    props.updateRegion(existing.id, { _value: value, labels, text: labels.join(", ") });
    return;
  }
  props.addRegion({
    id: Math.random().toString(36).slice(2, 12),
    type, labels, score: null, hidden: false, locked: false, selected: false, parentId: null,
    text: labels.join(", "), _value: value, _fromName: fromName, _toName: toName,
  });
}

function SentimentScreen(props) {
  const ChoiceGroup = window.InterfaceComponents.ChoiceGroup;
  const region = (props.regions || []).find((r) => r._fromName === "sentiment" && r.type === "choices");
  const value = region ? region._value.choices || region.labels : [];
  return (
    <ChoiceGroup
      choices={[{ value: "Positive" }, { value: "Negative" }, { value: "Neutral" }]}
      value={value}
      choice="single-radio"
      layout="radio"
      readOnly={props.readOnly}
      hotkeys={props.hotkeys}
      onChange={(next) =>
        upsertControlRegion(props, { fromName: "sentiment", toName: "text", type: "choices", value: { choices: next }, labels: next })
      }
    />
  );
}
```
