<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Interface Components: DocumentCanvas

## Interface Components: DocumentCanvas

`window.InterfaceComponents.DocumentCanvas` covers Document AI / OCR screens: multi-page PDFs (PDF.js, virtualized — only pages near the viewport are mounted, so 100+ page documents stay fast) or page-image lists (classic `<Image valueList="$pages">`). It replaces the classic OCR templates: boxes (move / resize / **rotate**), **polygons**, a selectable **PDF text layer** (classic `<Pdf>` + `<OcrLabels>`), text auto-fill, and per-region transcription (classic `<TextArea perRegion>`).

Props: `documentUrl` (PDF) or `pages` / `images` (page image URLs), `regions`, `selectedRegionIds`, `onAddRegion`, `onUpdateRegion`, `onDeleteRegion`, `onSelectRegion`, `activeLabels`, `labelColors`, `fromName`, `toName`, `tools` (subset of "select" | "box" | "polygon" | "text"), `activeTool` + `onToolChange`, `resultFormat` ("image" | "ocrlabels"), `pageMode` ("continuous" | "single"), `currentPage` / `initialPage` + `onPageChange` (1-based), `transcription`, `transcriptionPlaceholder`, `textLayer`, `autoFillText`, `textItems` (precomputed OCR tokens for page images), `rotatable`, `controllerRef`, `relationLinkingSource`, `readOnly`, `hotkeys`. Hotkeys (root-scoped): v select, b box, o polygon, t text, n / p pages, Enter closes a polygon, Esc cancels it, Backspace removes its last vertex.

Tools:
- **box** — drag a rectangle. On a PDF with a text layer the new box's transcription is auto-filled with the text under it (classic OcrLabels behavior) when `transcription` is on or `resultFormat="ocrlabels"`.
- **polygon** — click vertices; the first vertex, a double-click or Enter closes it. Drag vertices / the body with **select**. Not available with `resultFormat="ocrlabels"`.
- **text** — select text on the PDF; the selection becomes a box hugging the selected characters that carries the text.
- **select** — select, move, resize, rotate (handle above the box; Shift snaps to 15°).

Regions (the page lives on the region):
- `"rectanglelabels"` (or `"rectangle"` unlabeled): `_value: { x, y, width, height, rotation }` in % of the page, `_itemIndex` = 0-based page (serialize as `item_index`; omitted for single-page documents).
- `"polygonlabels"` (or `"polygon"`): `_value: { points: [[x, y], ...], closed: true }` in %, `_itemIndex` as above.
- `"ocrlabels"` (`resultFormat="ocrlabels"`): `_value: { x, y, width, height, rotation, pageIndex, ocrtext }` with x/y/width/height as **fractions 0..1** and a **1-based** `pageIndex`, exactly like classic Pdf + OcrLabels. Serialize ONE result: `{ id, type: "ocrlabels", from_name: "ocr", to_name: "pdf", value: { ..._value, ocrtext: region._transcription, ocrlabels: region.labels } }` (no item_index, no original_width).
- `_transcription` = OCR text. For rectangles / polygons emit it as a second result sharing the region id: `{ id, type: "textarea", from_name: "transcription", to_name, value: { ...geometry, text: [transcription] } }`. The classic OCR template's split form is `"rectangle"` (from_name "bbox") or `"polygon"` (from_name "poly") + `"labels"` (from_name "label", value `{ ...geometry, labels }`) + the textarea.

- **Pass shell state straight through.** `props.regions` already uses the canonical shape, so filter it to this canvas (`r._toName === TO_NAME`) and pass it as `regions`. Wire `selectedRegionIds={props.selectedRegionIds}`, `onAddRegion={props.addRegion}`, `onUpdateRegion={props.updateRegion}`, `onDeleteRegion={props.deleteRegion}`, `onSelectRegion={(id, opts) => props.selectRegion(id, opts)}` (a `null` id clears the selection).
- **Created regions are complete.** The canvas stamps `activeLabels` → `labels`, `labelColors` → `colors`, and `fromName`/`toName` → `_fromName`/`_toName`. Do not rebuild or re-id them in the screen. Always pass the same `labelColors` map you give the LabelPicker.
- **No Delete buttons in slots.** `onDeleteRegion` is for the canvas's own delete gestures. The shell already renders Lock / Hide / Delete around `InfoViewer` and `OutlinerItem`, so those exports render content only — never a "Delete polygon" / "Delete box" / trash button (FIT-2931).
- **Never discard unlabeled regions.** If nothing is selected in the LabelPicker the region is created with `labels: []`; relabel it later with `props.updateRegion(id, { labels, colors })` (always update `colors` with `labels`).
- **Hydrate with colors.** In `parseResults`, pass `{ labelColors }` into `from*Results` (or stamp `colors` afterward). The Regions panel has no `labelColors` fallback — empty `colors` means gray chips.
- **Do not show the in-canvas LayerManager.** `showLayers` defaults to false. Leave it off (and do not mount `*.LayerManager`) — the editor-shell Outliner / Regions panel is the region list.

