# Runtime Contract

Use this reference when writing any non-trivial HumanSignal Interface.

## Module Shape

The source file is evaluated as a JavaScript function body. It must end with a parenthesized object literal whose `default` key is a React component.

```jsx
const MyInterface = (props) => {
  return <div />;
};

({
  default: MyInterface,
  specVersion: 1,
  paramsSchema,
  outputSchema,
  getResults,
  parseResults,
  GridCell,
  OutlinerItem,
  InfoViewer,
  BottomBarExtra,
  onBeforeUpdate,
  regionSchema,
  structure,
})
```

## Available Globals

These identifiers are injected into the runtime scope:

| Name | Use |
|---|---|
| `React` | React 17 API |
| `useState` | `React.useState` |
| `useRef` | `React.useRef` |
| `useEffect` | `React.useEffect` |
| `useCallback` | `React.useCallback` |
| `useMemo` | `React.useMemo` |
| `getField` | Safe nested accessor: `getField(obj, "a.b.c")` |
| `EditorUI` | HumanSignal UI namespace, available in the sandbox only (reference inside render only) |

Do not import packages. If an icon or helper is needed, define it inline.

## Default Component Props (`DynamicScreenProps`)

The `default` component receives a controlled editor-shell state object:

```ts
interface DynamicScreenProps {
  // ─── Read state ─────────────────────────────────────
  task: { id: number; data: Record<string, unknown> };
  regions: ScreenRegion[];
  relations: ScreenRelation[];
  selectedRegionIds: Set<string>;
  readOnly: boolean;
  interfaces: Set<string>;
  initialResults: AnnotationResult[];
  params: Record<string, unknown>;       // merged paramsSchema defaults + admin overrides

  // ─── Mutation callbacks (controlled-component model) ─
  addRegion(region: ScreenRegion): void;
  updateRegion(id: string, patch: Partial<ScreenRegion>): void;
  deleteRegion(id: string): void;
  selectRegion(id: string | null): void;
  addRelation(relation: ScreenRelation): void;
  deleteRelation(id: string): void;
  rotateRelationDirection(id: string): void;
  toggleRegionVisibility(id: string): void;
  toggleRegionLock(id: string): void;
}
```

The screen does not own `regions` or `relations`. Treat them like controlled props. Mutations must go through callbacks, then the shell re-renders with the updated state.

## Region Shape (`ScreenRegion`)

Use this base shape for generated regions:

```jsx
{
  id: "stable-id",
  type: "choices",          // "choices" | "labels" | "rectangle" | "polygonlabels" | etc.
  labels: ["Label"],
  colors: ["#4f46e5"],
  score: null,
  hidden: false,
  locked: false,
  selected: false,
  parentId: null,
  text: "Human readable summary",
  _customField: "screen-specific data"
}
```

Use underscore-prefixed keys for screen-specific data such as offsets (`_start`, `_end`), coordinates (`_x`, `_y`), notes, geometry, channel IDs, and source metadata. The shell preserves these fields.

## Optional Exports

### `paramsSchema`

JSON Schema for project-level configuration. Resolved values arrive as `props.params`.

### `outputSchema`

JSON Schema describing annotation outputs. Each property key must align with the `from_name` values emitted by `getResults`.

> [!IMPORTANT]
> **Choices Inference Rule:** If `getResults` emits `type: "choices"`, the field **must** have an inline `enum` (string fields) or `items.enum` (array fields) in `outputSchema`. A bare `$param` reference without an inline enum causes choices to be inferred as a text area, blocking submissions.

```jsx
const outputSchema = {
  type: "object",
  required: ["sentiment"],
  properties: {
    sentiment: {
      type: "string",
      enum: ["Positive", "Negative", "Neutral"], // required for choices inference
      $param: "labels",                           // links to paramsSchema.labels
    },
  },
};
```

### `getResults(regions, relations)`

Serialize controlled shell state to Label Studio annotation results on save.

> [!IMPORTANT]
> **Relations Serialization Rule:** Always accept `relations` as the second argument and serialize them back into the returned array. If relations are omitted, the editor shell falls back to an automatic serialization, but explicit serialization is highly recommended to maintain control over properties like direction and labels.

```jsx
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
```

### `parseResults(results)`

Load saved Label Studio annotation results back into shell state. Reuse result IDs when present. Always parse and return `relations` in the returned object to avoid relying on fallback mechanisms. Filter out `r.type === "relation"` when reconstructing regions.

```jsx
function parseResults(results) {
  const regions = (results || [])
    .filter((r) => r.type !== "relation" && r.from_name === "sentiment")
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
```

### `GridCell`

Compact display-only renderer for Data Manager grid cards (targets ~200x150px). No interactive inputs, checkboxes, or buttons.

### `OutlinerItem`

Renderer for each row in the regions panel. Receives `DynamicScreenProps & { region, index }`. Use it for region-specific details and list layouts.

### `InfoViewer`

Renderer for the selected region's details panel. Receives `DynamicScreenProps & { region }`. Use it to inspect or edit custom fields on the active region.

### `BottomBarExtra`

Extra controls rendered after the shell Submit/Update/Skip buttons. Receives `DynamicScreenProps & BottomBarActions`. This is the only appropriate place to render custom buttons that trigger save.

### `onBeforeUpdate(regions, change)`

Pre-mutation hook. Return `false` to reject a mutation, a modified change to alter it, or `undefined`/`void` to allow it.

## Shell Slot Mapping

| UI Pattern in Design | Export |
|---|---|
| Region list, span list, object list | `OutlinerItem` (Tiebreaker: per-region next to all regions) |
| Details/inputs for the currently selected region | `InfoViewer` (Tiebreaker: about the active selection) |
| Data Manager grid preview card | `GridCell` (Display-only, small) |
| Extra controls beside Submit/Skip | `BottomBarExtra` (e.g. error counts, custom flags) |
| Whole-task summary / task controls | render in default component canvas |

