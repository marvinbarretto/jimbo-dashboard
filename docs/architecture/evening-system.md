# The evening system — schema & endpoints

Three surfaces, one design rule, and the data model that has to be right before any of it
gets built.

**The rule:** the fleet prepares in silence and never asks. Scheduled Telegram nudges were
answered **2/44 (5%)** over 21 Jul–5 Aug; the same questions asked at a boundary Marvin had
just crossed were answered **10/10**. That number is already load-bearing — it's written
into `20260805130000_day_checks.sql` and into the `day-debrief` skill, which explicitly
forbids building a cron that asks these questions. Everything below is a **pull** surface
that Marvin opens, fed by jobs that write rows and send nothing.

---

## 0. What already exists — do not rebuild

| Thing | Where | Verdict |
|---|---|---|
| Per-job run health, classified | `agent_runs_classified` view over `system_events` where `kind='agent.end'` | **Reuse.** Gives job_name, model, outcome, tokens, duration, cost |
| Rollup / tail / ratings API | `GET /api/agent-runs/{rollup,tail,ratings}`, `PUT /ratings/{job_name}` | **Reuse.** The cost-and-health half of the jobs page is already shipped |
| Keep/watch/cut verdicts | `agent_job_ratings` | **Reuse.** Only 2 rows exist (`intake-quality: watch`, `status-pulse: keep`) |
| Goals, formally | `interrogate_goals` + full CRUD at `/api/interrogate/goals` incl. `PATCH /{id}/close` | **Reuse — it's empty, not missing** |
| Goal evidence | `interrogate_evidence`, `entity_type='goal'`, stance supports/contradicts, weight | **Reuse.** This is the progress substrate |
| Day authoring | `day_check_defs` / `day_check_entries`, logical-day keyed | **Reuse.** Sets the schema house style |
| Day reconstruction | `day-debrief/gather.py` | **Reuse.** Don't reimplement the digest |
| Bespoke response ledgers | `mood_log` (sent/answered), `coach_nudges` (pushed/action), `assignment_pushes` (pushed/resolved) | **Reuse via a view** — see §1 |

**What genuinely doesn't exist:** any record that Marvin *responded* to a job, for any job
without its own bespoke table. And nothing persists inbound Telegram messages at all —
`services/telegram-bot.ts` dispatches updates to handlers and writes no log of its own.

---

## 1. Jobs — "is it earning its keep?"

### Mockup

```
┌ FLEET ─────────────────────────────── last 14 days ─── [14d][30d][90d] ┐
│                                                                        │
│  job                     fires  silent   tokens   asked  answered  ▾   │
│  ──────────────────────────────────────────────────────────────────    │
│  email-triage-sweep        55    55/55    1.23M     —       —     CUT  │  ← 100% silent
│  check-in                  32    31/32     694k     1       0     CUT  │
│  jimbo-orchestrate        129    38/129   8.22M     —       —     keep │
│  capture-evening-recall    11     0/11     227k    11       ?    WATCH │
│  status-pulse              66     2/66    4.05M     —       —     KEEP │
│  cairn-daily               10     0/10     947k     —       —     keep │
│  assertion-scan             1      0/1     126k     1       ?      ?   │  ← 1 run?
│                                                                        │
│  ─ no verdict yet ─────────────────────────────────────────────────    │
│  foundry-connector         11     0/11     364k     —       —     ? ?  │
└────────────────────────────────────────────────────────────────────────┘

click a row ─▶
┌ capture-evening-recall ────────────────────────────────────────────────┐
│  30 20 * * *  ·  gpt-5.4-mini  ·  telegram  ·  skill: personal-capture │
│                                                                        │
│  fires    ████████████░░  11/14 days                                   │
│  answered ??░░░░░░░░░░░░  ?/11        ← by reply ?, by artifact ?      │
│  tokens   227k                                                         │
│                                                                        │
│  ○ keep   ● watch   ○ cut     note: [ ask at the boundary instead   ]  │
│                                                                        │
│  ─ recent ───────────────────────────────────────────────────────────  │
│  05 Aug 21:30  asked · no response                                     │
│  04 Aug 21:30  asked · answered 21:34 (reply)                          │
│  03 Aug 21:30  asked · answered 22:02 (artifact: coach_food_log)       │
└────────────────────────────────────────────────────────────────────────┘
```

