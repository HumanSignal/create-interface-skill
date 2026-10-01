<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Complete example: Spatial Bounding Box

## Complete Example: Image Bounding Box / Spatial Region

For an image annotation or bounding box interface:

**Outliner / Info panel actions (CRITICAL — FIT-2246 / FIT-2931):**
- The editor-shell wraps `OutlinerItem` with Lock + Hide, and wraps `InfoViewer` with Lock + Hide + Delete.
- Export `OutlinerItem` / `InfoViewer` as **content only** (label, coordinates, notes, editable fields).
- Do **not** render "Delete polygon", "Delete box", "Delete region", trash icons, Lock, Hide or eye buttons inside them — the Info panel then shows two Delete controls.

```js
function BoundingBoxScreen(props) {
  const labels = props.params?.labels ?? [
    { name: "Object", color: "#ef4444" },
    { name: "Background", color: "#3b82f6" },
  ];
  const imageUrl = getField(props.task.data, props.params?.imageField) ?? "";
  const visibleRegions = props.visibleRegions ?? (props.regions || []).filter(r => !r.hidden);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 24 }}>
      <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
        <img src={imageUrl} alt="Annotation target" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
    </div>
  );
}

function formatBox(region) {
  const fmt = (n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(1) : "0.0");
  const x = region.x ?? region._x ?? region._value?.x;
  const y = region.y ?? region._y ?? region._value?.y;
  const width = region.width ?? region._width ?? region._value?.width;
  const height = region.height ?? region._height ?? region._value?.height;
  return fmt(x) + ", " + fmt(y) + " · " + fmt(width) + " × " + fmt(height) + "%";
}

/** Content-only row — shell adds Lock/Hide (FIT-2246). */
function OutlinerItem(props) {
  const { region, index } = props;
  const label = (region.labels || [])[0] || "Unlabeled";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: (region.colors || [])[0] || "#ef4444", flexShrink: 0 }} />
      <span style={{ fontWeight: 600 }}>{index}. {label}</span>
    </div>
  );
}

/** Content-only details — shell adds Lock/Hide/Delete (FIT-2931). No "Delete box" button here. */
function InfoViewer(props) {
  const { region, updateRegion, readOnly, params } = props;
  const labels = params?.labels ?? [{ name: "Object", color: "#ef4444" }];
  const current = (region.labels || [])[0] || "";
  const editable = !readOnly && !region.locked;

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {labels.map((label) => (
          <button
            key={label.name}
            type="button"
            disabled={!editable}
            aria-label={"Set label " + label.name}
            aria-pressed={current === label.name}
            onClick={() => updateRegion?.(region.id, { labels: [label.name], colors: [label.color] })}
            style={{
              padding: "4px 8px",
              borderRadius: 4,
              border: "1px solid " + (current === label.name ? label.color : "var(--color-neutral-border)"),
              background: current === label.name ? label.color + "22" : "transparent",
              color: "var(--color-neutral-content)",
              cursor: editable ? "pointer" : "default",
            }}
          >
            {label.name}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>Box: {formatBox(region)}</div>
    </div>
  );
}

({
  default: BoundingBoxScreen,
  OutlinerItem,
  InfoViewer,
  paramsSchema: {
    type: "object",
    properties: {
      imageField: { type: "dataField", default: "image", description: "Task field with image URL" },
      labels: {
        type: "labels",
        default: [{ name: "Object", color: "#ef4444" }],
        description: "Bounding box labels",
      },
    },
  },
  inputSchema: {
    type: "object",
    properties: {
      imageField: { type: "dataField", default: "image", description: "Task field with image URL" },
    },
  },
  outputSchema: {
    type: "object",
    properties: {
      boxes: {
        type: "array",
        description: "Bounding box detections",
        items: { type: "string", enum: ["Object"], "$param": "labels" },
      },
    },
  },
  getResults(regions, relations) {
    return (regions || []).map(r => ({
      id: r.id, from_name: "boxes", to_name: "image", type: "rectanglelabels",
      value: { x: r.x, y: r.y, width: r.width, height: r.height, rotation: r.rotation || 0, rectanglelabels: r.labels || [] },
      origin: "manual",
    }));
  },
  parseResults(results) {
    const regions = (results || []).map(r => ({
      id: r.id, type: "rectanglelabels", labels: r.value?.rectanglelabels || [],
      x: r.value?.x, y: r.value?.y, width: r.value?.width, height: r.value?.height,
      rotation: r.value?.rotation || 0, score: r.score || null, hidden: false, locked: false,
    }));
    return { regions, relations: [] };
  },
})
