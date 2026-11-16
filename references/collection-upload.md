<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Data Collection file submission

## Data Collection interfaces (file submission)

A Data Collection interface asks the contributor to upload files (video, image, PDF…) as the task's deliverable. A submission is ALWAYS an ordered collection of 1..max_files stored files - "single file" is simply a collection whose bounds are 1..1, never a different design. These interfaces are only functional on Data Collection projects, and their power comes from ONE schema marker - get it wrong and the interface looks right but silently cannot upload.

### 1. The load-bearing schema marker (CRITICAL)

The output schema MUST declare a submission property carrying `"x-ls-region": "submission"`:

```js
outputSchema: {
  type: "object",
  required: ["submission"],
  properties: {
    submission: {
      type: "array",
      title: "Uploaded submission",
      "x-ls-region": "submission",
      "x-ls-validation": { types: ["video/mp4", "video/quicktime"] },
      items: { type: "object", additionalProperties: true },
    },
  },
},
```

The platform grants upload powers — the brokered upload RPC and network access to the storage bucket — ONLY to interfaces whose schema declares this marker. It also drives the project-creation picker and the server's signed upload policy. An upload UI without the marker is dead on arrival; never omit it, and never remove it when editing an existing interface unless the user explicitly asks to remove upload capability.

### 2. The lifecycle is PLATFORM CODE - call the hook, never re-implement it

The entire submission lifecycle - pick, validate, upload, attach, draft recovery, replace-in-place, remove, submitted detection, previews, capacity - ships as `window.InterfaceComponents.useCollectionSubmission`. Generated code calls it and renders its output; it NEVER re-implements any part of it. Hand-rolled lifecycle code has shipped real bugs (remount loops, duplicated members, resurrected history files, phantom cards) that the hook makes impossible:

```js
const RULES = { types: ["video/mp4"], min_files: 1, max_files: 3 }; // authored fallback + project seed

function CollectionScreen(props) {
  const c = window.InterfaceComponents.useCollectionSubmission({
    deps: typeof EditorDeps !== "undefined" ? EditorDeps : null, // upload engine access
    props,                                                       // regions, schema, capabilities…
    fallbackRules: RULES,
    validateFile: typeof validateFile === "function" ? validateFile : undefined,
  });
  // c.rules / c.accept          live x-ls-validation (props.outputSchema, RULES as fallback)
  // c.bounds / c.capacity       { min, max } / { count, free, full, over, shortfall }
  // c.members                   ordered cards: state, file, kind (video|image|audio|pdf|file), previewUrl,
  //                             progress, message, ruleResults, meta (+ meta.verified / meta.facts / meta.flags /
  //                             meta.modifiedSignals once the server has read the stored bytes)
  //                             + onReplace/onRemove/onRetry/onCancel…
  // c.rejected                  rejected picks (render as rejected cards)
  // c.pick(files)               validate → upload → attach
  // c.replaceInput              spread onto ONE hidden replace <input> (see §5)
  // c.collection                { progress, uploadingCount, submitted, readonly }
  // c.error                     collection-level error message (or null)
}
```

The hook reads the LIVE rules from `props.outputSchema` (the same declaration the server signs upload policies from) and falls back to the authored constant - so per-project settings edits apply without re-authoring the interface. Do not duplicate that derivation. When uploads are unavailable in a view (reviewers, read-only embeds), the hook degrades gracefully via `c.error` and `c.collection.readonly` - never a blank screen and never a bare try/catch around your own engine wiring.

### 3. The submission round-trip (regions)

One region per stored FILE, owned end-to-end by the hook - you only serialize:

```js
function getResults(regions) {
  return window.InterfaceComponents.serializeSubmissionRegions(regions); // one result per file, indexes normalized
}
function parseResults(results) {
  const regions = [];
  (results || []).forEach((r, i) => {
    if (r && r.from_name === "submission" && r.value) {
      regions.push({ id: r.id || "submission-" + i, type: "submission", _submission: { ...r.value } });
    }
  });
  return { regions, relations: [] };
}
```

Never gate `getResults` on custom discriminators, rename `_submission`, or emit a type other than "submission" - that breaks round-trip and review. Never sign URLs yourself or hot-link the bucket: the hook resolves each region's own stored file through `props.fileResolverTemplate` (its single placeholder is `{fileuri}`; there is no `{bucket}` or `{key}`), so history versions always play the file they actually reference.

