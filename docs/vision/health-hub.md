# Health Hub — Direction

_Drafted 2026-06-22. A direction doc, not a spec — thesis, current state, gaps, a recommended sequence, and the two decisions that are genuinely yours to make._

## Thesis

Jimbo already captures a broad, daily health signal — steps, sleep, heart rate, calories
burned, exercise sessions, nutrition macros, supplement adherence, and subjective
energy/mood. The problem is **not** that we capture too little. It is that the data is
**fragmented across three silos in `jimbo_pg`, a generic event store, and a second
database entirely — with no read model that joins a single day, and no consumer that
synthesises it.**

The health hub is therefore a **read / synthesis layer**, not a new capture pipeline. Its
job is to turn rows scattered across `device_events`, `coach_*`, `gym_*`, and the gym
Supabase into one queryable "day," and to feed that day to the things that already want it
but are starved of it.

**Primary consumer (explicit assumption — orders everything below):** the **coach engine**
and the **daily briefing**. The coach already has food/sleep-aware stubs
(`needs_food` / `avoid_food`, post-workout nudges) that fire blind because no nutrition or
sleep signal reaches them. The briefing is Jimbo's synthesis organ and today ingests
**none** of this. The dashboard day-view is the _surface_, not the primary consumer.

## Current state — what we actually capture

### Objective — Health Connect (hourly → `device_events`)
Read today (`HealthConnectCollector.kt`): `StepsRecord`, `DistanceRecord`,
`ActiveCaloriesBurnedRecord`, `TotalCaloriesBurnedRecord`, `FloorsClimbedRecord`,
`ElevationGainedRecord`, `HeartRateRecord` (daily min/avg/max aggregate),
`ExerciseSessionRecord`, `SleepSessionRecord` (with per-stage breakdown).
Lands as generic rows in `device_events` (`collector`, `type`, `value`, `unit`, `payload`).
500-event batches, 10-retry dead-letter.

### Exercise — `jimbo_pg` `gym_*` (one DB with nutrition + supplements)
`gym_sessions`, `gym_session_sets` (reps/weight_kg/rpe), `gym_session_cardio`
(duration/distance/HR), `gym_exercises`, `gym_profile` (singleton `me`:
height/weight/dob/`fitness_goal`/experience). `GymSessionBridge.kt` auto-creates
`gym_sessions` from HC exercise sessions (distance + HR deferred as expensive per-session
reads).

### Nutrition — `jimbo_pg` `coach_food_log`
Free-text meal → LLM macro estimation (sync, Claude, UK-portion assumptions) → per-item
`items` jsonb + denormalised daily totals (`est_kcal/protein_g/carbs_g/fat_g`).
Capture only — **no GET endpoint yet**.

### Supplements — `jimbo_pg` `coach_supplements` / `coach_nudges` / `coach_logs`
Inventory, rule-driven daily nudge schedule (morning/bedtime/post-workout/rest-day/loading),
intake logs. `conditions` carries `needs_food` / `avoid_food` — **as teaching hints, not
active logic.**

### Subjective — gym Supabase `body_check_ins` ⚠️ stranded
Daily `energy` / `sleep_quality` / `soreness_map` (1–5). This is the **richest subjective
signal and the natural pair to HC's objective sleep/HR** — and it lives in a _different
database_ with **no jimbo-api read path**.

### Work context (for correlation) — `jimbo_pg`
`focus_sessions`, `code_sessions` — already capture energy/mood/friction against time.

## The fragmentation problem (the actual gap)

1. **No derived daily health table.** HC health is buried as untyped rows in
   `device_events`; nothing rolls it up.
2. **Three silos, never joined.** `coach_food_log`, `coach_*`, `gym_*` share a DB but no
   query crosses them.
3. **One silo in a different DB.** `body_check_ins` can't be joined at all.
4. **No consumer.** jimbo-api exposes **no health read path** — `briefing.ts` and
   `pipeline.ts` are CRUD stores for `briefing_analyses` / `pipeline_runs` and ingest zero
   health signal. (Briefing _content_ generation may run in an external pass; if so, it has
   no structured health surface to pull from regardless.)
5. **Trivially-derivable insights nobody derives.** Energy balance = calories out (HC
   `TotalCaloriesBurned`, which includes BMR — i.e. TDEE) − calories in (food log). Both are
   captured. Nobody subtracts them.

## Capture gaps (cheap → high-value first)

- **Weight — entirely absent.** No `WeightRecord` read. `gym_profile.fitness_goal` is
  meaningless without a trend. One-line HC addition. **Highest leverage — do it in Phase 1.**
- **Resting HR** — only daily min/avg/max; no `RestingHeartRateRecord`. Recovery / trend signal.
- **Sleep quality / efficiency** — sessions + stages captured, but no score/efficiency derived.
- HRV, SpO2, blood pressure, glucose — available, lower priority.

## Recommended sequence

### Phase 1 — Unify the read model + weight
- A per-day health shape (read **service** first; see Decision 2) joining HC aggregates +
  `gym_sessions` + `coach_food_log` + `coach_logs`:
  `{ steps, sleep_min, hr, cal_out, cal_in, protein_g, workout?, supplements_taken[] }`.
- Add `WeightRecord` to the HC reader; derive a weight trend.
- Expose `GET /api/health/day?date=` and `GET /api/health/trend`.

### Phase 2 — Pull in the subjective + close the coach loop
- **Mirror `body_check_ins` into `jimbo_pg`** (Decision 1) so energy/sleep_quality/soreness
  join the rest.
- Light up `coach-rules` with food + sleep: actually honour `needs_food` / `avoid_food`;
  skip or soften nudges after poor sleep or low energy.

### Phase 3 — Correlation + surfacing
- Briefing ingests the daily rollup — the first structured health surface available to
  synthesis.
- Correlations: sleep → next-day energy/focus; protein → recovery/soreness; supplement
  adherence → check-in; energy balance over time.
- Dashboard day-view surfaces it (the surface, last — consistent with data-models-first).

## Decisions that are yours

1. **`body_check_ins` home.** _Recommend: mirror/expose it in `jimbo_pg`._ It follows the
   exact Phase B direction of travel (gym → jimbo_pg, supplements → jimbo_pg, nutrition
   native) and keeps every health join single-DB. The alternative — jimbo-api reaching
   into the gym Supabase at read time — re-introduces the two-DB split we've been removing.

2. **Read model shape.** _Recommend: on-demand read service first, materialise later._ A
   live join is always fresh and cheap to build; promote to a materialised `daily_health`
   table only if briefing/dashboard latency demands it.

3. **Capture scope now.** _Recommend: weight in Phase 1; resting HR + sleep-quality in
   Phase 2._ Weight is the one gap that unblocks an existing field (`fitness_goal`) for a
   one-line change.

## One-line summary

We don't need more sensors — we need a `GET /api/health/day` that joins what four
subsystems already record, a `WeightRecord` read, and a briefing that finally looks at it.
