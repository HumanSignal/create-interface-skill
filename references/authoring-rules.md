# Authoring Rules

Use this reference to avoid common runtime, validation, sandbox, and layout failures.

## Compiler Rules

- JSX is supported.
- TypeScript is not supported. Strip type annotations, `as` casts, generics, and interfaces.
- ES module syntax is not supported (no `import` or `require`).
- The file is evaluated as a function body, so the trailing object literal is the export mechanism.

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

### Save-Time Validation
The editor's `validateInterface()` blocks saving the interface on:
- JSX or JavaScript compile errors (e.g. Sucrase rejects TypeScript syntax).
- Missing or non-function `default` export.
- Undefined JSX components (e.g. `<Panel />` referenced but not declared).
- **Array Output Serialization mismatch** (`getResults` must match the inferred array output kind: `pass_through` bare array, `enum_choices` choices object, or `spatial_per_region` coordinates object).
- **Spatial Region Serialization failure** (round-trip fixture check: `getResults` must map every positional `_` field like `_x`, `_y`, `_start` into the output `value` object, and `parseResults` must parse them back correctly).
- Static scan violations (e.g. encoded coordinate string hacks like `"label@x,y"` in `getResults`/`parseResults` output).

Validation warns but may allow saving on:
- Missing `getResults`, `parseResults`, `outputSchema`, or `paramsSchema`.
- `getResults` or `parseResults` crashing when executed with empty inputs.

For production interfaces, always include `paramsSchema`, `outputSchema`, `getResults`, and `parseResults` together to prevent auto-labeling (Prompter) and version reload errors.

### Runtime Schema Validation
During labeling, submit/update, and previews, `validateResultsForCustomInterface` enforces the `outputSchema` contract:
- **`outputSchema.required`**: Fields listed here must be present in results and non-empty (e.g. a required textarea field cannot have `value.text: ""`). If invalid, the shell disables the Submit/Update buttons and shows error tooltips.
- **Draft Autosave**: Draft saving is **not** gated on schema validation. Partial or incomplete drafts are always saved so users do not lose progress.
- **Preview Output**: The Interface Builder preview runs validation on `getResults()` output in real-time, showing validation banners for mismatches.

## Sandbox Rules

- Do not access the parent `document` or `window`.
- Do not assume cookies, IndexedDB, or persistent storage are available (localStorage/sessionStorage are in-memory shims that reset on iframe remount).
- Network access is governed by the host's Content Security Policy (`connect-src`).
- Relative asset paths do not resolve. Inline SVGs and styles when needed.
- Do not inject script tags.
- Use system fonts (`font-family: ui-sans-serif, system-ui, sans-serif`) unless a hosted font URL is explicitly allowed.

## `EditorUI` Rule

`EditorUI` (the `@humansignal/ui` namespace) is injected only in the sandbox runtime; it does not exist during admin-time schema extraction. Never reference it at module top-level.

Avoid:
```jsx
const { Button } = EditorUI; // Throws error at admin schema extraction
```

Prefer referencing inside render:
```jsx
const MyInterface = () => {
  const Button = EditorUI?.Button;
  return Button ? <Button>Action</Button> : <button style={{ padding: '8px 16px' }}>Action</button>;
};
```

## Region ID Stability

Never generate fresh region IDs inside render functions. Doing so triggers duplicate regions and corrupts the undo history stack. Mint IDs only inside user event handlers (e.g. clicks) or `parseResults`:

```jsx
// Good
const addPoint = (x, y, label) => {
  addRegion({
    id: `pt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    type: "keypointlabels",
    labels: [label],
    _x: x,
    _y: y,
    _hasCoords: true,
  });
};
```

## Schema Alignment

Ensure strict alignment between:
- `outputSchema.properties.<field>` keys.
- The `from_name` field of results returned by `getResults`.
- The `from_name` filtering inside `parseResults`.

If output categories are configurable through `paramsSchema`, use `$param` in `outputSchema` **and** provide an inline fallback `enum` (or `items.enum`) so the editor shell can infer the correct kind.

## Read-Only Handling

Respect `props.readOnly` on all interaction points. Disable buttons, inputs, drag-and-drop elements, and prevent keyboard shortcuts from trigger mutations (`addRegion`, `updateRegion`, `deleteRegion`) when `readOnly` is true.

## Styling and Theme Guidelines (Light & Dark Mode Support)

All interfaces must support both Light and Dark modes. The sandboxed iframe sets the `data-color-scheme="dark"` (or `"light"`) attribute on the `<html>` and `<body>` elements based on the active theme.

### Styling Rules
1. **Never hardcode light or dark background/text colors in inline styles:**
   - ❌ Avoid `style={{ background: "#fff", color: "#000" }}`. These will remain bright white/black even in dark mode, making text unreadable.
   - Use CSS custom properties (variables) defined in a `<style>` block.
2. **Define a `<style>` block with CSS variables:**
   - Override CSS custom properties when `html[data-color-scheme="dark"]` is active:
     ```css
     .my-interface-root {
       --bg-color: #ffffff;
       --text-color: #1f2937;
       --border-color: #e5e7eb;
       
       background-color: var(--bg-color);
       color: var(--text-color);
     }
     
     html[data-color-scheme="dark"] .my-interface-root {
       --bg-color: #121210;
       --text-color: #f3f4f6;
       --border-color: #374151;
     }
     ```
3. **No custom sidepanels / duplicate UI:**
   - The editor shell already has native sidebar panels for outliners and inspectors. Do not build sidebars or region listings inside the main canvas. Map them to `OutlinerItem` and `InfoViewer` exports instead.
4. **JS-based theme detection:**
   - When canvas elements or external drawing libraries need to detect the theme programmatically, use a MutationObserver hook:
     ```jsx
     function useColorScheme() {
       const detect = () => {
         if (typeof document !== "undefined") {
           const scheme = document.documentElement?.getAttribute?.("data-color-scheme") 
                       || document.body?.getAttribute?.("data-color-scheme");
           if (scheme === "dark" || scheme === "light") return scheme;
         }
         if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)")?.matches) {
           return "dark";
         }
         return "light";
       };
       const [scheme, setScheme] = React.useState(detect);
       React.useEffect(() => {
         const observer = new MutationObserver(() => setScheme(detect()));
         if (document.documentElement) {
           observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-color-scheme"] });
         }
         return () => observer.disconnect();
       }, []);
       return scheme;
     }
     ```

## Preview Sample Data Guidelines

When authoring `generate_sample_data` tests or mock fixtures:
- Keys must match every `dataField` default task path declared in `inputSchema` or `paramsSchema`, with correct types.
- For images, use only `.jpg` assets. Do not use `.mp4` or `.mp3` files in image fields.
- For video or audio fields, use `.mp4` or `.mp3` assets respectively.

## Accessibility

- Use semantic HTML buttons, inputs, and roles.
- Ensure clear visible focus states (`:focus-visible`) for keyboard navigation.
- If you use clickable divs, add `tabIndex={0}`, roles, and keyboard handlers (`onKeyDown` for Enter/Space).
- Keep text and interactive controls spaced out to prevent misclicks on touch screens.
