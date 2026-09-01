# LLM billing surfaces — what actually spends money

Measured 2026-09-01. Every number came from a live probe, not from memory and
not from the `costs` table. Re-measure with the commands at the bottom.

## The one number that matters

```
OpenRouter account:  total_credits 220.00
                     total_usage   215.00
                     REMAINING       5.00
```

Both OpenRouter keys draw on **this single balance**.

**Watched since 2026-09-01**: `jimbo-api/scripts/openrouter-balance-check.sh`,
daily at 07:40 UTC via `hc-run.sh openrouter-balance`. Curl + Telegram, no LLM,
£0 to run. Alerts below $3.00 and re-alerts daily while low (no dedup, on
purpose). It buys *notice*, not runway — auto-topup is off, so the alert is a
prompt to top up at openrouter.ai/settings/credits. Caveat: there is no
`HC_URL_OPENROUTER_BALANCE` in `/opt/healthchecks.env`, so `hc-run.sh` degrades
to a transparent exec wrapper and nothing watches the watcher — same as
`pr-reconcile` and `day-report`.

**Runway: roughly 7 weeks to 2.5 months.** The two defensible burn estimates
bracket it, and the gap between them is real rather than noise:

| estimate | window | source | runway |
|---|---|---|---|
| $3.30/mo | 37d, from the codex flip onward | account delta: usage 210.98 (2026-07-26) → 215.00 (2026-09-01) | ~6–7 weeks |
| $2.14/mo | trailing 30d | `usage_monthly`, both keys summed | ~2.3 months |

The $3.30 window opens on 2026-07-26 — the day 29 crons were flipped off
OpenRouter — so it still carries the tail of the old, expensive regime. The
$2.14 figure excludes that first week and is the better **forward-looking**
number; $3.30 is the honest **retrospective** average. Caveat on both:
`usage_monthly`'s window (calendar vs trailing-30d) is undocumented and was not
verified. Today being the 1st is weak evidence for trailing-30d — a calendar
window would read near-zero, and it reads $2.14.

## The four surfaces

| # | Surface | Meter | Current burn |
|---|---|---|---|
| 1 | Claude Max — all Boris/jeffrey dispatch (`claude -p`) | **flat** | £0 |
| 2 | ChatGPT/Codex — **30 of 32 active hermes crons** | **flat** | £0 |
| 3 | OpenRouter — jimbo-api key + hermes key, one shared $220 pot | metered | $2.14–3.30/mo |
| 4 | OpenAI platform key (hermes TTS/Whisper/image-gen) | metered, separate | **unquantified** |

**Correction to the previous handoff:** the two OpenRouter keys are not
independent budgets. Different keys, same account, one balance. The "~£5/month"
target covers both together and is met.

## The `usage $59.18 / limit $10` paradox — resolved

Never a contradiction; two different denominators.

- **`usage`** — lifetime cumulative spend on the key, since creation.
- **`limit`** — a **periodic** cap. `limit_reset: "weekly"` on both keys.
- **`limit_remaining`** — what is left *this week*. This is the enforcement signal.

The arithmetic proves it — `usage_weekly + limit_remaining == limit`, exactly:

```
jimbo-api key   0.001392 + 9.998608  = 10.00  ✓
hermes key      0.185746 + 29.814254 = 30.00  ✓
```

Calls succeed because the weekly window is barely touched. Lifetime `usage` is
not a budget signal and never was.

## Per-key detail

| | jimbo-api (`fp 708ac6db`) | hermes (`fp 28796fdf`) |
|---|---|---|
| weekly cap | $10 | $30 |
| left this week | $9.9986 | $29.8143 |
| this month | $0.2347 | $1.9062 |
| lifetime | $59.18 | $154.07 |
| expires | never | 2027-04-16 |

## Key provenance — why these are the right two keys

Keys were identified by SHA-256 fingerprint (first 12 hex of the digest of the
full value). No key value was read into a transcript — only digests, lengths,
and OpenRouter's own pre-redacted `label` field.

| fingerprint | found in | corroboration |
|---|---|---|
| `708ac6db4c64` | `/opt/jimbo-api.env`, and a stale copy in `~/.hermes/systemd.env` | lifetime $59.18 matches the figure the previous session probed; $0.235/mo matches the prior "~$0.40/mo, negligible" reading for jimbo-api |
| `28796fdf595c` | `~/.hermes/.env` | lifetime $154.07 against **$151 measured 2026-07-26** — same key, five weeks on |

