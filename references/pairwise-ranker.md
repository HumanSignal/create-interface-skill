<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Interface Components: PairwiseRanker

## Interface Components: PairwiseRanker

`window.InterfaceComponents.PairwiseRanker` replaces classic `<Pairwise>`. Props: `items` (two { id, title, content? }; left = items[0]), `value` ("left" | "right" | null — exactly LS `value.selected`), `onChange(selected)`, `allowTie`, `showHotkeys` (A / B, T for tie), `readOnly`, `hotkeys`. Compound member: `PairwiseRanker.ItemCard`. For ordering more than two items use **RankerBoard** (do not use deprecated `mode="ranking"`).

Result: `{ type: "pairwise", from_name, to_name: "left", value: { selected: "left" } }` (classic writes the left object name as `to_name`).

```jsx
function ResponsePreference(props) {
  const PairwiseRanker = window.InterfaceComponents.PairwiseRanker;
  const data = props.task.data || {};
  const region = (props.regions || []).find((r) => r._fromName === "comparison" && r.type === "pairwise");
  return (
    <PairwiseRanker
      items={[{ id: "left", title: "Response A", content: data.answer_a }, { id: "right", title: "Response B", content: data.answer_b }]}
      value={region ? region._value.selected : null}
      onChange={(selected) => upsertControlRegion(props, { fromName: "comparison", toName: "left", type: "pairwise", value: { selected } })}
      readOnly={props.readOnly}
    />
  );
}
```