**What in that mockup is real:** `fires`, `silent` and `tokens` are pulled from
`/api/agent-runs/rollup?days=14`. Everything else is illustration — `asked`/`answered` is
the data that doesn't exist yet, and the verdict chips are placeholders (only two ratings
exist in `agent_job_ratings` today: `intake-quality: watch`, `status-pulse: keep`). The
detail-panel history is invented to show the shape.

One real thing did fall out of pulling those numbers: **`assertion-scan` is scheduled
`45 5,13,19 * * *` — three times a day — and logged one run in fourteen days.** Either its
gate script is aborting before the model (which is the designed behaviour and would mean it
never reaches `agent.end`), or it is silently broken. That ambiguity is itself an argument
for the page: a gated job and a dead job currently look identical.

### The measurement model

**Cost is a dead axis.** Every job reports `cost_usd = 0` because Boris/codex billing is
flat (`cost_status='included'`). The honest effort axis is **tokens**, and it is brutal:
`email-triage-sweep` burned **1.23M tokens across 55 runs to say `[SILENT]` 55 times**,
`check-in` burned **694k to produce one message**. Do not put a `$` column on this page; it
will read as free and it is not.

Five axes, in order of how much they should move a verdict:

1. **answered / asked** — the value axis. Null when the job never asks.
2. **silent rate** — a poller that never finds work is a cron that should be an event.
3. **tokens** — effort spent.
4. **error mix** — `CREDIT_402`, `RATE_429`, `POLL_CORRUPTED` from the existing classifier.
5. **rating** — Marvin's verdict, which always overrides the arithmetic.

### Integrity constraints

**`PROSE_RESPONSE` is a proxy for "delivered", not proof of it.** It means the model
emitted prose, not that Telegram accepted it. Ship v1 on the proxy, label it in the UI as
*fired*, not *delivered*, and note the real fix: route hermes deliveries through
`POST /api/notify` so jimbo-api observes the send. Today hermes delivers direct
(`deliver: "telegram:<chat_id>"` in the job record) and the API never sees it.

**Never render a response rate as 0% when nothing was asked.** `NULL` and `0` are different
facts — the same distinction `day_check_entries` makes between an un-tick ("no data") and a
recorded `false` ("no"). Render `—`.

**Never mix attribution methods silently.** Every attributed response carries *how* it was
attributed, and the UI shows it.

### Schema

Three pieces. The first is the cheap primitive that makes everything else computable later.

```sql
-- Raw inbound Telegram. One INSERT in the webhook, before any handler runs.
--
-- Nothing persists inbound messages today — telegram-bot.ts routes updates to
-- handlers (food, gym, mood) and each handler stores its own domain row. So we
-- can see that a food log appeared at 22:02, but not that a message arrived at
-- 21:34 in reply to the 21:30 push.
--
-- Deliberately dumb: raw facts, no interpretation. Attribution semantics live in
-- views (below) and can change without a migration or a backfill.
CREATE TABLE IF NOT EXISTS telegram_inbound (
  -- Telegram's own message id. Natural key, so a webhook replay is a no-op
  -- rather than a duplicate — the webhook already disables Telegram's retry
  -- backoff for exactly this reason.
  message_id          bigint PRIMARY KEY,
  chat_id             bigint NOT NULL,
  -- When Telegram says it was sent, not when we processed it. Attribution
  -- windows must not be skewed by our own queue latency.
  ts                  timestamptz NOT NULL,
  -- Present only when Marvin used Telegram's reply affordance. This is the one
  -- unambiguous attribution signal we will ever get; everything else is a guess.
  reply_to_message_id bigint,
  kind                text NOT NULL,
  -- Full text. The domain handlers already store their own parse; this is the
  -- unparsed original, kept because "what did he actually say" is the evidence
  -- and the handler's interpretation is not.
  body                text,
  -- Which handler claimed it: 'food' | 'gym' | 'mood' | 'callback' | 'none'.
  -- 'none' is the interesting one — a message no handler understood is a
  -- capture gap, and right now it vanishes without trace.
  handled_by          text,
  received_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS telegram_inbound_ts_idx ON telegram_inbound (ts DESC);
CREATE INDEX IF NOT EXISTS telegram_inbound_reply_idx
  ON telegram_inbound (reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;
```

