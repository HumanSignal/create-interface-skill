# Claude Design and React Prototype Conversion

Use this reference when converting a Claude Design bundle, React mockup, or
single-page prototype into a HumanSignal Interface.

## Target

The output is still one JSX file with a trailing object literal. Do not preserve
the prototype's app bootstrapping, package imports, external CSS files, or
host-specific postMessage hooks.

## Conversion Checklist

1. Read any chat transcript, product brief, or prototype notes first. They often
   define the real annotation output and which controls are demo-only.
2. Identify task data fields. Replace mock constants with `getField(task.data,
   "field.path")` where data varies by task.
3. Identify annotation state. Replace local prototype state with
   `props.regions` and shell mutation callbacks.
4. Convert project-level controls into `paramsSchema`.
5. Write `outputSchema`, `getResults`, and `parseResults` from the annotation
   output, not from the visual design alone.
6. Inline required styles, SVGs, and small fixtures.
7. Remove app bootstrapping and end with the Interface object literal.

## Common Mappings

| Prototype source | Interface target |
|---|---|
| `ReactDOM.createRoot(...).render(<App />)` | Delete. The shell mounts `default`. |
| `import` statements | Delete. Inline helpers/components or use injected globals. |
| TypeScript props/interfaces | Strip to plain JavaScript. |
| `window.TWEAK_DEFAULTS` or tweak panels | Convert real knobs to `paramsSchema`; delete the tweak UI. |
| Mock data arrays | Move to `task.data`, `paramsSchema`, or static constants depending on intent. |
| Local annotation state | Use `props.regions` and callbacks. |
| Relative CSS files | Inline styles or render a `<style>` tag. |
| Relative images/icons | Inline SVGs or replace with text/HTML. |
| Host `postMessage` edit-mode hooks | Delete. Label Studio does not use them. |

## React Version

Assume React 17. Avoid React 18-only APIs such as `useId` or concurrent
features. The prototype may have targeted React 18, but the interface
runtime should not depend on it.

## Region State

Prototype state often looks like this:

```jsx
const [spans, setSpans] = useState(INITIAL_SPANS);
```

Convert it to shell state:

```jsx
const spans = props.regions.filter((r) => r.type === "labels");

const addSpan = (start, end, text, label) => {
  props.addRegion({
    id: `span-${Date.now()}-${start}-${end}`,
    type: "labels",
    labels: [label],
    colors: ["#4f46e5"],
    score: null,
    hidden: false,
    locked: false,
    selected: false,
    parentId: null,
    text: `${label}: ${text}`,
    _start: start,
    _end: end,
    _text: text,
  });
};
```

## Styling

Keep styling self-contained:

```jsx
const styles = `
  .ci-root { font-family: ui-sans-serif, system-ui, sans-serif; }
  .ci-button { border: 1px solid #d1d5db; border-radius: 6px; }
`;

const App = () => (
  <div className="ci-root">
    <style>{styles}</style>
    ...
  </div>
);
```

Use unique class prefixes such as `ci-` to avoid collisions inside the iframe.

## What to Drop

- Landing-page or marketing sections.
- Demo-only controls that do not affect annotation.
- External script tags.
- Fonts unless the user provides a hosted, allowed font URL.
- Parent-window integration code.
- Build tooling, package files, and app entry files.
