# Create Labeling Interface Skill

Agent skill for building HumanSignal Interfaces: single-file JSX annotation
screens for Label Studio Enterprise. It can be installed into Claude, Codex,
Cursor, and other agents supported by the `skills` CLI.

Use this skill when you want an agent to create or iterate on a labeling UI,
including text classification, NER/span labeling, Document AI workflows, data
review screens, or conversions from React/Claude Design prototypes.

## Install

Install with the `skills` CLI:

```bash
npx skills add humansignal/create-interface-skill --skill create-interface-skill -g -a codex
```

Other supported agent targets:

```bash
npx skills add humansignal/create-interface-skill --skill create-interface-skill -g -a claude-code
npx skills add humansignal/create-interface-skill --skill create-interface-skill -g -a cursor
```

Restart your agent after installing.

## Use

Ask your agent to use the skill:

```text
Use $create-interface-skill to build an interface for classifying support tickets by urgency and product area.
```

The skill produces a single JSX module that ends with a parenthesized object
literal:

```jsx
({
  default: MyInterface,
  specVersion: 1,
  paramsSchema,
  outputSchema,
  getResults,
  parseResults,
})
```

## Start a Local Interface

If `label-studio-sdk` is installed, create a local interface directory first:

```bash
label-studio-sdk interface init ./my-interface
cd ./my-interface
```

This creates a small editable workspace:

```text
Screen.jsx
task.json
scenarios.js
```

- `Screen.jsx` is the interface source file.
- `task.json` is sample task data for local preview and validation.
- `scenarios.js` contains browser-driven interaction checks.

After the scaffold exists, ask your agent to edit `Screen.jsx` using this skill.

## Local Validation

If `label-studio-sdk` is installed, validate from a local interface directory:

```bash
label-studio-sdk interface validate .
```

Or validate a single file:

```bash
label-studio-sdk interface validate ./Screen.jsx
```

Preview locally:

```bash
label-studio-sdk interface preview .
```

Sync a draft back to Label Studio:

```bash
label-studio-sdk interface sync . --message "Describe the change"
```

Publish from the CLI when ready:

```bash
label-studio-sdk interface sync . --message "Describe the change" --publish
```

## Repository Layout

```text
SKILL.md
agents/openai.yaml
references/
  authoring-rules.md
  claude-design-conversion.md
  examples.md
  runtime-contract.md
  text-spans.md
```

`SKILL.md` contains the core workflow and hard rules. The reference files are
loaded by agents only when the task needs more detail.
