#!/usr/bin/env node
// GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-3446).
// Dynamically resolves per-user/per-org authoring capabilities from
// <LABEL_STUDIO_URL>/api/interfaces/authoring-capabilities/ (falling back to /feature-flags/ on HTTP 404
// for pre-FIT-3446 servers) and fails closed to Flag-OFF when unset, unauthorized, or offline.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const AUTHORING_CAPABILITIES_PATH = "/api/interfaces/authoring-capabilities/";
const CAPABILITY_SPECS = [
  {
    "stateKey": "interfacesComponentsEnabled",
    "capabilityKey": "interfaces_components",
    "flagKey": "fflag_interfaces_components",
    "parentFlagKey": null,
    "cliFlag": "interfaces-components",
    "envVar": "INTERFACE_SKILL_INTERFACES_COMPONENTS"
  },
  {
    "stateKey": "collectionEnabled",
    "capabilityKey": "collection",
    "flagKey": "fflag_feat_utc_1179_native_collection_submission_capabilities",
    "parentFlagKey": null,
    "cliFlag": "collection",
    "envVar": "INTERFACE_SKILL_COLLECTION"
  },
  {
    "stateKey": "scenariosEnabled",
    "capabilityKey": "scenarios",
    "flagKey": "fflag_feat_interfaces_scenarios",
    "parentFlagKey": "fflag_feat_all_optic_interfaces_short",
    "cliFlag": "scenarios",
    "envVar": "INTERFACE_SKILL_SCENARIOS"
  }
];
const CONSERVATIVE_STATE = {
  "interfacesComponentsEnabled": false,
  "collectionEnabled": false,
  "scenariosEnabled": false
};
const ALL_ON_STATE = {
  "interfacesComponentsEnabled": true,
  "collectionEnabled": true,
  "scenariosEnabled": true
};
const PATH_POOL = [
  "references/core-contract.md",
  "references/text-spans.md",
  "references/spatial-bounding.md",
  "references/video-frames.md",
  "references/schemas.md",
  "references/schemas-spatial.md",
  "references/example-classification.md",
  "references/example-ner.md",
  "references/example-audio.md",
  "references/example-spatial.md",
  "references/video-timeline.md",
  "references/styling-a11y.md",
  "references/components-enabled/core-contract.md",
  "references/components-enabled/spatial-bounding.md",
  "references/components-enabled/schemas-spatial.md",
  "references/components-enabled/example-classification.md",
  "references/components-enabled/example-ner.md",
  "references/components-enabled/example-audio.md",
  "references/components-contract.md",
  "references/label-picker.md",
  "references/choice-group.md",
  "references/taxonomy-tree.md",
  "references/text-input.md",
  "references/number-input.md",
  "references/datetime-input.md",
  "references/rating-control.md",
  "references/pairwise-ranker.md",
  "references/ranker-board.md",
  "references/answer-form.md",
  "references/region-list.md",
  "references/image-canvas.md",
  "references/video-canvas.md",
  "references/scene3d-canvas.md",
  "references/audio-canvas.md",
  "references/time-series-canvas.md",
  "references/media-transport.md",
  "references/text-canvas.md",
  "references/document-canvas.md",
  "references/components-enabled/styling-a11y.md",
  "references/template-audio-speech-processing.md",
  "references/template-computer-vision.md",
  "references/template-conversational-ai.md",
  "references/template-document-ocr.md",
  "references/template-images.md",
  "references/template-natural-language-processing.md",
  "references/template-ranking-and-scoring.md",
  "references/template-structured-data.md",
  "references/template-time-series-analysis.md",
  "references/template-video-object-tracking.md",
  "references/template-videos.md",
  "references/collection-upload.md",
  "references/scenarios.md"
];
const STATE_PATH_INDICES = {"0,0,0":[0,1,2,3,4,5,6,7,8,9,10,11],"1,0,0":[12,1,13,3,4,14,15,16,17,9,10,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49],"0,1,0":[0,1,2,3,4,5,6,7,8,9,50,10,11],"1,1,0":[12,1,13,3,4,14,15,16,17,9,50,10,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49],"0,0,1":[0,1,2,3,4,5,6,7,8,9,10,11,51],"1,0,1":[12,1,13,3,4,14,15,16,17,9,10,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,51,39,40,41,42,43,44,45,46,47,48,49],"0,1,1":[0,1,2,3,4,5,6,7,8,9,50,10,11,51],"1,1,1":[12,1,13,3,4,14,15,16,17,9,50,10,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,51,39,40,41,42,43,44,45,46,47,48,49]};
const RUNTIME_NOTES_POOL = ["- **Injected globals.** Beyond the `React` / hooks / `getField` globals listed in\n  `core-contract`, the sandbox injects `EditorUI` (the Screen-facing `@humansignal/ui` subset) and\n  `EditorDeps` (e.g. `EditorDeps.audioDecoder.WasmStreamingDecoder`, `EditorDeps.video.probeFrameRate`).\n- **Do not reference `window.InterfaceComponents`** (`AudioCanvas`, `useComponentHotkeys`) — they are\n  gated behind `fflag_interfaces_components`, which is off. Build audio interfaces with\n  `EditorDeps.audioDecoder.WasmStreamingDecoder` as shown in `core-contract` and `example-audio`, and\n  ignore any `InterfaceComponents` recipes in `reference.md`. The one exception is the Data Collection\n  surface (`window.InterfaceComponents.useCollectionSubmission`, `CollectionUploader`, `MediaCard`,\n  `serializeSubmissionRegions`), which is always available: follow `collection-upload` when it applies.\n- **`EditorUI` two-path trap.** `EditorUI` is injected only inside the runtime iframe, **not** in the\n  admin-time eval that extracts `paramsSchema`. A top-level `EditorUI` reference throws\n  `EditorUI is not defined` and silently breaks `paramsSchema` in Labeling Settings. Reference it inside\n  render only, or omit it and use inline styles with design tokens.\n- **Shell-owned behavior.** The labeling shell owns Submit/Update, undo/redo/reset, the Regions/Info/Relations\n  panels, region visibility, and comments. Drive them through the props and callbacks in `core-contract` and\n  `spatial-bounding` (`addRegion`, `updateRegion`, `deleteRegion`, `selectRegion`, `selectedRegionIds`,\n  hidden/locked state). Do not re-implement them in the screen: a custom Delete button, local-only region state,\n  or ignoring hidden state breaks the shell's panels and history.\n- **Compiler extraction.** The compiler turns the last parenthesized object literal into the module export. If the\n  file does not end with a bare `({ default: ... })`, the editor rejects it with\n  *\"Module missing 'default' function export.\"*\n- **No persistent storage.** `localStorage` / `sessionStorage` are in-memory shims that reset on every iframe\n  remount; persist only through the mutation callbacks and annotation results.\n- **Links.** `<a href=\"https://...\">` clicks and `window.open(url)` open in a new browser tab through the host\n  (https and `/` app paths only; `window.open` returns `null`). Pages that refuse framing, such as\n  sign-in-protected Google Docs, cannot be shown in an `<iframe>` inside the screen; link to them instead. Google\n  Docs deep-links only to headings (`#heading=h.…`) and bookmarks (`#bookmark=id.…`).\n- **Sample data.** Keep `task.json` compact and use the exact `default` task-data paths from every\n  `dataField` in `paramsSchema` / `inputSchema`.\n- **Saving to Label Studio.** Create or update the interface **only** with\n  `label-studio-sdk interface sync <dir> --title \"<Title>\" --publish` (new interface; add `--workspace <id>`\n  when needed) or `label-studio-sdk interface sync <dir> --message \"<change>\"` (existing one, tracked by the\n  sidecar file; that creates an unpublished draft, so add `--publish` when new projects should use it). `sync` extracts `inputSchema` / `outputSchema` / `paramsSchema` from the module and stores\n  them with the code. **Never** `POST` / `PATCH` `/api/interfaces/` yourself: the server cannot read the schemas\n  from the code, so a hand-built request saves an empty `output_schema` / `input_schema` without any error, and\n  projects created from the interface lose their Data Manager annotation filters. After syncing, confirm\n  `GET /api/interfaces/<id>/` returns a non-empty `output_schema`.","- **Injected globals.** Beyond the `React` / hooks / `getField` globals listed in\n  `core-contract`, the sandbox injects `EditorUI` (the Screen-facing `@humansignal/ui` subset) and\n  `EditorDeps` (e.g. `EditorDeps.audioDecoder.WasmStreamingDecoder`, `EditorDeps.video.probeFrameRate`).\n- **InterfaceComponents are enabled (`fflag_interfaces_components`).** For audio waveforms use\n  `const AudioCanvas = window.InterfaceComponents.AudioCanvas;` (see `audio-canvas`).\n  - **NEVER destructure `window.InterfaceComponents`** (`const { AudioCanvas } = window.InterfaceComponents;`) —\n    it is a dynamic-loading Proxy; destructuring breaks the proxy trap and causes chunk load failures.\n  - The component is `AudioCanvas`. **Never** use `window.InterfaceComponents.Audio` — it fails with a 404 chunk load error.\n  - Streaming / large audio: pass `decoderType=\"wasm-stream\"`. Multichannel: `splitChannels={true}`; regions\n    carry the channel as `_value.channel`.\n  - Never drop unlabeled regions (`if (!activeLabels.length) return;`); canvases create them with `labels: []`.\n  - **Every other component:** read `components-contract` first, then the component's module in\n    `control-components` / `canvas-components`. All canvases share the canonical region props (`regions`,\n    `selectedRegionIds`, `onAddRegion`, `onUpdateRegion`, `onDeleteRegion`, `onSelectRegion`, `activeLabels`,\n    `labelColors`, `fromName`, `toName`) and pass `props.regions` straight through — no mapping layer. Compound\n    members (`LabelPicker.Item`, `ImageCanvas.Toolbar`) work lazily.\n  - **Serialize with the component helpers, not hand-written serializers.** Every component chunk exports exact\n    classic-LS converters (`ImageCanvas.toImageResults` / `fromImageResults`, `VideoCanvas.toVideoResults`,\n    `AudioCanvas.toAudioResults`, `TextCanvas.toTextCanvasResults`, `TimeSeriesCanvas.toTimeSeriesResults`,\n    `DocumentCanvas.toDocumentResults`, controls' `to<X>Result`, `AnswerForm.answersToResults` /\n    `resultsToAnswers` / `attachAnswers` / `collectAnswerErrors`). Call them from `getResults` / `parseResults` /\n    `getValidationErrors` as `window.InterfaceComponents.<Component>.<helper>(...)` — full path, inside the function\n    body. The sandbox loads every chunk the Screen source references before it validates the module or hydrates\n    saved results, so the calls are synchronous; no `load()` / `getLoaded()` guards or fallback serializers. For\n    component names computed at runtime, export `requiredComponents: [\"AnswerForm\"]`. Worked example:\n    \"Serialization helpers\" in `components-contract`. Runtime-only code may still\n    `await window.InterfaceComponents.load(\"<Component>\")`.\n  - **Hotkeys:** export a `hotkeys` manifest (`hotkeys: { name, title, actions }`) in the trailing module object;\n    project settings register the shortcuts per project. Pass `hotkeys={props.hotkeys}` to `AudioCanvas`, or call\n    `const useComponentHotkeys = window.InterfaceComponents.useComponentHotkeys;` with\n    `assignedHotkeys: props.hotkeys` so project overrides apply with input suppression and conflict detection.\n- **`EditorUI` two-path trap.** `EditorUI` is injected only inside the runtime iframe, **not** in the\n  admin-time eval that extracts `paramsSchema`. A top-level `EditorUI` reference throws\n  `EditorUI is not defined` and silently breaks `paramsSchema` in Labeling Settings. Reference it inside\n  render only (`EditorUI.Typography`, `EditorUI.Button` at the point of use) and never destructure it, or omit it\n  and use inline styles with design tokens.\n- **Relations are shell-owned.** Before adding anything relation-related, read the **Relations (shell-owned)** block\n  in `core-contract`. In short: one `data-region-id` per painted region, `data-shell-layout-epoch` on transform\n  changes, clicks through `props.selectRegion`, \"Create relation\" = `props.setRelationLinkingSource(id)`, relation\n  labels via `paramsSchema.relationLabels`; never draw relation SVG, never pass `props.relations` into a canvas,\n  never wire a component `onAddRelation` to `props.addRelation`.\n- **Shell-owned behavior.** The labeling shell owns Submit/Update, undo/redo/reset, the Regions/Info/Relations\n  panels, region visibility, and comments. Drive them through the props and callbacks in `core-contract` and\n  `spatial-bounding` (`addRegion`, `updateRegion`, `deleteRegion`, `selectRegion`, `selectedRegionIds`,\n  hidden/locked state). Do not re-implement them in the screen: a custom Delete button, local-only region state,\n  or ignoring hidden state breaks the shell's panels and history.\n- **Compiler extraction.** The compiler turns the last parenthesized object literal into the module export. If the\n  file does not end with a bare `({ default: ... })`, the editor rejects it with\n  *\"Module missing 'default' function export.\"*\n- **No persistent storage.** `localStorage` / `sessionStorage` are in-memory shims that reset on every iframe\n  remount; persist only through the mutation callbacks and annotation results.\n- **Links.** `<a href=\"https://...\">` clicks and `window.open(url)` open in a new browser tab through the host\n  (https and `/` app paths only; `window.open` returns `null`). Pages that refuse framing, such as\n  sign-in-protected Google Docs, cannot be shown in an `<iframe>` inside the screen; link to them instead. Google\n  Docs deep-links only to headings (`#heading=h.…`) and bookmarks (`#bookmark=id.…`).\n- **Sample data.** Keep `task.json` compact and use the exact `default` task-data paths from every\n  `dataField` in `paramsSchema` / `inputSchema`.\n- **Saving to Label Studio.** Create or update the interface **only** with\n  `label-studio-sdk interface sync <dir> --title \"<Title>\" --publish` (new interface; add `--workspace <id>`\n  when needed) or `label-studio-sdk interface sync <dir> --message \"<change>\"` (existing one, tracked by the\n  sidecar file; that creates an unpublished draft, so add `--publish` when new projects should use it). `sync` extracts `inputSchema` / `outputSchema` / `paramsSchema` from the module and stores\n  them with the code. **Never** `POST` / `PATCH` `/api/interfaces/` yourself: the server cannot read the schemas\n  from the code, so a hand-built request saves an empty `output_schema` / `input_schema` without any error, and\n  projects created from the interface lose their Data Manager annotation filters. After syncing, confirm\n  `GET /api/interfaces/<id>/` returns a non-empty `output_schema`."];
const STATE_RUNTIME_NOTE_INDEX = {"0,0,0":0,"1,0,0":1,"0,1,0":0,"1,1,0":1,"0,0,1":0,"1,0,1":1,"0,1,1":0,"1,1,1":1};
const TEMPLATE_STEP = "When a `references/template-*.md` reference composition matches the request\n   (same data type and labeling task), start from it: reuse its component tree,\n   params → fields mapping and `getResults` / `parseResults` round-trip, and\n   write your own layout and copy. Use at most two, and none when nothing matches.";

