# Triage pre-grooming baseline experiments

Manual experiments comparing how Haiku/Sonnet/Opus handle the
`triage-pre-grooming` skill on real Google Tasks.

## How a run is structured

Each run lives in its own directory:

```
01-bare-url/
  input.md       — the Google Task being triaged + why this case matters
  haiku.json     — proposal produced by Haiku
  sonnet.json    — proposal produced by Sonnet
  opus.json      — proposal produced by Opus
  findings.md    — what the spread tells us, what to iterate
```

`snapshot.json` (one level up) is the snapshot all runs share — re-fetch
when project state changes meaningfully.

## How runs are kicked off

Each model is dispatched as a subagent with the same prompt. The prompt:

1. Tells the agent to read `~/development/hub/hermes/skills/dispatch/triage-pre-grooming/SKILL.md`
2. Inlines the Google Task JSON (replacing what `jimbo-api google-task` would return)
3. Points at `snapshot.json` (replacing what `jimbo-api snapshot` would return)
4. Sets `user_context` (empty in baseline runs)
5. Asks for a JSON proposal in the agent's final response — no HTTP, no submit, no side effects

This is **not** the production path. Production = Boris-style polling loop +
`grooming-submit-triage` endpoint. These experiments isolate the prompt from
the plumbing so we can iterate on the prompt cheaply.

## Run index

| # | Case | Why | Outcome |
|---|---|---|---|
| 01 | Bare X/Twitter URL, no context | Worst-case sparse input — tests refusal to hallucinate | All 3 models converged on `note + bookmark + 1-2 questions`. See [01-bare-url/findings.md](./01-bare-url/findings.md). |