```sql
-- Delivery ledger for jobs that have no bespoke table of their own.
--
-- mood_log, coach_nudges and assignment_pushes each invented their own
-- sent/answered columns. This is the generic one — NOT a replacement for those
-- (they hold real history and their own semantics); the union view below reads
-- all four as one thing.
CREATE TABLE IF NOT EXISTS job_deliveries (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_name            text NOT NULL,
  -- Matches system_events.ts on the agent.end row, so a delivery can be joined
  -- back to the run that produced it (tokens, model, outcome).
  run_ts              timestamptz NOT NULL,
  channel             text NOT NULL,
  -- The outbound Telegram message id, when the channel gives us one. Without
  -- it, reply_id attribution is impossible and only window/artifact remain.
  telegram_message_id bigint,
  -- Did this delivery actually ask Marvin something? A blog post and a status
  -- pulse are deliveries that expect nothing, and they must not drag the
  -- response rate down. Only asked=true rows enter the denominator.
  asked               boolean NOT NULL DEFAULT false,
  responded_at        timestamptz,
  -- 'reply'     — he replied in the channel
  -- 'artifact'  — no reply, but a downstream row appeared (food log, day check,
  --               vault note). Often the stronger signal: the point of
  --               capture-evening-recall is a captured thing, not a chat message.
  -- 'dismissed' — explicitly declined
  response_kind       text,
  -- How we know. Never inferred silently; the UI shows this.
  --   reply_id — Telegram reply_to_message_id matched. Certain.
  --   window   — inbound arrived inside the window with no other ask pending.
  --   artifact — a downstream row appeared in the window.
  --   manual   — Marvin said so.
  attribution         text,
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT job_deliveries_channel_check
    CHECK (channel = ANY (ARRAY['telegram','discord','vault_thread','blog','none'])),
  -- A response must always carry its provenance, and provenance without a
  -- response is meaningless. Enforced rather than documented, because a row
  -- with responded_at and no attribution would silently inflate every rate.
  CONSTRAINT job_deliveries_attribution_paired CHECK (
    (responded_at IS NULL AND attribution IS NULL AND response_kind IS NULL)
    OR (responded_at IS NOT NULL
        AND attribution = ANY (ARRAY['reply_id','window','artifact','manual'])
        AND response_kind = ANY (ARRAY['reply','artifact','dismissed']))
  ),
  -- Only an ask can be answered.
  CONSTRAINT job_deliveries_response_needs_ask
    CHECK (responded_at IS NULL OR asked = true),
  -- One delivery per job per run.
  CONSTRAINT job_deliveries_unique_run UNIQUE (job_name, run_ts)
);

CREATE INDEX IF NOT EXISTS job_deliveries_job_idx ON job_deliveries (job_name, run_ts DESC);
CREATE INDEX IF NOT EXISTS job_deliveries_open_idx
  ON job_deliveries (run_ts DESC) WHERE asked = true AND responded_at IS NULL;
```

```sql
-- One shape for "a job asked, and here is whether it got an answer", across the
-- four ledgers that exist. A view, not a table: the bespoke tables keep owning
-- their own writes and history, and re-attribution never needs a backfill.
--
-- INTERPRETATION WARNING: mood_log and coach_nudges predate job_name and store
-- a `source`/`nudge_key` instead. The mapping below is this view's editorial
-- judgement, not recorded fact. Change it here, in one place.
CREATE OR REPLACE VIEW job_ask_events AS
  SELECT job_name, run_ts AS asked_at, responded_at, attribution
    FROM job_deliveries WHERE asked = true
  UNION ALL
  SELECT 'mood-checkin-tick', sent_at, answered_at,
         CASE WHEN answered_at IS NULL THEN NULL ELSE 'reply' END
    FROM mood_log WHERE source = 'telegram_nudge'
  UNION ALL
  SELECT 'coach-nudge', COALESCE(pushed_at, scheduled_for), action_at,
         CASE WHEN action_at IS NULL THEN NULL ELSE 'artifact' END
    FROM coach_nudges WHERE pushed_at IS NOT NULL
  UNION ALL
  SELECT 'assignment-watch', pushed_at, resolved_at,
         CASE WHEN resolved_at IS NULL THEN NULL ELSE 'artifact' END
    FROM assignment_pushes;
-- day_check_entries is deliberately NOT unioned in. A ticked check is an answer
-- to a question the *page* asked, not one a job pushed — no job owns it, so it
-- has no denominator here. Where a check gets answered via Telegram
-- (source='telegram'), it enters as artifact attribution on the job that asked,
-- which is the correct attribution, not as a row of its own.
```

