# Next session — optimise grooming before re-grooming 600 items

Paste the block below to start. Everything under it is the evidence behind it.

---

## Starter prompt

> The commission pump now refuses to dispatch work that grooming never chose a
> skill for, so 600 ready items sit unroutable and the review queue is empty.
> I want them all re-groomed — but not until the grooming pipeline is worth
> spending 600 runs on.
>
> Audit `dispatch/vault-decompose` (in `hub/hermes/skills/dispatch/`, a
> hand-authored SKILL.md, not generated) and tell me what to change before a
> re-groom. Three things it must do afterwards that it doesn't do now:
> choose a skill per leaf, write acceptance criteria that name a check rather
> than an outcome, and refuse to promote an epic's children while the epic has
> no `## Why` block.
>
> Its failure rate went 1% → 15% this month while volume went 163 → 924 runs.
> Most failures are `reaper: timeout`, which is plausibly just contention from
> opening the valves — verify that before treating it as a regression.
>
> Read `docs/handoff-grooming-optimisation.md` first. Propose before you build.

---

## Where things stand

Shipped and live: dashboard **v0.0.213**, jimbo-api **1b23c37**.

The review queue is **empty** — 7 items cleared (3 approved, 3 archived, 1
marked done unreviewed). The commission lane went from `10/10 blocked` to
`0 running, 10 slots free`.

Nothing can flow into it, by design:

```
Ready but unroutable   600     grooming never chose a skill; the pump declines
Held on red CI           3     retryable from the review page
Standing anchor          1     permanent by design
```

## The one thing left

`vault-decompose` is where all three gaps close, because it already reads the
work to write acceptance criteria:

| gap | measured | fix |
|---|---|---|
| no skill chosen | 600 of 629 ready items | choose one per leaf |
| subjective ACs | 74 of 92 recorded criteria | enforce "name a check" (`1e6db55` states the rule, nothing applies it) |
| epics don't say why | 0 epics have a `## Why` | refuse to promote children until the parent has one |

**The API half is already done** (`1b23c37`): `suggested_skill` is on the
decomposition submit contract and stored on the leaf, with tests for present
and absent. Optional on purpose — a skill not yet sending it still submits, and
the leaf lands on the `unroutable` gate rather than failing at grooming time.
Nothing sends it yet.

## Pipeline facts

```
ungroomed → intake_complete → classified → decomposed → ready
          intake-quality    vault-classify  vault-decompose
          1079 runs, 0% fail  1056, 0% fail   1215, 12% fail
          gemini-3.1-flash-lite  deepseek-v4-flash  deepseek-v4-flash
```

`readyGateMissing` is the promotion gate: type, not-an-epic, assignee,
acceptance criteria (presence only, never quality), a priority, actionability.

Decompose failures, all time: **62 `reaper: timeout`**, ~11
`DECOMPOSITION_TOO_DEEP` (a legitimate refusal the skill has a documented fix
for), 3 wrong-status. Monthly: Aug 924 runs / 81 timeouts / 15% fail, Jul 163 /
0 / 1%. Volume rose 5.7x in the same period — contention is the likely cause,
but the rate moved 15x, so verify rather than assume.

## Decisions already made — don't relitigate

- **The 600 need reading, not a regex.** A verb heuristic was tried and
  rejected: "Write integration test" is code, "Write the outreach template" is
  prose. A wrong skill is the defect the gate exists to prevent.
- **Scope before scale.** Most of the 600 are the `jimbo` project. Marvin needs
  the next 20 routable, not all 600 — consider re-grooming per project.
- **Convention over columns.** The epic Why is a `## Why` block in the body,
  not a new field. `definition_of_done` has been a column for the vault's whole
  life and is filled on 0 of 629 items.
- **Vocabulary is settled.** approve / mark done — unreviewed / send back /
  archive / dismiss (hides, keeps the row) / retry / delete (permanent). Each
  has one UI label, one endpoint, one audit action. Don't add synonyms.

## Hazards

- `hub` is a shared checkout other agents switch branches in; verify the branch
  before pushing, and push the same day or expect a rebase conflict with the
  0400Z snapshot bot.
- The snapshot bot last touched `hermes/skills/dispatch/` on 2026-06-28 and not
  since — the skills are hand-authored, but confirm before assuming edits are safe.
- SKILL.md bodies carry explicit rules only; rationale goes in the commit.
- Cost: Hermes crons are the OpenRouter bill against a ~£5/mo budget. 600
  re-groom runs is a real cost — size it before running.
- The dashboard's service worker takes two loads to activate a new release.

## A bug pattern worth fixing properly

`toVaultEvent` in `activity-events.service.ts` returns `null` for any
`note_activity.action` it doesn't recognise. That silently hid data three times
in one session — `commission_completed`, the `review_*` family, and
`status_changed` (3,099 rows). All fixed, but the next gap will be just as
invisible. It wants a fallback that logs unknown actions instead of dropping them.
