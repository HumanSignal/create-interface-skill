<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Design system, styling & a11y

## Design System

Follow these design guidelines so interfaces feel native to Label Studio.

### Key Rules
- **Theme-aware always** — surfaces, panels, text, and borders use the design-system tokens in the Colors section (e.g. `bg-neutral-surface`, `text-neutral-content`), never raw hex / `bg-white` / gray-scale utilities, so the interface works in both Light and Dark mode
- **Emerald is the primary accent** — apply it via the `primary` tokens (`bg-primary-surface`, `border-primary-border`) for primary interactive states (selected, active, play buttons), not a raw hex
- **Fill the canvas** — interfaces should expand to use available space, not float in the center
- **Don't recreate editor chrome** — no submit buttons, no navigation, no sidebars that duplicate LS panels (the editor already provides those)
- **No redundant status text** — NEVER show "Selected: X", "Current selection: X", or any text summary of the user's selection. For classification, taxonomy, or any single/multi-choice control, the selected state must be visually obvious from the control styling alone (filled background, accent border, checkmark icon, etc.). Do NOT add a banner, header, or inline text displaying what is selected — that is redundant visual noise.
- **Minimal shadows** — only on floating elements (modals, dropdowns)
- **Monospace for data values** — timestamps, coordinates, IDs, durations
- **Color-code annotation categories** — saturated color + 10% opacity background variant
- **DOM-based hover** — use onMouseEnter/onMouseLeave setting style directly instead of useState for hover to prevent re-renders

### Colors — CRITICAL: the interface MUST adapt to Light and Dark theme

**Never hardcode hex colours, `white`/`#fff`/`#ffffff`, `bg-white`, or gray-scale Tailwind utilities (`gray-100`, `gray-900`, …) for surfaces, panels, text, or borders.** Those lock the canvas to Light mode and are the #1 cause of dark-mode bugs. Use the design-system tokens below — they switch automatically between Light and Dark. Apply them as Tailwind classes (`bg-neutral-surface`) or CSS variables (`var(--color-neutral-surface)`).

| Purpose | Tailwind class |
|---|---|
| Canvas / app background | `bg-neutral-background` |
| Card / panel / toolbar surface | `bg-neutral-surface` |
| Surface hover | `bg-neutral-surface-hover` |
| Recessed / subtle fill | `bg-neutral-emphasis-subtle` |
| Border / divider / input border | `border-neutral-border` |
| Primary text | `text-neutral-content` |
| Secondary text | `text-neutral-content-subtle` |
| Muted / placeholder text | `text-neutral-content-subtler` |
| Primary action / selected (the LS emerald accent) | `bg-primary-surface` · `text-primary-surface-content` · `border-primary-border` · subtle bg `bg-primary-emphasis-subtle` |
| Danger / error | `bg-negative-surface` · `text-negative-surface-content` · `text-negative-content` |
| Warning | `bg-warning-surface` · `text-warning-content` |
| Success | `bg-positive-surface` · `text-positive-surface-content` |

The primary accent and all status colours come from these tokens — never substitute raw hex for them.

### Annotation Category Colors (entity/label MARKS only — never for surfaces, panels, or text blocks)
To distinguish annotation categories you MAY use saturated colours for the mark itself (entity highlight, label pill, region outline): Emerald #10b981, Indigo #6366f1, Amber #f59e0b, Purple #8b5cf6, Red #ef4444, Pink #ec4899. Pair each with its low-opacity background (`rgba(color, 0.1)`), which reads on both themes. Do NOT use these (or any hex) for the page/panel background, toolbars, or body text — those use the neutral tokens above.

### Typography
- Section headers: 14px, weight 600
- Body/controls: 12–13px, weight 400
- Small labels/captions: 10–11px, weight 500–600
- Metadata tags: 8–9px, weight 600
- Timestamps/codes: monospace (`'SF Mono', 'JetBrains Mono', monospace`), 10–12px
- Line height: 1.5 for body text

### Spacing (8px grid)
- xs: 4px — compact gaps, pill padding
- sm: 8px — between controls, icon button padding
- md: 16px — container padding, section gaps
- lg: 24px — spacious panel padding