```sql
-- The page's row. Effort from the run stream, value from the ask stream.
-- response_rate is NULL when nothing was asked — never 0.
CREATE OR REPLACE VIEW job_effectiveness AS
WITH runs AS (
  SELECT job_name,
         count(*)                                                  AS fires,
         count(*) FILTER (WHERE outcome = 'POLL_NO_WORK')          AS silent,
         count(*) FILTER (WHERE outcome NOT IN ('POLL_NO_WORK','PROSE_RESPONSE'))
                                                                   AS errors,
         sum(tokens_total)                                         AS tokens,
         max(ts)                                                   AS last_run_at
    FROM agent_runs_classified
   GROUP BY job_name
), asks AS (
  SELECT job_name,
         count(*)                                       AS asked,
         count(responded_at)                            AS answered,
         max(responded_at)                              AS last_response_at
    FROM job_ask_events
   GROUP BY job_name
)
SELECT r.job_name, r.fires, r.silent, r.errors, r.tokens, r.last_run_at,
       a.asked, a.answered, a.last_response_at,
       CASE WHEN COALESCE(a.asked, 0) = 0 THEN NULL
            ELSE a.answered::numeric / a.asked END      AS response_rate,
       g.rating, g.note AS rating_note
  FROM runs r
  LEFT JOIN asks a USING (job_name)
  LEFT JOIN agent_job_ratings g USING (job_name);
```

The view is unwindowed for clarity; the endpoint parameterises the window into the CTEs.

### Endpoints

| Verb | Path | Notes |
|---|---|---|
| GET | `/api/agent-runs/rollup?days=` | **exists** |
| GET | `/api/agent-runs/tail?limit=` | **exists** |
| GET | `/api/agent-runs/ratings` | **exists** |
| PUT | `/api/agent-runs/ratings/{job_name}` | **exists** — `{rating, note}` |
| GET | `/api/agent-runs/effectiveness?days=30` | **new** — `job_effectiveness` rows |
| GET | `/api/agent-runs/jobs/{job_name}?days=30` | **new** — detail: schedule/model/skill from the hermes snapshot, fire history, ask history with attribution |
| POST | `/api/job-deliveries` | **new** — `{job_name, run_ts, channel, telegram_message_id?, asked}`. Called by the job at delivery time |
| PATCH | `/api/job-deliveries/{id}/respond` | **new** — `{responded_at, response_kind, attribution}`. Called by the attributor, or by Marvin with `attribution:'manual'` |

Attribution runs as a **job, not a trigger** — a small periodic pass over open
`job_deliveries` joining `telegram_inbound` and downstream artifact tables. It writes only
where it can name its method, and leaves the rest open. An unattributed ask is honest data;
a guessed one poisons the metric the page exists to show.

---

## 2. Goals — formal, not inferred

`interrogate_goals` already has the right shape (`content`, `priority_id`,
`success_criteria`, `deadline`, `goal_status` active/hit/missed/abandoned, `confidence`) and
full CRUD including `PATCH /{id}/close`. **It has zero rows.** So this is a population and
surfacing problem, with two schema gaps.

### Mockup

```
┌ GOALS ─────────────────────────────────────────── [+ new goal] ────────┐
│                                                                        │
│  ▸ Be campervan-ready before the opportunity arrives                   │
│    serves: time-freedom over financial security      due: — (ongoing)  │
│    success: van chosen, budget set, notice period understood           │
│    evidence  ████████░░░░  6 supports · 1 contradicts   last: 12d ago  │
│    linked    LOC · 2 vault epics                        touched: never │
│                                                                        │
│  ▸ Ship briefing v2 phase 3                                            │
│    serves: —                                     due: 2026-08-31  ●    │
│    success: today/tomorrow rail live, actors on swimlanes              │
│    evidence  ██░░░░░░░░░░  2 supports                   last: today    │
│    linked    jimbo-dashboard                        touched: 3h today  │
│                                                                        │
│  ─ closed ─────────────────────────────────────────────────────────    │
│    ✓ hit      Phase B Postgres cutover                        24 Jul   │
└────────────────────────────────────────────────────────────────────────┘
```

### Schema — two additions only

