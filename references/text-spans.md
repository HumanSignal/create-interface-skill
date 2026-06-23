# Text Spans and NER Offset Rules

NER (Named Entity Recognition) and text span interfaces must treat character offsets as first-class region data. Use this reference to ensure span highlighting, offset computation, and selection handlers are stable, deterministic, and bug-free.

## Core Rules

- **Use saved `_start` / `_end` as the source of truth** for rendering, selection, editing, and serialization.
- **Never render highlights by finding text dynamically during render** (e.g. `text.indexOf(...)` using label or entity text). This works only for the first match, and breaks on repeated entities, repeated labels, punctuation, normalization, and shifts.
- **Filter hidden regions out of the visual span list** (`!region.hidden`) so that the editor-shell's hide-all and per-region eye controls hide highlights while leaving the source text visible as plain text.
- **Filter or handle invalid/overlapping spans** (`start < 0`, `end <= start`, `end > text.length`). For overlapping spans, either reject them in `onBeforeUpdate` or render only the non-overlapping sequence using a clear deterministic rule.
- **Resolve offsets once.** If an upstream agent or model returns entity text without offsets, resolve the offsets once in source order using `indexOf(entityText, cursor)` and store them immediately in the region's underscore-prefixed fields. Do not call bare `indexOf(entityText)`, and do not recalculate offsets on every render.
- **Do not calculate offsets from innerHTML or innerText of rendered markup.** When creating regions from `window.getSelection()`, container elements may contain labels, badges, or mark elements that introduce extra DOM text. This shifts offsets calculated over the rendered tree. Render original source text in children with a `data-source-start` attribute, and compute anchor/focus offsets from the nearest source-text element.
- **Serialization:** In `getResults`, serialize Label Studio text span results with `type: "labels"` and `value: { start, end, text, labels }`, taking `text` from `_text` or from the original source text slice.
- **Deserialization:** In `parseResults`, copy `value.start`, `value.end`, and `value.text` back to `_start`, `_end`, and `_text`, and reuse the incoming result `id`.

## Canonical Highlight Renderer

Below is the recommended pattern to render stable, non-overlapping highlights over a source text block. It sorts valid spans and slices the original text sequentially using a cursor:

```jsx
function renderNerText(sourceText, regions, selectedRegionIds, selectRegion) {
  const text = String(sourceText ?? "");
  const spans = (regions || [])
    .map((region) => ({
      region,
      start: Number(region._start),
      end: Number(region._end),
    }))
    .filter(({ region, start, end }) =>
      !region.hidden &&
      Number.isInteger(start) &&
      Number.isInteger(end) &&
      start >= 0 &&
      end > start &&
      end <= text.length
    )
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const nodes = [];
  let cursor = 0;

  spans.forEach(({ region, start, end }) => {
    if (start < cursor) return; // overlapping span; reject earlier if the UI disallows overlaps
    if (cursor < start) {
      nodes.push(
        <span key={`text-${cursor}-${start}`} data-source-start={cursor}>
          {text.slice(cursor, start)}
        </span>
      );
    }
    const selected = selectedRegionIds?.has(region.id);
    nodes.push(
      <mark
        key={region.id}
        data-region-id={region.id}
        onClick={() => selectRegion(region.id)}
        style={{
          background: selected ? "#fde68a" : region.colors?.[0] ?? "#bfdbfe",
          borderRadius: 3,
          padding: "0 2px",
          cursor: "pointer",
        }}
      >
        <span data-source-start={start}>{text.slice(start, end)}</span>
        <span aria-hidden="true" style={{ marginLeft: 4, userSelect: "none", pointerEvents: "none" }}>
          {(region.labels ?? [])[0] ?? "Entity"}
        </span>
      </mark>
    );
    cursor = end;
  });

  if (cursor < text.length) {
    nodes.push(
      <span key={`text-${cursor}-end`} data-source-start={cursor}>
        {text.slice(cursor)}
      </span>
    );
  }

  return nodes;
}
```

## Selection Offset Helpers

Use these helpers to resolve character offsets from `window.getSelection()` relative to `data-source-start` containers, avoiding DOM pollution shifts:

```jsx
function getSourcePointOffset(node, offset) {
  let el = node?.nodeType === 3 ? node.parentElement : node;
  while (el && !el.getAttribute?.("data-source-start")) {
    el = el.parentElement;
  }
  if (!el) return null;
  const sourceStart = Number(el.getAttribute("data-source-start"));
  if (!Number.isFinite(sourceStart)) return null;
  return sourceStart + offset;
}

function getSelectionOffsets() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const anchor = getSourcePointOffset(selection.anchorNode, selection.anchorOffset);
  const focus = getSourcePointOffset(selection.focusNode, selection.focusOffset);
  if (anchor == null || focus == null || anchor === focus) return null;
  return { start: Math.min(anchor, focus), end: Math.max(anchor, focus) };
}
```
