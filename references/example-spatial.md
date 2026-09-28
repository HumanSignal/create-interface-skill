<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Complete example: Spatial Bounding Box

## Complete Example: Image Bounding Box / Spatial Region

For an image annotation or bounding box interface:

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

({
  default: BoundingBoxScreen,
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
