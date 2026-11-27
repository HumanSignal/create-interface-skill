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

## Step 1 — Resolve live authoring capabilities from Label Studio (Mandatory)

Before reading `references/` or writing `Screen.jsx`, run the bundled probe script
from the user's working directory so organization capabilities are pulled dynamically
from `<LABEL_STUDIO_URL>/api/interfaces/authoring-capabilities/` (with `/feature-flags/` fallback on
older releases, reading `LABEL_STUDIO_URL` / `LS_URL` and `LABEL_STUDIO_API_KEY` from the
environment or `.env`):

```bash
node "<dir-of-this-SKILL.md>/scripts/resolve-flags.mjs"
```

- **Follow the JSON state, Active References list, and Active Runtime Notes printed by `scripts/resolve-flags.mjs`.**
- When `interfacesComponentsEnabled: true`, read `references/components-enabled/<module>.md` for the 7 dual-variant base modules (`core-contract`, `spatial-bounding`, `schemas-spatial`, `example-classification`, `example-ner`, `example-audio`, `styling-a11y`), and read `references/components-contract.md` plus matching component modules.
- When `scenariosEnabled: true`, also read `references/scenarios.md` and author `scenarios.js`.
- When `collectionEnabled: true`, include `references/collection-upload.md` for file-submission interfaces.
- **Fail-closed default:** when `LABEL_STUDIO_URL` / `LABEL_STUDIO_API_KEY` are unset, invalid, or offline (or before `scripts/resolve-flags.mjs` runs), all capabilities default to `false` — read only the conservative `references/<module>.md` base files below and follow the Flag-OFF runtime notes.

## Mandatory read order

1. Run `node "<dir-of-this-SKILL.md>/scripts/resolve-flags.mjs"` first.
2. Read `references/core-contract.md` (or `references/components-enabled/core-contract.md` when `interfacesComponentsEnabled: true`) end-to-end.
3. Read `references/schemas.md` and `references/styling-a11y.md` (or `references/components-enabled/styling-a11y.md` when `interfacesComponentsEnabled: true`). Every interface needs schemas and must support light **and** dark mode through design-system tokens.
4. Read the domain module(s) matching the request, and the matching complete example to adapt:

| Base Reference (Flag-OFF default) | Covers |
|---|---|
| `references/core-contract.md` | Response/output format, defensive coding, pre-submit checklist, edit tools, dynamic screen module, params, accessibility basics, and task-data access. *(use `references/components-enabled/core-contract.md` when `interfacesComponentsEnabled: true`)* |
| `references/text-spans.md` | Absolute-offset text highlighting, NER/entity spans, and selection-offset helpers. |
| `references/spatial-bounding.md` | Spatial region persistence, ShellRegion shape, visibility/lock state, AnnotationResult shape, image navigation & selection tools (select, pan, zoom, fit / 100%), and ranking/ordering (legacy DIY only when Interface Components are off). *(use `references/components-enabled/spatial-bounding.md` when `interfacesComponentsEnabled: true`)* |
| `references/video-frames.md` | Seek-safe HTML5 video FPS probing and stable frame counters for timeline navigation (FIT-2803). |
| `references/schemas.md` | inputSchema, outputSchema syntax, required output fields, dependsOn, and parseResults. |
| `references/schemas-spatial.md` | Multi-select image URLs, spatial keypoint schemas, and PDF OCR / bounding box schemas. *(use `references/components-enabled/schemas-spatial.md` when `interfacesComponentsEnabled: true`)* |
| `references/example-classification.md` | A full Sentiment Analysis / Text Classification screen module example. *(use `references/components-enabled/example-classification.md` when `interfacesComponentsEnabled: true`)* |
| `references/example-ner.md` | A full Named Entity Recognition (NER) screen module example. *(use `references/components-enabled/example-ner.md` when `interfacesComponentsEnabled: true`)* |
| `references/example-audio.md` | Audio/waveform time-span regions with shell relation anchors and correct serialization (FIT-2247). *(use `references/components-enabled/example-audio.md` when `interfacesComponentsEnabled: true`)* |
| `references/example-spatial.md` | A full Image Bounding Box / Spatial screen module example. |
| `references/video-timeline.md` | Probe real fps on load via EditorDeps.video, keep frame counts monotonic, and never clip annotation frames to a 24fps fallback (FIT-2804). |
| `references/styling-a11y.md` | Theme-aware tokens, typography, spacing, components, layout, and interaction/accessibility rules. *(use `references/components-enabled/styling-a11y.md` when `interfacesComponentsEnabled: true`)* |