function loadDotEnv(cwd) {
  const envPath = resolve(cwd, ".env");
  if (!existsSync(envPath)) return {};
  const out = {};
  try {
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const withoutExport = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
      const eq = withoutExport.indexOf("=");
      if (eq <= 0) continue;
      const key = withoutExport.slice(0, eq).trim();
      let val = withoutExport.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      } else {
        const hash = val.indexOf(" #");
        if (hash >= 0) val = val.slice(0, hash).trim();
      }
      out[key] = val;
    }
  } catch {
    // Ignore unreadable .env and fall back conservatively
  }
  return out;
}

function parseBool(value) {
  if (value === undefined) return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") return true;
  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") return false;
  return undefined;
}

function parseCliArgs(argv) {
  const out = { jsonOnly: false, overrides: {} };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") out.jsonOnly = true;
    else if (arg === "--flags-on") out.preset = "on";
    else if (arg === "--flags-off") out.preset = "off";
    else if (arg === "--url" || arg === "--lse-url") out.url = argv[++i];
    else if (arg.startsWith("--url=")) out.url = arg.slice(6);
    else if (arg.startsWith("--lse-url=")) out.url = arg.slice(10);
    else if (arg === "--token" || arg === "--api-key") out.apiKey = argv[++i];
    else if (arg.startsWith("--token=")) out.apiKey = arg.slice(8);
    else if (arg.startsWith("--api-key=")) out.apiKey = arg.slice(10);
    else {
      for (const spec of CAPABILITY_SPECS) {
        if (arg === "--" + spec.cliFlag) {
          out.overrides[spec.stateKey] = true;
        } else if (arg === "--no-" + spec.cliFlag) {
          out.overrides[spec.stateKey] = false;
        } else if (arg.startsWith("--" + spec.cliFlag + "=")) {
          out.overrides[spec.stateKey] = parseBool(arg.slice(spec.cliFlag.length + 3));
        }
      }
    }
  }
  return out;
}

