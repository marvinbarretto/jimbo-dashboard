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
> 1. ~~**Get to the bottom of the LLM budget.**~~ **DONE 2026-09-01** — see
>    `docs/architecture/llm-billing-surfaces.md`. `usage` is lifetime, `limit`
>    is a weekly cap; no paradox. Real signal: **$5.00 left of $220** on one
>    shared OpenRouter account, ~$2–3/mo burn. Bulk jobs go via `claude -p`
>    on Max from here, not `chatCompletion`.
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

## The budget picture — SETTLED 2026-09-01

Full write-up, with per-key figures and re-measure commands:
**`docs/architecture/llm-billing-surfaces.md`**. The short version:

**The `usage $59.18 / limit $10` paradox was never a paradox.** `usage` is
*lifetime* spend on the key; `limit` is a **weekly** cap (`limit_reset:
"weekly"`), and `limit_remaining` is the enforcement signal. On both keys
`usage_weekly + limit_remaining == limit` exactly. Calls succeed because the
weekly window is barely touched.

**The real signal is account-level, and nothing watches it:**

```
OpenRouter account:  credits 220.00 / usage 215.00  →  $5.00 LEFT
combined burn:       $2.14–3.30 / month  →  ~7 weeks to 2.5 months
```

$3.30/mo is the account delta across two independent readings (usage 210.98 on
2026-07-26 → 215.00 today, 37d) — but that window opens on the day of the codex
flip, so it carries the tail of the old regime. $2.14/mo (`usage_monthly`,
trailing-30d) is the better forward number. Neither is precise; both say the
same thing — months, not weeks-to-a-crisis, but nothing is watching it.

**Both OpenRouter keys draw on that one balance** — jimbo-api ($0.23/mo) and
hermes ($1.91/mo) are different keys, same account, same pot. The earlier
framing of them as separate budgets was wrong. The ~£5/mo target covers both
and is comfortably met.

**Most of the fleet is already flat, so zero hurts less than assumed.** 30 of
32 active hermes crons carry an explicit per-job `provider: openai-codex` and
cost nothing. At $0 only `commission-worker` and `model-bakeoff` stop, plus
jimbo-api's `fast`/`balanced`/`powerful` tiers 402 down to the free chain.
(`fallback_providers: []` is true but misleading — there's no *automatic*
failover, yet the flat engine is already the pinned **primary** almost
everywhere.)

**The one cheap lever:** `commission-worker` runs **every 2h on `provider: null`**
— inheriting `model.default` = deepseek via OpenRouter, i.e. on the meter by
accident, and a large share of hermes' $1.91/mo. Pinning it to `openai-codex` in
`~/.hermes/cron/jobs.json` would leave a weekly bakeoff as the only metered
hermes **cron** traffic. Not done — production change on a third-party agent, so
it's your call.

**Interactive hermes stays on the meter regardless.** Telegram/Discord sessions
inherit `model.default` too; per-job pinning doesn't touch them. Today's
`usage_daily` $0.186 (≈$5.6/mo annualised) vs trailing-30d $1.91 says the burn is
bursty in a way 12 cron runs can't explain — that's interactive traffic.

**A fourth surface is unquantified**: hermes' `OPENAI_API_KEY` (TTS, Whisper,
image-gen) is real metered OpenAI spend outside the OpenRouter pot.

**Operating rule that falls out of this — carry it into the AC pass:** bulk jobs
run through `claude -p` on Max (flat), not `chatCompletion` (metered).
`backfill-skills.ts` cost $0.15 via OpenRouter; trivial alone, wrong reflex with
$5 of headroom, and the AC rewrite is bigger in both directions.

**Two questions only Marvin can answer:** is auto-topup on (the difference
between "stops in ~10 weeks" and "card gets charged")? and what does the OpenAI
key actually cost? Neither is readable from here.

Also found, both safe to delete: `GOOGLE_AI_API_KEY` in `/opt/jimbo-api.env`
has zero consumers anywhere (jimbo-api, dashboard, hub/boris, hermes), and
`~/.hermes/systemd.env` holds a stale copy of the *jimbo-api* OpenRouter key
that the live gateway does not use.


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
- **No static heuristic detects AC scorability.** Three attempts, three measured
  failures, 2026-09-01:
  1. *verb classifier* — the verb doesn't say whether work is code or prose;
  2. *the `ac.unfalsifiable` word list* — weak BOTH ways. False positives: seq
     3763 trips on "correctly" while naming "116 services, 64 routes"; seq 3979
     trips on "78 correctly-skipped sessions", where the word describes existing
     data. False negatives: seq 4099 "Backward compatibility approach explained"
     and seq 4581 "Formatting consistent" are unscorable and trip nothing;
  3. *anchor-rescue* (don't reject a soft word when the criterion names something
     checkable) — over all 3,073 criteria it "rescued" 47, but the path pattern
     was matching slash-separated prose: "Complexity/accuracy tradeoffs clearly
     stated", "How to run/invoke extraction logic clearly documented". ~2 of 8
     sampled rescues were real.

  The judge is the agent in the groom loop, not the regex. The gate's job is to
  nudge. Do not attempt a fourth variant — narrowing to backticks-only is the
  same mistake again.
