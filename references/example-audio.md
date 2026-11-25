<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Complete example: Audio time-spans

## Complete Example: Audio Time-Span Regions + Relations (FIT-2247)

Audio/time-span screens use **seconds** on `_start` / `_end` (not character offsets). Waveform `<canvas>` paint alone is not enough for shell relation connectors — also render positioned DOM overlays with `data-region-id`.

**Anti-patterns (common mixed image+audio failures — FIT-2247):**
- Do **not** serialize audio spans as `type: "rectanglelabels"` with percent `x/width`. Audio is `type: "labels"` + `value: { start, end, labels }` in **seconds**.
- Do **not** invent discriminators like `_kind: "box"|"span"` and gate `getResults` on them. Sandbox probes pass standard regions with `type` + `_x`/`_start` only — custom gates make round-trip impossible.
- Mixed screens: image boxes keep `rectanglelabels` + `_x/_y/_width/_height`; audio spans keep `labels` + `_start/_end`. Two different contracts in one file.

**Outliner / Info panel actions (CRITICAL — FIT-2246):**
- The editor-shell already wraps `OutlinerItem` with Lock + Hide, and wraps `InfoViewer` with Lock + Hide + Delete.
- `OutlinerItem` / `InfoViewer` must render **content only** (label, time range, notes, editable fields).
- Do **not** render Lock, Hide, Unlock, eye icons, or Delete / "Delete Span" buttons inside those slots — that duplicates the shell chrome in Regions and Info panels.

Critical contracts the sandbox validates:
1. `outputSchema` label field MUST use `items.enum` (or `"$param": "labels"`) — never bare `items: { type: "string" }` (that triggers pass-through and rejects `start`/`end`).
2. `getResults(regions, relations)` emits `type: "labels"` with `value: { start, end, labels }` plus `type: "relation"` entries from the relations argument (`from_id`/`to_id` ← `node1Id`/`node2Id`). Gate on `Number.isFinite(r._start)` / `from_name`, not custom `_kind`.
3. `parseResults` restores `_start`/`_end` and relation node ids; filter `r.type === "relation"` out of regions.
4. Overlay each visible region: `data-region-id={region.id}`, `left`/`width` from `_start`/`_end` as % of duration.

