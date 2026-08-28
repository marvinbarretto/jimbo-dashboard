# Epic Why — phase 1 backfill

29 active epics have READY children, so their work reaches the review queue.
**12 of them are deficient** (no acceptance criteria, or a body under 400 chars).

For each, the block to add to the epic body:

```
## Why
Who it's for:
What changes for them:
How we'd know it worked:
```

## Deficient — do these first

| seq | project | ready kids | body | AC | source | title |
|---|---|---|---|---|---|---|
| [#2](https://jimbo.fourfoldmedia.uk/vault-items/2) | gym-app | 1 | 604c | no-AC | manual | [Idea] Voice gym tracker PWA |
| [#1865](https://jimbo.fourfoldmedia.uk/vault-items/1865) | localshout | 6 | 1191c | no-AC | manual | LocalShout — Weekly Digest |
| [#2328](https://jimbo.fourfoldmedia.uk/vault-items/2328) | jimbo | 1 | 179c | has-AC | pipeline | Build token cost reporting query or endpoint for Jimbo |
| [#2755](https://jimbo.fourfoldmedia.uk/vault-items/2755) | boxbox | 2 | 424c | no-AC | pipeline | Race analysis |
| [#2815](https://jimbo.fourfoldmedia.uk/vault-items/2815) | film-planner | 3 | 77c | has-AC | pipeline | Data Enrichment — director, cast, decade filter |
| [#3041](https://jimbo.fourfoldmedia.uk/vault-items/3041) | try-something-new | 1 | 785c | no-AC | pipeline | Validate the reveal (v1 learning loop) |
| [#3042](https://jimbo.fourfoldmedia.uk/vault-items/3042) | try-something-new | 1 | 594c | no-AC | pipeline | Phase 2 — generated decks & scale |
| [#3103](https://jimbo.fourfoldmedia.uk/vault-items/3103) | localshout | 12 | 0c | no-AC | manual | Live bugs - Route to launch |
| [#3250](https://jimbo.fourfoldmedia.uk/vault-items/3250) | localshout | 1 | 0c | no-AC | manual | Fix scrapers |
| [#4873](https://jimbo.fourfoldmedia.uk/vault-items/4873) | localshout | 1 | 1386c | no-AC | pipeline | Save and follow — the retention engine |
| [#5019](https://jimbo.fourfoldmedia.uk/vault-items/5019) | admin | 2 | 719c | no-AC | grooming | CLI tooling — safe, predictable admin from the terminal |
| [#5273](https://jimbo.fourfoldmedia.uk/vault-items/5273) | pmq-bingo | 9 | 234c | no-AC | github | PMQ Bingo — GitHub issues |

## Has substance — spot-check only

| seq | project | ready kids | body | AC | source | title |
|---|---|---|---|---|---|---|
| [#2493](https://jimbo.fourfoldmedia.uk/vault-items/2493) | reinvent-me | 1 | 1149c | has-AC | pipeline | The AI translator pivot: zero clients to day-rate advisory |
| [#2494](https://jimbo.fourfoldmedia.uk/vault-items/2494) | reinvent-me | 2 | 1201c | has-AC | pipeline | Origin: AI translator pivot session |
| [#2498](https://jimbo.fourfoldmedia.uk/vault-items/2498) | reinvent-me | 1 | 869c | has-AC | pipeline | Curate portfolio: what to show and how to frame it for non-technical readers |
| [#2502](https://jimbo.fourfoldmedia.uk/vault-items/2502) | reinvent-me | 1 | 860c | has-AC | pipeline | Create living positioning doc: who Marvin is, for whom, doing what |
| [#2505](https://jimbo.fourfoldmedia.uk/vault-items/2505) | reinvent-me | 1 | 874c | has-AC | pipeline | Research: AI advisory day-rate benchmarking in UK 2026 |
| [#2809](https://jimbo.fourfoldmedia.uk/vault-items/2809) | pmq-bingo | 1 | 400c | has-AC | pipeline | Bingo Game Core |
| [#2811](https://jimbo.fourfoldmedia.uk/vault-items/2811) | pmq-bingo | 1 | 453c | has-AC | pipeline | Automate the bingo pipeline |
| [#2816](https://jimbo.fourfoldmedia.uk/vault-items/2816) | film-planner | 1 | 624c | has-AC | pipeline | Collections & Deduplication — expand and merge cleanly |
| [#2842](https://jimbo.fourfoldmedia.uk/vault-items/2842) | jimbo | 1 | 531c | has-AC | manual | Fix component layout bugs |
| [#3591](https://jimbo.fourfoldmedia.uk/vault-items/3591) | jimbo | 5 | 1342c | has-AC | pipeline | Move the connector cron from daily to weekly and retire the daily run |
| [#3592](https://jimbo.fourfoldmedia.uk/vault-items/3592) | jimbo | 154 | 1106c | has-AC | pipeline | Compounding pass: contradict against stated answers, not inferred ones |
| [#3602](https://jimbo.fourfoldmedia.uk/vault-items/3602) | jimbo | 3 | 2314c | has-AC | pipeline | Blog posts to improve the codebase — both directions: written from the code, and writing as a way to find its faults |
| [#3614](https://jimbo.fourfoldmedia.uk/vault-items/3614) | jimbo | 3 | 1606c | has-AC | manual | Debate-partner skill: an AI persona takes a side and argues it, Marvin argues back |
| [#3615](https://jimbo.fourfoldmedia.uk/vault-items/3615) | watchdog | 2 | 2701c | has-AC | conversation | Micro-habits and compounding: capture, reinforce, show progress |
| [#3682](https://jimbo.fourfoldmedia.uk/vault-items/3682) | jimbo | 32 | 427c | has-AC | pipeline | Investigate the 12 reaped sessions carrying no duration data |
| [#3825](https://jimbo.fourfoldmedia.uk/vault-items/3825) | jimbo | 4 | 511c | has-AC | pipeline | Propose implementation plan for injecting custody state into grooming board UI |
| [#4948](https://jimbo.fourfoldmedia.uk/vault-items/4948) | jimbo | 2 | 2081c | has-AC | pipeline | Per-project agents that groom and execute their own backlog |

_12 deficient, 17 to spot-check. `source=pipeline` means Jimbo made it — those are the ones you can't explain._

---

# Drafts for the three epics behind the current review queue

Proposals only — **not written to the vault.** Composed from each epic's existing
body, its children, and its project's `intent`. Marked where I am inferring
rather than reading. Correct them, then they go on the epics.

## #2815 · Data Enrichment — director, cast, decade filter (film-planner)

The thinnest of the three: 77 characters, no acceptance criteria, and the parent
of both PRs currently awaiting review.

```
## Why
Who it's for: Marvin browsing his own watchlist, deciding what to watch tonight.
What changes for them: you can narrow by era and see who made a film without
  leaving the browser — the two axes people actually think in ("something 90s",
  "the one by that director"), which today force a search elsewhere.
How we'd know it worked: films get chosen from the collection browser instead of
  abandoned to Google. Proxy: decade chips used in a session; director/cast shown
  on ≥90% of films (the #2973 audit found 144/160 already have director data).
```

## #1865 · LocalShout — Weekly Digest (localshout)

Body is already substantial; what is missing is acceptance criteria. 13 children.

```
## Why
Who it's for: v1 Marvin, dogfooding. v2 the Watford locals who signed up and
  went quiet.
What changes for them: they hear what's on near them without opening the app —
  the digest does the hunt, which is the whole product promise in one email.
How we'd know it worked: Marvin still reads it weekly without forcing himself
  (localshout's own success_criteria already says this); then open and click
  rate on a real cohort rather than on himself.
```

## #2504 · Outreach to 3 agencies in existing orbit (reinvent-me)

Body already argues the strategy well; it has no acceptance criteria and no
statement of what success looks like.

```
## Why
Who it's for: Marvin, looking for a first paid AI engagement.
What changes for them (the agencies): they get someone who can answer their
  clients' AI questions credibly on a day rate, without hiring for it.
How we'd know it worked: 3 messages sent, ≥1 reply, ≥1 exploratory call. The
  four children already map to exactly that sequence.
```

**Least confident in:** the measurement lines. Every one is a proxy I inferred —
#2815's "≥90%" is a number I chose, not one you set. If the metric is wrong the
rest is still useful; if the *audience* is wrong, the draft is wrong.
