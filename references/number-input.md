<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Interface Components: NumberInput

## Interface Components: NumberInput

`window.InterfaceComponents.NumberInput` replaces classic `<Number>`. Props: `value` (number | null), `onChange(value)`, `min`, `max`, `step`, `slider`, `placeholder`, `required`, `label`, `readOnly`. Out-of-range input is clamped to `min`/`max`; clearing the field emits `null`.

Result: `{ type: "number", value: { number: 7 } }`.

Always pass `min` and `max` (and `step` when fractional): the field width and the slider's value slot are sized from them so the layout never shifts.

`step` is also a validation grid: a value off `min + k*step` shows "Value must be a multiple of 0.1". Use a fixed `step` only for values a person picks on that grid (a count, a 1–10 score). For continuous values the Screen fills itself — a playhead time, a region start/end, an X/Y coordinate, a yaw angle, anything measured or interpolated — pass `step="any"` (no grid; steppers move by 1), or a step that matches the data's real precision. Never pass `step={0.1}` or `step={0.01}` for a value your own code writes with more decimals. The −/+ steppers, hotkeys and the slider are built in; never wrap NumberInput in your own buttons or add a raw `<input type="number">` / `<input type="range">`.

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
