<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Reference composition: Ranking & Scoring

## Reference composition: Ranking & Scoring (`ranking-and-scoring`)

The ready system template `ranking-and-scoring` already solves requests like this one with Interface Components.
Start from its composition: the same components, nesting, field mapping and result round-trip. This is a summary of the template, not its full Screen: adapt it to the request, and write your own layout, copy and styling under the rules above.

- Data types: text, image, audio, html, ranking
- Capabilities: pairwise-preference, ranker-buckets, rating, item-choices, nested-choices

### Component tree

In `RankingScoringScreen`:
- AnswerForm
  - PairwiseRanker
  - RankerBoard
  - AnswerForm.Field

### paramsSchema fields

- `instructions` (string): Instructions
- `instructionsField` (dataField): Instructions field
- `promptField` (dataField): Prompt / query field
- `promptKind` (string): Prompt kind
- `promptStyle` (string): Prompt style
- `promptTitle` (string): Prompt title
- `documentField` (dataField): Document field
- `documentTitle` (string): Document title
- `itemsField` (dataField): Items list field
- `itemFields` (array): Item fields
- `itemKind` (string): Item kind
- `itemTitles` (array): Item captions
- `answer` (string): Answer control
- `pairwiseName` (string): Pairwise name
- `pairwiseToName` (string): Pairwise to_name
- `pairwiseRequired` (boolean): Require a preference
- `leftLabel` (string): Left caption
- `rightLabel` (string): Right caption
- `choicesName` (string): Choices name
- `choicesToName` (string): Choices to_name
- `choicesTitle` (string): Choices title
- `choiceMode` (string): Choice mode
- `choicesFromItems` (boolean): Items are the choices
- `allowNested` (boolean): Nested choices
- `choicesRequired` (boolean): Require a choice
- `choices` (labels): Choices
- `rankerName` (string): Ranker name
- `rankerToName` (string): Ranker to_name
- `listTitle` (string): List title
- `buckets` (object): Buckets
- `defaultBucket` (string): Default bucket
- `ratingEnabled` (boolean): Show rating
- `ratingName` (string): Rating name
- `ratingToName` (string): Rating to_name
- `ratingTitle` (string): Rating title
- `maxRating` (integer): Max rating
- `ratingRequired` (boolean): Require a rating
- `extraChoices` (labels): Extra question choices
- `extraChoicesName` (string): Extra question name
- `extraChoicesToName` (string): Extra question to_name
- `extraChoicesTitle` (string): Extra question title
- `extraChoiceMode` (string): Extra question mode
- `commentEnabled` (boolean): Show rationale
- `commentName` (string): Rationale name
- `commentToName` (string): Rationale to_name
- `commentTitle` (string): Rationale title

### Params → answer fields

```js
function answerFields(params, nodes) {
  const specs = controlSpecs(params);
  const fields = [];
  if (params.answer === "choices") {
    const images = params.choicesFromItems && nodes.some((n) => n.item.imageUrl);
    const title = params.choicesTitle;
    fields.push({
      name: specs.choices.fromName,
      kind: "choices",
      toName: specs.choices.toName,
      label: title || "Selection",
      options: params.choicesFromItems ? itemChoiceOptions(nodes) : labelChoices(params.choices),
      choice: params.choiceMode === "multiple" ? "multiple" : "single",
      required: params.choicesRequired,
      requiredMessage: `Select at least one option${title ? ` for "${title}"` : ""}.`,
      props: {
        layout: !params.choicesFromItems || images ? "chips" : "vertical",
        renderChoice: images ? renderImageChoice : undefined,
      },
    });
  }
  if (params.ratingEnabled) {
    const title = params.ratingTitle || "Rating";
    fields.push({
      name: specs.rating.fromName,
      kind: "rating",
      toName: specs.rating.toName,
      label: title,
      required: params.ratingRequired,
      requiredMessage: `${title} is required.`,
      props: { type: "stars", max: params.maxRating },
    });
  }
  if (params.extraChoices.length > 0) {
    fields.push({
      name: specs.extraChoices.fromName,
      kind: "choices",
      toName: specs.extraChoices.toName,
      label: params.extraChoicesTitle || "Additional question",
      options: labelChoices(params.extraChoices),
      choice: params.extraChoiceMode === "multiple" ? "multiple" : "single",
      props: { layout: "chips" },
    });
  }
  if (params.commentEnabled) {
    fields.push({
      name: specs.comment.fromName,
      kind: "textarea",
      toName: specs.comment.toName,
      label: params.commentTitle || "Comment",
      props: { rows: 3, placeholder: "Explain your judgement" },
    });
  }
  return fields;
}
```

### Result round-trip

```js
function getResults(regions, _relations, context) {
  const { PairwiseRanker, RankerBoard, AnswerForm } = window.InterfaceComponents;
  const list = regions || [];
  const results = [];
  for (const region of list) {
    const options = { id: region.id, fromName: region._fromName, toName: region._toName, origin: region._origin };
    const result =
      region.type === "pairwise"
        ? PairwiseRanker.toPairwiseResult(region._value?.selected, options)
        : region.type === "ranker"
          ? RankerBoard.toRankerResult(region._value?.ranker, options)
          : null;
    if (!result) continue;
    if (typeof region.score === "number") result.score = region.score;
    if (region.locked) result.readonly = true;
    results.push(result);
  }
  const answers = list.filter((r) => r.type !== "pairwise" && r.type !== "ranker");
  // With the shell params, answers whose question is hidden are not submitted (classic); validators pass none.
  // Item-choice options come from the task, which getResults does not get; options do not gate anything.
  const params = context && context.params;
  return results.concat(
    AnswerForm.answersToResults(answers, params ? { fields: answerFields(withDefaults(params), []), params } : {}),
  );
}

function parseResults(results) {
  const { PairwiseRanker, RankerBoard, AnswerForm } = window.InterfaceComponents;
  const parsed = AnswerForm.resultsToAnswers(results);
  const controls = [];
  for (const res of parsed.rest) {
    const value =
      res.type === "pairwise"
        ? PairwiseRanker.fromPairwiseResult(res) && { selected: PairwiseRanker.fromPairwiseResult(res) }
        : res.type === "ranker"
          ? RankerBoard.fromRankerResult(res) && { ranker: RankerBoard.fromRankerResult(res) }
          : null;
    if (!value || !res.from_name) continue;
    const region = answerRegion(String(res.id ?? makeResultId()), res.type, value, res.from_name, res.to_name, res.origin);
    if (typeof res.score === "number") region.score = res.score;
    if (res.readonly === true) region.locked = true;
    controls.push(region);
  }
  return { regions: AnswerForm.attachAnswers(controls, parsed), relations: [] };
}
```