### 4. Validation is DATA, never code (x-ls-validation)

File rules live in the `"x-ls-validation"` block on the submission property — the platform enforces and renders them; generated code must NOT implement rule logic:

- Vocabulary: `types` (MIME allowlist), `min_bytes`/`max_bytes`, `min_duration`/`max_duration` (seconds), `orientation` ("portrait"|"landscape"), `min_resolution`/`max_resolution` (shorter side px), `min_files`/`max_files` (collection bounds), and three rules the server reads from the stored file after upload: `min_fps`/`max_fps` (frames per second), `require_capture_metadata` (camera make, model or software present) and `gps_required` (GPS tags present, never coordinates). Those three show as neutral badges until the upload completes, then settle; they never block a pick.
- `types` MUST be a subset of the platform-supported set: `video/mp4`, `video/quicktime`, `image/png`, `image/jpeg`, `image/webp`, `application/pdf`, plus the audio types `audio/mp4`, `audio/x-m4a`, `audio/mpeg`, `audio/ogg`, `audio/wav` where the deployment inspects uploads (the project settings type list shows exactly what the server accepts). Anything else (e.g. `video/webm`) is silently dropped by the server, so the picker would offer files the upload then rejects.
- The server enforces `types` and BOTH size bounds (`min_bytes`/`max_bytes`) in the signed upload policy from this same declaration; rules can only NARROW the platform limits, never widen them. A size floor ("bigger than 5MB") is `min_bytes` — declarative and bucket-enforced, NOT a custom validateFile check.
- Platform ceilings (deployment defaults): allowed types are those listed above, and maximum file size is 10 GB. A declaration beyond a ceiling does not widen anything — the server silently clamps it. So when the user asks beyond a ceiling (e.g. "max 12 GB"), NEVER declare it as if it worked: tell them the platform maximum, declare the ceiling value at most, and note that raising the ceiling is a deployment setting, not an interface rule. Always mention the relevant ceiling when asking clarifying questions about a bounded rule ("up to the platform maximum of 10 GB").
- The hook evaluates rules and feeds per-file `ruleResults` to the cards; the dropzone shows the declared rules as neutral badges. "unknown" is honest (e.g. duration of a PDF) - never treat it as failure.

For a rule outside the vocabulary, define a module-level `validateFile(file, meta)` returning extra `{ key, label, status }` results and pass it to the hook. It MUST be fail-open: a thrown error warns and never blocks an upload. A custom check can decide ONLY on the facts in `meta`: `contentType`, `size`, `durationSec`, `width`, `height` - and `size` can be undefined (iOS reports 0 for fresh camera captures; unknown, never a failure). Never read or parse the file's bytes - that is slow, fragile, and the server's job: when an upload completes, the server reads the stored bytes and hands the facts back on the member (`meta.verified` true, dimensions/duration from the file itself, and `meta.facts` such as frame rate, capture device and GPS presence), which the card shows automatically. The same read scans for active content - a ZIP, PDF, markup or executable hidden in the file, PDF JavaScript, launch actions, embedded files - and hands reviewers the findings as `meta.flags`; the card renders them as a Flagged chip with the reasons. For photos and videos it also looks for signs the file is not an original capture (processed by a video tool, saved by an editing app, downloaded from a video or social platform, no camera metadata) and, when it suspects one, hands reviewers the signals as `meta.modifiedSignals`; the card renders them as a Possibly modified chip. Findings are advisory and never reject an upload, and the uploader never sees them. If a requested rule cannot be decided from those five facts, check the vocabulary first: frame rate, device info and GPS presence are declarative rules the server settles after upload (`min_fps`/`max_fps`, `require_capture_metadata`, `gps_required`), not custom checks. For anything else, do NOT write a check for it: tell the user it is not in the rule vocabulary yet, that the fact is shown on the card for reviewers, and that review covers it until then.

When the user asks what can be validated, requests a rule the platform cannot check yet, or when you present a plan that includes validation, show the menu in three buckets so they can discover what exists:
1. **Enforced by storage** (cannot be bypassed): file type, minimum and maximum size.
2. **Checked in the browser before upload** (instant feedback; review is the backstop): duration, orientation, resolution.
3. **Not yet available — planned server-side inspection**: anything needing the file's bytes (frame rate, codec, capture device, authenticity, embedded-content scanning). Offer these as "parked, coming with server-side inspection", never as custom checks.