```js
function formatTime(t) {
  const n = Number(t);
  if (!Number.isFinite(n)) return "0:00";
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60);
  return m + ":" + String(s).padStart(2, "0");
}

function AudioTimeSpanScreen(props) {
  const labels = props.params?.labels ?? [
    { name: "Speaker A", color: "#3b82f6" },
    { name: "Speaker B", color: "#10b981" },
  ];
  const audioUrl = getField(props.task.data, props.params?.audioField) ?? "";
  const visibleRegions = props.visibleRegions ?? (props.regions || []).filter((r) => !r.hidden);
  const duration = Number(props.params?.duration) || 30;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8, padding: 16 }}>
      <audio src={audioUrl} controls style={{ width: "100%" }} />
      <div data-relation-anchor="" style={{ position: "relative", height: 96, background: "var(--color-neutral-background)" }}>
        <canvas width={640} height={96} style={{ width: "100%", height: "100%" }} />
        {visibleRegions.map((region) => {
          const start = Number(region._start) || 0;
          const end = Number(region._end) || start;
          return (
            <div
              key={region.id}
              data-region-id={region.id}
              style={{
                position: "absolute",
                left: (start / duration) * 100 + "%",
                width: Math.max(0.5, ((end - start) / duration) * 100) + "%",
                top: 0,
                height: "100%",
                background: region.colors?.[0] || "#3b82f6",
                opacity: 0.35,
                pointerEvents: "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Content-only row — shell adds Lock/Hide (FIT-2246). */
function OutlinerItem(props) {
  const { region, index, selectedRegionIds, selectRegion } = props;
  const isSelected = selectedRegionIds?.has(region.id);
  const label = (region.labels || [])[0] || "Unlabelled";
  const start = Number(region._start) || 0;
  const end = Number(region._end) || start;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={"Select span " + label + " " + formatTime(start) + "-" + formatTime(end)}
      aria-pressed={!!isSelected}
      onClick={() => selectRegion?.(region.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectRegion?.(region.id);
        }
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 8px",
        cursor: "pointer",
        borderRadius: 4,
        background: isSelected ? "rgba(59,130,246,0.12)" : "transparent",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 2, background: (region.colors || [])[0] || "#3b82f6", flexShrink: 0 }} />
      <span style={{ fontWeight: isSelected ? 700 : 600 }}>{index}. {label}</span>
      <span style={{ fontSize: 12, opacity: 0.7 }}>{formatTime(start)} - {formatTime(end)}</span>
    </div>
  );
}

/** Content-only details — shell adds Lock/Hide/Delete (FIT-2246). No Delete Span button here. */
function InfoViewer(props) {
  const { region, updateRegion, readOnly, params } = props;
  if (!region) return <div style={{ padding: 12, opacity: 0.7 }}>Select an audio span.</div>;
  const labels = params?.labels ?? [
    { name: "Speaker A", color: "#3b82f6" },
    { name: "Speaker B", color: "#10b981" },
  ];
  const current = (region.labels || [])[0] || "";
  const start = Number(region._start) || 0;
  const end = Number(region._end) || start;
  const editable = !readOnly && !region.locked;

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>Label</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {labels.map((label) => (
          <button
            key={label.name}
            type="button"
            disabled={!editable}
            aria-label={"Set label " + label.name}
            onClick={() => updateRegion?.(region.id, { labels: [label.name], colors: [label.color] })}
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid " + (current === label.name ? label.color : "var(--color-neutral-border)"),
              background: current === label.name ? label.color + "22" : "transparent",
              cursor: editable ? "pointer" : "default",
            }}
          >
            {label.name}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>
        Time range: {formatTime(start)} - {formatTime(end)} ({start.toFixed(1)}s – {end.toFixed(1)}s)
      </div>
    </div>
  );
}

({
  default: AudioTimeSpanScreen,
  OutlinerItem,
  InfoViewer,
  paramsSchema: {
    type: "object",
    properties: {
      audioField: { type: "dataField", default: "audio", description: "Task field with audio URL" },
      labels: {
        type: "labels",
        default: [{ name: "Speaker A", color: "#3b82f6" }, { name: "Speaker B", color: "#10b981" }],
        description: "Time-span labels",
      },
    },
  },
  inputSchema: {
    type: "object",
    properties: {
      audioField: { type: "dataField", default: "audio", description: "Task field with audio URL" },
    },
  },
  outputSchema: {
    type: "object",
    properties: {
      regions: {
        type: "array",
        description: "Labeled audio time spans",
        items: { type: "string", enum: ["Speaker A", "Speaker B"], "$param": "labels" },
      },
    },
  },
  getResults(regions, relations) {
    const out = (regions || []).map((r) => ({
      id: r.id,
      from_name: "regions",
      to_name: "audio",
      type: "labels",
      value: { start: Number(r._start), end: Number(r._end), labels: r.labels || [] },
      origin: "manual",
    }));
    for (const rel of relations || []) {
      if (!rel.node1Id || !rel.node2Id) continue;
      out.push({
        id: rel.id,
        from_name: "",
        to_name: "",
        type: "relation",
        value: {},
        from_id: rel.node1Id,
        to_id: rel.node2Id,
        direction: rel.direction || "right",
        labels: rel.labels || [],
      });
    }
    return out;
  },
  parseResults(results) {
    const regions = [];
    const relations = [];
    for (const r of results || []) {
      if (r.type === "relation") {
        relations.push({
          id: r.id,
          node1Id: r.from_id,
          node2Id: r.to_id,
          direction: r.direction || "right",
          visible: true,
          labels: r.labels || [],
        });
        continue;
      }
      regions.push({
        id: r.id,
        type: r.type || "labels",
        labels: (r.value && r.value.labels) || [],
        colors: [],
        score: r.score || null,
        hidden: false,
        locked: !!r.readonly,
        selected: false,
        parentId: null,
        text: "",
        _start: r.value && r.value.start,
        _end: r.value && r.value.end,
      });
    }
    return { regions, relations };
  },
  getValidationErrors(regions) {
    return (regions || [])
      .filter((r) => !(Number.isFinite(r._start) && Number.isFinite(r._end) && r._end > r._start))
      .map((r) => ({ regionId: r.id, message: "Region needs a valid start/end time span" }));
  },
})
```
