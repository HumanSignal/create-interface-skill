<!-- GENERATED from HumanSignal hs-platform services/lse/web/libs/interface-skills (FIT-2953). Do not edit here; edit the source modules — CI republishes on merge. -->

# create-interface-skill

Agent skill for building HumanSignal Interfaces (custom labeling screens for
Label Studio Enterprise) in your own editor or agent.

```bash
npx skills add humansignal/create-interface-skill --skill create-interface-skill -g -a claude-code   # or: -a codex / -a cursor
```

The content is generated from the same skill modules the in-app "Create with
Agent" assistant uses, so local and in-app generation follow identical rules.
When `LABEL_STUDIO_URL` and `LABEL_STUDIO_API_KEY` are configured, `scripts/resolve-flags.mjs`
queries `/api/interfaces/authoring-capabilities/` (falling back to `/feature-flags/` on older
releases) so organization capabilities (such as Interface Components, Data Collection,
and Scenarios) match your Label Studio server across flag rollouts and post-GA archival;
when offline or unconfigured, it defaults conservatively to Flag-OFF mode.
Do not open PRs against this repository; changes are made in hs-platform and
published automatically.
