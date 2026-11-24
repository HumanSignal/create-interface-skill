<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Design system, styling & a11y

## Design System

Screens run inside a sandboxed iframe. The Label Studio design-system tokens (CSS variables) and the
`@humansignal/ui` primitives (exposed as the `EditorUI` global) are available there. **Tailwind utility classes
are NOT** — `className="flex gap-2 bg-neutral-surface"` does nothing in the sandbox. Style with inline
`style={{ ... }}` objects that reference tokens, or a small `<style>` block scoped to your own class names.

### Key Rules
- **Tokens only, never colour literals** — no hex (`#fff`, `#2563eb`), no `rgb()`/`rgba()`, no named colours (`white`, `gray`) for surfaces, panels, borders, text, hints or icons. Use `var(--color-…)` so the screen adapts to Light and Dark mode. Do not add hex fallbacks inside `var()`.
- **Chrome comes from `EditorUI`** — titles, instructions, hints and empty states use `EditorUI.Typography`; incidental actions use `EditorUI.Button`; status pills use `EditorUI.Badge`; dropdowns use `EditorUI.Select`; icons use `EditorUI.Icons`. Raw `<h1>–<h6>`, `<p>`, `<span>`, `<button>`, `<select>` or `<svg>` for product copy, actions, pickers and icons is a defect.
- **Icons are Phosphor via `EditorUI.Icons`** — `<EditorUI.Icons.Star size={16} />` (any Phosphor name, with or without the `Icon` suffix; `weight="fill"` for selected/active, `"bold"` only at 16px or below, `"regular"` otherwise). Never inline `<svg>` icons, Unicode glyphs (▶ ✕ ⚙ ★) or emoji as icons. Icon-only buttons still need `aria-label`.
- **Pickers: `EditorUI.SegmentedControl` (segmented control) for up to 3 short, non-verbose options** such as view / mode / granularity / page-mode switches (an icon-only option passes `tooltip`, which is also its accessible name); **`EditorUI.Select` for 4+ options** or whenever option labels are long. Never a native `<select>`. Both are also reachable as `InterfaceComponents.SegmentedControl` / `InterfaceComponents.Select` (the same components).
- **Labeling controls are not chrome** — when Interface Components modules are in this prompt, collect annotation values with `ChoiceGroup`, `RatingControl`, `NumberInput`, `TextInput`, etc. Do not use `EditorUI.Button` rows or raw `<input>`/`<textarea>` to reinvent those controls.
- **Never destructure `EditorUI`** — reference `EditorUI.Typography`, `EditorUI.Button` at the point of use. `const { Button } = EditorUI` at module top level throws in the admin-time eval that extracts `paramsSchema` and silently breaks Labeling Settings.
- **One control size per row** — every `EditorUI` control takes the same `size`: `"medium"` (40px, the default), `"small"` (32px) or `"smaller"` (24px). Controls in the same row all pass the same one. A screen's controls are `"smaller"`; a row that needs larger fields passes `"small"` on every control in it, buttons included. Never set a height on a control with `style` or CSS; the height comes from `size`.
- **At most one primary button** — Submit/Update belong to the editor shell; never add one. In-screen actions are `variant="neutral" look="outlined" size="smaller"`; use `variant="primary" look="filled"` for at most one dominant in-screen action.
- **Dialogs come from `EditorUI`, never the browser and never by hand** — the sandbox blocks `window.confirm`, `alert` and `prompt` (they return `false` / `null` and show nothing). Ask with `<EditorUI.ConfirmDialog open={…} onOpenChange={setOpen} title="Clear all regions?" okText="Clear all" buttonLook="negative" onOk={…}>` (keep `open` in state; `buttonLook="negative"` for destructive actions), tell with `EditorUI.InfoDialog`, and use `EditorUI.ModalWindow` (`placement="center"`) with a `footer` for a small form. Never build a modal yourself (a full-cover backdrop plus a panel, or `aria-modal`): the DS dialog draws the scrim, focus and Escape.
- **Data colours stay data** — label/region/choice colours from params or task data pass through untouched. A hex literal is only acceptable as a default label colour in `paramsSchema` defaults, never for chrome.
- **Fill the canvas** — expand to the available space; don't float in the centre.
- **Don't recreate editor chrome** — no submit buttons, no navigation, no sidebars duplicating LS panels.
- **No redundant status text** — never render "Selected: X"; the selected state must be obvious from the control itself.
- **Minimal shadows** (floating elements only); **monospace** (`var(--font-family-mono)`) for timestamps, coordinates, ids; **DOM-based hover** via onMouseEnter/onMouseLeave, not useState.