```jsx
function InvoiceScreen(props) {
  const DocumentCanvas = window.InterfaceComponents.DocumentCanvas;
  const [activeLabels, setActiveLabels] = React.useState(["Total"]);
  return (
    <DocumentCanvas
      documentUrl={getField(props.task.data, props.params?.pdfField) || undefined}
      tools={["select", "box", "polygon", "text"]}
      transcription
      regions={(props.regions || []).filter((r) => r._toName === "document")}
      selectedRegionIds={props.selectedRegionIds}
      activeLabels={activeLabels}
      labelColors={{ Total: "#0ea5e9", Vendor: "#a855f7" }}
      fromName="label"
      toName="document"
      readOnly={props.readOnly}
      relationLinkingSource={props.relationLinkingSource}
      onAddRegion={props.addRegion}
      onUpdateRegion={props.updateRegion}
      onDeleteRegion={props.deleteRegion}
      onSelectRegion={(id, opts) => props.selectRegion(id, opts)}
    />
  );
}
```

Classic Pdf + OcrLabels ("select text to correct"):

```jsx
function PdfOcrScreen(props) {
  const DocumentCanvas = window.InterfaceComponents.DocumentCanvas;
  return (
    <DocumentCanvas
      documentUrl={props.task.data.pdf}
      resultFormat="ocrlabels"
      tools={["select", "box", "text"]}
      activeTool="text"
      regions={(props.regions || []).filter((r) => r.type === "ocrlabels")}
      selectedRegionIds={props.selectedRegionIds}
      activeLabels={["Typo"]}
      labelColors={{ Typo: "#dc2626" }}
      fromName="ocr"
      toName="pdf"
      readOnly={props.readOnly}
      onAddRegion={props.addRegion}
      onUpdateRegion={props.updateRegion}
      onDeleteRegion={props.deleteRegion}
      onSelectRegion={(id, opts) => props.selectRegion(id, opts)}
    />
  );
}
```

### Custom layouts (compound members + controller)
Put members inside `<DocumentCanvas>` (or `DocumentCanvas.Root`) to build any layout, e.g. page + form side by side: `DocumentCanvas.Toolbar` (default: `.Tools` + `.PageNavigator` + `.RotationControls` + `.ZoomControls`, or your own children), `DocumentCanvas.Viewport` (the virtualized pages; `renderPageChildren={(page) => ...}` adds per-page overlays such as `<DocumentCanvas.TextLayer pageIndex={page.index} />`), `DocumentCanvas.Page`, `DocumentCanvas.Thumbnails` (page list with region-count badges), `DocumentCanvas.TranscriptionEditor` (edits the selected region, or `regionId`; pair with `transcription={false}` to move the editor into a side panel), `DocumentCanvas.RegionsOverlay` (screen-reader summary). `DocumentCanvas.useController()` (inside the tree) or `controllerRef` (outside) → `{ currentPage, pageCount, goToPage, nextPage, prevPage, focusRegion(id, { select }), pageForRegion(id), regionsByPage, tools, activeTool, setActiveTool, getTextInRect(pageIndex, rect), loadPageText(pageIndex), zoomIn, zoomOut, setZoom, rotateLeft, rotateRight, pageRotations }`. Selecting a region from outside (outliner, a list) scrolls the canvas to its page automatically. `DocumentCanvas.RotationControls` rotates the current page view in 90° steps, including in read-only mode. Images, PDFs, annotations and OCR text rotate together; drawing still emits original page coordinates. Rotation is local to each page, resets on document changes and does not alter saved results. The `rotateLeft` / `rotateRight` actions can be assigned through `hotkeys`; they have no default shortcut so Alt+Left/Right keeps navigating pages.

```jsx
function SideBySideScreen(props) {
  const DocumentCanvas = window.InterfaceComponents.DocumentCanvas;
  function FieldList() {
    const doc = DocumentCanvas.useController();
    return (
      <ul>
        {doc.regions.map((r) => (
          <li key={r.id}>
            <EditorUI.Button type="button" variant="neutral" look="ghost" size="smaller" onClick={() => doc.focusRegion(r.id)}>
              Page {doc.pageForRegion(r.id)}: {(r.labels || []).join(", ")} {r._transcription || ""}
            </EditorUI.Button>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <DocumentCanvas
      images={props.task.data.pages}
      transcription={false}
      regions={props.regions || []}
      selectedRegionIds={props.selectedRegionIds}
      activeLabels={["Amount"]}
      fromName="label"
      toName="pdf"
      readOnly={props.readOnly}
      onAddRegion={props.addRegion}
      onUpdateRegion={props.updateRegion}
      onDeleteRegion={props.deleteRegion}
      onSelectRegion={(id, opts) => props.selectRegion(id, opts)}
    >
      <DocumentCanvas.Toolbar />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <DocumentCanvas.Thumbnails />
        <DocumentCanvas.Viewport />
        <aside style={{ width: 320, padding: 12, overflowY: "auto" }}>
          <DocumentCanvas.TranscriptionEditor />
          <FieldList />
        </aside>
      </div>
    </DocumentCanvas>
  );
}
```

- Do NOT load pdf.js yourself or read `page.getTextContent()`; the sandbox preloads PDF.js and DocumentCanvas renders pages and the text layer on demand.
- Do NOT compute text-under-box yourself; use auto-fill or `controller.getTextInRect`.
- Do NOT store ocrlabels geometry in %: classic OcrLabels uses fractions (0..1) and a 1-based pageIndex.
