---
name: create-interface-skill
description: >-
  Generate HumanSignal Interfaces for Label Studio Enterprise: single-file
  JSX annotation screens that run in the sandboxed editor-shell iframe. Use when
  the user asks for a labeling UI, annotation screen, Document AI
  interface, data review workflow, or conversion of a React/Claude Design mockup
  into a Label Studio interface.
---

# Create Labeling Interface

Create a HumanSignal Interface: one JSX source file whose final expression
is a parenthesized object literal with a `default` React component and optional
exports such as `getResults`, `parseResults`, `paramsSchema`, and `outputSchema`.

This is the JSX-based Interfaces runtime. Do not use the older
`<ReactCode>` XML tag format unless the user explicitly asks for ReactCode.

## Core Workflow

1. Identify the task data fields, annotation outputs, labels/classes, and any
   project-level settings.
2. Design the screen as a controlled React component using the runtime props.
   Read task data from `props.task.data`; read annotation state from
   `props.regions` and `props.relations`; mutate through callbacks such as
   `addRegion`, `updateRegion`, and `deleteRegion`.
3. Write `paramsSchema` for configurable project settings.
4. Write `outputSchema` for the annotation contract. This is required for
   auto-labeling/prompter integration.
5. Write `getResults` and `parseResults` together so saved annotations round
   trip cleanly.
6. End the file with the required parenthesized object literal.
7. Validate the interface. If `label-studio-sdk` is available on `PATH`, run
   `label-studio-sdk interface validate .` from the local interface directory,
   or pass the `.jsx` file directly. If the SDK CLI is unavailable, fall back to
   the static checks in `references/authoring-rules.md`.

## Hard Rules

- Produce one `.jsx` source file. Do not create a package, build config, or app.
- Do not use `import`, `require`, or `export`. The source is evaluated as a
  function body, not as an ES module.
- Do not use TypeScript syntax. Strip type annotations, interfaces, generics,
  and `as` casts.
- The last expression in the file must be a parenthesized object literal:

```jsx
({
  default: MyInterface,
  specVersion: 1,
  paramsSchema,
  outputSchema,
  getResults,
  parseResults,
})
```

- Do not render a primary Submit/Update button in the canvas. The shell owns
  submission. Use `BottomBarExtra` only when extra bottom-bar actions are
  needed.
- Do not generate new region IDs during render. Reuse existing region IDs and
  mint IDs only inside user event handlers or `parseResults`.
- Do not rely on persistent `localStorage` or `sessionStorage`. The sandbox may
  reset them on iframe remount.
- Reference `EditorUI` only inside component render functions. Admin-time schema
  extraction may not inject it.

## Runtime Contract

Read `references/runtime-contract.md` before writing a non-trivial interface.
It covers available globals, default component props, region shapes, and optional
exports.

Use these references as needed:

- `references/authoring-rules.md`: validation, sandbox limits, schema alignment,
  and common breakages.
- `references/runtime-contract.md`: `DynamicScreenProps`, regions, relations,
  and shell slots.
- `references/text-spans.md`: text span/NER offset rules, highlight rendering,
  and selection offset helpers.
- `references/examples.md`: complete text classification example and reusable
  serialization patterns.
- `references/claude-design-conversion.md`: convert Claude Design or React
  prototypes into the single-file Interface format.

## Local Validation

Prefer the SDK CLI when the user has it installed. Do not assume the user has a
`label-studio-sdk` source checkout or this skill repo locally; assume only that
the `label-studio-sdk` command may be available.

From a local interface directory:

```bash
label-studio-sdk interface validate .
```

Or for a single JSX file:

```bash
label-studio-sdk interface validate ./Screen.jsx
```

If the interface includes browser interaction scenarios, run them too:

```bash
label-studio-sdk interface validate . --scenario scenarios.js
```

Use JSON output when another tool or agent needs to parse the result:

```bash
label-studio-sdk interface validate . --json
```

If validation passes and the user wants a visual check, use preview from the
same interface directory:

```bash
label-studio-sdk interface preview .
```

If the SDK CLI is not installed, do not block. Perform static checks: plain JSX
only, no `import`/`require`/`export`, no TypeScript syntax, a trailing
parenthesized object literal with `default`, stable region IDs, and aligned
`paramsSchema`/`outputSchema`/`getResults`/`parseResults`.

## Output Expectations

For simple requests, return the complete `.jsx` file and a short note naming the
task data fields and annotation outputs it expects.

For implementation inside a repo, create or update a single `.jsx` file unless
the user asks for tests, sample data, or SDK workflow files. Keep generated code
self-contained and pasteable into the Interfaces editor.

For complex requests, include:

- the interface source file,
- sample task data if the user did not provide any,
- notes on `paramsSchema` defaults,
- notes on the annotation result shape emitted by `getResults`.

## Quick Skeleton

```jsx
const MyInterface = (props) => {
  const { task, regions, params, addRegion, updateRegion, deleteRegion, readOnly } = props;
  const text = getField(task.data, params?.textField ?? "text") ?? "";

  return (
    <div style={{ padding: 24 }}>
      <pre style={{ whiteSpace: "pre-wrap" }}>{String(text)}</pre>
    </div>
  );
};

const paramsSchema = {
  type: "object",
  properties: {
    textField: {
      type: "string",
      title: "Text field",
      default: "text",
    },
  },
};

const outputSchema = {
  type: "object",
  properties: {},
};

function getResults(regions, relations) {
  return [];
}

function parseResults(results) {
  return { regions: [], relations: [] };
}

({
  default: MyInterface,
  specVersion: 1,
  paramsSchema,
  outputSchema,
  getResults,
  parseResults,
})
```