### Capability-gated references (use ONLY when `scripts/resolve-flags.mjs` reports the capability is `true`)

| Reference | Required Capability | Covers |
|---|---|---|
| `references/collection-upload.md` | `collectionEnabled: true` | Submission schema marker, host-brokered upload engine, submission region round-trip, declarative x-ls-validation rules, and upload UX contract. |
| `references/components-contract.md` | `interfacesComponentsEnabled: true` | Sandbox access (lazy compound members, load()/isLoaded()), canonical region model, and Label Studio result round-trip shared by every component. |
| `references/label-picker.md` | `interfacesComponentsEnabled: true` | Label palette (classic <Labels>) that drives `activeLabels` / `labelColors` of every canvas. |
| `references/choice-group.md` | `interfacesComponentsEnabled: true` | Single / multi choice classification (classic <Choices>) serialized as a `choices` result. |
| `references/taxonomy-tree.md` | `interfacesComponentsEnabled: true` | Searchable taxonomy dropdown or inline tree with virtualized rows and selection badges, serialized as classic taxonomy paths. |
| `references/text-input.md` | `interfacesComponentsEnabled: true` | Free text / transcription (classic <TextArea>), whole-task or per-region, serialized as `textarea`. |
| `references/number-input.md` | `interfacesComponentsEnabled: true` | Numeric answer (classic <Number>) serialized as a `number` result. |
| `references/datetime-input.md` | `interfacesComponentsEnabled: true` | Date / time answer (classic <DateTime>) serialized as a `datetime` result. |
| `references/rating-control.md` | `interfacesComponentsEnabled: true` | Star / Likert / numeric rating (classic <Rating>) serialized as a `rating` result. |
| `references/pairwise-ranker.md` | `interfacesComponentsEnabled: true` | Side-by-side A/B preference (classic <Pairwise>) serialized as a `pairwise` result. |
| `references/ranker-board.md` | `interfacesComponentsEnabled: true` | Drag-to-rank list and bucket sorting (classic <Ranker> / <List> + <Bucket>) serialized as `ranker`. |
| `references/answer-form.md` | `interfacesComponentsEnabled: true` | Declarative questions (task / per-region / per-item) with classic visibleWhen / whenLabelValue gates, required validation and exact LS serialization. |
| `references/region-list.md` | `interfacesComponentsEnabled: true` | The shell's Regions panel is the default region list. Add a region / segment list, inspector or search to a Screen only when the user explicitly asks — then build it with RegionList wired to the shell's selection, visibility and delete callbacks; never refuse. |
| `references/image-canvas.md` | `interfacesComponentsEnabled: true` | Image annotation canvas (classic <Image> + Rectangle/Polygon/Ellipse/KeyPoint/Brush/Bitmask/Vector labels and MagicWand) with LS-exact % geometry and cancellable worker serialization for large masks. |
| `references/video-canvas.md` | `interfacesComponentsEnabled: true` | Video object tracking and activity labeling in separate timelines with a shared playhead, time scale, and timeline zoom. |
| `references/scene3d-canvas.md` | `interfacesComponentsEnabled: true` | Extracted 3D scene tools, source workers, pane layouts and a controlled document workspace for temporal, camera, classification and review workflows; full parity acceptance remains in progress. |
| `references/audio-canvas.md` | `interfacesComponentsEnabled: true` | Interactive waveform canvas component, off-main-thread Web Worker audio decoding, and direct controlled region contract. |
| `references/time-series-canvas.md` | `interfacesComponentsEnabled: true` | Multi-channel time series with range/instant labeling (classic <TimeSeries> + <TimeSeriesLabels>). |
| `references/media-transport.md` | `interfacesComponentsEnabled: true` | Classic `sync` groups: one transport and shared playhead for VideoCanvas / AudioCanvas / TimeSeriesCanvas (+ transcripts that follow the audio) via `syncGroup`. |
| `references/text-canvas.md` | `interfacesComponentsEnabled: true` | Span labeling over plain text, HTML, or dialogue / transcript paragraphs (classic <Text>/<HyperText>/<Paragraphs> + <Labels>): resizable spans, symbol/word/sentence/paragraph granularity, virtualized long documents, transcripts synced to audio/video (syncGroup), author filter, shell-drawn relations. |
| `references/document-canvas.md` | `interfacesComponentsEnabled: true` | Multi-page PDF / page-image OCR: boxes (rotatable), polygons, PDF text-layer selection (classic OcrLabels) with text auto-fill, per-region transcription, thumbnails and custom side-by-side layouts. |
| `references/scenarios.md` | `scenariosEnabled: true` | Browser scenario module contract, tools, locators, execution, and behavioral verification. |

