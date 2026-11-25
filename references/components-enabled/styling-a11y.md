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
- **Pickers: `EditorUI.SegmentedControl` (segmented control) for up to 5 short, non-verbose options** such as view / mode / granularity / page-mode switches of the same content (an icon-only option passes `tooltip`, which is also its accessible name); **`EditorUI.Select` for 6+ options** or whenever option labels are long. `EditorUI.Tabs` only to navigate between sub-sections whose content differs (for example Task 1 / Task 2), never to switch a view. Never a native `<select>`. Both are also reachable as `InterfaceComponents.SegmentedControl` / `InterfaceComponents.Select` (the same components).
- **Labeling controls are not chrome** — when Interface Components modules are in this prompt, collect annotation values with `ChoiceGroup`, `RatingControl`, `NumberInput`, `TextInput`, etc. Do not use `EditorUI.Button` rows or raw `<input>`/`<textarea>` to reinvent those controls.
- **Never destructure `EditorUI`** — reference `EditorUI.Typography`, `EditorUI.Button` at the point of use. `const { Button } = EditorUI` at module top level throws in the admin-time eval that extracts `paramsSchema` and silently breaks Labeling Settings.
- **One control size per row** — every `EditorUI` control takes the same `size`: `"medium"` (40px, the default), `"small"` (32px) or `"smaller"` (24px). Controls in the same row all pass the same one. A screen's controls are `"smaller"`; a row that needs larger fields passes `"small"` on every control in it, buttons included. Never set a height on a control with `style` or CSS; the height comes from `size`. The control also sizes and places its own icons (20, 16 or 12px for medium, small, smaller): pass an icon to `leading`, `trailing` or `icon` without a `size`, and never pad or resize it.
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
- `EditorUI.Typography` — field labels (and the rare area title the content really needs) `variant="title" size="small"`; instructions and body copy `variant="body" size="small"`; hints and captions `variant="body" size="smaller"` or `variant="label" size="smaller"`. Pass `as="h3"` / `as="span"` to control the tag; `id`, `role` and `aria-*` pass through. Set `style={{ margin: 0 }}` unless you want the default margin.
- `EditorUI.Button` — `type="button" variant="neutral" look="outlined" size="smaller"` for text actions; icon-only toolbar buttons are `variant="neutral" look="ghost" size="smaller"` with `aria-label` and a 16px `EditorUI.Icons` child, `aria-pressed` for the active tool. Always pass an explicit `variant`; `disabled`, `aria-*` and `data-testid` pass through.
- `EditorUI.Badge` for status pills only: never clickable (use a Button or a labeling control), no icon or dot inside, the default filled look, `shape="rounded"` for states, `"square"` for attributes. `EditorUI.Message` for inline notices (`variant="warning"`, `"negative"`, `"primary"`), never a hand-coloured info box. `EditorUI.Select` (`options={[{ value, label }]}`, `value`, `onChange={(value) => ...}`, `size="smaller"`, `triggerProps={{ "aria-label": "..." }}`) for dropdowns of 6+ options; `EditorUI.SegmentedControl` (`options={[{ value, label }]}` with string values, `selectedOption` — not `value` —, `onChange={(value) => ...}`, `aria-label`, `size="smaller"`, `disabled={readOnly}` when it must be read-only) for up to 5 short options.
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
- **Single column by default.** Put the label palette in a horizontal bar **above** the media (`LabelPicker layout="ribbon"` or `"bar"`, not `"sidebar"`), and put questions / per-region attributes / choices **below** the media in their own full-width area (see What a good labeling screen looks like): label bar → media (`flex: 1, minHeight: 0`) → answers. Don't add a side column on your own: it squeezes the media and can duplicate the editor's own panels.
- **When the user asks for a side-by-side layout** (answers or a checklist beside the media, page and form side by side, two items compared left and right), build it: two columns in one flex row, the content column keeps most of the width (about 60–70%) and its own `minWidth: 0`, the other column scrolls on its own. Never refuse or substitute a different layout by citing these defaults. The user's explicit layout and placement choices win over every default in this section.
- **Inset the canvas.** Canvas components render as bordered, rounded cards, so give the media area `padding: "var(--spacing-base)"` to keep them inset from the interface edges (never flush against them).
- Space everything on the spacing tokens (rhythm in What a good labeling screen looks like).

