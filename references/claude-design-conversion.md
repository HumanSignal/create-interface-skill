# Claude Design and React Prototype Conversion

Use this reference when converting a Claude Design (claude.ai/design) bundle, React mockup, or single-page prototype into a HumanSignal Interface.

## Target

The output is always a single JSX file ending with a parenthesized object literal. Do not preserve the prototype's package imports, external css files, app bootstrapping (`ReactDOM.createRoot`), or host-specific postMessage/tweak panels.

## Fetch and Unpack (Claude Design)

Claude Design design links return a gzipped tar archive from `https://api.anthropic.com/v1/design/h/<id>`. Create a temporary directory, download the archive, and unpack it:

On Unix-like systems (macOS, Linux):
```bash
DESIGN_URL='https://api.anthropic.com/v1/design/h/<id>'
mkdir -p ./claude-design && cd ./claude-design
curl -L "$DESIGN_URL" -o design.tar.gz
tar -xzf design.tar.gz
```

On Windows (PowerShell):
```powershell
$DESIGN_URL="https://api.anthropic.com/v1/design/h/<id>"
New-Item -ItemType Directory -Force -Path .\claude-design
Set-Location .\claude-design
Invoke-WebRequest -Uri $DESIGN_URL -OutFile design.tar.gz
tar -xzf design.tar.gz
```


### Bundle Layout

```text
<project-name>/
├── README.md                 # boilerplate handoff instructions
├── chats/chat*.md            # design conversation — read first for intent
└── project/
    ├── index.html            # entry — defines script load order
    ├── colors_and_type.css   # CSS variables
    ├── fonts/                # web fonts
    ├── assets/icons/*.svg    # icon sprites
    └── src/*.jsx             # components (global scope, no imports/exports)
```

Read `chats/chat*.md` before the source. It records user intent, configuration knobs (which map to `paramsSchema`), and target serialization requirements.

## Conversion Mapping

| Claude Design Source | Custom Interface Output |
|---|---|
| Multiple script files under `src/*.jsx` | Concatenate into one file in the order defined in `index.html` (primitives → leaves → root component). |
| `ReactDOM.createRoot(...).render(<App/>)` | **Drop.** The shell mounts the default export. |
| `React.useState`, `React.useEffect`, etc. | Keep as `React.useState` or rewrite to injected globals (`useState`). |
| `window.TWEAK_DEFAULTS` + `<TweaksPanel>` | Map tweak defaults to `paramsSchema` properties. **Delete** the panel UI and the postMessage listeners. |
| Top-level mock data constants | If data varies per task → read from `props.task.data` via `getField`. If static metadata (severity tables, colors) → keep inline. |
| Local region state (`const [spans, setSpans] = useState(...)`) | **Drop local state.** Read from `props.regions`; mutate via `addRegion`/`updateRegion`/`deleteRegion`. |
| Ranking/reorder list state | Use one region (`ranking-main`). Render from `rankingRegion._rankedUrls` only. Do not duplicate list state in `useState`. |
| NER/text span mocks | Convert each span to a region with absolute `_start`/`_end` and `_text`. See `references/text-spans.md`. |
| Image keypoints/clicks | Convert to one region per mark with `_x`, `_y`, `_hasCoords: true`. |
| `<link rel="stylesheet">` | Inline the contents as a `<style>` block rendered inside the component. |
| `@font-face` rules pointing to `fonts/` | Drop. Use system fonts: `font-family: ui-sans-serif, system-ui, sans-serif`. |
| `<img src="assets/icons/foo.svg">` | Inline SVGs as tiny React components or via `dangerouslySetInnerHTML`. |
| `getResults` / `parseResults` / `outputSchema` | Write these from scratch based on task fields and requested output. |

## React Version Gotchas

- **React 17 vs 18**: Claude Design prototypes target React 18, but the editor shell provides React 17. Avoid React 18-only features (such as `useId` or concurrent features).
- **Theme Detection**: Do not try to theme the parent shell. Theme detection inside the iframe should reference `data-color-scheme`.
- **Region ID Stability**: Prototype mocks often use simple IDs like `s1` or `s2`. Ensure newly created regions in event handlers mint stable unique IDs (`crypto.randomUUID()` or `span-${Date.now()}`) only inside event handlers—never inside render.