5. Read only the `references/reference.md` sections you need (start with
   **Schemas & sample data** whenever the UI reads `task.data`). Open
   `references/examples.md` only when reference.md sends you there.

## Conservative default runtime notes (when Flag-OFF or offline)

> When `scripts/resolve-flags.mjs` reports `interfacesComponentsEnabled: true`, the **Active Runtime Notes** printed by that script supersede the `window.InterfaceComponents` restriction below.

- **Injected globals.** Beyond the `React` / hooks / `getField` globals listed in
  `core-contract`, the sandbox injects `EditorUI` (the Screen-facing `@humansignal/ui` subset) and
  `EditorDeps` (e.g. `EditorDeps.audioDecoder.WasmStreamingDecoder`, `EditorDeps.video.probeFrameRate`).
- **Do not reference `window.InterfaceComponents`** (`AudioCanvas`, `useComponentHotkeys`) — they are
  gated behind `fflag_interfaces_components`, which is off. Build audio interfaces with
  `EditorDeps.audioDecoder.WasmStreamingDecoder` as shown in `core-contract` and `example-audio`, and
  ignore any `InterfaceComponents` recipes in `reference.md`. The one exception is the Data Collection
  surface (`window.InterfaceComponents.useCollectionSubmission`, `CollectionUploader`, `MediaCard`,
  `serializeSubmissionRegions`), which is always available: follow `collection-upload` when it applies.
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
- **Links.** `<a href="https://...">` clicks and `window.open(url)` open in a new browser tab through the host
  (https and `/` app paths only; `window.open` returns `null`). Pages that refuse framing, such as
  sign-in-protected Google Docs, cannot be shown in an `<iframe>` inside the screen; link to them instead. Google
  Docs deep-links only to headings (`#heading=h.…`) and bookmarks (`#bookmark=id.…`).
- **Sample data.** Keep `task.json` compact and use the exact `default` task-data paths from every
  `dataField` in `paramsSchema` / `inputSchema`.
- **Saving to Label Studio.** Create or update the interface **only** with
  `label-studio-sdk interface sync <dir> --title "<Title>" --publish` (new interface; add `--workspace <id>`
  when needed) or `label-studio-sdk interface sync <dir> --message "<change>"` (existing one, tracked by the
  sidecar file; that creates an unpublished draft, so add `--publish` when new projects should use it). `sync` extracts `inputSchema` / `outputSchema` / `paramsSchema` from the module and stores
  them with the code. **Never** `POST` / `PATCH` `/api/interfaces/` yourself: the server cannot read the schemas
  from the code, so a hand-built request saves an empty `output_schema` / `input_schema` without any error, and
  projects created from the interface lose their Data Manager annotation filters. After syncing, confirm
  `GET /api/interfaces/<id>/` returns a non-empty `output_schema`.