Every plan that declares validation rules ends with one line naming any requested rule that was parked and why.

**Declare ONLY the rules the user asked for.** A request for "longer than 3 seconds" means `min_duration: 3` and nothing else — do not invent a `max_duration`, a resolution bound, or any other limit the user never mentioned. Missing bounds are not gaps to fill; they are deliberate.

### 5. UX contract - render the hook's output into the platform components

The submission UI is EXACTLY two platform components fed from the hook - compose them, never rebuild them:

```js
<input {...c.replaceInput} aria-label="Replace this file" />
<window.InterfaceComponents.CollectionUploader
  rows={[]} onPick={c.pick} accept={c.accept} rules={c.rules}
  minFiles={c.bounds.min} maxFiles={c.bounds.max}
  fileCount={c.capacity.count} storedCount={stored} bundleProgress={c.collection.progress}
  uploadingCount={c.collection.uploadingCount} submitted={c.collection.submitted}
  disabled={c.collection.readonly} hint={hint}
>
  {c.members.map((m) => (
    <window.InterfaceComponents.MediaCard key={m.key} state={m.state} file={m.file} kind={m.kind} pdf={m.pdf}
      previewUrl={m.previewUrl} previewBroken={m.previewBroken} progress={m.progress}
      message={m.message} ruleResults={m.ruleResults} meta={m.meta} storedHint={m.storedHint} duplicate={m.duplicate}
      onReplace={m.onReplace} onRemove={m.onRemove} onRetry={m.onRetry} onCancel={m.onCancel}
      onRetryPreview={m.onRetryPreview} onMediaMetadata={m.onMediaMetadata} onPreviewError={m.onPreviewError} />
  ))}
  {c.rejected.map((r) => (
    <window.InterfaceComponents.MediaCard key={r.key} state="rejected" file={r.file} kind={r.kind}
      previewUrl={r.previewUrl} ruleResults={r.ruleResults} meta={r.meta}
      message={r.message} onRemove={r.onRemove} />
  ))}
</window.InterfaceComponents.CollectionUploader>
{c.error && <EditorUI.Message variant="negative">{c.error}</EditorUI.Message>}
```

1. `window.InterfaceComponents.CollectionUploader` owns the whole surface at EVERY bound: the full dropzone while empty, the count header + card grid + slim add-strip for bundles, the over-pick banner, and the picker itself. `onPick(files: File[])` receives the picked files - do NOT render your own `<input type=file>` for picking (the ONE allowed input is `<input {...c.replaceInput} aria-label="Replace this file" />` for per-card Replace, wired entirely by the hook - keep the literal `aria-label` even though the spread already carries it: the accessibility validator reads source text and cannot see through a spread) and do NOT call `.click()` from `onPick` (programmatic picker opens outside a user gesture are blocked on iOS).
2. `window.InterfaceComponents.MediaCard` owns each member's card: status chip, preview with poster/play and progress (`playsInline` handled), rule badges + metadata row, the single message block, and the state-appropriate actions (Cancel while uploading; Retry/Remove on failure; Replace/Remove when uploaded; Replace only when submitted; nothing when read-only). Map the member's fields onto it 1:1 as above.

Card keys come from the hook (`m.key`) and are stable identity - NEVER derive a `key` from changing state. A key that includes a version counter, metadata, or progress makes React UNMOUNT and REMOUNT the card on every media-metadata event: the fresh `<video>` fires `loadedmetadata` again, the state bumps again, and the cycle loops forever - the browser exhausts its media-player budget (previews go blank and "blink") and the sandboxed iframe crashes on iOS.

Inline `style` is for LAYOUT ONLY (flex, gaps, margins, sizing, typography). Every colored surface - pills, chips, badges, banners, alerts, status indicators - MUST be a platform component (`window.InterfaceComponents.SubmissionStatusChip`, `window.InterfaceComponents.SubmissionRuleBadges`, `EditorUI.Message`); a `<div>` with `borderRadius` + a background color is a hand-rolled badge and is forbidden. Writing your own badge chips, status pills, banners, dropzone, cards, or rule-checking logic duplicates the platform and drifts from its semantics.

**Message placement rule**: feedback about a FILE (rejection, failure, retry) renders on that file's card - the hook already routes it there; banners above the grid are COLLECTION-level only (capacity, engine errors - `c.error`) and never contain a file name. When `c.capacity.over` (the project lowered `max_files` below the stored count), show one warning `EditorUI.Message` telling the contributor to remove the extras; the hook re-enables Remove on the extras for exactly this case.

