<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Interface Components: RatingControl

## Interface Components: RatingControl

`window.InterfaceComponents.RatingControl` replaces classic `<Rating>`. Props: `value` (number | null), `onChange(value)`, `type` ("stars" | "likert" | "numeric"), `max` (classic `maxRating`), `min`, `step`, `labels` (value → caption), `allowClear`, `readOnly`, `hotkeys`. Compound members: `RatingControl.Stars`, `RatingControl.Likert`, `RatingControl.Numeric`.

Result: `{ type: "rating", value: { rating: 4 } }`.

**outputSchema:** declare the field with `"x-ls-type": "rating"` (JSON Schema `type: "integer"` alone expects a `number` result and will fail validation):
```json
{ "rating": { "type": "integer", "minimum": 1, "maximum": 5, "x-ls-type": "rating", "title": "Rating" } }
```

```jsx
function QualityRating(props) {
  const RatingControl = window.InterfaceComponents.RatingControl;
  const region = (props.regions || []).find((r) => r._fromName === "quality" && r.type === "rating");
  return (
    <RatingControl
      type="stars"
      max={5}
      allowClear
      value={region ? region._value.rating : null}
      onChange={(n) => upsertControlRegion(props, { fromName: "quality", toName: "text", type: "rating", value: { rating: n } })}
      readOnly={props.readOnly}
    />
  );
}
```