Lifetime figures are the corroboration that matters: monotonic counters, both
lining up with independently-recorded prior measurements. The attribution is
not an assumption.

**Two provenance caveats, both benign:**

1. **`~/.hermes/systemd.env` holds a copy of the *jimbo-api* key**, not the
   hermes one. It is a stale duplicate: the live gateway process
   (`hermes_cli.main gateway run`) has **no `OPENROUTER_API_KEY` in its process
   environment at all** — checked via `/proc/<pid>/environ` — so it resolves the
   key at call time from `~/.hermes/.env`. Spend pattern confirms it ($0.186/day
   on the `.env` key vs $0.0014/day on the other). Worth deleting the duplicate.
2. **The account may hold keys beyond these two.** The two lifetimes sum to
   $213.25 against account `total_usage` of $215.00 — ~$1.75 on other or deleted
   keys. Enumerating needs a provisioning key. Irrelevant to the headline:
   **every key on the account draws the same $220 balance**.
3. **jimbo-api's key was verified from its env file, not from the live pm2
   process** (pm2 env dumps are off-limits). In principle pm2 could hold a stale
   key from an older start. Bounded as negligible: the lifetime figure matches
   the previous session's independent probe, the spend pattern matches its
   caller profile, and only $1.75 of account lifetime usage is unattributed.

## What actually spends, per surface

**jimbo-api (surface 3a, $0.23/mo)** — every caller of `chatCompletion()` in
`src/services/ai-models.ts`, hardwired to OpenRouter:

```
routes/ai-chat.ts          services/coach-food.ts
services/telegram-bot.ts   services/clarification-interpret.ts
services/google-tasks-refine.ts
services/url-triage.ts
```

Tiers: `fast` = `google/gemini-2.5-flash`, `balanced` = `anthropic/claude-sonnet-5`,
`free` = a non-Google/Anthropic fallback chain. Every tier has a fallback chain,
but all entries are OpenRouter models — a fallback does not escape the meter.

**hermes (surface 3b, $1.91/mo) — only two active crons are on the meter:**

| cron | schedule | provider | note |
|---|---|---|---|
| `commission-worker` | every 2h, **behind a wake-gate** (`script: dispatch_gate_boris.py`) | `null` → INHERIT `deepseek/deepseek-v4-flash` via OpenRouter | **on the meter by accident.** The gate aborts before the model when no commission is queued, so it only spends when it actually fires — but when it does, a *judgement-heavy* task (executing an approved commission dispatch) runs on the cheap metered model |
| `model-bakeoff` | weekly | explicit `openrouter` | deliberate — benchmarking OpenRouter models is its purpose |

The other **30 active crons carry an explicit per-job `provider: openai-codex`**
and cost nothing. `~/.hermes/config.yaml` still sets `model.default:
deepseek/deepseek-v4-flash` with `provider: openrouter`, so *inheriting* the
default means landing on the meter — which is exactly what `commission-worker`
does.

Because `commission-worker` is gated, the residual $1.91/mo is mostly **not**
crons at all.

**Interactive hermes is on the meter too.** Telegram/Discord sessions inherit
the same `model.default`, so they are not covered by the per-job cron pinning.
The arithmetic says they matter: today's `usage_daily` is $0.186 (≈$5.6/mo
annualised) against a trailing-30d `usage_monthly` of $1.91 — the day-to-day is
bursty in a way 12 cron runs cannot explain.

**Recommended action:** pin `commission-worker` to `openai-codex` / `gpt-5.5`
in `~/.hermes/cron/jobs.json` — the judgement tier, matching the phase-2
convention. The argument is as much **quality** as cost: the job that exists to
execute approved commissions is itself thinking on deepseek-v4-flash. That
leaves a weekly bakeoff as the only metered hermes **cron** traffic; interactive
sessions still inherit the metered default. Not done — production change on a
third-party agent, so it is Marvin's call.

Mechanism: per-job `provider`/`model` in `jobs.json`, edited under `_jobs_lock`
(there is no `--provider` CLI flag; `hermes cron edit` cannot do it). The old
`~/.hermes/scripts/pin_codex.py` helper is **gone** — that directory is
unbacked-up — but the procedure is documented and `jobs.json.bak-pre-codex-flip-*`
backups survive.

