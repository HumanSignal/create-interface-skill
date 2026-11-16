<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Interface Components: TaxonomyTree

## Interface Components: TaxonomyTree

`window.InterfaceComponents.TaxonomyTree` replaces classic `<Taxonomy>`. Props: `items` ({ id, label, children? }[]), `value` (string[][] — label paths root → leaf, exactly LS `value.taxonomy`), `onChange(paths)`, `multiple`, `leafOnly`, `searchable`, `defaultExpandedLevels`, `readOnly`. Compound member: `TaxonomyTree.Node`.

The control uses the shared design-system TreeSelect dropdown and virtualized selection badges. Open the selection field to browse or search; matching a branch keeps its descendants. Checkboxes show partial ancestor selection. Chips display labels while results retain node aliases/values. Large trees and selections are virtualized. Arrow keys, Home/End and Enter/Space navigate/select in the open tree.

Set `displayMode="expanded"` to show the tree inline with every branch initially expanded, or `displayMode="top-level"` to show only the roots initially, with branches expandable by the annotator. Both modes are visible immediately without opening a dropdown. `displayMode="dropdown"` is the unchanged default; `defaultExpandedLevels` applies only to that mode. Inline modes retain optional search (hide it with `searchable={false}`), selection badges, keyboard navigation and virtualized scrolling. Expansion is initialized again when the tree structure or display mode changes; manual expand/collapse survives ordinary rerenders. Read-only inline trees can be browsed but cannot change selections or labels.

Result: `{ type: "taxonomy", value: { taxonomy: [["Animals", "Mammals", "Cat"]] } }`.

**outputSchema:** declare the field with `"x-ls-type": "taxonomy"` (a bare JSON Schema `array` of path arrays otherwise expects a `labels` result):
```json
{
  "topics": {
    "type": "array",
    "items": { "type": "array", "items": { "type": "string" } },
    "x-ls-type": "taxonomy",
    "title": "Topics"
  }
}
```

```jsx
function TopicScreen(props) {
  const TaxonomyTree = window.InterfaceComponents.TaxonomyTree;
  const region = (props.regions || []).find((r) => r._fromName === "topic" && r.type === "taxonomy");
  return (
    <TaxonomyTree
      items={props.params?.taxonomy || []}
      value={region ? region._value.taxonomy : []}
      multiple
      searchable
      readOnly={props.readOnly}
      onChange={(paths) => upsertControlRegion(props, { fromName: "topic", toName: "text", type: "taxonomy", value: { taxonomy: paths } })}
    />
  );
}
```
(`upsertControlRegion` is the helper from the ChoiceGroup module.)

### Required for taxonomy / category UIs
- **Always** mount `TaxonomyTree` for hierarchical **or** flat category selection (one-level `items` is fine). Do **not** render Nature/Space/Climate-style `<button>` chips, `ChoiceGroup` masquerading as a taxonomy, or local `useState` for the selected category when the answer should persist as a `taxonomy` result.
- **Ranker + taxonomy:** compose `TaxonomyTree` + `RankerBoard` in one Screen (filter/tag with taxonomy paths, order items with RankerBoard). Persist `type: "taxonomy"` and `type: "ranker"` regions separately with `"x-ls-type"` on both outputSchema fields.
- Hand-roll category UI **only** after the user iterates for something TaxonomyTree cannot do.
