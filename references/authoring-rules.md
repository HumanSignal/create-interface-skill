# Authoring Rules

Use this reference to avoid common runtime, validation, and sandbox failures.

## Compiler Rules

- JSX is supported.
- TypeScript is not supported.
- ES module syntax is not supported.
- The file is evaluated as a function body, so the trailing object literal is
  the export mechanism.

Invalid:

```jsx
import React from "react";
export default MyInterface;
```

Valid:

```jsx
const MyInterface = () => <div />;

({
  default: MyInterface,
  specVersion: 1,
})
```

## Validation Rules

Save-time validation blocks:

- JSX or JavaScript compile errors.
- Missing or non-function `default`.
- Undefined JSX components such as `<Panel />` when `Panel` is not declared.

Validation warns, but may still allow save:

- missing `getResults`,
- missing `parseResults`,
- missing `outputSchema`,
- missing `paramsSchema`,
- `getResults` or `parseResults` crashing on empty inputs.

For production interfaces, include `paramsSchema`, `outputSchema`, `getResults`,
and `parseResults` together.

## Sandbox Rules

- Do not access the parent document or parent window.
- Do not assume cookies, IndexedDB, or persistent storage are available.
- Network access is limited by the host's Content Security Policy.
- Relative asset paths usually do not resolve. Inline SVGs and styles when
  needed.
- Do not inject script tags.
- Use system fonts unless the user has a supported way to host fonts.

## `EditorUI` Rule

`EditorUI` may be available in the iframe runtime, but may not exist during
admin-time schema extraction. Never reference it at module top level.

Avoid:

```jsx
const { Button } = EditorUI;
```

Prefer:

```jsx
const MyInterface = () => {
  const Button = EditorUI?.Button;
  return Button ? <Button>Action</Button> : <button>Action</button>;
};
```

When uncertain, use plain HTML and inline styles.

## Region ID Stability

Never create region IDs inside render:

```jsx
// Bad
const regions = labels.map((label) => ({ id: crypto.randomUUID(), label }));
```

Create IDs only when handling a user action or parsing saved results:

```jsx
const addSpan = (start, end, label) => {
  addRegion({
    id: `span-${Date.now()}-${start}-${end}`,
    type: "labels",
    labels: [label],
    colors: ["#4f46e5"],
    score: null,
    hidden: false,
    locked: false,
    selected: false,
    parentId: null,
    text: `${label}: ${start}-${end}`,
    _start: start,
    _end: end,
  });
};
```

## Schema Alignment

Keep these values aligned:

- `outputSchema.properties.<key>`
- `getResults(...).from_name`
- `parseResults(...).filter((r) => r.from_name === <key>)`

If labels are configurable through `paramsSchema`, use `$param` in
`outputSchema`.

## Read-only Handling

Respect `props.readOnly` in every mutation path. Disable buttons and prevent
keyboard shortcuts or drag handlers from mutating when read-only is true.

## Styling Rules

- Use inline styles or a rendered `<style>` tag inside the component.
- Avoid large decorative layouts unless the labeling task needs them.
- Favor dense, task-focused UI over marketing-style layouts.
- Keep controls predictable: buttons for actions, segmented controls for modes,
  checkboxes/toggles for binary settings, inputs for numeric/text values.

## Accessibility

- Use semantic buttons and inputs.
- Provide visible focus states when custom styling controls.
- Do not make clickable divs unless keyboard handlers and roles are added.
- Keep text readable and avoid overlapping controls.