### Tokens — use only these

| Purpose | Token |
|---|---|
| Canvas / app background | `--color-neutral-background` |
| Card / panel / toolbar surface | `--color-neutral-surface` · hover `--color-neutral-surface-hover` · active `--color-neutral-surface-active` · recessed `--color-neutral-surface-inset` |
| Border / divider / input border | `--color-neutral-border` · bold `--color-neutral-border-bold` |
| Text | primary `--color-neutral-content` · secondary `--color-neutral-content-subtle` · muted/placeholder `--color-neutral-content-subtlest` · icons `--color-neutral-icon` |
| Primary action / selected | `--color-primary-surface` + `--color-primary-surface-content` · subtle fill `--color-primary-background` · text `--color-primary-content` · border `--color-primary-border` / `--color-primary-border-bold` · focus `--color-primary-focus-outline` |
| Danger / warning / success | `--color-negative-content` · `--color-negative-border` · `--color-negative-background` (same triplet for `warning` and `positive`) |
| Radius | `--corner-radius-small` · `--corner-radius-smaller` |
| Spacing | `--spacing-tightest` · `--spacing-tighter` · `--spacing-tight` · `--spacing-base` · `--spacing-wide` |
| Font | `--font-family-base` · `--font-family-mono` · sizes `--font-size-body-small`, `--font-size-body-smaller`, `--font-size-label-small`, `--font-size-label-smaller` · weights `--font-weight-medium`, `--font-weight-semibold` |

### Primitives
- `EditorUI.Typography` — section titles `variant="title" size="small"`; instructions and body copy `variant="body" size="small"`; hints and captions `variant="body" size="smaller"` or `variant="label" size="smaller"`. Pass `as="h3"` / `as="span"` to control the tag; `id`, `role` and `aria-*` pass through. Set `style={{ margin: 0 }}` unless you want the default margin.
- `EditorUI.Button` — `type="button" variant="neutral" look="outlined" size="smaller"` for text actions; icon-only toolbar buttons are `variant="neutral" look="ghost" size="smaller"` with `aria-label` and a 16px `EditorUI.Icons` child, `aria-pressed` for the active tool. Always pass an explicit `variant`; `disabled`, `aria-*` and `data-testid` pass through.
- `EditorUI.Badge` for status pills; `EditorUI.Select` (`options={[{ value, label }]}`, `value`, `onChange={(value) => ...}`, `size="smaller"`, `triggerProps={{ "aria-label": "..." }}`) for dropdowns of 4+ options; `EditorUI.SegmentedControl` (`options={[{ value, label }]}` with string values, `selectedOption` — not `value` —, `onChange={(value) => ...}`, `aria-label`, `size="smaller"`) for up to 3 short options; it has no `disabled` prop, so wrap it in `<fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>` when it must be read-only.
- `EditorUI.Icons.<Name>` — Phosphor icons, loaded on first render; `size`, `weight`, `color` (defaults to `currentColor`), `alt`, `mirrored`.

```jsx
<section
  aria-label="Annotation controls"
  style={{
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "var(--spacing-tight) var(--spacing-base)",
    padding: "var(--spacing-tight) var(--spacing-base)",
    background: "var(--color-neutral-surface)",
    borderBottom: "1px solid var(--color-neutral-border)",
    color: "var(--color-neutral-content)",
  }}
>
  <EditorUI.Typography variant="title" size="small" style={{ margin: 0 }}>Labels</EditorUI.Typography>
  <EditorUI.Typography variant="body" size="smaller" style={{ margin: 0, color: "var(--color-neutral-content-subtlest)" }}>
    Pick a label, then draw on the image.
  </EditorUI.Typography>
  <EditorUI.Button type="button" variant="neutral" look="outlined" size="smaller" onClick={linkSelected} disabled={!canLink}>
    Link selected regions
  </EditorUI.Button>
  <div role="group" aria-label="Tools" style={{ display: "flex", gap: "var(--spacing-tighter)" }}>
    <EditorUI.Button type="button" variant="neutral" look="ghost" size="smaller" aria-label="Zoom in" onClick={zoomIn}>
      <EditorUI.Icons.MagnifyingGlassPlus size={16} />
    </EditorUI.Button>
    <EditorUI.Button type="button" variant="neutral" look="ghost" size="smaller" aria-label="Rectangle tool" aria-pressed={tool === "rectangle"} onClick={() => setTool("rectangle")}>
      <EditorUI.Icons.Rectangle size={16} weight={tool === "rectangle" ? "fill" : "regular"} />
    </EditorUI.Button>
  </div>
  <EditorUI.SegmentedControl
    options={[{ value: "single", label: "Single" }, { value: "continuous", label: "Continuous" }]}
    selectedOption={pageMode}
    onChange={setPageMode}
    aria-label="Page mode"
  />
</section>
```

