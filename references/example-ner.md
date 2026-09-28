<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Complete example: NER

## Complete Example: Named Entity Recognition (NER)

For an NER / entity highlighting interface:

```js
function NerScreen(props) {
  const labels = props.params?.labels ?? [
    { name: "Person", color: "#3b82f6" },
    { name: "Organization", color: "#10b981" },
    { name: "Location", color: "#f59e0b" },
  ];
  const [activeLabel, setActiveLabel] = React.useState(labels[0] || { name: "Person", color: "#3b82f6" });
  const sourceText = getField(props.task.data, props.params?.textField) ?? "";
  const visibleRegions = props.visibleRegions ?? (props.regions || []).filter(r => !r.hidden);
  const selectedRegionIds = props.selectedRegionIds ?? new Set(visibleRegions.filter(r => r.selected).map(r => r.id));

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

  function handleMouseUp() {
    if (props.readOnly) return;
    const offsets = getSelectionOffsets();
    if (!offsets) return;
    const selectedText = sourceText.slice(offsets.start, offsets.end);
    if (!selectedText.trim()) return;
    const id = "ner-" + Date.now();
    props.addRegion({
      id, type: "labels", labels: [activeLabel.name], colors: [activeLabel.color || "#3b82f6"],
      score: null, hidden: false, locked: false, selected: true, parentId: null,
      text: selectedText, _start: offsets.start, _end: offsets.end, _text: selectedText,
    });
    props.selectRegion(id);
    window.getSelection()?.removeAllRanges();
  }

  function renderNerText() {
    const text = String(sourceText ?? "");
    const spans = (visibleRegions || [])
      .map(region => ({ region, start: Number(region._start), end: Number(region._end) }))
      .filter(item =>
        Number.isInteger(item.start) && Number.isInteger(item.end) &&
        item.start >= 0 && item.end > item.start && item.end <= text.length
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
      const selected = selectedRegionIds.has(region.id);
      nodes.push(
        <mark
          key={region.id}
          data-region-id={region.id}
          onClick={(e) => { e.stopPropagation(); props.selectRegion(region.id); }}
          style={{
            background: region.colors?.[0] || "var(--color-primary-surface)",
            outline: selected ? "2px solid var(--color-primary-border)" : "none",
            borderRadius: 3, padding: "1px 2px", cursor: "pointer",
          }}
        >
          <span data-source-start={start}>{text.slice(start, end)}</span>
          <span aria-hidden="true" style={{ marginLeft: 4, fontSize: 10, fontWeight: 600, userSelect: "none" }}>
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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 24 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(labels || []).map(label => (
          <button key={label.name}
            onClick={() => setActiveLabel(label)}
            style={{
              padding: "6px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: activeLabel.name === label.name ? label.color : "var(--color-neutral-surface)",
              color: activeLabel.name === label.name ? "#fff" : "var(--color-neutral-content)",
              border: "1px solid var(--color-neutral-border)", cursor: "pointer",
            }}
          >{label.name}</button>
        ))}
      </div>
      <div
        onMouseUp={handleMouseUp}
        style={{
          padding: 20, borderRadius: 8, border: "1px solid var(--color-neutral-border)",
          background: "var(--color-neutral-surface)", fontSize: 14, lineHeight: 1.8,
        }}
      >
        {renderNerText()}
      </div>
    </div>
  );
}

({
  default: NerScreen,
  paramsSchema: {
    type: "object",
    properties: {
      textField: { type: "dataField", default: "text", description: "Source text for entity extraction" },
      labels: {
        type: "labels",
        default: [
          { name: "Person", color: "#3b82f6" },
          { name: "Organization", color: "#10b981" },
          { name: "Location", color: "#f59e0b" },
        ],
        description: "Entity labels",
      },
    },
  },
  inputSchema: {
    type: "object",
    properties: {
      textField: { type: "dataField", default: "text", description: "Source text" },
    },
  },
  outputSchema: {
    type: "object",
    properties: {
      entities: {
        type: "array",
        description: "Extracted named entities with spans",
        items: {
          type: "string",
          enum: ["Person", "Organization", "Location"],
          "$param": "labels",
        },
      },
    },
  },
  getResults(regions, relations) {
    const regionResults = (regions || []).map(r => ({
      id: r.id, from_name: "entities", to_name: "text", type: "labels",
      value: { start: Number(r._start), end: Number(r._end), text: r._text || r.text || "", labels: r.labels || [] },
      origin: "manual",
    }));
    return regionResults;
  },
  parseResults(results) {
    const regions = (results || []).map(r => {
      const labels = (r.value && r.value.labels) || [];
      return {
        id: r.id, type: "labels", labels, colors: [], score: r.score || null,
        hidden: false, locked: false, selected: false, parentId: null,
        text: (r.value && r.value.text) || "",
        _start: r.value && r.value.start, _end: r.value && r.value.end, _text: (r.value && r.value.text) || "",
      };
    });
    return { regions, relations: [] };
  },
})