### What a good labeling screen looks like
Annotators use this screen for hours, labeling one item after another. Good means: the content is easy to read and label, every control is where the eye and hand already are, and nothing is on screen that does not help. A screen that validates is not yet a good screen.
- **Design before code.** Before writing the module, decide the areas in reading order (for example: label toolbar + waveform · transcript · answers), what gets most of the space, and where the annotator answers. Then build that; don't start from the controls and stack them up.
- **Content first.** The thing being labeled (media, text, document) gets most of the space and the most visual weight. Chrome recedes: small, quiet, out of the way.
- **Every element earns its place.** No title, helper text, divider or container unless the annotator needs it to decide or act. A waveform, image, transcript or label picker explains itself: don't title it ("Audio regions", "Paragraph entities", "Dialogue") or describe what it obviously is. Instructions are one short line, only where the interaction is not obvious, and never repeat what the editor shell already shows. A question is labeled by its own small field label, not by an extra heading above it.
- **Group by task, not by component.** Put each control next to what it acts on: a label picker is a toolbar attached directly above the canvas or text it labels (same block, no title or gap between them); media controls sit with their media; answers sit together after the content they describe. Never one card per control.
- **Proximity, alignment and weight before boxes.** Separate areas with spacing and alignment first. Use a surface or border only to set apart genuinely different areas (for example the content versus the answer form), and never nest boxes. Canvas components are already framed: don't wrap them in another box.
- **Compact controls, roomy content.** Controls can be dense (`--spacing-tight` between them, 42px toolbars) because annotators repeat them all day; give the content itself room (`--spacing-base` around media, about 72 characters per line of text). Keep one consistent spacing rhythm.
- **Native to Label Studio.** The screen should look like part of the editor (toolbars, label chips, `EditorUI` controls), not a web page: no hero titles, no marketing copy, no decorative headers or badges.
- **Nothing broken or empty.** No large empty areas, cut-off text, scroll areas inside scroll areas, or controls that do nothing with the sample data.

