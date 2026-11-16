<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Interface Components: NumberInput

## Interface Components: NumberInput

`window.InterfaceComponents.NumberInput` replaces classic `<Number>`. Props: `value` (number | null), `onChange(value)`, `min`, `max`, `step`, `slider`, `placeholder`, `required`, `label`, `readOnly`. Out-of-range input is clamped to `min`/`max`; clearing the field emits `null`.

Result: `{ type: "number", value: { number: 7 } }`.

Always pass `min` and `max` (and `step` when fractional): the field width and the slider's value slot are sized from them so the layout never shifts. The −/+ steppers, hotkeys and the slider are built in; never wrap NumberInput in your own buttons or add a raw `<input type="number">` / `<input type="range">`.

```jsx
function CountField(props) {
  const NumberInput = window.InterfaceComponents.NumberInput;
  const region = (props.regions || []).find((r) => r._fromName === "count" && r.type === "number");
  return (
    <NumberInput
      label="Objects in scene"
      min={0}
      max={100}
      step={1}
      value={region ? region._value.number : null}
      onChange={(n) => upsertControlRegion(props, { fromName: "count", toName: "image", type: "number", value: { number: n } })}
      readOnly={props.readOnly}
    />
  );
}
```