```sql
-- 1) A typed deadline alongside the fuzzy one.
--
-- interrogate_goals.deadline is `text`, which is right for "by autumn" and
-- useless for "what is due this week". Keep both: the text stays the human
-- statement, the date is what queries and the evening drift check read. A goal
-- may have either, both, or neither.
ALTER TABLE interrogate_goals ADD COLUMN IF NOT EXISTS deadline_date date;

-- 2) What in the world would move this goal.
--
-- Without this, "did today affect my goals" can only be answered by an LLM
-- guessing, which is the inference this is meant to replace. A link is a
-- deliberate statement by Marvin; the daily delta is then arithmetic over
-- code_sessions / note_activity, and defensible.
CREATE TABLE IF NOT EXISTS interrogate_goal_links (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  goal_id     text NOT NULL REFERENCES interrogate_goals(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  -- Not a foreign key: targets live in four different tables and one of them
  -- (day_check_defs) is deliberately loosely coupled already. Resolution is the
  -- reader's job; a dangling link renders as "missing", never as zero progress.
  target_id   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT interrogate_goal_links_target_type_check
    CHECK (target_type = ANY (ARRAY['project','vault_note','day_check','commitment'])),
  CONSTRAINT interrogate_goal_links_unique UNIQUE (goal_id, target_type, target_id)
);
```

### Integrity constraints

- **A machine never closes a goal.** `goal_status` moves only through
  `PATCH /{id}/close` from a human action. Nothing derives "hit" from activity.
- **A machine never writes `interrogate_evidence` with an unmarked source.**
  `source_kind` is already constrained; agent-discovered evidence uses the real kind
  (`journal`, `vault`) and carries `discovered_via_session_id`. Evidence is a claim, and
  `stance='contradicts'` is as valuable as `supports` — do not filter it out of the UI.
- **Zero linked activity is not failure.** A goal with no movement today renders as a
  question ("nothing on this for 11 days — still live?"), never a score or a streak break.
  The self-model currently holds 1 value, 1 priority, 1 interest, 0 goals, and 2 tensions —
  one of which is literally *the Deferral pattern*. A scoring UI would be a machine
  moralising at him about the thing he already flagged.

### Endpoints

| Verb | Path | Notes |
|---|---|---|
| GET/POST | `/api/interrogate/goals` | **exists** |
| GET/PATCH/DELETE | `/api/interrogate/goals/{id}` | **exists** |
| PATCH | `/api/interrogate/goals/{id}/close` | **exists** — `{goal_status, notes}` |
| GET | `/api/interrogate/goals/{id}/progress?since=` | **new** — evidence for/against + linked-target activity in the window. Returns facts and counts, no score |
| POST/DELETE | `/api/interrogate/goals/{id}/links` | **new** — attach/detach a target |

---

## 3. Reflection & commitments

### Mockup

```
┌ EVENING · Thu 6 Aug ────────────────────────────────────────────────── ┐
│                                                                        │
│  ① TODAY                                        prepared 19:04 ✓       │
│     ~6h across jimbo-dashboard · 4 commits · 2 gaps unaccounted        │
│     ├ 14:10–16:40  unaccounted                          what was this? │
│     └ 21:12        assertion-scan raised 2 claims       [rate them]    │
│                                                                        │
│     highs [                                                        ]   │
│     lows  [                                                        ]   │
│                                                                        │
│  ② GRATEFUL FOR                                                        │
│     ○ the vault-item detail thing landed after 3 sessions      seeded  │
│     ○ walked 5km                                               seeded  │
│     ● [                                                          ]     │
│                                                                        │
│  ③ AGAINST GOALS                                                       │
│     campervan-ready · nothing for 11 days      deliberate? [        ]  │
│     briefing v2 ph.3 · 3h today                                        │
│                                                                        │
│  ④ TOMORROW                                                            │
│     ▸ [ finish the intake block                    ] ⚑goal ☐delegate   │
│     ▸ [                                            ]                   │
│     shape [ morning deep work, admin after 4                       ]   │
│                                                                        │
│     yesterday you said:  ✓ ship the detail body    ○ email backlog →   │
│                                                    carried 3×          │
└────────────────────────────────────────────────────────────────────────┘
```

### Schema

