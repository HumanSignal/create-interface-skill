---
name: create-interface-skill
description: >-
  Generate HumanSignal Interfaces for Label Studio Enterprise: single-file
  JSX annotation screens that run in the sandboxed editor-shell iframe. Use when
  the user asks for a labeling UI, annotation screen, Document AI
  interface, data review workflow, or conversion of a React/Claude Design mockup
  into a Label Studio interface.
---
<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Create Labeling Interface

Create a HumanSignal Interface: one JSX source file (`Screen.jsx`) whose final
expression is a parenthesized object literal with a `default` React component
and optional exports such as `getResults`, `parseResults`, `paramsSchema`,
`outputSchema`, and `hotkeys`.

This is the JSX-based Interfaces runtime. Do not use the older `<ReactCode>`
XML tag format unless the user explicitly asks for ReactCode.

## Source of truth

The files under `references/` are rendered from the **same modules** the
in-app "Create with Agent" assistant sends to its model. They are authoritative.
Follow their module contract, schema rules, pre-submit checklist, region
contract, and styling/accessibility requirements exactly.

## Mandatory read order

1. Read `references/core-contract.md` end-to-end. It is the base contract for
   every interface, including the pre-submit checklist.
2. Read `references/schemas.md` and `references/styling-a11y.md`. Every
   interface needs schemas and must support light **and** dark mode through
   design-system tokens.
3. Read the domain module(s) matching the request, and the matching complete
   example to adapt:

| Reference | Covers |
|---|---|
| `references/core-contract.md` | Response/output format, defensive coding, pre-submit checklist, edit tools, dynamic screen module, params, accessibility basics, and task-data access. |
| `references/text-spans.md` | Absolute-offset text highlighting, NER/entity spans, and selection-offset helpers. |
| `references/spatial-bounding.md` | Spatial region persistence, ShellRegion shape, visibility/lock state, AnnotationResult shape, image navigation & selection tools (select, pan, zoom, fit / 100%), and ranking/ordering (legacy DIY only when Interface Components are off). |
| `references/video-frames.md` | Seek-safe HTML5 video FPS probing and stable frame counters for timeline navigation (FIT-2803). |
| `references/schemas.md` | inputSchema, outputSchema syntax, required output fields, dependsOn, and parseResults. |
| `references/schemas-spatial.md` | Multi-select image URLs, spatial keypoint schemas, and PDF OCR / bounding box schemas. |
| `references/example-classification.md` | A full Sentiment Analysis / Text Classification screen module example. |
| `references/example-ner.md` | A full Named Entity Recognition (NER) screen module example. |
| `references/example-audio.md` | Audio/waveform time-span regions with shell relation anchors and correct serialization (FIT-2247). |
| `references/example-spatial.md` | A full Image Bounding Box / Spatial screen module example. |
| `references/video-timeline.md` | Probe real fps on load via EditorDeps.video, keep frame counts monotonic, and never clip annotation frames to a 24fps fallback (FIT-2804). |
| `references/styling-a11y.md` | Theme-aware tokens, typography, spacing, components, layout, and interaction/accessibility rules. |

4. Read only the `references/reference.md` sections you need (start with
   **Schemas & sample data** whenever the UI reads `task.data`). Open
   `references/examples.md` only when reference.md sends you there.

## Runtime notes for local authoring

- **Injected globals.** Beyond the `React` / hooks / `getField` globals listed in
  `core-contract`, the sandbox injects `EditorUI` (the `@humansignal/ui` namespace) and
  `EditorDeps` (e.g. `EditorDeps.audioDecoder.WasmStreamingDecoder`, `EditorDeps.video.probeFrameRate`).
- **Do not reference `window.InterfaceComponents`** (`AudioCanvas`, `useComponentHotkeys`) — they are
  gated behind `fflag_interfaces_components`, which is off. Build audio interfaces with
  `EditorDeps.audioDecoder.WasmStreamingDecoder` as shown in `core-contract` and `example-audio`, and
  ignore any `InterfaceComponents` recipes in `reference.md`.
- **`EditorUI` two-path trap.** `EditorUI` is injected only inside the runtime iframe, **not** in the
  admin-time eval that extracts `paramsSchema`. A top-level `EditorUI` reference throws
  `EditorUI is not defined` and silently breaks `paramsSchema` in Labeling Settings. Reference it inside
  render only, or omit it and use inline styles with design tokens.
- **Shell-owned behavior.** The labeling shell owns Submit/Update, undo/redo/reset, the Regions/Info/Relations
  panels, region visibility, and comments. Drive them through the props and callbacks in `core-contract` and
  `spatial-bounding` (`addRegion`, `updateRegion`, `deleteRegion`, `selectRegion`, `selectedRegionIds`,
  hidden/locked state). Do not re-implement them in the screen: a custom Delete button, local-only region state,
  or ignoring hidden state breaks the shell's panels and history.
- **Compiler extraction.** The compiler turns the last parenthesized object literal into the module export. If the
  file does not end with a bare `({ default: ... })`, the editor rejects it with
  *"Module missing 'default' function export."*
- **No persistent storage.** `localStorage` / `sessionStorage` are in-memory shims that reset on every iframe
  remount; persist only through the mutation callbacks and annotation results.
- **Sample data.** Keep `task.json` compact and use the exact `default` task-data paths from every
  `dataField` in `paramsSchema` / `inputSchema`.
