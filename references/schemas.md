<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Input / output schemas (Core)

### Cross-schema dataField contract (REQUIRED)

`paramsSchema`, `inputSchema`, and `sample_data` form one contract for each task-data column the interface reads:

| Schema | Stores | Example for pin IDs |
|---|---|---|
| `paramsSchema` | Column **name** in `props.params.*Field` | `"pin_id"` (string path) |
| `inputSchema` | Column **value type** via `dataType` | `"number"` (CSV imports numeric IDs as ints) |
| `sample_data` | Example values matching `dataType` | `316659417561986437` |

Rules:
- **Same keys** — e.g. `idField` in both `paramsSchema` and `inputSchema` (not raw `pin_id` in one schema and `idField` in the other).
- **Same default path** — both schemas point at the same `task.data` key (e.g. `"pin_id"`).
- **Field mapping in `paramsSchema`** — use `type: "dataField"` (preferred) or legacy `type: "string"` for `*Field` remapping params. These store a column name/path, **never** a value type. Do **not** use `type: "int"`/`"number"`/`"integer"` on field-mapping params.
- **Value type in `inputSchema` only** — every `dataField` must declare explicit `dataType`: `"string"`, `"number"`, `"array"`, or `"object"`. Numeric ID columns (pin IDs, user IDs, SKUs) → `dataType: "number"`.
- **`sample_data` matches `dataType`** — strings for `"string"`, numbers for `"number"`, arrays for `"array"`.

Other `paramsSchema` properties (labels, booleans, numeric thresholds) keep their natural JSON Schema types — the rules above apply only to **field-mapping params** (`*Field`).

```js
// paramsSchema — column name remapping (stores a path, not a value type)
idField: {
  type: "dataField",
  default: "pin_id",
  description: "Task data field with the pin identifier",
},

// inputSchema — actual task-data value type (mirrors paramsSchema key)
idField: {
  type: "dataField",
  dataType: "number",
  default: "pin_id",
  description: "Pinterest pin identifier",
},
```

### inputSchema (REQUIRED)

Declares which task data fields the interface reads from. This tells the system what data shape is needed for import validation and field mapping in the Prompter. Each property uses `type: "dataField"` with a `default` path into the task data.

```js
inputSchema: {
  type: "object",
  properties: {
    textField: {
      type: "dataField",
      dataType: "string",
      default: "text",
      description: "Task data field containing the text to classify",
    },
    imageListField: {
      type: "dataField",
      dataType: "array",
      default: "images",
      description: "Array of image URLs in task.data",
    },
  },
},
```

Rules:
- Mirror the `dataField` entries from your `paramsSchema` — same keys, same defaults
- Each property represents one task data field the interface reads (e.g. text, image, audio)
- Set `dataType` to `"string"`, `"number"`, `"array"`, or `"object"` (required). Lists of URLs/options/images MUST use `dataType: "array"`. Numeric ID columns MUST use `dataType: "number"` (CSV import auto-types numeric columns as integers).
- The `default` value is the expected key in `task.data` (e.g. "text" means `task.data.text`)
- Include a `description` explaining what data this field should contain
- `sample_data` / INPUT EXAMPLE keys MUST use those `default` task paths — never alternate names like `image1` when the dataField default is `Images` or `images`
- For a single array dataField, put values in one array at the declared path (e.g. `Images: [url1, url2]`), not as separate top-level keys

### outputSchema (REQUIRED)

Declares the annotation output fields this interface produces. This is critical for the Prompter (auto-labeling with LLMs) — without it, the Prompter cannot generate predictions for this interface.

**How it works end-to-end**: The Prompter reads outputSchema to know what structured fields the LLM should return. The LLM returns a JSON object whose keys match the property names in outputSchema. The system then converts those values into Label Studio annotation results (with `from_name` = the property key). Finally, `parseResults` loads those annotations back into the UI as regions.

**Key rule**: Each property key in outputSchema must match the `from_name` used in your `getResults` and `parseResults` functions. Choose meaningful names based on what the interface annotates (e.g. "category", "severity", "explanation") — not hardcoded to any specific domain.

The schema is a JSON Schema object. Use `$param` to reference a paramsSchema key so enum values stay in sync with configurable labels.

**Required fields**: Any control marked required in the UI (textarea, choices, keypoints the user must place, etc.) MUST appear in `outputSchema.required`. Preview and submit/update validate against that list — a UI-only asterisk is not enough. Draft autosave does not block on outputSchema (partial work-in-progress is allowed).

