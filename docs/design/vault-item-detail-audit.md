# Vault Item Detail — first-principles component audit (V1)

## Why this exists
The detail view feels messy and over-built. The V2 attempt (`/vault-items/:seq/v2`,
prototype #10) confirmed a restyle can't fix it: re-skinning the chrome while reusing panels
that each carry their own visual language + their own slice of overlapping content gave us the
worst of both worlds. The real issue is **composition**, so this audit goes back to V1 and makes
every component justify its place against the questions the screen actually answers.

## The decision this screen serves
Marvin lands here to process one vault item. Anchored on the stream-row 5-question principle
([[feedback_stream_row_anatomy]]), the screen answers a small set of questions:

| | Question | "really nice" answer = |
|---|---|---|
| A | What is this? | identity at a glance |
| B | What state / who owns it? | the 3 decisions: status · owner · priority |
| C | What's my next move? | ONE line: blocked on X / ready / answer this |
| D | What's the ask? | the body / brief |
| E | Is someone waiting on me? | open question, loud, when present |
| F | How do we know it's done? | acceptance criteria + readiness |
| G | What's it connected to? | parent · subtasks · projects · blockers · tags |
| H | Why does the system think this? | intake exam + rationale — on demand |
| I | What's happened? | activity + thread — on demand |
| J | How do I dispose of it? | reject / note / archive / delete |

## The overlap (what's actually wrong)
Not duplicated *data* — duplicated *surfaces*. Several questions are answered by many
components, each with its own chrome:

- **C (state / next move) — answered 4×:** `next-action` + `status-chips` grooming badge +
  `delivery-block` readiness panel + `overview-cards` queue count.
- **G (context / connections) — answered 4×:** `overview-cards` (hierarchy + queue) +
  `links-block` + `status-chips` project + `intake-rationale` inferred project/epic.
- **H (why) — answered 2×:** `meta-line` `ai_rationale` toggle + `intake-rationale` exam.
- **created_at — shown 2×:** `meta-line` + `intake-block`.

## Verdicts — every component earns its place or doesn't

| Component | Answers | Verdict | Action |
|---|---|---|---|
| `identity-header` | A | **KEEP** | #seq · type · editable title. The identity home. |
| `next-action` | C | **KEEP — promote** | Make this *the* single state/next-move line. Everything else stops competing to answer C. |
| `status-chips` | B | **KEEP — slim** | Keep the 3 decisions (status · owner · priority) + project. **Remove** the grooming + actionability badges (they re-answer C) — that signal lives in next-action / readiness. |
| `delivery-block` | F | **KEEP** | Acceptance criteria + readiness detail. The one "can it ship?" home. |
| `links-block` | G | **KEEP** | The one connections home: parent · subtasks · projects · blockers · tags. |
| `intake-block` | D | **KEEP** | The body. Drop its duplicate created_at label. |
| `intake-rationale` | H | **KEEP — absorb** | The "why" home. **Fold `meta-line`'s `ai_rationale` in here.** On-demand (collapsed). |
| `questions` | E | **KEEP — promote** | Hero placement when an open question exists. |
| `activity-log` + `thread` | I | **KEEP** | On-demand (tabbed). |
| `action-bar` | J | **KEEP** | Footer. |
| `overview-cards` | (summary of B/G/I) | **CUT** | Its 3 lines re-summarize links-block, timeline, and the queue counts already shown elsewhere. Salvage only **origin/source** → fold into header meta. |
| `meta-line` | timestamps + why | **REDUCE / CUT** | Rationale → intake-rationale. Timestamps → a single "created · last activity" line in the header. As a standalone block it earns little. |

**Net:** cut `overview-cards`, dissolve `meta-line`, and stop 3 components from each answering
"what state?". One home per question. That removes the visual triplication that reads as mess —
*before* any colour/spacing work.

## Keep the good ideas from #10 (just not the shoehorn)
#10's *structure* was right even though the implementation wasn't: open-question hero, demote the
intake exam to on-demand, a clean tab split, a project-coloured identity spine. Feed those into V1;
bin the V2 component shell.

## Recommended path
**Iterate V1, not replace it.** Sequence:
1. **Cut & merge (no new look yet):** delete `overview-cards`; fold its origin line + meta-line's
   timestamps into the header; move `ai_rationale` into `intake-rationale`; strip the grooming /
   actionability badges out of `status-chips`. Page gets simpler with zero restyle.
2. **One home per question:** confirm next-action owns C, delivery owns F, links owns G.
3. **Then** a single, coherent visual pass for "really nice" — applied once, to a page that no
   longer fights itself.

## Chosen lead: TRIAGE & DECIDE
Confirmed 2026-06-22. The screen optimises for "is it real, what state, what's my next move —
and act fast." Resulting vertical order:

1. **Identity** — #seq · type · project/epic family · title · (created · last-activity inline)
2. **State + next move** — the single next-action line, then status · owner · priority decisions
3. **Open question hero** — when present (the most urgent triage action)
4. **Decide actions** — reject / send-back / note reachable without scrolling
5. **Body / brief** (D)
6. **Acceptance criteria + readiness** (F)
7. **Connections** — parent · subtasks · projects · blockers · tags (G)
8. **Why — intake exam** (H), collapsed / on-demand
9. **Activity · Thread** (I), tabbed / on-demand
10. **Lifecycle actions** — archive / delete (footer)

## Files (for the iteration)
- `components/vault-item-detail-body/vault-item-detail-body.{ts,html}` (composition)
- `…/vault-item-overview-cards/` (delete), `…/vault-item-meta-line/` (reduce/inline)
- `…/vault-item-status-chips/` (strip secondary badges)
- `…/vault-item-intake-rationale/` (absorb ai_rationale)
- store `dialog/vault-item-dialog-store.ts` (drop the now-unused summary computeds:
  `sourceSummary` / `hierarchySummary` / `timelineSummary` / `queueSummary`)
- V2 (`containers/vault-item-detail-v2/`, `components/vault-item-detail-body-v2/`, the `:seq/v2`
  route): shelve or delete once V1 carries the good ideas.