```sql
-- What Marvin wrote. Nothing the fleet generates ever lands in this table.
CREATE TABLE IF NOT EXISTS reflection_sessions (
  -- Logical day (04:00 cutover, per coach-tz LOGICAL_DAY_CUTOVER_HOURS), same
  -- convention as day_check_entries and the food log. A 01:30 session belongs
  -- to the day that is ending. One session per day, so the day is the key.
  day             date PRIMARY KEY,
  opened_at       timestamptz NOT NULL DEFAULT now(),
  -- Set when he leaves §4, not on last keystroke. An opened-but-abandoned
  -- session is a real and interesting fact — it is the pull-surface equivalent
  -- of an unanswered nudge, and the jobs page should be able to see it.
  completed_at    timestamptz,
  highs           text,
  lows            text,
  -- His answer to the drift question, in his words. Never a computed score.
  drift_note      text,
  tomorrow_shape  text,
  source          text NOT NULL DEFAULT 'dashboard',
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reflection_sessions_source_check
    CHECK (source = ANY (ARRAY['dashboard','mcp','manual']))
);

-- Gratitude, one row per item, because three fixed columns would fossilise a
-- count nobody has justified yet. No categories, no targets, no manage screen:
-- capture first, let the shape emerge from what he actually writes.
--
-- CANDIDATES DO NOT LIVE HERE. The prep job's suggestions stay in
-- reflection_prep.payload; accepting one is what creates a row in this table.
-- So every row here is, by construction, something Marvin assented to — the
-- fleet has no write path into this table at all, which is a stronger guarantee
-- than an accepted_at flag it could forget to check. It also sidesteps the
-- ordering problem: prep runs at ~19:00, before any session row exists.
CREATE TABLE IF NOT EXISTS reflection_gratitude (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  day         date NOT NULL REFERENCES reflection_sessions(day) ON DELETE CASCADE,
  content     text NOT NULL,
  -- 'human'  — he typed it
  -- 'seeded' — he accepted a candidate from reflection_prep
  origin      text NOT NULL DEFAULT 'human',
  -- Which candidate, and what telemetry produced it ('code_session:abc'), so an
  -- accepted line can always be traced back to the fact behind the suggestion.
  seed_ref    text,
  -- True once he changed an accepted candidate's words. Worth knowing: the edit
  -- is exactly where the machine's guess and the real thing diverge, and that
  -- delta is the only honest signal of whether seeding is working.
  edited      boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reflection_gratitude_origin_check
    CHECK (origin = ANY (ARRAY['human','seeded'])),
  -- A seeded row must say which candidate it came from; a typed one must not
  -- pretend to have a provenance it never had.
  CONSTRAINT reflection_gratitude_seed_ref_paired
    CHECK ((origin = 'seeded') = (seed_ref IS NOT NULL)),
  CONSTRAINT reflection_gratitude_edit_needs_seed
    CHECK (edited = false OR origin = 'seeded')
);

-- What the fleet prepared. A separate table so that a prep job re-running can
-- NEVER overwrite a word Marvin wrote. The two are joined at read time and the
-- API refuses to merge them.
CREATE TABLE IF NOT EXISTS reflection_prep (
  day          date PRIMARY KEY,
  generated_at timestamptz NOT NULL DEFAULT now(),
  -- Which job produced it, so a bad night's prep is traceable to a job on the
  -- fleet page.
  generator    text NOT NULL,
  -- Reconstruction digest, unaccounted spans, gratitude candidates, the drift
  -- question. jsonb because this is the one part that will churn weekly, and
  -- churning it must not mean migrating his authored text.
  payload      jsonb NOT NULL
);

-- Tomorrow's intent. The spine the morning briefing is built around.
CREATE TABLE IF NOT EXISTS commitments (
  id             text PRIMARY KEY,
  -- The evening it was made vs the day it is for. Kept separate so a commitment
  -- made for the day after tomorrow is expressible, and so "made and never
  -- looked at" is distinguishable from "due today".
  made_on        date NOT NULL,
  for_day        date NOT NULL,
  content        text NOT NULL,
  -- 'do' | 'avoid' | 'decide'. An avoid-commitment cannot be evidenced by
  -- activity, only reported — the resolution UI must not ask for proof of it.
  kind           text NOT NULL DEFAULT 'do',
  goal_id        text REFERENCES interrogate_goals(id) ON DELETE SET NULL,
  -- Marvin marking this as fleet-shaped work. Only he sets it.
  delegable      boolean NOT NULL DEFAULT false,
  -- Set when actually commissioned, so "I said delegate" and "it was queued"
  -- stay separable.
  dispatch_id    text,
  status         text NOT NULL DEFAULT 'open',
  resolved_at    timestamptz,
  resolution_note text,
  -- Explicit carry chain. A deferred commitment creates a NEW row pointing back
  -- here rather than mutating for_day, so the third consecutive deferral is
  -- visible as a chain of three. This is the whole point: the self-model
  -- already names "the Deferral pattern" as an open tension, and a silently
  -- rolled-forward date would hide the only evidence of it.
  carried_from   text REFERENCES commitments(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commitments_kind_check
    CHECK (kind = ANY (ARRAY['do','avoid','decide'])),
  CONSTRAINT commitments_status_check
    CHECK (status = ANY (ARRAY['open','kept','missed','dropped','carried'])),
  -- A resolution needs a resolution time, and vice versa.
  CONSTRAINT commitments_resolution_paired CHECK (
    (status = 'open' AND resolved_at IS NULL)
    OR (status <> 'open' AND resolved_at IS NOT NULL)
  ),
  CONSTRAINT commitments_for_day_not_before_made
    CHECK (for_day >= made_on)
);

CREATE INDEX IF NOT EXISTS commitments_for_day_idx ON commitments (for_day DESC);
CREATE INDEX IF NOT EXISTS commitments_open_idx
  ON commitments (for_day) WHERE status = 'open';
```

