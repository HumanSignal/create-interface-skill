# Local preview (`label-studio-sdk interface preview`)

Use this reference when helping a user run or debug the SDK local Interfaces
playground (FIT-2869 thin local preview). Authoring rules for the JSX module
itself stay in `authoring-rules.md` and `runtime-contract.md`.

## What preview does

1. Resolves `Screen.jsx` (+ optional `task.json` / `sample.json`) from a
   directory or explicit paths.
2. Downloads **version-compatible** playground + sandbox static artifacts from
   the configured Label Studio Enterprise origin (first run / cache refresh).
3. Verifies fingerprints and stores them in an **origin- and protocol-scoped**
   user cache under the platform cache dir
   (`label-studio-sdk/interface-preview`).
4. Starts **two** listeners bound only to `127.0.0.1`:
   - **Host** — playground UI, localhost SSE for file updates, narrow Save BFF
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
- View-Only seats cannot mint the PAT needed for bootstrap or Save.
- Cookie SSO / OAuth / IAP browser bootstrap is out of scope for this path.

## Save from the playground

- Save can appear without a token, but create/update cannot succeed without
  valid API auth.
- The browser talks only to the local Save gateway. The gateway allowlists
  workspace lookup and interface create/update — it is **not** a general API
  proxy.
- After `pull`, Save updates the sidecar-bound interface id for that origin.
  A new scaffold creates an interface, then sticky-binds that id for later
  Update.
- Prefer `interface sync` / `pull` for durable draft/publish workflows; use
  playground Save while iterating visually.

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
6. Point users at `interface sync` when they need a published/draft version in
   the product UI.

Canonical CLI details also live in the SDK's `interface-cli.md` shipped with
`label-studio-sdk`.
