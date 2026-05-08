# Examples

Use these patterns when building complete interfaces.

## Text Classification

```jsx
const TextClassification = (props) => {
  const { task, regions, params, addRegion, deleteRegion, readOnly } = props;
  const text = getField(task.data, params?.textField ?? "text") ?? "";
  const labels = params?.labels ?? [];
  const selected = regions[0]?.labels?.[0] ?? null;

  const choose = (label) => {
    if (readOnly) return;
    if (regions[0]) deleteRegion(regions[0].id);
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
    <div style={{ padding: 24, maxWidth: 720 }}>
      <div style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 24, whiteSpace: "pre-wrap" }}>
        {String(text)}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {labels.map((label) => (
          <button
            key={label}
            disabled={readOnly}
            onClick={() => choose(label)}
            style={{
              padding: "8px 20px",
              borderRadius: 6,
              border: selected === label ? "2px solid #4f46e5" : "1px solid #d1d5db",
              background: selected === label ? "#eef2ff" : "#fff",
              cursor: readOnly ? "default" : "pointer",
              fontWeight: selected === label ? 600 : 400,
            }}
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
    },
    textField: {
      type: "string",
      title: "Text field",
      default: "text",
    },
  },
  required: ["labels", "textField"],
};

const outputSchema = {
  type: "object",
  properties: {
    sentiment: {
      type: "string",
      enum: { $param: "labels" },
    },
  },
  required: ["sentiment"],
};

function getResults(regions) {
  return regions.map((r) => ({
    id: r.id,
    from_name: "sentiment",
    to_name: "text",
    type: "choices",
    value: { choices: r.labels },
    origin: "manual",
  }));
}

function parseResults(results) {
  const regions = results
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
  return { regions };
}

({
  default: TextClassification,
  specVersion: 1,
  paramsSchema,
  outputSchema,
  getResults,
  parseResults,
})
```

## Result Serialization Pattern

For span-style interfaces, store display and domain data in regions, then
serialize to Label Studio results:

```jsx
function getResults(regions) {
  return regions.map((r) => ({
    id: r.id,
    from_name: "entity",
    to_name: "text",
    type: "labels",
    value: {
      start: r._start,
      end: r._end,
      text: r._text,
      labels: r.labels,
    },
    origin: "manual",
  }));
}

function parseResults(results) {
  return {
    regions: results
      .filter((r) => r.from_name === "entity")
      .map((r) => ({
        id: r.id,
        type: "labels",
        labels: r.value.labels ?? [],
        colors: ["#4f46e5"],
        score: r.score ?? null,
        hidden: false,
        locked: false,
        selected: false,
        parentId: null,
        text: `${(r.value.labels ?? [])[0] ?? "Entity"}: ${r.value.text ?? ""}`,
        _start: r.value.start,
        _end: r.value.end,
        _text: r.value.text,
      })),
  };
}
```

## Params and `$param`

Use `$param` when output choices come from project settings:

```jsx
const paramsSchema = {
  type: "object",
  properties: {
    entityLabels: {
      type: "array",
      items: { type: "string" },
      default: ["Person", "Organization", "Location"],
    },
  },
};

const outputSchema = {
  type: "object",
  properties: {
    entity: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string", enum: { $param: "entityLabels" } },
          text: { type: "string" },
          start: { type: "number" },
          end: { type: "number" },
        },
      },
    },
  },
};
```