### Integrity constraints

- **Authored text is never machine-writable.** `reflection_sessions` and
  `reflection_gratitude` accept writes only from a human-originated request. Everything the
  fleet produces lands in `reflection_prep` and nowhere else — a suggestion becomes a
  gratitude row only when he accepts it, and an unaccepted candidate leaves no trace in the
  record at all.
- **A commitment resolves only by his hand.** Nothing infers `kept` from a commit landing.
  The morning briefing may *show* evidence next to an open commitment; it may not close it.
- **Deferral is a new row, never a date edit.** Carrying sets the old row to `carried` and
  inserts a successor with `carried_from` set. `for_day` is immutable after creation.
- **Absence is not a negative.** An evening with no session is missing data. It is not a
  bad day, and it must not break a streak — there are no streaks here.
- **Logical day everywhere**, including `made_on`. Mixing calendar and logical days across
  these tables and `day_check_entries` would make every join quietly wrong for anything
  after midnight, which is most of them.

### Endpoints

| Verb | Path | Notes |
|---|---|---|
| GET | `/api/reflection/day/{date}` | Bundle: session + gratitude (accepted and candidate, flagged) + prep payload + commitments made tonight + commitments due today from last night |
| PUT | `/api/reflection/day/{date}` | Upsert `{highs, lows, drift_note, tomorrow_shape}`. Creates the session row on first write |
| POST | `/api/reflection/day/{date}/complete` | Sets `completed_at` |
| POST | `/api/reflection/day/{date}/gratitude` | `{content}` → `origin:'human'`; or `{seed_ref, content?}` to accept a candidate from prep → `origin:'seeded'`, `edited` set if `content` differs from the candidate |
| PATCH | `/api/reflection/gratitude/{id}` | Reword an existing row |
| DELETE | `/api/reflection/gratitude/{id}` | Discard. Declining a *candidate* is not a call here — it never became a row |
| GET | `/api/reflection/prep/{date}` | Read prep only |
| PUT | `/api/reflection/prep/{date}` | **Prep job writes here.** The only write the fleet has in this domain |
| GET | `/api/commitments?for_day=&status=&goal_id=` | |
| POST | `/api/commitments` | `{content, kind, for_day, goal_id?, delegable?}` |
| PATCH | `/api/commitments/{id}` | Content/kind/goal/delegable while still `open` |
| POST | `/api/commitments/{id}/resolve` | `{status, note?}` — `kept`/`missed`/`dropped` |
| POST | `/api/commitments/{id}/carry` | `{for_day}` — closes as `carried`, returns the successor |
| POST | `/api/commitments/{id}/dispatch` | Enqueues to `dispatch_queue`, stores `dispatch_id` |

---

## 4. How the fleet plugs in

1. **`evening-prep`** (~19:00 UTC) — runs the `gather.py` reconstruction, picks gratitude
   candidates, computes the drift question from `interrogate_goal_links` × `code_sessions`,
   `PUT /api/reflection/prep/{date}`. **Sends nothing.**
2. **Morning briefing reads `for_day = today`** — commitments become the header. This is
   briefing v2's pending Phase 3 rail with actual content instead of a guess.
3. **`check-in` judges against commitments** instead of against nothing — and if it still
   has nothing to say, that's now visible on the fleet page as a silent rate.
4. **Delegable commitments enqueue to dispatch at ~22:00** so Boris/Kipper work them
   overnight. Right now the fleet's overnight hours run maintenance nobody asked for while
   the one moment Marvin knows what he wants done leaves no trace.