### Components

All component styling uses the tokens above — no raw hex, `bg-white`, or gray-scale utilities.

**Buttons**: Primary = `bg-primary-surface text-primary-surface-content`, rounded 4-6px. Secondary = `bg-neutral-surface border border-neutral-border text-neutral-content`. Icon = `text-neutral-content-subtler`, hover `text-neutral-content bg-neutral-surface-hover`. Danger = `bg-negative-surface text-negative-surface-content`.

**Tags/pills**: rounded-full, 10px font, weight 500. Inactive = `bg-neutral-emphasis-subtle text-neutral-content-subtle`. Active = category color at 10% bg + category color text.

**List items**: px-2 py-1.5, rounded, `border border-neutral-border bg-neutral-surface`. Hover = `bg-neutral-surface-hover`. Selected = `border-primary-border bg-primary-emphasis-subtle`.

**Inputs**: text-xs p-2, `border border-neutral-border bg-neutral-surface text-neutral-content rounded`. Focus = `border-primary-border` + ring.

**Loading**: centered spinner, animate-spin, accent border (`border-primary-border`). Optional overlay: `bg-neutral-background/80` + backdrop-blur.

**Toolbar / top bar**: flex items-center justify-between, px-4, `bg-neutral-surface border-b border-neutral-border`. If creating a top bar, header bar, or toolbar inside the interface, default its height to exactly 42px (e.g. height: 42, minHeight: 42, flex: "0 0 42px") unless there is a strong domain-specific reason to make it taller.

### Layout Patterns

**Full-canvas**: flex flex-col, content area flex-1, toolbar flex-none 42px. Fill available space with `height: calc(100vh - 140px)` or flex.

**With sidebar**: toolbar on top, then flex row — main content flex-1 + optional sidebar w-64 to w-80 with border-l.

### Interaction
- Selected state: accent border/ring + light accent background
- Use CSS transitions on buttons: `transition: all 0.15s ease`
- Arrow keys / number keys may navigate or pick labels inside the canvas
- All icon-only buttons need aria-label
- Never rely solely on color to convey information

### Shell-owned history, delete and hotkeys (FIT-2936 / FIT-2953)
The editor shell owns Undo / Redo / Reset and their hotkeys (`mod+z`, `mod+shift+z`), region delete (Backspace / Delete on the selected regions), and Escape (unselect). They only work when the shell sees every change and every keystroke:
- Do **not** bind Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z, Backspace, Delete, or Escape in the screen, and never call `deleteRegion` from your own keydown handler — the shell already does, so a screen handler double-deletes or fights the shell.
- Never call `event.stopPropagation()` / `preventDefault()` on keydown for keys you do not own, and keep keydown listeners scoped to the canvas element (not `window`) — swallowing keys disables the shell's hotkeys.
- Create and change regions **only** through `addRegion` / `updateRegion` / `deleteRegion` — never keep the authoritative region list in local state. Show drags as a local preview and send **one `updateRegion` per gesture** on pointer-up, so each gesture is exactly one undo step. Always pass new arrays/objects in the patch (never mutate `region` fields in place — an in-place mutation looks unchanged and records no history).

### Slot components (InfoViewer / OutlinerItem)
- `InfoViewer` and `OutlinerItem` render **content only**. The shell wraps them with Lock / Hide / Delete controls — never render Lock / Hide / Delete / eye / trash buttons inside them, for any region type (boxes, polygons, keypoints, spans, masks).
- These slots render in the shell's side panels, **outside the screen's root element**, so CSS variables or classes scoped to your root do not reach them. Style every slot element (including `<input>`, `<select>`, `<textarea>`) directly with design-system tokens (`bg-neutral-surface`, `text-neutral-content`, `border-neutral-border`, or `var(--color-neutral-*)`) — never leave native inputs unstyled (the iframe does not set CSS `color-scheme`, so unstyled inputs stay light in Dark mode) or hardcode light colors.

Always respond with a complete, working screen. Keep it concise but functional.