**The root container uses tight, fluid outer padding** — `padding: "clamp(8px, 3vw, 24px)"` like the shipped template — so phone screens keep their width for the cards instead of fixed 24px gutters.

**The task prompt is ALWAYS the first block** of the interface - rendered from the `promptField` dataField before anything else (questions, dropzone, cards). It is not optional and never a clarifying question.

- Make the whole interface surface accept drops (call `c.pick` from the drop handler) and light the dropzone while dragging anywhere over it.
- Do NOT raise clarifying questions about previews, badges, metadata, or card behavior - these defaults are settled platform behavior the hook and components already implement.

**Clarifying questions - whitelist, not judgment.** For collection interfaces you may ask about ONLY: missing validation-rule VALUES (types, size bounds, duration bounds, orientation, resolution), the FILE COUNT (mandatory - one file or several, and the exact `min_files`/`max_files` bounds; never guess it), and which question fields (dropdowns, checkboxes) the user wants. NOTHING else is ever a question - composition, presentation, layout, previews, badges, metadata, prompt display, card behavior are all settled platform defaults; apply them silently. If you have no whitelisted question, ask none.

### 6. Submit gating — the schema does it; do not add eager error messages

The submission property is `required` in the output schema, so the shell already refuses to submit without a stored file, and the server enforces the declared `min_files`/`max_files` bounds at submit. Do NOT implement `getValidationErrors` / `onValidationChange` returning "upload a file first"-style messages: they render before the contributor has done anything (an empty dropzone IS the affordance). A quiet hint line under the dropzone driven by `c.capacity.shortfall` is the most you add. Use the validation hooks ONLY for conditions the schema cannot express (e.g. an answered question that contradicts the uploaded file).

### 7. File count per task (collection bounds)

How many files a task holds is DECLARED, never coded: `min_files`/`max_files` in `x-ls-validation`, enforced server-side and clamped to the platform ceiling. Undeclared means exactly ONE file per task per contributor - a collection of one, same screen, same hook, same components.

**The file count is a MANDATORY clarifying question.** Never guess it: ask whether the task takes one file or several, and for several, the exact bounds ("exactly 8", "3 to 8"). A single file needs no declaration; several files declare both keys (`min_files` alone degrades to single-file server-side).

There is NO separate single-file or multi-file design: the hook and `CollectionUploader` adapt to the declared bounds (plain dropzone + one full-width card at 1..1; count header, grid and add-strip beyond). Do NOT build slot counters, accumulating lists, mode branches, or your own multi-card UI.

### 8. Task data convention

Collection task files carry the instruction text in a field named `prompt`. Declare the dataField as `promptField` with `default: "prompt"` so projects import tasks without manual remapping. In UI copy call it the "prompt" or the "task" — NEVER "brief" (banned product terminology).

### Anti-patterns (each has broken real interfaces)

- fetch()/XHR to upload or to presign - sandbox-blocked; only the platform engine (inside the hook) uploads.
- Re-implementing the lifecycle instead of calling `window.InterfaceComponents.useCollectionSubmission` - hand-rolled attach/recovery/replace/remove code has shipped remount loops, duplicated members, resurrected history files and phantom cards; the hook exists so those cannot be written.
- Validation logic in code (type/size/duration if-statements) - rules are data; the declaration and the platform evaluator are the only sources.
- Gating `getResults` on custom discriminators, renaming `_submission`, or emitting a type other than "submission" — breaks round-trip and review.
- Removing or renaming the `x-ls-region` marker during an edit "cleanup" — the upload capability vanishes silently.
- Hand-rolled badge chips / status pills / banners / dropzones / cards / rule evaluators when `window.InterfaceComponents.CollectionUploader`, `window.InterfaceComponents.MediaCard`, `window.InterfaceComponents.SubmissionRuleBadges`, `window.InterfaceComponents.SubmissionStatusChip` and `EditorUI.Message` exist for exactly that.
- Card keys derived from changing state (version counters, metadata, progress) - infinite remount loop, media-player exhaustion, iOS iframe crash.
- `getValidationErrors` returning "upload a file first" - eager noise that duplicates the schema's required-field gating.
- A dataField named anything but `promptField`/`prompt` for the instruction text (e.g. "brief") — tasks then fail import validation until someone remaps the project.
- Writing anything back into `task.data`.