5. **Retire two crons into the page** — `capture-evening-recall` and the 20:00 `check-in`
   become §1 sections. Keep one 22:30 fallback line *only if* the page wasn't opened: a
   nudge to the surface, not a question to answer.
6. **Invert `cairn-daily`** so the post is written after the session, from his account of
   the day rather than the sensor's.

---

## 5. Build order

1. `telegram_inbound` + the webhook INSERT. One table, one line, unblocks all attribution
   later. Do this first because every day without it is a day of unrecoverable data.
2. `commitments` + endpoints + the briefing hand-off. Highest value, smallest surface.
3. `job_deliveries` + `job_ask_events` + `job_effectiveness` + `/effectiveness`, then the
   fleet page on top of the three endpoints that already exist.
4. `reflection_sessions` / `_gratitude` / `_prep` + the prep job.
5. Goals: populate via `/interrogate`, then `deadline_date`, `interrogate_goal_links`, and
   the progress endpoint.

**Deployment note:** the dashboard dev proxy targets production jimbo-api. None of these
endpoints exist locally until deployed — build API-first, deploy, then wire the page.

## 6. Buzz

Buzz is real, it is first-party to the Hermes he runs, and **he does not have it yet**.

Block's (Jack Dorsey) open-source Nostr-based workspace where humans and agents are peers in
the same channels — every message a Schnorr-signed event on a relay you own, each
participant holding its own keypair. Apache-2.0, `github.com/block/buzz`. NousResearch
shipped a first-party Hermes adapter for it: `plugins/platforms/buzz` upstream, commit
`66fc2e2a9` (2026-07-25). His VPS checkout sits at `b9b6033704` (2026-07-26, v0.18.2) with
20 platform adapters and no `buzz` among them; upstream is v0.20.0. The adapter landed just
past his divergence point. (A vault item already asks this question — seq 3479, *"Spike:
what is Buzz, and is it useful for us?"*, active, ungroomed. Its ACs are now answerable.)

**What it would add**, on the integration path that fits a VPS-hosted gateway (Buzz as a
native messaging platform beside Telegram/Discord, keeping native skills, memory and
approvals):

- `deliver=buzz` as a cron delivery target, routed to a home channel.
- **Per-actor cryptographic identity** — the one that matters. The actor model
  (Jimbo/Boris/Kipper/Marvin) currently collapses into "messages from the Jimbo bot". In
  Buzz each actor signs its own work, which is an actor-attributed, tamper-evident audit
  log for free — something currently synthesised in Postgres.
- Two-way threaded channels agents can talk to each other in, with mention-gating and
  per-user allowlists. Telegram delivery today is one-way broadcast.

It adds nothing to scheduling, cost telemetry or vault storage. It is a delivery surface,
not a replacement for jimbo-api.

**The bill is not the install** — the adapter is stdlib Python plus a `buzz` CLI and two
secrets, no GPU, hosted relays available. The bill is the rebase. Getting the adapter means
pulling upstream into a fork whose HEAD is literally `b9b6033704 feat(cron): restore
session/agent lifecycle hooks (fork-local)` — **the `agent.end` hook, which is the sole
feed behind `agent_runs_classified` and therefore behind everything in §1.** It has already
died once for nine days after a fork reset.

**Recommended sequence:** upgrade the fork on its own merits and confirm `agent.end` still
fires *before* touching Buzz; then point one low-stakes cron at a Buzz channel and see
whether shared channels change anything; only then consider a broader move. A zero-risk look
is Buzz Desktop on the MacBook against a hosted relay — but note that the `buzz-acp` bridge
auto-approves `session/request_permission` with `allow_once` (verified upstream with
`rm -rf` through the ACP path), so don't give that session anything it can destroy. That
caveat applies to the desktop/bridge paths, not to the native-platform path above.

## 7. Open

- **`agent.end` is a fork-local patch, and §1 rests entirely on it.** Worth a monitor on
  the dashboard that alarms when no `agent.end` row has landed in N hours — the fleet page
  going quietly blank looks identical to a quiet fleet.
- **Timezone.** The VPS is `Etc/UTC` and hermes `config.yaml` has `timezone: ''`, so cron
  expressions are UTC and every evening job currently fires an hour later than its
  expression reads during BST. Worth confirming against a real fire time before the prep
  job's schedule is set.
