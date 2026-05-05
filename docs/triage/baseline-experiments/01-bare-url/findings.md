# Run 01 — findings

## Headline: all three models agree on the structural calls

| Field | Haiku | Sonnet | Opus | Verdict |
|---|---|---|---|---|
| `type` | `note` | `note` | `note` | ✓ unanimous, correct |
| `category` | `bookmark` | `bookmark` | `bookmark` | ✓ unanimous, correct |
| `ai_priority` | null | null | null | ✓ correctly null for non-task |
| `priority_confidence` | null | null | null | ✓ correctly null |
| `suggested_parent_id` | null | null | null | ✓ refused to hallucinate a project |
| `suggested_agent_type` | null | null | null | ✓ correctly null |
| `questions` count | 1 | 2 | 2 | — |

**This is a strong baseline.** A bare URL with no context is the case where models are most prone to (a) over-confident classification, (b) hallucinated parent project, (c) skipping clarifying questions to look decisive. None of the three did any of those.

## Where they differ

### Tag choices

- Haiku: `[bookmark, twitter, social-media]`
- Sonnet: `[bookmark, social-media, twitter, x-com]`
- Opus: `[bookmark, twitter, url-only]`

Sonnet's `x-com` is redundant with `twitter`. Opus's `url-only` is the most useful tag of the three — it's a meta-signal that this item arrived without context, which is exactly what downstream `vault-classify` would want to know. Worth amplifying in the skill prompt: encourage meta-tags about the *capture state* (`url-only`, `bare-title`) so future automated passes can distinguish "operator was lazy" from "operator had nothing to add".

### Question quality

- **Haiku** asked 1 combined question ("what's the tweet about + which project"). Decent but bundles two decisions.
- **Sonnet** asked 2, separating intent (note/idea/task?) from project. Cleanest.
- **Opus** asked 2, also separating intent from project but framed intent as save-for-later vs act-on. Slightly more concrete.

Sonnet wins on question quality at this case. Opus is close. Haiku adequate.

### Rationale style

- Haiku is terse (one short sentence).
- Sonnet matches the skill's "ONE sentence" rule cleanly.
- Opus runs slightly longer, mentioning multiple absent fields explicitly.

All three respected the rationale length constraint. None inflated to a paragraph.

## What this baseline tells us about the skill prompt

**Working well:**

- The locked taxonomy (`task | note | idea`) and `category: bookmark` mapping is being honoured.
- The "null priority for note/idea" rule is being honoured.
- The "don't guess parent_id" rule is being honoured — biggest risk avoided.
- The clarifying-questions framing is producing useful, decision-shaped questions.

**Weaknesses worth iterating on:**

1. **No model called out the `listTitle: "Test"` signal explicitly.** That list name is a hint that the operator was using this as a sandbox, not capturing real work. The skill could nudge models to read `listTitle` as a project hint when it's named, or as a "deprioritise" hint when it's "Test"/"Inbox"/etc.
2. **Tag conventions are inconsistent.** No project tags (correct here — none apply), but no shared convention for capture-state tags. Adding a "meta-tag rubric" to the skill (e.g. `url-only`, `title-only`, `bare-capture`) might let downstream skills filter on capture quality.
3. **No model used `idea` as the type.** That's correct here — a bare URL isn't an idea. But this run doesn't tell us whether the `idea` discrimination *works*. We need a contrasting case (e.g. "What if Jimbo could X?") to test that.

## Suggested next experiments

In rough order of value:

1. **A clear actionable task** — e.g. "Email Sarah re: Q3 budget" — to confirm `type: task` discrimination, priority calibration, and whether models suggest a sensible `suggested_agent_type: comms`.
2. **A speculative idea** — e.g. "What if focus sessions had a coach mode?" — to confirm `type: idea` discrimination and whether models avoid raising false-actionable priorities on it.
3. **A task that *could* fit a real active project** — pull a snapshot project name, write a task that obviously belongs to it (e.g. "Add tests to LocalShout event pipeline"), confirm `suggested_parent_id` resolves correctly.
4. **The same bare-URL with operator-supplied `user_context`** — e.g. `user_context: "tweet about agentic coding patterns, save for the AI workflow research"`. Confirm the skill weights operator context above its own inference.

## Minor friction caught during the run

- The subagents wrote prose around the JSON despite being asked for "just the JSON". I extracted the JSON for the persisted files. Worth tightening the prompt to "your final response is exactly one JSON object on its own — no markdown, no prose" if we want clean machine-parseable output downstream. Not a blocker for human-readable comparison.
- All three models successfully read the SKILL.md and snapshot from the filesystem when given paths. So our "subagent reads files" pattern works without needing to inline 65KB of snapshot in the prompt.
