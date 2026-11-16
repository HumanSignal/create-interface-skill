<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Interface Components: TextInput

## Interface Components: TextInput

`window.InterfaceComponents.TextInput` replaces classic `<TextArea>`. Props: `value`, `onChange(value)`, `onCommit(value)` (blur / Enter / Cmd+Enter), `placeholder`, `multiline`, `minRows`, `maxRows`, `minLength`, `maxLength`, `showCharacterCount`, `label`, `regionId`, `readOnly`. Compound members: `TextInput.Counter`, `TextInput.RegionBadge`.

Result: `{ type: "textarea", value: { text: ["..."] } }`. Per-region transcriptions (classic `perRegion`) reuse the **region's id** as the result id and are stored on the region as `_transcription`; emit them as an extra `textarea` result with the same `id` next to the region's own result.

```jsx
function SummaryField(props) {
  const TextInput = window.InterfaceComponents.TextInput;
  const region = (props.regions || []).find((r) => r._fromName === "summary" && r.type === "textarea");
  const [draft, setDraft] = React.useState(region ? (region._value.text || []).join("\n") : "");
  return (
    <TextInput
      label="Summary"
      multiline
      maxLength={500}
      showCharacterCount
      value={draft}
      onChange={setDraft}
      onCommit={(text) => upsertControlRegion(props, { fromName: "summary", toName: "text", type: "textarea", value: { text: text ? [text] : [] } })}
      readOnly={props.readOnly}
    />
  );
}
```
- Commit on `onCommit`, not every keystroke, so undo history stays readable.