function decodeHtmlEntities(input) {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function parseAuthoringCapabilitiesResponse(body) {
  const trimmed = String(body ?? "").trim();
  if (!trimmed || !trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    if (!parsed.capabilities || typeof parsed.capabilities !== "object" || Array.isArray(parsed.capabilities)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function evaluateCapabilitiesPayload(payload) {
  const caps = payload.capabilities ?? {};
  const knownKeys = new Set(CAPABILITY_SPECS.map((s) => s.capabilityKey));
  const state = { ...CONSERVATIVE_STATE };
  for (const spec of CAPABILITY_SPECS) {
    state[spec.stateKey] = caps[spec.capabilityKey] === true;
  }
  const unknownEnabledCapabilities = Object.keys(caps)
    .filter((k) => caps[k] === true && !knownKeys.has(k))
    .sort();
  return { state, unknownEnabledCapabilities };
}

function parseServerFeatureFlagsResponse(body) {
  const trimmed = String(body ?? "").trim();
  if (!trimmed) return null;
  const preMatch = trimmed.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  const candidate = preMatch ? decodeHtmlEntities(preMatch[1].trim()) : trimmed;
  if (!candidate.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(candidate);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isServerFlagActive(payload, flagName, defaultValue) {
  if (flagName in payload && typeof payload[flagName] === "boolean") {
    return payload[flagName];
  }
  return defaultValue;
}

function evaluateServerFlags(payload) {
  const defaultValue = payload.$system?.FEATURE_FLAGS_DEFAULT_VALUE === true;
  const state = { ...CONSERVATIVE_STATE };
  for (const spec of CAPABILITY_SPECS) {
    const raw = isServerFlagActive(payload, spec.flagKey, defaultValue);
    if (spec.parentFlagKey) {
      const parentGate =
        spec.parentFlagKey in payload
          ? isServerFlagActive(payload, spec.parentFlagKey, defaultValue)
          : defaultValue || raw;
      state[spec.stateKey] = parentGate && raw;
    } else {
      state[spec.stateKey] = raw;
    }
  }
  return state;
}

function normalizeServerBaseUrl(rawUrl) {
  const trimmed = String(rawUrl ?? "").trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    const cleanPath = parsed.pathname.replace(/\/+$/, "");
    return parsed.origin + cleanPath;
  } catch {
    return null;
  }
}

function parseJwtTokenType(token) {
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((p) => !p || !/^[A-Za-z0-9_-]+$/.test(p))) {
    return { isJwt: false };
  }
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const decoded = JSON.parse(json);
    return {
      isJwt: true,
      tokenType: typeof decoded?.token_type === "string" ? decoded.token_type : undefined,
    };
  } catch {
    return { isJwt: false };
  }
}

function normalizeRawApiKey(rawKey) {
  const trimmed = String(rawKey ?? "").trim();
  const match = trimmed.match(/^(Bearer|Token)\s+(.+)$/i);
  if (!match) return { token: trimmed };
  const scheme = match[1].toLowerCase() === "bearer" ? "Bearer" : "Token";
  return { schemeOverride: scheme, token: match[2].trim() };
}

async function fetchFromServer(rawUrl, rawKey) {
  if (!rawUrl || !rawKey) {
    return { state: { ...CONSERVATIVE_STATE }, source: "fallback", reason: "missing-credentials" };
  }
  const baseUrl = normalizeServerBaseUrl(rawUrl);
  if (!baseUrl) {
    return { state: { ...CONSERVATIVE_STATE }, source: "fallback", reason: "invalid-url" };
  }
  const { schemeOverride, token } = normalizeRawApiKey(rawKey);
  if (!token) {
    return { state: { ...CONSERVATIVE_STATE }, source: "fallback", reason: "missing-credentials" };
  }

  try {
    let authHeader;
    const jwtInfo = parseJwtTokenType(token);
    if (jwtInfo.isJwt && jwtInfo.tokenType !== "access") {
      const refreshRes = await fetch(baseUrl + "/api/token/refresh/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refresh: token }),
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
      });
      if (refreshRes.status === 200) {
        const refreshJson = await refreshRes.json();
        if (typeof refreshJson?.access === "string" && refreshJson.access.trim()) {
          authHeader = "Bearer " + refreshJson.access.trim();
        } else {
          return { state: { ...CONSERVATIVE_STATE }, source: "fallback", reason: "invalid-refresh" };
        }
      } else if (jwtInfo.tokenType === "refresh") {
        return {
          state: { ...CONSERVATIVE_STATE },
          source: "fallback",
          reason: "token-refresh-http-" + refreshRes.status,
        };
      } else {
        authHeader = (schemeOverride ?? "Bearer") + " " + token;
      }
    } else if (jwtInfo.isJwt || schemeOverride === "Bearer") {
      authHeader = "Bearer " + token;
    } else {
      authHeader = "Token " + token;
    }

    // 1. Primary semantic capability endpoint (preserves GA state after LaunchDarkly flag archival)
    const capRes = await fetch(baseUrl + AUTHORING_CAPABILITIES_PATH, {
      method: "GET",
      headers: { Authorization: authHeader, Accept: "application/json" },
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    if (capRes.status >= 300 && capRes.status < 400) {
      return { state: { ...CONSERVATIVE_STATE }, source: "fallback", reason: "redirect" };
    }
    if (capRes.status === 200) {
      const parsedCaps = parseAuthoringCapabilitiesResponse(await capRes.text());
      if (!parsedCaps) {
        return { state: { ...CONSERVATIVE_STATE }, source: "fallback", reason: "invalid-payload" };
      }
      const { state, unknownEnabledCapabilities } = evaluateCapabilitiesPayload(parsedCaps);
      return {
        state,
        source: "server",
        endpoint: "authoring-capabilities",
        ...(unknownEnabledCapabilities.length > 0 ? { unknownEnabledCapabilities } : {}),
      };
    }
    if (capRes.status !== 404) {
      return { state: { ...CONSERVATIVE_STATE }, source: "fallback", reason: "http-" + capRes.status };
    }

    // 2. HTTP 404 fallback: pre-FIT-3446 release servers (2.37 / 2.38) or LSO
    const res = await fetch(baseUrl + "/feature-flags/", {
      method: "GET",
      headers: { Authorization: authHeader, Accept: "text/html, application/json" },
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    if (res.status >= 300 && res.status < 400) {
      return { state: { ...CONSERVATIVE_STATE }, source: "fallback", reason: "redirect" };
    }
    if (res.status !== 200) {
      return { state: { ...CONSERVATIVE_STATE }, source: "fallback", reason: "http-" + res.status };
    }
    const parsed = parseServerFeatureFlagsResponse(await res.text());
    if (!parsed) {
      return { state: { ...CONSERVATIVE_STATE }, source: "fallback", reason: "invalid-payload" };
    }
    return { state: evaluateServerFlags(parsed), source: "server", endpoint: "feature-flags" };
  } catch {
    return { state: { ...CONSERVATIVE_STATE }, source: "fallback", reason: "network-error" };
  }
}

function stateSignature(state) {
  return CAPABILITY_SPECS.map((spec) => (state[spec.stateKey] ? "1" : "0")).join(",");
}

async function main() {
  const cli = parseCliArgs(process.argv.slice(2));
  const dotEnv = loadDotEnv(process.cwd());
  const readVar = (name) => process.env[name] ?? dotEnv[name];

  const envPresetOn = parseBool(readVar("INTERFACE_SKILL_FLAGS_ON"));
  const envPresetOff = parseBool(readVar("INTERFACE_SKILL_FLAGS_OFF"));

  let resolved;
  if (cli.preset === "on" || envPresetOn === true) {
    resolved = { state: { ...ALL_ON_STATE }, source: "override", reason: "flags-on" };
  } else if (cli.preset === "off" || envPresetOff === true) {
    resolved = { state: { ...CONSERVATIVE_STATE }, source: "override", reason: "flags-off" };
  } else {
    const baseUrl = cli.url ?? readVar("LABEL_STUDIO_URL") ?? readVar("LS_URL") ?? "";
    const apiKey = cli.apiKey ?? readVar("LABEL_STUDIO_API_KEY") ?? "";
    resolved = await fetchFromServer(baseUrl, apiKey);
  }

  const state = { ...resolved.state };
  let hasExplicitOverride = false;
  for (const spec of CAPABILITY_SPECS) {
    const envVal = parseBool(readVar(spec.envVar));
    const chosen = cli.overrides[spec.stateKey] ?? envVal;
    if (chosen !== undefined) {
      state[spec.stateKey] = chosen;
      hasExplicitOverride = true;
    }
  }
  const source = hasExplicitOverride ? "override" : resolved.source;

  const summary = {
    source,
    ...(resolved.endpoint ? { endpoint: resolved.endpoint } : {}),
    ...(resolved.reason ? { reason: resolved.reason } : {}),
    ...(resolved.unknownEnabledCapabilities ? { unknownEnabledCapabilities: resolved.unknownEnabledCapabilities } : {}),
    ...state,
  };

  if (cli.jsonOnly) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const sig = stateSignature(state);
  const pathIndices = STATE_PATH_INDICES[sig] ?? STATE_PATH_INDICES[stateSignature(CONSERVATIVE_STATE)] ?? [];
  const activePaths = pathIndices.map((idx) => PATH_POOL[idx]);
  const runtimeNoteIdx = STATE_RUNTIME_NOTE_INDEX[sig] ?? 0;
  const activeRuntimeNotes = RUNTIME_NOTES_POOL[runtimeNoteIdx] ?? RUNTIME_NOTES_POOL[0];

  const lines = [
    "## Resolved Feature Flags",
    "",
    "```json",
    JSON.stringify(summary, null, 2),
    "```",
  ];
  if (resolved.unknownEnabledCapabilities?.length) {
    lines.push(
      "",
      "> **Skill update available:** The server enabled newer authoring capabilities (" +
        resolved.unknownEnabledCapabilities.map((c) => "`" + c + "`").join(", ") +
        ") not bundled in this local skill copy. Existing capabilities work normally; run `npx skills add humansignal/create-interface-skill --skill create-interface-skill -g` to pull the latest modules when ready.",
    );
  }
  lines.push(
    "",
    "## Active References for This Session",
    "",
    ...activePaths.map((p) => "- `" + p + "`"),
  );
  if (state.interfacesComponentsEnabled) {
    lines.push("", TEMPLATE_STEP);
  }
  if (state.scenariosEnabled) {
    lines.push(
      "",
      "Author companion interaction tests in `scenarios.js` following `references/scenarios.md` and run `label-studio-sdk interface validate Screen.jsx --scenario scenarios.js` (if `label-studio-sdk interface validate --help` does not list `--scenario`, upgrade `label-studio-sdk` first).",
    );
  }
  lines.push(
    "",
    "## Active Runtime Notes",
    "",
    activeRuntimeNotes,
  );
  console.log(lines.join("\n"));
}

main();