### Annotation category colours (marks only)
Label, region and choice marks carry the saturated colour that comes from params (`label.color`) or task data — pass it through as `labelColors` / `background`. Never use those colours, or any hex, for page/panel backgrounds, toolbars or body text.

### Layout
- **Full-canvas**: flex column; content `flex: 1, minHeight: 0`. If you add a toolbar, top bar or header bar, default its height to exactly 42px (`flex: "0 0 42px"`) unless there is a strong domain-specific reason to make it taller.
- **Single column by default.** Put the label palette in a horizontal bar **above** the media (`LabelPicker layout="ribbon"` or `"bar"`, not `"sidebar"`), and put questions / per-region attributes / choices **below** the media in a full-width section (`borderTop: "1px solid var(--color-neutral-border)"`): label bar → media (`flex: 1, minHeight: 0`) → answers. Don't add a side column on your own: it squeezes the media and can duplicate the editor's own panels.
- **When the user asks for a side-by-side layout** (answers or a checklist beside the media, page and form side by side, two items compared left and right), build it: two columns in one flex row, the content column keeps most of the width (about 60–70%) and its own `minWidth: 0`, the other column scrolls on its own. Never refuse or substitute a different layout by citing these defaults. The user's explicit layout and placement choices win over every default in this section.
- **Inset the canvas.** Canvas components render as bordered, rounded cards, so give the media area `padding: "var(--spacing-base)"` to keep them inset from the interface edges (never flush against them).
- Space everything on the spacing tokens; card padding `--spacing-base`, gaps between controls `--spacing-tight`, pill padding `--spacing-tighter`.

### Interaction & accessibility
- Selected state: `--color-primary-border` outline/border + `--color-primary-background` fill.
- `transition: all 0.15s ease` on interactive elements.
- Arrow keys / number keys may navigate or pick labels inside the canvas.
- Every icon-only button needs `aria-label`; never rely solely on colour to convey information.

### Shell-owned history, delete and hotkeys (FIT-2936 / FIT-2953)
The editor shell owns Undo / Redo / Reset and their hotkeys (`mod+z`, `mod+shift+z`), region delete (Backspace / Delete on the selected regions), and Escape (unselect). They only work when the shell sees every change and every keystroke:
- Do **not** bind Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z, Backspace, Delete, or Escape in the screen, and never call `deleteRegion` from your own keydown handler — the shell already does, so a screen handler double-deletes or fights the shell.
- Never call `event.stopPropagation()` / `preventDefault()` on keydown for keys you do not own, and keep keydown listeners scoped to the canvas element (not `window`) — swallowing keys disables the shell's hotkeys.
- Create and change regions **only** through `addRegion` / `updateRegion` / `deleteRegion` — never keep the authoritative region list in local state. Show drags as a local preview and send **one `updateRegion` per gesture** on pointer-up, so each gesture is exactly one undo step. Always pass new arrays/objects in the patch (never mutate `region` fields in place — an in-place mutation looks unchanged and records no history).

### Slot components (InfoViewer / OutlinerItem)
- `InfoViewer` and `OutlinerItem` render **content only**. The shell wraps them with Lock / Hide / Delete controls — never render Lock / Hide / Delete / eye / trash buttons inside them, for any region type (boxes, polygons, keypoints, spans, masks).
- These slots render in the shell's side panels, **outside the screen's root element**, so CSS variables or classes scoped to your root do not reach them. Style every slot element (including `<input>`, `<select>`, `<textarea>`) directly with design-system tokens (`var(--color-neutral-surface)`, `var(--color-neutral-content)`, `var(--color-neutral-border)`) — never hardcode light colors. The sandbox sets CSS `color-scheme` from the theme, so browser defaults for native controls (field background, `<select>` popup) follow Light / Dark mode, but your own borders, text and surfaces must still use tokens.

Always respond with a complete, working screen. Keep it concise but functional.
