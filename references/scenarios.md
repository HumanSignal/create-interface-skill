<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Interaction scenarios

> **Local authoring note:** `scenarios_create`, `get_current_scenarios`, and `run_scenarios` are the in-app agent's tools. When authoring locally, read and edit `scenarios.js` directly with your own tools, and run `label-studio-sdk interface validate Screen.jsx --scenario scenarios.js` to execute the suite; every other rule in this file applies unchanged.

## Interaction scenarios

Every newly generated interface MUST include a companion `scenarios.js` module. After the screen module validates,
create scenarios with `scenarios_create`, then call `run_scenarios` before ending the turn.

**Verify last.** A run reports on the artifacts as they are when it starts, and the user reads that report as the
state of the interface you handed back. So `run_scenarios` is the last thing you do to `Screen.jsx` or
`scenarios.js`: if you edit either one afterwards — including a one-line fix prompted by the run itself — run the
full suite again and summarize from that result. Running tests first and fixing the code after is a good way to
work, but ending there leaves a red report describing code you already replaced, which reads as a real failure.
Re-runs of a single scenario (`only`) do not settle the suite; finish on a run with no `only`.

**Writing tests never rewrites the interface.** When the request is about scenarios — generate tests, add a case,
cover this behavior, update the tests — `scenarios.js` is the only artifact you may edit. Do not call
`artifact_str_replace`, `artifact_rewrite`, or any other screen-module tool in that turn, not even to make a
failing scenario pass. Write scenarios that describe what the interface actually does; if a scenario still fails,
report it and stop — name the scenario, quote what it expected against what happened, and leave the choice to the
user through the Tests tab's "Fix Code" and "Update Tests" actions.

**Existing scenarios are the regression contract.** Before you change interface code, read them with
`get_current_scenarios` and keep them passing — they describe behavior the user already accepted. Update the
affected scenarios in the same turn only when the requested change intentionally changes that behavior, then rerun
them and state in plain words which assertions you changed and why. Never delete a scenario or weaken an assertion
to turn a run green.

`scenarios.js` is a standard ESM module with a default array:

```js
export default [
  {
    name: "selects an option",
    task: { id: 101, data: { text: "Example" } },
    params: {},
    initialRegions: [],
    initialRelations: [],
    selectedRegionIds: [],
    steps: {
      pick: (label) => `select the ${label} option`,
      confirm: "confirm the choice was serialized",
    },
    async run({ page, step, getResults }) {
      step.pick("Positive");
      await page.getByRole("button", { name: "Positive" }).click();

      step.confirm();
      const results = await getResults();
      if (results[0]?.value?.choices?.[0] !== "Positive") {
        throw new Error("Expected the Positive choice to be serialized.");
      }
    },
    expect: {
      visibleText: ["Positive"],
      results: [{ from_name: "sentiment", to_name: "text", type: "choices" }],
    },
  },
];
```

**Every scenario MUST declare `steps`.** They are how a reader follows a run and sees where a failure happened,
so a scenario without them reports only the harness phases and is not acceptable. Write one step per
user-observable move you would name when describing the test out loud — not one per `await` — and call each one
from `run` through `step.<key>()` immediately *before* the actions it covers. Use as many as the scenario needs;
there is no required number. A scenario running past roughly twenty steps should usually be split in two instead.

Declaration order is execution order, and the runner enforces it: every declared step must run exactly once and
unconditionally. Never put `step.<key>()` inside an `if`, inside a loop, or after an early return — hoist the
branch out or declare separate steps. Calling an undeclared step throws. A step value is either a label string or
a pure function returning one, which is rendered with placeholders before the run (`select the … option`) and
with real values after it. Step keys must not begin with `@`: that prefix is reserved for the harness phases
(`@serialize`, `@round-trip`, `@expect.visibleText`, `@expect.results`) appended to every scenario.

Use `task.data` for scenario-specific task inputs and `initialRegions`, `initialRelations`, and
`selectedRegionIds` for initial annotation state — or `initialResults` to start from already-serialized Label
Studio results instead. `readOnly: true` mounts the screen without write access, and `interfaces` and
`settings` are passed through to the shell for scenarios that depend on editor chrome.

The run context exposes `page`, `step`, `getResults`,
`parseResults`, `setParsed`, `getState`, `getOutputSchema`, and `getExport`. Assertions inside `run`
use explicit checks that throw an Error; declarative `expect.visibleText` and partial `expect.results` checks run
afterward. Supported locator and action APIs include `locator`, `getByRole`, `getByText`, `getByLabel`,
`getByPlaceholder`,
`getByTestId`, `getByTitle`, `getByAltText`, `click`, `fill`, `type`, `check`, `uncheck`,
`selectOption`, `press`, `hover`, `focus`, `textContent`, `inputValue`, `getAttribute`,
`boundingBox`, `isVisible`, `isEnabled`, `isDisabled`, `isChecked`, `count`, `first`, `last`,
`nth`, `filter`, `evaluate`, `evaluateAll`, and `waitFor`. Locators are strict: ambiguous matches fail.
`.locator()` is only on `page`: a locator cannot be chained with `.locator(...)` (the call throws a
TypeError). Scope with one selector — `page.locator("[data-a] [data-b]")` — or chain the `getBy*` queries, which
locators do support: `page.getByRole("group", { name: "Car color" }).getByRole("radio", { name: "Red" })`.
`filter` accepts only `{ hasText }`.

For interactions no locator expresses, `page` also exposes `mouse.move`/`down`/`up`/`click`/`dblclick` (canvas
drawing and drags — take coordinates from `boundingBox()`, never hardcode them), `keyboard.press` for
held-key and shortcut behavior, `evaluate`, `waitForFunction`, `waitForTimeout`, and `addStyleTag`.
Synchronize on `waitFor` or `waitForFunction`, not on `waitForTimeout` — a sleep either flakes or wastes
budget. Each scenario gets about 15 seconds total and each action about 5 seconds, and a scenario that overruns
is reported as a failure, so keep journeys tight rather than padding them with waits.

Use stable accessible roles, labels, names, and test IDs. Do not use network access, Node.js APIs, Playwright
imports, arbitrary browser globals, or direct DOM selectors when an accessible locator works.
