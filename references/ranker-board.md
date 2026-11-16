<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Interface Components: RankerBoard

## Interface Components: RankerBoard

`window.InterfaceComponents.RankerBoard` replaces classic `<Ranker>` (+ `<Bucket>`). Props: `items` ({ id, title, body? }[]), `buckets` (optional { name, title? }[] — omit for one ranked list), `value` (exactly LS `value.ranker`: bucket/list name → ordered item ids), `onChange(ranker)`, `readOnly`. Drag and keyboard (Space to grab, arrows to move) both reorder.

Result: `{ type: "ranker", from_name: "rank", to_name: "results", value: { ranker: { results: ["id3", "id1", "id2"] } } }`.

```jsx
function SearchRanking(props) {
  const RankerBoard = window.InterfaceComponents.RankerBoard;
  const items = (props.task.data?.results || []).map((r) => ({ id: String(r.id), title: r.title, body: r.snippet }));
  const region = (props.regions || []).find((r) => r._fromName === "rank" && r.type === "ranker");
  return (
    <RankerBoard
      items={items}
      value={region ? region._value.ranker : { results: items.map((i) => i.id) }}
      onChange={(ranker) => upsertControlRegion(props, { fromName: "rank", toName: "results", type: "ranker", value: { ranker } })}
      readOnly={props.readOnly}
    />
  );
}
```

**Image candidates + taxonomy (compose — first artifact for "categorize then rank images"):**
```jsx
function TaxonomyRankerScreen(props) {
  const TaxonomyTree = window.InterfaceComponents.TaxonomyTree;
  const RankerBoard = window.InterfaceComponents.RankerBoard;
  const images = getField(props.task.data, props.params?.imagesField ?? "images") || [];
  const taxonomyRaw = getField(props.task.data, props.params?.taxonomyField ?? "taxonomy") || [];
  const taxonomyItems = (taxonomyRaw || []).map((entry) => {
    const label = typeof entry === "string" ? entry : String(entry?.label ?? entry?.name ?? entry?.value ?? "");
    return { id: label, label };
  }).filter((item) => item.id);
  const items = images.map((url, index) => ({ id: String(index), title: "Image " + (index + 1), imageUrl: String(url) }));
  const taxonomyRegion = (props.regions || []).find((r) => r._fromName === "taxonomy" && r.type === "taxonomy");
  const rankingRegion = (props.regions || []).find((r) => r._fromName === "ranking" && r.type === "ranker");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-wide)", padding: "var(--spacing-base)" }}>
      <TaxonomyTree
        items={taxonomyItems}
        value={taxonomyRegion ? taxonomyRegion._value.taxonomy : []}
        leafOnly
        searchable
        readOnly={props.readOnly}
        onChange={(paths) =>
          upsertControlRegion(props, {
            fromName: "taxonomy",
            toName: "images",
            type: "taxonomy",
            value: { taxonomy: paths },
            labels: paths.map((p) => p.join(" / ")),
          })
        }
      />
      <RankerBoard
        name="rank"
        listTitle="Candidates"
        items={items}
        value={rankingRegion?._value?.ranker ?? { rank: items.map((i) => i.id) }}
        readOnly={props.readOnly}
        onChange={(ranker) =>
          upsertControlRegion(props, { fromName: "ranking", toName: "images", type: "ranker", value: { ranker } })
        }
      />
    </div>
  );
}
```
(outputSchema: taxonomy field with `"x-ls-type": "taxonomy"`, ranking field with `"x-ls-type": "ranker"`. Persist via `TaxonomyTree.toTaxonomyResult` / `RankerBoard.toRankerResult` in `getResults`.)

### Required for ranking / reorder UIs
- **Always** mount `RankerBoard` (or `PairwiseRanker` for exactly two items) on the first artifact. Do **not** hand-roll HTML tables, `draggable` rows, `useState` ordered lists, card grids with Move up/down, or a `type: "labels"` / `_rankedUrls` ranking region when RankerBoard covers the ask.
- Persist with `type: "ranker"` and outputSchema `"x-ls-type": "ranker"` (JSON Schema `object` / column maps). Image candidates → `items` with `id`/`title`/`imageUrl` (or thumbnail HTML in `body`), not a custom preview column.
- **With taxonomy:** compose `TaxonomyTree` + `RankerBoard` as above; do not replace either with Select/chips + a DIY table because plan mode said "filter then rank".
- Hand-roll or wrap RankerBoard **only** after the user iterates for something it cannot do (e.g. per-row flag columns it does not expose).
