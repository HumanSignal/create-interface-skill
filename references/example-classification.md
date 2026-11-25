<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Complete example: Classification

## Complete Example: Text Classification

For a sentiment analysis or text classification interface:

```js
function SentimentScreen(props) {
  const labels = props.params?.labels ?? [
    { name: "Positive", color: "#10b981" },
    { name: "Negative", color: "#ef4444" },
    { name: "Neutral", color: "#6b7280" },
  ];
  const text = getField(props.task.data, props.params?.textField) ?? "No text provided.";
  const selected = (props.regions || []).find(r => r.type === "choices");
  const disabled = props.readOnly || !!selected?.locked;

  function select(label) {
    // Change the existing choice in place: the shell rejects edits to a locked region,
    // but a delete + add would keep the locked choice and add a second one (FIT-3076).
    if (disabled) return;
    if (selected) {
      props.updateRegion(selected.id, {
        labels: [label.name], colors: [label.color || "#6b7280"], text: label.name,
      });
      return;
    }
    const id = "sentiment-" + Date.now();
    props.addRegion({
      id, type: "choices", labels: [label.name], colors: [label.color || "#6b7280"],
      score: null, hidden: false, locked: props.readOnly,
      selected: true, parentId: null, text: label.name,
    });
    props.selectRegion(id);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 24 }}>
      <div style={{
        background: "var(--color-neutral-emphasis-subtle)", border: "1px solid var(--color-neutral-border)", borderRadius: 8,
        padding: 20, marginBottom: 24, fontSize: 13, lineHeight: 1.5, color: "var(--color-neutral-content)",
      }}>
        <strong style={{
          display: "block", marginBottom: 8, color: "var(--color-neutral-content-subtle)",
          fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1,
        }}>Text</strong>
        {text}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {(labels || []).map((label) => {
          const isSelected = selected?.labels?.[0] === label.name;
          const color = label.color || "var(--color-primary-surface)";
          return (
            <button key={label.name}
              onClick={() => select(label)}
              disabled={disabled}
              style={{
                padding: "8px 24px",
                border: "1px solid " + (isSelected ? color : "var(--color-neutral-border)"),
                borderRadius: 6, fontSize: 13, fontWeight: 600,
                cursor: disabled ? "default" : "pointer",
                background: isSelected ? color : "var(--color-neutral-surface)",
                color: isSelected ? "var(--color-neutral-on-dark-content)" : "var(--color-neutral-content)",
                opacity: disabled ? 0.6 : 1,
                transition: "all 0.15s ease",
              }}
            >{label.name}</button>
          );
        })}
      </div>
    </div>
  );
}

({
  default: SentimentScreen,
  paramsSchema: {
    type: "object",
    properties: {
      textField: {
        type: "dataField",
        default: "text",
        description: "Task data field containing the text to classify",
      },
      labels: {
        type: "labels",
        default: [
          { name: "Positive", color: "#10b981" },
          { name: "Negative", color: "#ef4444" },
          { name: "Neutral", color: "#6b7280" },
        ],
        description: "Classification labels",
      },
    },
  },
  inputSchema: {
    type: "object",
    properties: {
      textField: {
        type: "dataField",
        default: "text",
        description: "Task data field containing the text to classify",
      },
    },
  },
  outputSchema: {
    type: "object",
    properties: {
      sentiment: {
        type: "string",
        title: "Sentiment",
        description: "The sentiment classification label",
        enum: ["Positive", "Negative", "Neutral"],
        "$param": "labels",
      },
    },
  },
  getResults(regions, relations) {
    const regionResults = (regions || []).map(r => ({
      id: r.id, from_name: "sentiment", to_name: "text",
      type: "choices", value: { choices: r.labels || [] }, origin: "manual",
    }));
    const relationResults = (relations || []).filter(rel => rel.node1Id && rel.node2Id).map(rel => ({
      id: rel.id, from_name: "", to_name: "", type: "relation", value: {},
      from_id: rel.node1Id, to_id: rel.node2Id, direction: rel.direction, labels: rel.labels || [],
    }));
    return [...regionResults, ...relationResults];
  },
  parseResults(results) {
    const regions = (results || [])
      .filter(r => r.type !== "relation")
      .map(r => {
        if (r.from_name === "sentiment") return {
          id: r.id, type: "choices",
          labels: r.value?.choices || [],
          colors: [], score: null, hidden: false, locked: false,
          selected: false, parentId: null, text: (r.value?.choices || [])[0] || "",
        };
        return null;
      }).filter(Boolean);
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
  },
})
