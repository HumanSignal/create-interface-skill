<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Interface Components: DateTimeInput

## Interface Components: DateTimeInput

`window.InterfaceComponents.DateTimeInput` replaces classic `<DateTime>`. Props: `value` (string | null in LS form), `onChange(value)`, `only` ("date" | "time" | "datetime" | "year" | "month"), `min`, `max`, `required`, `label`, `readOnly`.

Result: `{ type: "datetime", value: { datetime: "2024-01-31T10:30" } }` — keep the string exactly as emitted; never convert to a Date or a timezone.

```jsx
function IncidentDate(props) {
  const DateTimeInput = window.InterfaceComponents.DateTimeInput;
  const region = (props.regions || []).find((r) => r._fromName === "incident_date" && r.type === "datetime");
  return (
    <DateTimeInput
      label="Incident date"
      only="date"
      value={region ? region._value.datetime : null}
      onChange={(v) => upsertControlRegion(props, { fromName: "incident_date", toName: "text", type: "datetime", value: { datetime: v } })}
      readOnly={props.readOnly}
    />
  );
}
```
