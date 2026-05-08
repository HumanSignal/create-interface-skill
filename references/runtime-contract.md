# Runtime Contract

Use this reference when writing any non-trivial HumanSignal Interface.

## Module Shape

The source file is evaluated as a JavaScript function body. It must end with a
parenthesized object literal whose `default` key is a React component.

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
| `EditorUI` | HumanSignal UI namespace, available in the sandbox only |

Do not import packages. If an icon or helper is needed, define it inline.

## Default Component Props

The `default` component receives a controlled editor-shell state object:

```ts
{
  task: { id: number, data: Record<string, unknown> },
  regions: ScreenRegion[],
  relations: ScreenRelation[],
  selectedRegionIds: Set<string>,
  readOnly: boolean,
  interfaces: Set<string>,
  initialResults: AnnotationResult[],
  params: Record<string, unknown>,

  addRegion(region): void,
  updateRegion(id, patch): void,
  deleteRegion(id): void,
  selectRegion(idOrNull): void,
  addRelation(relation): void,
  deleteRelation(id): void,
  rotateRelationDirection(id): void,
  toggleRegionVisibility(id): void,
  toggleRegionLock(id): void,
}
```

The screen does not own `regions` or `relations`. Treat them like controlled
props. Mutations must go through callbacks, then the shell re-renders with the
updated state.

## Region Shape

Use this base shape for generated regions:

```jsx
{
  id: "stable-id",
  type: "choices",
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

Use underscore-prefixed keys for screen-specific data such as offsets, severity,
notes, geometry, scores, channel IDs, and source metadata. The shell preserves
these fields.

## Optional Exports

### `paramsSchema`

JSON Schema for project-level configuration. Resolved values arrive as
`props.params`.

### `outputSchema`

JSON Schema describing annotation outputs. Each property key should align with
the `from_name` values emitted by `getResults`. Use `$param` when an enum should
come from `paramsSchema`.

```jsx
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
```

### `getResults(regions, relations)`

Serialize controlled shell state to Label Studio annotation results on save.

### `parseResults(results)`

Load saved Label Studio annotation results back into shell state. Reuse result
IDs when present. Return `{ regions, relations }`.

### `GridCell`

Compact display-only renderer for Data Manager grid cards. No form controls or
buttons unless the host explicitly provides a click handler.

### `OutlinerItem`

Renderer for each row in the regions panel. Use it for per-region list UI.

### `InfoViewer`

Renderer for the selected region's details panel. Use it for per-selected-region
inspection or editing.

### `BottomBarExtra`

Extra controls rendered after the shell Submit/Update/Skip buttons. This is the
only appropriate place for extra save/skip controls.

### `onBeforeUpdate(regions, change)`

Pre-mutation hook. Return `false` to reject a mutation, a modified change to
alter it, or `undefined` to allow it.

## Shell Slot Mapping

| UI pattern | Export |
|---|---|
| Region list, span list, object list | `OutlinerItem` |
| Details for the selected region | `InfoViewer` |
| Data Manager grid preview card | `GridCell` |
| Extra controls beside Submit/Skip | `BottomBarExtra` |
| Whole-task summary | render in the default component |

Prefer shell slots over duplicating shell behavior inside the canvas.
