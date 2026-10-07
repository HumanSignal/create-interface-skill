<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# create-labeling-interface — Examples

Companion to the `create-labeling-interface` skill orchestrator
(`.agents/skills/create-labeling-interface/SKILL.md`). **Load only when**
[reference.md](reference.md) → **Schemas & sample data** (or the orchestrator’s quick index)
sends you here — typically when scaffolding a text/label classifier that needs a
full `inputSchema` + `task.json` round-trip. Do not load this file for every request.

---

## Complete working example — Text Classification

```jsx
const STYLE_TEXT = `
  .text-classification {
    --text-color: #1f2937;
    --bg-color: #ffffff;
    --btn-border: #d1d5db;
    --btn-bg: #ffffff;
    --btn-selected-bg: #eef2ff;
    --btn-selected-border: #4f46e5;
    
    padding: 24px;
    max-width: 720px;
    background-color: var(--bg-color);
    color: var(--text-color);
    font-family: ui-sans-serif, system-ui, sans-serif;
  }
  
  html[data-color-scheme="dark"] .text-classification {
    --text-color: #f3f4f6;
    --bg-color: #121210;
    --btn-border: #374151;
    --btn-bg: #1f2937;
    --btn-selected-bg: #312e81;
    --btn-selected-border: #6366f1;
  }
  
  .text-classification__btn {
    padding: 8px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 400;
    background: var(--btn-bg);
    border: 1px solid var(--btn-border);
    color: var(--text-color);
    transition: all 0.2s ease;
  }
  
  .text-classification__btn:hover:not(:disabled) {
    opacity: 0.9;
  }
  
  .text-classification__btn--selected {
    font-weight: 600;
    background: var(--btn-selected-bg);
    border: 2px solid var(--btn-selected-border);
  }
`;

const TextClassification = (props) => {
  const { task, regions, params, addRegion, updateRegion, readOnly } = props;
  const text = getField(task.data, params?.textField ?? "text") ?? "";
  const labels = params?.labels ?? [];
  const current = (regions || []).find((r) => r.type === "choices");
  const selected = current?.labels?.[0] ?? null;
  const disabled = readOnly || !!current?.locked;

  const choose = (label) => {
    if (disabled) return;
    // Change the choice in place: a locked region rejects updateRegion, so a single choice stays single.
    if (current) {
      updateRegion(current.id, { labels: [label], text: label });
      return;
    }
    addRegion({
      id: `cls-${Date.now()}`,
      type: "choices",
      labels: [label],
      colors: ["#4f46e5"],
      score: null,
      hidden: false,
      locked: false,
      selected: false,
      parentId: null,
      text: label,
    });
  };

  return (
    <div className="text-classification">
      <style>{STYLE_TEXT}</style>
      <div style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 24, whiteSpace: "pre-wrap" }}>
        {String(text)}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {labels.map((label) => (
          <button
            key={label}
            disabled={disabled}
            onClick={() => choose(label)}
            className={`text-classification__btn ${selected === label ? 'text-classification__btn--selected' : ''}`}
            style={{ cursor: disabled ? "default" : "pointer" }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

const paramsSchema = {
  type: "object",
  properties: {
    labels: {
      type: "array",
      items: { type: "string" },
      title: "Labels",
      default: ["Positive", "Negative", "Neutral"],
      description: "Categories the annotator can choose from",
    },
    textField: {
      type: "string",
      title: "Text field",
      default: "text",
      description: "Task data field containing the text to classify",
    },
  },
  required: ["labels", "textField"],
};

const inputSchema = {
  type: "object",
  properties: {
    textField: {
      type: "dataField",
      dataType: "string",
      default: "text",
      description: "Task data field containing the text to classify",
    },
  },
};

const outputSchema = {
  type: "object",
  properties: {
    sentiment: {
      type: "string",
      enum: ["Positive", "Negative", "Neutral"],
      $param: "labels",
      description: "Selected sentiment label",
    },
  },
  required: ["sentiment"],
};

function getResults(regions, relations) {
  const regionResults = regions.map((r) => ({
    id: r.id,
    from_name: "sentiment",
    to_name: "text",
    type: "choices",
    value: { choices: r.labels },
    origin: "manual",
  }));

  const relationResults = (relations || [])
    .filter((rel) => rel.node1Id && rel.node2Id)
    .map((rel) => ({
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

function parseResults(results) {
  const regions = (results || [])
    .filter((r) => r.from_name === "sentiment")
    .map((r) => ({
      id: r.id,
      type: "choices",
      labels: r.value.choices ?? [],
      colors: ["#4f46e5"],
      score: r.score ?? null,
      hidden: false,
      locked: false,
      selected: false,
      parentId: null,
      text: (r.value.choices ?? [])[0] ?? "",
    }));

  const relationResults = (results || []).filter((r) => r.type === "relation");
  const regionMap = {};
  for (const reg of regions) regionMap[reg.id] = reg;
  const relations = relationResults.map((rel) => {
    const node1 = regionMap[rel.from_id];
    const node2 = regionMap[rel.to_id];
    return {
      id: rel.id,
      direction: rel.direction || "right",
      visible: true,
      labels: rel.labels || null,
      node1Label: node1?.labels[0] || node1?.type || rel.from_id,
      node2Label: node2?.labels[0] || node2?.type || rel.to_id,
      node1Id: rel.from_id,
      node2Id: rel.to_id,
    };
  });

  return { regions, relations };
}

({
  default: TextClassification,
  specVersion: 1,
  paramsSchema,
  inputSchema,
  outputSchema,
  getResults,
  parseResults,
})
```

Ship a sibling **`task.json`** (Develop Locally / SDK sync) whose keys match
every `inputSchema` dataField `default`:

```json
{
  "text": "The product arrived quickly and works as expected. Highly recommend!"
}
```

This example demonstrates the full pattern: configurable labels and data
field via `paramsSchema`, **`inputSchema` for Data I/O**, the screen reading
`params` and `regions` from props, mutation through `addRegion`/`updateRegion`
(not local state), read-only handling, round-trip serialization that keeps
`outputSchema` keys aligned with `getResults` `from_name` values, and
preview task data so INPUT EXAMPLE / Preview are not empty.
