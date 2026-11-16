<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# Reference composition: Conversational AI & Dialogue Evaluation

## Reference composition: Conversational AI & Dialogue Evaluation (`conversational-ai`)

The ready system template `conversational-ai` already solves requests like this one with Interface Components.
Start from its composition: the same components, nesting, field mapping and result round-trip. This is a summary of the template, not its full Screen: adapt it to the request, and write your own layout, copy and styling under the rules above.

- Data types: conversation, chat, text, audio
- Capabilities: paragraph-labels, per-message-evaluation, conversation-evaluation, message-composer, likert-ratings, quality-choices

### Component tree

In `ConversationScreen`:
- MediaTransport
- AudioCanvas.Root
  - AudioCanvas.Viewport
- LabelPicker
- TextCanvas
- AnswerForm

### paramsSchema fields

- `dialogueField` (dataField): Conversation field (array of messages)
- `promptField` (dataField): Prompt text field (optional)
- `instructionsField` (dataField): Instructions field (optional)
- `audioField` (dataField): Audio URL field (optional)
- `nameKey` (string): Message speaker key (classic nameKey)
- `textKey` (string): Message text key (classic textKey)
- `objectName` (string): Conversation object name (to_name)
- `instructions` (string): Instructions
- `paragraphLabels` (labels): Paragraph labels (select text in a message; empty = none)
- `paragraphLabelsName` (string): Paragraph labels result name
- `granularity` (string): Paragraph label granularity (classic granularity)
- `controls` (array): Questions: scope | name | kind | question | options | required | when
- `messageRef` (string): Per-message result reference
- `candidateFields` (array): Candidate response data keys (optional)
- `composerRoles` (array): Roles the annotator can add messages as (empty = read-only conversation)
- `chatName` (string): Composed messages result name
- `minMessages` (integer): Minimum messages (0 = none)
- `maxMessages` (integer): Maximum messages (0 = none)

### Params → answer fields

```js
function buildFields(config) {
  return config.controls.map((control) => {
    const perMessage = control.scope !== "conversation";
    const field = {
      name: control.name,
      label: control.question,
      scope: perMessage ? "region" : "task",
      required: control.required,
      requiredMessage: perMessage
        ? `"${control.question}" is required for every evaluated message.`
        : `"${control.question}" is required.`,
    };
    // Per-message answers take the message region's to_name (task messages: objectName, composed: chatName).
    if (!perMessage) field.toName = config.objectName;
    const when = {};
    if (control.scope === "user" || control.scope === "assistant") when.role = control.scope;
    if (control.when) when.choice = { name: control.when.name, value: control.when.values };
    if (Object.keys(when).length) field.when = when;
    if (control.kind === "rating") {
      return { ...field, kind: "rating", props: { max: control.max, allowClear: true } };
    }
    if (control.kind === "text") {
      const props = { rows: control.rows, multiline: control.rows > 1, placeholder: control.placeholder };
      return { ...field, kind: "textarea", props };
    }
    return {
      ...field,
      kind: "choices",
      options: control.options,
      choice: control.kind,
      props: { layout: control.options.some((option) => option.length > 24) ? "vertical" : "chips" },
    };
  });
}
```

### Result round-trip

```js
function getResults(regions, relations, context) {
  const { TextCanvas, AnswerForm } = window.InterfaceComponents;
  const list = asList(regions).filter((r) => r && typeof r === "object");
  const spans = TextCanvas.toTextCanvasResults(list.filter(isSpanRegion), { fromName: "label", toName: "dialogue" });
  const messages = list.filter(isAuthoredMessage).map((region) =>
    withOrigin({
      value: { chatmessage: { ...(chatmessageOf(region) || {}) } },
      id: region.id,
      from_name: region._fromName || "chat",
      to_name: region._toName || "chat",
      type: MESSAGE_TYPE,
      origin: region._origin,
    }),
  );
  // With the shell params, answers to hidden questions (whenChoiceValue / role gates) are not submitted. Classic
  // drops them too, except a perRegion control under a gated <View> (Result.canBeSubmitted skips that case, e.g.
  // red-team refusal quality); here a hidden answer is never exported. Validators pass no params: nothing is gated.
  const params = context && context.params;
  const fields = params ? buildFields(resolveConfig(params)) : null;
  // A task message reloaded without its role (parsed without params) gets it from its answers, so the role gate
  // never drops an answer the annotator could see.
  const gated = fields
    ? list.map((region) =>
        isMessageRegion(region) && !isAuthoredMessage(region) && !region._messageRole
          ? { ...region, _messageRole: answeredRole(Object.keys(region._perRegion || {}), fields) }
          : region,
      )
    : list;
  const answers = AnswerForm.answersToResults(gated, {
    toName: DEFAULTS.objectName,
    ...(fields ? { fields, params } : {}),
  }).map(withOrigin);
  const links = AnswerForm.toRelationResults(relations);
  return [...spans, ...messages, ...answers, ...links];
}

function parseResults(results, ctx) {
  const { TextCanvas, AnswerForm } = window.InterfaceComponents;
  const list = asList(results).filter((r) => r && typeof r === "object");
  const config = resolveConfig(ctx && ctx.params);
  const labelColors = Object.fromEntries(config.paragraphLabels.map((l) => [l.name, l.color]));
  const parsed = AnswerForm.resultsToAnswers(list);
  const spans = TextCanvas.fromTextCanvasResults(parsed.rest, { labelColors });
  const origin = (res) => (res.origin && res.origin !== "manual" ? { _origin: res.origin } : {});
  const composed = parsed.rest
    .filter((res) => res.type === MESSAGE_TYPE && res.value && res.value.chatmessage)
    .map((res) => {
      const msg = { ...res.value.chatmessage };
      return {
        ...newRegion({
          text: `${msg.role || ""}: ${msg.content || ""}`,
          locked: res.readonly === true,
          score: typeof res.score === "number" ? res.score : null,
          _authored: true,
          _fromName: res.from_name,
          _toName: res.to_name,
          _value: { chatmessage: msg },
          _messageRole: String(msg.role || ""),
          ...origin(res),
        }),
        id: String(res.id),
      };
    });
  // A paragraph reference carries no role: a role-scoped answer on the message names it, so the question stays
  // visible and getResults keeps the answer (it drops answers whose `when.role` does not match).
  const fields = buildFields(config);
  // Answers on task messages: rebuild the message anchor from the reference geometry the answers carry.
  const anchors = parsed.orphans.map(({ id, toName, reference }) => {
    const role = reference.chatmessage
      ? String(reference.chatmessage.role || "")
      : answeredRole(Object.keys(parsed.perRegion[id] || {}), fields);
    const index = typeof reference.start === "string" && /^\d+$/.test(reference.start) ? Number(reference.start) : null;
    return {
      ...newRegion({
        text: "Message evaluation",
        _toName: toName,
        _value: reference,
        _messageRole: role,
        ...(index !== null ? { _messageIndex: index } : {}),
      }),
      id,
    };
  });
  const relations = AnswerForm.fromRelationResults(parsed.rest);
  return { regions: AnswerForm.attachAnswers([...spans, ...composed, ...anchors], parsed), relations };
}
```
