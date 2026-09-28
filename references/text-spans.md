<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Text spans & NER

### Text Span / NER Interfaces (CRITICAL)

For NER, entity extraction, relation extraction evidence spans, or any text highlight interface, region offsets MUST be absolute JavaScript string indices into the exact source text. Use `_start` and `_end` on each region, with `_end` exclusive. Also store `_text: sourceText.slice(start, end)` when creating or parsing a region, because `getResults(regions, relations)` does not receive `task`.

Never calculate offsets with:
- `text.indexOf(selectedText)` or `sourceText.indexOf(entityText)` without a start cursor
- `range.cloneRange().toString().length`
- `container.textContent`, `innerText`, or any rendered DOM text
- accumulated lengths of rendered chunks that include label badges

These fail after the first highlight. Example: if the first marked span renders `food was` plus a visible `Person` badge, DOM text now contains six extra characters. A later selection beginning at `service` will be saved as `e was outst`. The source of truth is the original source string, not the DOM.

Required rendering pattern for spans:
- Sort regions by `Number(region._start)`
- Render all original source text inside elements with `data-source-start`; highlighted text and plain text both need this
- Put label badges/icons outside counted text nodes and set `userSelect: "none"`
- Use saved `_start` / `_end` for rendering, selection, editing, serialization, and parseResults
- Filter hidden regions out of the visual span list with `!region.hidden`. The shell's hide-all and per-region eye controls update `region.hidden`; the text should become plain text, not highlighted.

Required selection-offset helper:
```js
function getSourcePointOffset(node, offset) {
  let el = node?.nodeType === 3 ? node.parentElement : node;
  while (el && !el.getAttribute?.("data-source-start")) {
    el = el.parentElement;
  }
  if (!el) return null;
  const sourceStart = Number(el.getAttribute("data-source-start"));
  if (!Number.isFinite(sourceStart)) return null;
  return sourceStart + offset;
}

function getSelectionOffsets() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const anchor = getSourcePointOffset(selection.anchorNode, selection.anchorOffset);
  const focus = getSourcePointOffset(selection.focusNode, selection.focusOffset);
  if (anchor == null || focus == null || anchor === focus) return null;
  return { start: Math.min(anchor, focus), end: Math.max(anchor, focus) };
}
```

Required highlight rendering pattern:
```js
function renderNerText(sourceText, regions, selectedRegionIds, selectRegion) {
  const text = String(sourceText ?? "");
  const spans = (regions || [])
    .map(region => ({ region, start: Number(region._start), end: Number(region._end) }))
    .filter(item =>
      !item.region.hidden &&
      Number.isInteger(item.start) &&
      Number.isInteger(item.end) &&
      item.start >= 0 &&
      item.end > item.start &&
      item.end <= text.length
    )
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const nodes = [];
  let cursor = 0;
  spans.forEach(({ region, start, end }) => {
    if (start < cursor) return;
    if (cursor < start) {
      nodes.push(
        <span key={"text-" + cursor + "-" + start} data-source-start={cursor}>
          {text.slice(cursor, start)}
        </span>
      );
    }
    const selected = selectedRegionIds?.has(region.id);
    nodes.push(
      <mark
        key={region.id}
        data-region-id={region.id}
        onClick={() => selectRegion(region.id)}
        style={{ background: region.colors?.[0] || "var(--color-neutral-emphasis-subtle)", outline: selected ? "2px solid var(--color-primary-border)" : "none", borderRadius: 3 }}
      >
        <span data-source-start={start}>{text.slice(start, end)}</span>
        <span aria-hidden="true" style={{ marginLeft: 4, fontSize: 9, userSelect: "none", pointerEvents: "none" }}>
          {(region.labels || [])[0] || "Entity"}
        </span>
      </mark>
    );
    cursor = end;
  });
  if (cursor < text.length) {
    nodes.push(
      <span key={"text-" + cursor + "-end"} data-source-start={cursor}>
        {text.slice(cursor)}
      </span>
    );
  }
  return nodes;
}
```

When creating a selected span:
```js
const offsets = getSelectionOffsets();
if (!offsets) return;
const selectedText = sourceText.slice(offsets.start, offsets.end);
props.addRegion({
  id: "ner-" + Date.now(),
  type: "labels",
  labels: [activeLabel.name],
  colors: [activeLabel.color || "#10b981"],
  score: null,
  hidden: false,
  locked: false,
  selected: true,
  parentId: null,
  text: selectedText,
  _start: offsets.start,
  _end: offsets.end,
  _text: selectedText,
});
```

NER serialization:
```js
getResults(regions, relations) {
  const regionResults = (regions || []).map(region => ({
    id: region.id,
    from_name: "entities",
    to_name: "text",
    type: "labels",
    value: {
      start: Number(region._start),
      end: Number(region._end),
      text: region._text || region.text || "",
      labels: region.labels || [],
    },
    origin: "manual",
  }));
  const relationResults = (relations || [])
    .filter(rel => rel.node1Id && rel.node2Id)
    .map(rel => ({
      id: rel.id,
      from_name: "",
      to_name: "",
      type: "relation",
      value: {},
      from_id: rel.node1Id,
      to_id: rel.node2Id,
      direction: rel.direction,
      labels: rel.labels || [],
    }));
  return [...regionResults, ...relationResults];
}
```

NER parseResults must copy `value.start`, `value.end`, and `value.text` back to `_start`, `_end`, and `_text`, and must reuse `r.id`. The shell restores configured label colors after parsing, so initialize `colors` as an empty array rather than reading component props that are unavailable in this module-level function. Example:

```js
parseResults(results) {
  const regions = (results || [])
    .filter(r => r.type !== "relation")
    .map(r => {
      const labels = (r.value && r.value.labels) || [];
      return {
        id: r.id,
        type: r.type || "labels",
        labels,
        colors: [],
        score: r.score || null,
        hidden: false,
        locked: r.readonly || false,
        selected: false,
        parentId: null,
        text: (r.value && r.value.text) || "",
        _start: r.value && r.value.start,
        _end: r.value && r.value.end,
        _text: (r.value && r.value.text) || "",
      };
    });
  const relationResults = (results || []).filter(r => r.type === "relation");
  const regionMap = {};
  for (const reg of regions) regionMap[reg.id] = reg;
  const relations = relationResults.map(rel => {
    const node1 = regionMap[rel.from_id];
    const node2 = regionMap[rel.to_id];
    return {
      id: rel.id, direction: rel.direction || "right", visible: true, labels: rel.labels || null,
      node1Label: node1?.labels[0] || node1?.type || rel.from_id,
      node2Label: node2?.labels[0] || node2?.type || rel.to_id,
      node1Id: rel.from_id, node2Id: rel.to_id,
    };
  });
  return { regions, relations };
}
```

Before considering an NER interface complete, test repeated text like: `Alice met Bob at Acme. Alice called Bob from Acme.`