```js
outputSchema: {
  type: "object",
  required: ["sentiment"],
  properties: {
    // Single-choice classification (from_name must match getResults/parseResults)
    sentiment: {
      type: "string",
      title: "Sentiment",
      description: "The sentiment classification",
      enum: ["Positive", "Negative", "Neutral"],
      "$param": "labels",   // at runtime, enum is replaced with names from paramsSchema.labels
    },
  },
},
```

Field type patterns:

| Annotation type | JSON Schema type | Extra fields | LLM returns |
|---|---|---|---|
| Single-choice (radio/select) | `"string"` | `enum: [...], "$param": "labels"` | `"Positive"` |
| Multi-choice (checkboxes) | `"array"` | `items: { type: "string", enum: [...], "$param": "labels" }` | `["A", "B"]` |
| Multi-select image URLs / string lists | `"array"` | `items: { type: "string" }` (no `enum` on items) | `["url1", "url2"]` |
| Free text (textarea) | `"string"` | none | `"some text"` |
| Boolean (yes/no) | `"boolean"` | none | `true` |
| Number (rating/score) | `"number"` or `"integer"` | optional `minimum`/`maximum` | `4` |
| Spatial marks / Spans | `"array"` | `items: { type: "string", enum: [...] }` | category strings only; coordinates/spans come from annotator UI |

Rules:
- Every annotation output field must have a corresponding property
- Property keys must match the `from_name` values in `getResults` and `parseResults`
- Per-region follow-up answers must NOT use an undeclared sibling `from_name` (e.g. `"followUp"`). Put them on the parent field via `items.properties.answers` (or declare a real top-level outputSchema property). Emitting undeclared `from_name`s fails preview/submit validation (FIT-1979).
- Use `$param` to link to a labels/choices param — put it directly on the field for single-choice, or on `items` for multi-choice arrays
- Always provide `enum` alongside `$param` with the default values (they get overridden at runtime)
- Include `title` and `description` for each property — these help the LLM understand what to produce

#### Conditional fields with `dependsOn`

Use `dependsOn` when a field should only be filled based on another field's value. The Prompter tells the LLM to set the field to null when the condition doesn't match.

Structure:
```js
outputSchema: {
  type: "object",
  required: ["category"],
  properties: {
    category: {
      type: "string",
      title: "Category",
      description: "Primary defect category",
      enum: ["Hardware", "Software", "None"],
      "$param": "categories",
    },
    hardware_subType: {
      type: "string",
      title: "Hardware Issue Type",
      description: "Specific hardware problem",
      enum: ["Screen", "Battery", "Button"],
      "$param": "hwLabels",
      dependsOn: {
        field: "category",
        paramKey: "hardware",
      },
    },
  },
}
```

Rules for conditional fields:
- Top-level fields go in `required` array; conditional fields MUST NOT be in `required` (they only apply when condition is met)
- Use a meaningful key name that indicates parent context (e.g. `hardware_subType` or `hardwareType`)
- `dependsOn.field` MUST reference another property key in outputSchema
- `dependsOn.paramKey` MUST match the `key` of the parent label that triggers the child; use an array for multiple triggers
- In `paramsSchema`, parent labels MUST include stable `key` properties so child controls know which parent value triggers them
- In `getResults`, return an AnnotationResult for each active conditional field that has a selected value
- In `parseResults`, ignore null/empty conditional values — do not convert them to regions

### parseResults (REQUIRED)

`parseResults` is the inverse of `getResults`: it receives an array of stored AnnotationResult objects and reconstructs UI state (`{ regions, relations }`).

Key rules:
- Handle empty or missing inputs gracefully (`results || []`)
- Extract `from_name` to match regions to output fields
- Convert result `value` objects back into UI region shapes with `id`, `type`, `labels`, `colors`
- Restore `colors` from `props.params.labels` (match by name) so custom label colors persist after submit/reload
- Separate relations (`r.type === "relation"`) from region results and reconstruct relation nodes/labels
- Return `{ regions, relations }` object

### Optional module slots

The trailing object literal returned by the module function can include optional slots:
- `default`: The main React screen component (REQUIRED)
- `paramsSchema`: UI configuration schema for settings panel
- `inputSchema`: Data import field mapping schema (REQUIRED)
- `outputSchema`: Annotation export field mapping schema (REQUIRED)
- `getResults(regions, relations)`: Converts UI regions to AnnotationResult array (REQUIRED)
- `parseResults(results)`: Converts AnnotationResult array to UI regions (REQUIRED)
