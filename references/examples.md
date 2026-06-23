# Examples

Use these complete examples and serialization patterns when building interfaces.

## Complete Text Classification Example (with Light/Dark Mode support)

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
    <div className="text-classification">
      <style>{STYLE_TEXT}</style>
      <div style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 24, whiteSpace: "pre-wrap" }}>
        {String(text)}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {labels.map((label) => (
          <button
            key={label}
            disabled={readOnly}
            onClick={() => choose(label)}
            className={`text-classification__btn ${selected === label ? 'text-classification__btn--selected' : ''}`}
            style={{ cursor: readOnly ? "default" : "pointer" }}
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
  outputSchema,
  getResults,
  parseResults,
})
```

---

## Result Serialization Patterns

### 1. Multi-Select Image URLs (Array of Strings, No `items.enum`)
Use this pattern when selecting one or more items (e.g. image URLs) from task data, rather than predefined categories.

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "selected_images": {
      "type": "array",
      "items": { "type": "string" },
      "description": "URLs of selected images"
    }
  },
  "required": ["selected_images"]
}
```

**Serialization:**
```jsx
function getResults(regions, relations) {
  const regionResults = (regions || [])
    .filter((r) => r.type === "selected_images")
    .map((r) => ({
      id: r.id,
      from_name: "selected_images",
      to_name: "images",
      type: "labels",
      value: r.labels ?? r.urls ?? [],
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
    .filter((r) => r.type !== "relation" && r.from_name === "selected_images")
    .map((r) => {
      const picked = Array.isArray(r.value)
        ? r.value
        : (r.value?.labels ?? r.value?.choices ?? []);
      return {
        id: r.id,
        type: "selected_images",
        labels: picked,
        colors: [],
        score: null,
        hidden: false,
        locked: false,
        selected: false,
        parentId: null,
        text: picked[0] ?? "",
      };
    });

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
```

### 2. Ranking and Reordering (Array Pass-Through, Single Region)
Use this pattern when the annotator reorders items via drag-and-drop. Order is stored inside a single stable region, and outputted as a bare array.

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "ranking": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Ordered image URLs, most relevant first"
    }
  },
  "required": ["ranking"]
}
```

**Serialization:**
```jsx
const RANKING_REGION_ID = "ranking-main";

function getResults(regions, relations) {
  const rankingRegion = (regions || []).find((r) => r.id === RANKING_REGION_ID);
  const orderedUrls = rankingRegion?._rankedUrls ?? [];
  const regionResults = orderedUrls.length ? [{
    id: rankingRegion.id,
    from_name: "ranking",
    to_name: "images",
    type: "labels",
    value: orderedUrls,
    origin: "manual",
  }] : [];

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
  const result = (results || []).find((r) => r.from_name === "ranking");
  const orderedUrls = result
    ? (Array.isArray(result.value) ? result.value : (result.value?.labels ?? []))
    : [];

  const regions = orderedUrls.length
    ? [{ id: RANKING_REGION_ID, type: "labels", labels: [], _rankedUrls: orderedUrls }]
    : [];

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
```

### 3. Spatial Per Region (Image keypoints, Bounding Boxes, Polygons)
Use this pattern when annotators click on an image, and each mark has an associated category.

`parseResults` must handle two shapes:
1. **Prompter / saved predictions** (`type: "choices"`): category classifications without coordinates. Create dummy regions with `_hasCoords: false` so they appear in the UI until the user places them.
2. **Saved annotations** (e.g. `type: "keypointlabels"`): copy coordinates into `_x`/`_y` and set `_hasCoords: true`.

**Serialization:**
```jsx
function getResults(regions, relations) {
  const regionResults = (regions || [])
    .filter((r) => r._hasCoords !== false)
    .map((region) => ({
      id: region.id,
      from_name: "keypoints",
      to_name: "image",
      type: "keypointlabels",
      value: {
        x: Number(region._x),
        y: Number(region._y),
        width: region._width ?? 1,
        keypointlabels: region.labels || [],
      },
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
  const regions = [];
  for (const r of results || []) {
    if (r.type === "relation" || r.from_name !== "keypoints") continue;

    // Prompter choices path: categories only, no coordinates yet
    if (r.type === "choices") {
      const labels = r.value?.choices ?? [];
      labels.forEach((label, index) => {
        regions.push({
          id: r.id ? `${r.id}-prompter-${index}` : `prompter-kp-${index}`,
          type: "keypointlabels",
          labels: [String(label)],
          colors: [],
          score: r.score ?? null,
          hidden: false,
          locked: false,
          selected: false,
          parentId: null,
          text: String(label),
          _width: 1,
          _hasCoords: false,
        });
      });
      continue;
    }

    // Saved keypoint path: full coordinates required
    if (r.type === "keypointlabels") {
      const value = r.value;
      if (typeof value !== "object" || value == null) {
        throw new Error("keypoints result value must be an object with x/y");
      }
      const x = Number(value.x);
      const y = Number(value.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        throw new Error("keypoints result has invalid x/y coordinates");
      }
      regions.push({
        id: r.id,
        type: "keypointlabels",
        labels: value.keypointlabels ?? value.labels ?? [],
        colors: [],
        score: r.score ?? null,
        hidden: false,
        locked: false,
        selected: false,
        parentId: null,
        text: (value.keypointlabels ?? value.labels ?? [])[0] ?? "",
        _x: x,
        _y: y,
        _width: value.width ?? 1,
        _hasCoords: true,
      });
    }
  }

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
```
