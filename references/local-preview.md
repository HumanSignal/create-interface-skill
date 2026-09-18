# Local preview (`label-studio-sdk interface preview`)

Use this reference when helping a user run or debug the SDK local Interfaces
playground (FIT-2869 thin local preview, **preview-only** — no playground Save).
Authoring rules for the JSX module itself stay in `authoring-rules.md` and
`runtime-contract.md`.

> Variant note: this skill copy matches the hs-platform stack **without** the
> Save BFF layer (stop after runtime). A parallel skill PR documents the world
> **with** playground Save + narrow BFF.

## What preview does

1. Resolves `Screen.jsx` (+ optional `task.json` / `sample.json`) from a
   directory or explicit paths.
2. Downloads **version-compatible** playground + sandbox static artifacts from
   the configured Label Studio Enterprise origin (first run / cache refresh).
3. Verifies fingerprints and stores them in an **origin- and protocol-scoped**
   user cache under the platform cache dir
   (`label-studio-sdk/interface-preview`).
4. Starts **two** listeners bound only to `127.0.0.1`:
   - **Host** — playground UI and localhost SSE for file updates (no Save BFF)
   - **Sandbox** — isolated editor-shell iframe
5. Both origins use unguessable **capability** URL prefixes. Print them for the
   user but treat them as workstation-local secrets (do not paste into tickets,
   chats, or public docs).

Live reload is **localhost SSE only**. It does not use Django playground
streams, Redis, Streamer, WebSockets, or long-lived Label Studio connections.

## Auth and credentials

Set once per shell (or pass `--lse-url` / `--token`):

```bash
export LABEL_STUDIO_URL="https://app.humansignal.com"
export LABEL_STUDIO_API_KEY="YOUR_API_KEY"
```

Rules:

- The API key stays in the **CLI process**. It is never placed in browser JS,
  HTML, query parameters, or local storage.
- First uncached download probes auth (`whoami`) and **fails closed** on
  `401`/`403` when no verified cache exists (no anonymous asset bootstrap).
- Later starts may revalidate the manifest; if LSE is unreachable or auth fails
  but a verified cache exists, preview can start from cache with a stale-artifact
  warning.
- `--offline` skips network entirely and **requires** a verified cache.
- Protocol mismatch between SDK and LSE fails **before** the browser opens.
- View-Only seats cannot mint the PAT needed for first-run bootstrap or `sync`.
- Cookie SSO / OAuth / IAP browser bootstrap is out of scope for this path.

## No Save in the playground — use `sync`

In this configuration the local playground is a **viewer/editor with live
reload only**. The Save control is disabled/hidden. Agents must not instruct
users to create or update interfaces from the preview UI.

To create or update a draft on Label Studio after iterating locally:

```bash
# From the interface directory (sidecar picks up prior pull/sync ids when present)
label-studio-sdk interface sync . --message "Describe the change"

# Publish when ready
label-studio-sdk interface sync . --message "Describe the change" --publish
```

Typical loop:

1. `interface preview .` — edit JSX / `task.json`, watch localhost live reload.
2. Keep preview open or stop it; run `interface sync` in the terminal.
3. Open the interface in LSE to review the draft / published version.
4. Optional: `interface pull` before the next session to refresh the sidecar.

`sync` / `pull` / `start` remain authenticated server operations. Preview never
proxies arbitrary Label Studio APIs from the browser.

## Proxy / allowlist notes

Customers who lock down static paths need access to:

- `/react-app/local-playground/`
- `/react-app/editor-standalone/`

Or they must populate the preview cache from a reachable instance before going
air-gapped / `--offline`.

## Agent checklist

When the user asks to preview locally:

1. Confirm `label-studio-sdk` is on `PATH` and Node/npm exist (`interface doctor`).
2. Confirm `LABEL_STUDIO_URL` + `LABEL_STUDIO_API_KEY` for first run.
3. Run `interface preview .` from the scaffold directory (or pass file + `--task`).
4. If auth fails with an empty cache, stop — do not invent ORM/API workarounds.
5. If offline/air-gapped, verify a prior successful warm cache or use `--offline`
   only after one successful online run.
6. When they need a draft or published version in the product UI, run
   `interface sync` (never playground Save). Add `--publish` only when asked.

Canonical CLI details also live in the SDK's `interface-cli.md` shipped with
`label-studio-sdk`.
