<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Complete example: Classification

## Complete Example: Text Classification (Interface Components)

When Interface Components are available, **use them** for labeling controls. Do not hand-roll choice chips with `EditorUI.Button` / `<button>`, raw `<input type="range">`, or `<textarea>`, and do not invent custom region types (`sentiment-selection`, `confidence-value`, …). Store one standard LS region per control via `upsertControlRegion`.

**Choice mode:** default text classification / sentiment to `choice="single"` (mutually exclusive). Use `choice="multiple"` only when the user asked to select several labels at once.

```js
// The label list is written once; the fallback, paramsSchema default and outputSchema enum all read it.
const DEFAULT_LABELS = [
  { name: "Positive", color: "#10b981" },
  { name: "Negative", color: "#ef4444" },
  { name: "Neutral", color: "#6b7280" },
];

function upsertControlRegion(props, { fromName, toName, type, value, labels = [] }) {
  const existing = (props.regions || []).find((r) => r._fromName === fromName && r.type === type);
  const isEmpty =
    value == null ||
    Object.values(value).every((v) => v == null || (Array.isArray(v) && v.length === 0) || v === "");
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
    type,
    labels,
    score: null,
    hidden: false,
    locked: false,
    selected: false,
    parentId: null,
    text: labels.join(", "),
    _value: value,
    _fromName: fromName,
    _toName: toName,
  });
}

function SentimentScreen(props) {
  const ChoiceGroup = window.InterfaceComponents.ChoiceGroup;
  const NumberInput = window.InterfaceComponents.NumberInput;
  const RatingControl = window.InterfaceComponents.RatingControl;
  const TextInput = window.InterfaceComponents.TextInput;

  const labels = props.params?.labels ?? DEFAULT_LABELS;
  const text = getField(props.task.data, props.params?.textField) ?? "No text provided.";

  const sentiment = (props.regions || []).find((r) => r._fromName === "sentiment" && r.type === "choices");
  const confidence = (props.regions || []).find((r) => r._fromName === "confidence" && r.type === "number");
  const rating = (props.regions || []).find((r) => r._fromName === "rating" && r.type === "rating");
  const explanation = (props.regions || []).find((r) => r._fromName === "explanation" && r.type === "textarea");
  const [explanationDraft, setExplanationDraft] = React.useState(
    explanation ? (explanation._value?.text || [])[0] || explanation.text || "" : "",
  );

  // The text is the content: it gets the space and needs no title. Every answer sits together in one quiet area
  // below it, each question labeled by its own small field label.
  const fieldStyle = { display: "flex", flexDirection: "column", gap: "var(--spacing-tight)" };

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        background: "var(--color-neutral-background)",
        color: "var(--color-neutral-content)",
        fontFamily: "var(--font-family-base)",
      }}
    >
      <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "var(--spacing-base)" }}>
        <EditorUI.Typography
          variant="body"
          size="small"
          style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6, maxWidth: "72ch" }}
        >
          {text}
        </EditorUI.Typography>
      </div>

      <section
        aria-label="Answers"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--spacing-base)",
          padding: "var(--spacing-base)",
          borderTop: "1px solid var(--color-neutral-border)",
          background: "var(--color-neutral-surface)",
        }}
      >
        <div style={fieldStyle}>
          <EditorUI.Typography id="sentiment-label" as="span" variant="title" size="small" style={{ margin: 0 }}>
            Sentiment
          </EditorUI.Typography>
          <ChoiceGroup
            ariaLabelledBy="sentiment-label"
            choices={(labels || []).map((l) => ({ value: l.name, background: l.color }))}
            value={sentiment ? sentiment._value?.choices || sentiment.labels : []}
            choice="single"
            layout="chips"
            readOnly={props.readOnly || !!sentiment?.locked}
            hotkeys={props.hotkeys}
            onChange={(next) =>
              upsertControlRegion(props, {
                fromName: "sentiment",
                toName: "text",
                type: "choices",
                value: { choices: next },
                labels: next,
              })
            }
          />
        </div>

        <div style={fieldStyle}>
          <NumberInput
            label="Confidence %"
            slider
            min={0}
            max={100}
            step={5}
            value={confidence ? confidence._value?.number : 50}
            readOnly={props.readOnly}
            onChange={(n) =>
              upsertControlRegion(props, {
                fromName: "confidence",
                toName: "text",
                type: "number",
                value: { number: n },
              })
            }
          />
        </div>

        <div style={fieldStyle}>
          <EditorUI.Typography id="rating-label" as="span" variant="title" size="small" style={{ margin: 0 }}>
            Star rating
          </EditorUI.Typography>
          <RatingControl
            ariaLabelledBy="rating-label"
            type="stars"
            max={5}
            allowClear
            value={rating ? rating._value?.rating : null}
            readOnly={props.readOnly}
            hotkeys={props.hotkeys}
            onChange={(n) =>
              upsertControlRegion(props, {
                fromName: "rating",
                toName: "text",
                type: "rating",
                value: { rating: n },
              })
            }
          />
        </div>

        <div style={fieldStyle}>
          <TextInput
            label="Explanation"
            multiline
            minRows={3}
            placeholder="Evidence supporting your decision…"
            value={explanationDraft}
            readOnly={props.readOnly}
            onChange={setExplanationDraft}
            onCommit={(textValue) =>
              upsertControlRegion(props, {
                fromName: "explanation",
                toName: "text",
                type: "textarea",
                value: { text: textValue ? [textValue] : [] },
              })
            }
          />
        </div>
      </section>
    </main>
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
        default: DEFAULT_LABELS,
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
    required: ["sentiment"],
    properties: {
      sentiment: {
        type: "string",
        title: "Sentiment",
        description: "The sentiment classification label",
        enum: DEFAULT_LABELS.map((l) => l.name),
        "$param": "labels",
      },
      confidence: {
        type: "number",
        title: "Confidence",
        description: "Confidence percentage from 0 to 100",
        minimum: 0,
        maximum: 100,
      },
      rating: {
        type: "integer",
        title: "Star rating",
        description: "Overall rating from 1 to 5",
        minimum: 1,
        maximum: 5,
        "x-ls-type": "rating",
      },
      explanation: {
        type: "string",
        title: "Explanation",
        description: "Evidence supporting the sentiment decision",
      },
    },
  },
  getResults(regions, relations) {
    const regionResults = (regions || []).map((r) => {
      if (r.type === "choices") {
        return {
          id: r.id,
          from_name: r._fromName || "sentiment",
          to_name: r._toName || "text",
          type: "choices",
          value: { choices: r._value?.choices || r.labels || [] },
          origin: "manual",
        };
      }
      if (r.type === "number") {
        return {
          id: r.id,
          from_name: r._fromName || "confidence",
          to_name: r._toName || "text",
          type: "number",
          value: { number: Number(r._value?.number) },
          origin: "manual",
        };
      }
      if (r.type === "rating") {
        return {
          id: r.id,
          from_name: r._fromName || "rating",
          to_name: r._toName || "text",
          type: "rating",
          value: { rating: Number(r._value?.rating) },
          origin: "manual",
        };
      }
      if (r.type === "textarea") {
        const textValue = Array.isArray(r._value?.text) ? r._value.text : r.text ? [r.text] : [];
        return {
          id: r.id,
          from_name: r._fromName || "explanation",
          to_name: r._toName || "text",
          type: "textarea",
          value: { text: textValue },
          origin: "manual",
        };
      }
      return {
        id: r.id,
        from_name: r._fromName || "sentiment",
        to_name: r._toName || "text",
        type: r.type,
        value: r._value || { choices: r.labels || [] },
        origin: "manual",
      };
    });
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
  },
  parseResults(results) {
    const regions = [];
    for (const r of results || []) {
      if (r.type === "relation") continue;
      if (r.type === "choices" || r.from_name === "sentiment") {
        const choices = r.value?.choices || [];
        regions.push({
          id: r.id,
          type: "choices",
          labels: choices,
          colors: [],
          score: r.score ?? null,
          hidden: false,
          locked: !!r.readonly,
          selected: false,
          parentId: null,
          text: choices.join(", "),
          _value: { choices },
          _fromName: r.from_name || "sentiment",
          _toName: r.to_name || "text",
        });
        continue;
      }
      if (r.type === "number" || r.from_name === "confidence") {
        const number = Number(r.value?.number ?? 0);
        regions.push({
          id: r.id,
          type: "number",
          labels: [],
          colors: [],
          score: r.score ?? null,
          hidden: false,
          locked: !!r.readonly,
          selected: false,
          parentId: null,
          text: String(number),
          _value: { number },
          _fromName: r.from_name || "confidence",
          _toName: r.to_name || "text",
        });
        continue;
      }
      if (r.type === "rating" || r.from_name === "rating") {
        const ratingValue = Number(r.value?.rating ?? 0);
        regions.push({
          id: r.id,
          type: "rating",
          labels: [],
          colors: [],
          score: r.score ?? null,
          hidden: false,
          locked: !!r.readonly,
          selected: false,
          parentId: null,
          text: String(ratingValue),
          _value: { rating: ratingValue },
          _fromName: r.from_name || "rating",
          _toName: r.to_name || "text",
        });
        continue;
      }
      if (r.type === "textarea" || r.from_name === "explanation") {
        const textValue = Array.isArray(r.value?.text) ? r.value.text : [String(r.value?.text ?? "")];
        regions.push({
          id: r.id,
          type: "textarea",
          labels: [],
          colors: [],
          score: r.score ?? null,
          hidden: false,
          locked: !!r.readonly,
          selected: false,
          parentId: null,
          text: textValue[0] || "",
          _value: { text: textValue },
          _fromName: r.from_name || "explanation",
          _toName: r.to_name || "text",
        });
      }
    }
    const relationResults = (results || []).filter((r) => r.type === "relation");
    const regionMap = {};
    for (const reg of regions) regionMap[reg.id] = reg;
    const relations = relationResults.map((rel) => ({
      id: rel.id,
      direction: rel.direction || "right",
      visible: true,
      labels: rel.labels || null,
      node1Label: regionMap[rel.from_id]?.text || rel.from_id,
      node2Label: regionMap[rel.to_id]?.text || rel.to_id,
      node1Id: rel.from_id,
      node2Id: rel.to_id,
    }));
    return { regions, relations };
  },
})
