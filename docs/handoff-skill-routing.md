# Next session — skills, chaining, and the budget picture

Paste the block below to start. Everything under it is the evidence behind it.

---

## Starter prompt

> Last session made 585 vault items routable (606 unroutable → 59) and fixed the
> decompose skill, which had been teaching a shape the server rejects since
> 2026-08-13. Read `docs/handoff-skill-routing.md` first.
>
> Four things to work on, roughly in this order:
>
> 1. **Get to the bottom of the LLM budget.** I don't have a clear picture of
>    what spends money and what doesn't. Some of it is now verified (below);
>    the OpenRouter key reports `usage $59.18 / limit $10` and calls still
>    succeed, which doesn't parse. Establish the real picture across all three
>    engines before anything else assumes one.
> 2. **Acceptance-criteria quality.** 199 of the 585 routable items have
>    criteria no cold agent can score ("clearly organised", "works correctly").
>    That is what stands between "dispatchable" and "comes back good". This
>    rewrites existing text, so dry-run and review before writing.
> 3. **The 59 abstains say which skill is missing** — they cluster into
>    deploy/ops and verify-in-environment. Worth building.
> 4. **Skill design questions I want to think through:** should some vault tasks
>    chain skills rather than take one? Some abstains ("code review, refinement
>    and sign-off") are phases that only exist once a PR does. And
>    https://github.com/mattpocock/skills is worth forking/adapting from.
>
> m2 is unreachable over Tailscale and running stale skills — the decompose lane
> is paused with a calendar reminder for Fri 4 Sep.

---

## What shipped (all deployed)

jimbo-api `1932cbd`..`5ae210a`, hub `b455165`.

| | |
|---|---|
| `GET /api/skills/routable` | the commissionable menu, 687 bytes vs 262KB for the full listing. Opt-in via `metadata.routable` in hub frontmatter |
| `suggested_skill` validated | at submit, as a legibility rule, so it reuses the fixable-400 path. Absent = legitimate abstain |
| parent-level `suggested_skill` | an atomic submit had nowhere to put one, so re-grooming a leaf produced another unroutable leaf |
| `grooming_submit_rejections` | rejection rounds were invisible; this is why the regression took an audit to find |
| ready gate requires a skill | agent-owned leaf with none parks as a blocking question instead of silently landing on the unroutable gate |
| `scripts/decompose-cohort.sh` | before/after comparison around a cutover |
| `scripts/backfill-skills.ts` | the one-time routing migration, dry-run by default |
| `vault-decompose` SKILL.md | rewritten to mirror the gate; every example verified against the real `checkLegibility` |

## The budget picture — verified vs unknown

This is the item to settle first, because two of tonight's decisions rested on
assumptions about it.

**VERIFIED tonight (not inherited from memory):**

- Dispatch work runs `claude -p` on the **Claude Max subscription — flat, no
  marginal cash**. Confirmed three ways: `boris/worker/claude-runner.ts:29`
  literally execs `claude -p --model … --output-format json`; there is no
  `ANTHROPIC_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN` or `~/.claude/.credentials.json`
  anywhere (so it is keychain/subscription auth); and the m4 worker run on
  2026-08-30 completed two haiku dispatches with no Anthropic key in its env.
- Therefore **the `costs` table's `provider='anthropic' / dispatch_turn` rows are
  notional token estimates, not spend.** Any "this run cost $X" figure derived
  from them is effort, not money. `decompose-cohort.sh` says so in its header.
- `chatCompletion()` in `src/services/ai-models.ts` is hardwired to OpenRouter
  (`process.env.OPENROUTER_API_KEY`). Tier `fast` = `google/gemini-2.5-flash`.
  Every caller of it is real metered spend.

**UNKNOWN / needs investigation:**

- `GET https://openrouter.ai/api/v1/auth/key` reports **`usage $59.18 / limit $10`**
  and calls still succeed. That does not parse — either `limit` is not a hard cap,
  or it means something other than what it looks like. Establish what these fields
  actually mean before treating either as a budget signal.
- There are **at least three billing surfaces** and they are routinely confused:
  1. Claude Max (flat) — all Boris/jeffrey/kipper dispatch
  2. OpenRouter via jimbo-api's key — every `chatCompletion` caller
  3. Hermes crons — their own key in `~/.hermes/.env`, plus a ChatGPT/Codex
     subscription that is flat and does NOT hit OpenRouter
  The "~£5/month budget" belongs to (2) and (3), never to (1).
- `costs` telemetry is **sparse and unreliable**: 1 row across 5 dispatches on
  2026-08-30. Do not compute per-run cost or duration from it; use
  `dispatch_queue` timestamps instead.

**A choice worth revisiting:** `backfill-skills.ts` routes via OpenRouter
(`chatCompletion`) because that was the ready-made in-process path — 585 items,
$0.15. It could have run flat through `claude -p`. Trivial here; the same reflex
on the AC pass and future bulk jobs is worth fixing first.

## Where the vault actually stands

```
code/pr-from-issue                 251
research/structured-investigation  202
write/draft-doc                    121
(unroutable)                        59
extract/data-extraction              6
code/doc-refresh                     5
```

606 → 59 unroutable, ~$0.15. Review page for all 556 JIM decisions with their
reasoning: https://claude.ai/code/artifact/6e196dbb-1c33-41ec-b615-b7d4f98109ae

**But routing is only half of "ready for execution."** Measured over the 585
routable items with the real `checkLegibility`:

```
585 routable items — 0 pass the shape gate

  body.missing_now       584  100%    ← formatting convention, low impact
  body.missing_do        584  100%    ← same
  body.lead_too_long     537   92%
  title.activity_shaped  457   78%
  ac.unfalsifiable       199   34%    ← THIS is the one that matters
  ac.count               106   18%
```

Do not read 0% as an alarm. `vault-legibility.ts` says explicitly that shape was
kept out of `readyGateMissing` because "applying shape retroactively would
un-ready hundreds of existing items" — that decision stands, and the `**Now**`/
`**Do**` failures are cosmetic on pre-existing work.

The real finding is **199 items with acceptance criteria a cold agent cannot
score.** A commissioned agent gets that text verbatim and cannot tell when it is
done; the review queue cannot verify it either. That is the original handoff's
"74 of 92 criteria are subjective", now measured across the whole set.

## The 59 abstains are the skill gap

Abstaining was made a first-class answer deliberately, and it paid off. The
remaining 59 cluster into two families no current skill covers:

```
deploy / ops          Deploy rewritten foundry-connector SKILL.md to local and VPS
                      Configure VPS cron to enqueue Briefing v2 dispatch jobs
                      Edit foundry-connector cron on VPS from daily to weekly
                      Pause the legacy hermes-daily-briefing cron job

verify in environment Test Jimbo bot can post a message to #jimbo-questions
                      Trigger first weekly run and confirm successful completion
                      Test and verify the end-to-end Briefing v2 pipeline
                      Deploy tested code to staging and verify manually
```

A third group is **not** a missing skill: "Code review, refinement, and sign-off",
"Refine implementation and complete code review". These are phases that only
exist once a PR does — decomposition cut them too fine. That is evidence for the
chaining question, arrived at from data rather than theory.

The nine boris-executable skills are the whole menu; the four not flagged
`routable` are flow-bound and could not take an arbitrary leaf
(`project/synthesise-understanding` needs completed recons,
`research/travel-planning` advances one phase of a trip epic,
`think/assertion-scan` is a scheduled scan, `write/day-report` writes a finished
day). Widening the flag would not have rescued a single abstain.

## m2 — stale, unreachable, and the lane is paused

m2 (`marvins-macbook-air`) runs the jeffrey groomer. It is **running a stale hub
checkout**, proven by a controlled comparison on the same note:

| | m2 (dispatch 4923) | m4 (dispatch 4925) |
|---|---|---|
| round 1 | 7 rules, incl. `title.activity_shaped` | 4 rules, no `title.activity_shaped` |
| round 2 | 2 rules, still `title.activity_shaped` | 1 rule (`ac.count`) |
| outcome | `reaper: timeout` at 1711s | completed in 146s |
| round gap | 15 minutes | 36 seconds |

`title.activity_shaped` is what the rewrite front-loads hardest. m4 never trips
it; m2 fails it twice and dies.

- SSH times out; Tailscale shows it flapping (`rx 0`, rising `tx`); not on the LAN.
- **`pipeline.decompose_items_per_tick` is set to 0** so m2 stops burning items'
  `retry_count` toward the cap of 2 (20 were already stuck there). Calendar
  reminder for Fri 4 Sep 09:00 carries the verification and re-enable commands.
- m4 can run the groomer on demand — that is how 4925/4926 ran. It needs
  `ln -sfn ~/development/hub/hermes/skills/dispatch ~/development/hub/skills/dispatch`
  (created 2026-08-30; the symlink is made only by jimbo-api's `deploy.sh` on the
  VPS and is not in git), env from `hub/.env`, `BORIS_WORKER_EXECUTOR=jeffrey`,
  `BORIS_SWEEP_FROM_EXECUTOR=''`, and its own `BORIS_WORKER_HEARTBEAT_KEY`.
- Grooming cannot be handed to `kipper` — that worker uses `OllamaRunner` against
  local Ollama, which the pump explicitly rejects for the judgement-heavy stage.

## Improvements not yet done

- **Version-stamp the skill on each dispatch.** `dispatch_prompt` is NULL for
  groom rows and nothing records which SKILL.md version ran, so establishing that
  m2 was stale needed a cross-machine experiment. `decompose-cohort.sh` uses a
  cutover timestamp as its cohort key and is currently comparing populations it
  cannot distinguish. Everything else about skill iteration is unmeasurable until
  this exists.
- **A drift test**: parse the SKILL.md's stated limits (70 / 3–5 / 160 / 1200) and
  assert they match the `vault-legibility.ts` constants. Would have caught the
  2026-08-13 regression at commit time. Skips where hub is absent, so a local
  guard rather than CI-enforced.
- **Two disagreeing timeouts**: `timeout_minutes: 10` in the skill frontmatter vs
  `pipeline.stale_minutes: 20`. Observed round latency on m2 was ~15 min, so a
  run needing two rounds died by arithmetic. Neither number matches reality.
- **`/api/snapshot` is 41KB**, fetched on every decompose run — the same class of
  waste as the 262KB skills listing, and of doubtful value for decomposition.
- **The reaper cannot distinguish** "never submitted" from "submitted and
  grinding" — both report `reaper: timeout`. The rejections table now makes that
  distinguishable; the message should say which.

## Decisions already made — don't relitigate

- **Abstain is first-class.** An item no skill fits stays on the unroutable gate
  where it is visible. That pile is the evidence for what to build next; forcing
  a choice routes work to a program that cannot do it.
- **Backfill, not a pipeline stage.** Decompose now names the skill itself and
  the ready gate refuses leaves without one, so the pile cannot refill.
- **Not a re-groom through decompose.** Decompose SPLITS: on seq 3748 it turned
  one ready leaf into four ungroomed children. Right verb for new work, wrong one
  for a backlog you want to route rather than multiply.
- **No regex classifier.** Measured: "Write integration test" is code, "Write the
  outreach template" is prose. The verb carries no signal.