These are the visual failures the Interface Agent evals keep finding; check each one:
- **The labeled content is fully visible** at a usable size: an image fits its area (not a thin strip, not cropped, not at 10% zoom), a transcript or document shows several lines or turns, a video keeps its size. The content never shrinks or moves when a field appears or an item is selected (**No layout jumps**: reserve the space, don't reflow a grid on selection).
- **The main answers are reachable without scrolling** past the content, and nothing important sits under the editor's bottom bar. If the content is tall, it scrolls inside its own area so the answers stay in view.
- **Nothing for developers on screen**: no raw file paths or URLs as titles, internal tokens or enum values (`DISCARD_WHOLE_TASK`), ids, debug counters, test switchers or "for testing" banners. Show the human label instead.
- **Controls look enabled when they are**, and their text is readable: no grey-on-grey, no tiny chips or tabs for the main choices, no pre-ticked checkboxes for a checklist that is only guidance (render it as text).
- **Labels are tellable apart**: distinct colours and names; group long label lists instead of one wall of chips.
- **Check before you finish:** remove every title or line of text whose removal loses nothing; make sure the content is the biggest thing on screen and every control sits next to what it acts on.

```jsx
<div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: "var(--color-neutral-background)" }}>
  {/* Label toolbar attached to the content it labels: no title, no gap */}
  <div role="toolbar" aria-label="Labels" style={{ flex: "0 0 42px", display: "flex", alignItems: "center", gap: "var(--spacing-tight)", padding: "0 var(--spacing-base)", borderBottom: "1px solid var(--color-neutral-border)", background: "var(--color-neutral-surface)" }}>
    {/* LabelPicker layout="bar" */}
  </div>
  <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "var(--spacing-base)" }}>
    {/* the content being labeled */}
  </div>
  <section aria-label="Answers" style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-base)", padding: "var(--spacing-base)", borderTop: "1px solid var(--color-neutral-border)", background: "var(--color-neutral-surface)" }}>
    {/* one question per row: a small field label, then its control */}
  </section>
</div>
```

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

Always respond with a complete, working screen. Keep the code concise and the screen focused on the content.

## Labeling screen design brief

What we want from the design system on a labeling screen. When the user asks for something different, the user's request wins (see When instructions conflict).

### Blockers: accessibility (always fix)
- **Readable**: text and control borders stand out from their surface (WCAG AA: 4.5:1 for body text, 3:1 for large text and control edges). No grey-on-grey, no text laid over media without a surface behind it.
- **Never colour alone**: a selected label, a verdict, a required or invalid field shows its state with text, an icon, a check or an outline as well as colour.
- **Named and reachable**: every control has a visible label or an aria-label, is a real control (EditorUI.Button or a labeling control, never a clickable div or badge) and keeps its visible focus ring.

### Quality issues (fix)
- **Hierarchy**: within five seconds an annotator can tell what to look at (the content) and what to do (the answer). One primary emphasis; supporting information is smaller, lighter or subtler; nothing competes with the content.
- **Rhythm**: spacing only from the spacing scale, the same between repeated items (rows, chips, questions share their padding and gaps); text only through Typography variants and sizes; a small palette of neutral surfaces plus the label colours from params.
- **Interaction states**: every control looks clickable at rest, reacts on hover and press, looks disabled when it is disabled (and the screen says why when it blocks progress), and shows loading for anything slow. Selection is obvious from the control itself.
- **Generic-AI tropes**: no gradients, no emoji as decoration, no coloured left-border accent cards, no shadow on every box, no hero titles or marketing copy, no hand-drawn SVG icons, no font sizes, fonts or colours that do not come from the tokens, no stock imagery presented as the task's content.
- **The failures the Interface Agent evals keep finding** (see What a good labeling screen looks like): content not fully visible, answers out of reach, developer text on screen, controls that look disabled, layout jumps, labels hard to tell apart.

### Polish (note it; never redo a screen for it)
- Small alignment or spacing tweaks within the scale, the shade of a neutral, the wording of a caption.

### Components (from the design system's component manifest)
- **EditorUI.Typography** — Every piece of user-visible text: headings, body, labels, metadata, truncation.
  - Never: Bare <p>, <span> or <h*> with text utilities; Inline colour or font styles.
  - Rules: disabled text uses var(--color-neutral-content-subtlest).
- **EditorUI.Button** — Any element the user clicks to do something: submit, open, navigate, toggle a panel, icon-only controls.
  - Never: A raw <button>, <a onClick> or div with role=button; A Badge or chip made clickable; More than one filled primary Button per screen.
  - Rules: look=filled only for the single main action; outlined or ghost for the rest; no other look; icon-only buttons pass aria-label; variant negative only for destructive actions, which also confirm.
- **EditorUI.Badge** — A short label that states an attribute (Required, Inherited, a count) or a status of an item.
  - Never: Booleans or attributes most rows share (use Typography); Anything clickable (use Button look=ghost or Toggle); An icon, dot, check or cross inside; A local span with rounded-full classes.
  - Rules: look is always the filled default; a selection control shows not selected as the neutral filled Badge; shape=rounded for lifecycle states, square for attributes; state colours follow the registry table: neutral initial, primary in process, warning needs attention, plum in review, positive done, negative failed; size via the size prop only, never className overrides.
- **EditorUI.Select** — Choosing from a flat list of options, single or multiple, searchable or not, with read-only display mode. With multiple, add requireApply when picks should only take effect on an Apply click (long lists, or a change that reloads data).
  - Never: A raw <select>; Hierarchies (use TreeSelect); Free text (use Input once it exists).
- **EditorUI.SegmentedControl** — Switching views, filtering the same data or showing the same content in another format (list or grid, form or JSON, a short filter).
  - Never: Moving between sub-sections whose content differs (use Tabs); More than five options (use Select); Options that need descriptions (use Radio once it exists).
- **EditorUI.Tabs** — Navigating between sub-sections of a parent section whose content differs but sits at the same level.
  - Never: Switching the view, format or filter of the same content (use SegmentedControl); A row of Buttons with an active class; Role=tablist built by hand; Navigation between pages.
- **EditorUI.Message** — Info, warning, error or success text placed inline with the content it refers to.
  - Never: Custom coloured info boxes; Transient results (use Toast).
  - Rules: variant is a colour (primary, neutral, positive, negative, warning, enterprise); look is filled or ghost.
- **EditorUI.Checkbox** — Selection of rows, options or items where several can be chosen at once, including indeterminate parents.
  - Never: A raw <input type=checkbox>; An on/off setting (use Toggle).
- **EditorUI.Toggle** — A setting that is either on or off and takes effect as a preference (auto-save, notifications, a feature switch).
  - Never: Selecting items (use Checkbox); Choosing one of several named options (use SegmentedControl or Select).
  - Rules: the toggle sits before its label; align end only in narrow forms, where it stays close to the label.
- **EditorUI.Tooltip** — Plain-text help attached to a control or a truncated value.
  - Never: Title attributes; DOM-built tooltips; Rich or interactive content (use Popover).
- **EditorUI.Spinner** — Something the user triggered is still running and has no layout to reserve.
  - Never: Loading a layout that will be filled (use Skeleton); An app-local spinner or CSS animation.
  - Rules: size is a name (smallest, smaller, small, medium, large, larger, largest), never a px number.
- **EditorUI.Skeleton** — Placeholder blocks in the shape of the content that is about to appear.
  - Never: An action in progress (use Spinner); Grey divs with a pulse class.
- **EditorUI.EmptyState** — No data, no results or a first-run screen: icon, title, description and the action that fills it.
  - Never: A bare 'No data' Typography; An app-local empty block.
- **EditorUI.SummaryLabel** — A cell, trigger or summary lists values that may not fit: tags, skills, projects, selected options. Text by default, badges with `badges`.
  - Never: A hand-written +N or a local overflow hook; A row of avatars (use AvatarStack); The count as a Badge: +N is always text.
  - Rules: counts go through formatCount: +1.2k from a thousand up; where values can be selected, countLabel says so: +3 selected; what clicking +N does belongs to the parent, never to SummaryLabel.
- **EditorUI.DataTable** — Tabular data with sorting, selection, column sizing or virtualisation.
  - Never: a raw <table> for datasets (use PropertyTable for compact inspector properties); a grid of divs styled as a table.
- **EditorUI.SearchInput** — A search box that narrows a list or table as the user types.
  - Never: General text entry (Input gap); A raw <input> with a magnifier icon; A clear button added next to it: it has its own.
- **EditorUI.CollapsiblePanel** — A single section the user expands or collapses, panel style.
  - Never: A details element styled by hand; Stacked sections (use Accordion).
- **EditorUI.Stepper** — Wizards and setup flows with ordered steps.
  - Never: Numbered Badges in a row; Tabs used as steps.
  - Rules: orientation sets the direction (horizontal, vertical); size is medium or small.

### Token scales (use only these named steps)
- Spacing: `--spacing-base` · `--spacing-none` · `--spacing-tight` · `--spacing-tighter` · `--spacing-tightest` · `--spacing-wide` · `--spacing-wider` · `--spacing-widest`
- Corner radius: `--corner-radius-large` · `--corner-radius-larger` · `--corner-radius-largest` · `--corner-radius-medium` · `--corner-radius-none` · `--corner-radius-small` · `--corner-radius-smaller` · `--corner-radius-smallest`
- Font size: `--font-size-body-medium` · `--font-size-body-small` · `--font-size-body-smaller` · `--font-size-body-smallest` · `--font-size-body-tinier` · `--font-size-body-tiny` · `--font-size-display-large` · `--font-size-display-medium` · `--font-size-display-small` · `--font-size-headline-large` · `--font-size-headline-medium` · `--font-size-headline-small` · `--font-size-label-medium` · `--font-size-label-small` · `--font-size-label-smaller` · `--font-size-label-smallest` · `--font-size-label-tinier` · `--font-size-label-tiny` · `--font-size-title-large` · `--font-size-title-medium` · `--font-size-title-small`
- Font weight: `--font-weight-bold` · `--font-weight-light` · `--font-weight-medium` · `--font-weight-regular` · `--font-weight-semibold`
- Font family: `--font-family-base` · `--font-family-body` · `--font-family-headings` · `--font-family-mono` · `--font-family-monospace`