**Surface 4, unquantified** — `OPENAI_API_KEY` in `~/.hermes/.env`. Consumers
per grep: `tts_tool.py` (`gpt-4o-mini-tts`), `transcription_tools.py` (Whisper),
`image_generation_tool.py`, `delegate_tool.py` fallback. Real metered spend at
platform.openai.com, outside the OpenRouter pot and outside the £5 accounting.

## What breaks at zero

Less than the previous handoff assumed, because most of the fleet is already
flat.

- **jimbo-api degrades.** `fast`/`balanced`/`powerful` all 402; only tier `free`
  (`:free` model suffixes) still answers. This is the real damage.
- **Two hermes crons stop**: `commission-worker` and `model-bakeoff`.
- **30 hermes crons keep running** on the flat Codex subscription.
- **Dispatch is unaffected** — Claude Max, flat.

A note on a tempting misreading: `~/.hermes/config.yaml` does have
`fallback_providers: []`, so there is no *automatic failover* off OpenRouter.
But that understates the resilience, because for 30 of 32 crons the flat engine
is already the **primary**, pinned per-job. Failover being unwired only matters
for the two crons above.

## Operating rule

**Bulk jobs run through `claude -p` on Max (surface 1, flat), not through
`chatCompletion` (surface 3, metered).**

`backfill-skills.ts` routed 585 items via `chatCompletion` for $0.15 — trivial
in isolation, wrong reflex with $5 of headroom. The upcoming acceptance-criteria
rewrite (199+ items, longer prompts, more output) must not repeat it.

## `costs` table — not money

`provider='anthropic'` / `dispatch_turn` rows are **notional token estimates**.
Dispatch runs on the Max subscription (`boris/worker/claude-runner.ts:29` execs
`claude -p`; no `ANTHROPIC_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN` or
`~/.claude/.credentials.json` anywhere). Any "this run cost $X" derived from
those rows is effort, not spend. The table is also sparse — 1 row across 5
dispatches on 2026-08-30 — so use `dispatch_queue` timestamps for duration.

## Open questions for Marvin

1. **Is auto-topup enabled on OpenRouter?** Not readable via the API, and it is
   the difference between "everything degrades in ~7 weeks" and "the card gets
   charged." Check openrouter.ai/settings/credits.
2. **What does surface 4 cost?** A glance at platform.openai.com billing.
   Probing the key from here was blocked, and the usage API needs an org admin
   key regardless.
3. **Pin `commission-worker` to codex?** See above — near-total elimination of
   metered hermes spend, one field in `jobs.json`.

## Housekeeping found on the way

- `GOOGLE_AI_API_KEY` in `/opt/jimbo-api.env` has **zero consumers** — nothing in
  jimbo-api, dashboard, hub/boris, or hermes, and no `generativelanguage` /
  `@google/generative` call anywhere. Dead credential.
- `~/.hermes/systemd.env` holds a stale duplicate of the jimbo-api OpenRouter key
  that the live gateway does not use.

## Re-measuring

```sh
# account balance — the number that matters
ssh vps 'K=$(sudo grep "^OPENROUTER_API_KEY=" /opt/jimbo-api.env | sed "s/^OPENROUTER_API_KEY=//" | tr -d "\"\r\n"); \
  curl -s -H "Authorization: Bearer $K" https://openrouter.ai/api/v1/credits'

# per-key window — read limit_remaining, never usage
ssh jimbo 'K=$(grep "^OPENROUTER_API_KEY=" ~/.hermes/.env | sed "s/^OPENROUTER_API_KEY=//" | tr -d "\"\r\n"); \
  curl -s -H "Authorization: Bearer $K" https://openrouter.ai/api/v1/auth/key'

# which crons are still on the meter
ssh jimbo 'python3 -c "import json,collections; d=json.load(open(\"/home/jimbo/.hermes/cron/jobs.json\")); \
  jobs=d if isinstance(d,list) else list(d.values()); \
  print(collections.Counter((\"paused\" if j.get(\"paused\") else \"active\", j.get(\"provider\") or \"INHERIT\") for j in jobs if isinstance(j,dict)))"'
```
