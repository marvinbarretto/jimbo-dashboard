# Grooming pipeline + modal improvements

**Date:** 2026-04-27
**Author:** Marvin (with Claude as scribe)
**Status:** Design approved, ready for implementation plan

## Goal

Make the Grooming pipeline more parseable, auditable, and recoverable. Five changes work together to give the operator (Marvin) confidence in what the agents have done and a clean way to send work back when it's wrong.

## Out of scope

- Streaming runtime logs from skills (mid-run). Captured as Phase 2 follow-up; this spec only covers run-completion log lines.
- Auto-retry of items in `needs_rework`. The new owner picks up manually; auto-retry is a separate concern.
- Multi-stage rejection history rendering on the card. Only the latest rejection reason is rendered prominently; earlier ones live in the activity log.
- Acceptance-criteria inline editing — already exists per existing UI; if it doesn't, light add during implementation, but not the focus of this spec.
- Mobile / responsive shape of the modal. Header restructure assumes wide viewport.

---

## Section 1 — Parent link in modal

**Problem.** The parent link in the modal uses `routerLink="['/vault-items', parent.seq]"`, which navigates to a separate route and leaves the current modal "behind" instead of swapping its contents.

**Fix.** Replace the `routerLink` with a button (or anchor with `preventDefault`) that calls the modal-swap helper exposed by `withVaultDetailModal()` in `src/app/shared/kanban/detail-modal.ts`. Clicking updates the `?detail=<parent.seq>` URL param; the existing CDK Dialog mechanism re-renders the modal body with the parent item.

**Audit while there.** Apply the same fix to any other vault-item link inside the modal (children, blockers — wherever a `routerLink` to `/vault-items/:seq` is used inside the detail body).

**Acceptance:**
- Clicking the parent link in the modal updates the modal contents to the parent item without closing the modal or navigating to a new route.
- Browser back button returns to the previous item in the modal.

---

## Section 2 — Activity log clarity + verbosity toggles

**Problem.** Events already carry rich data (`actor_id`, `from_status`/`to_status`, decisions, tokens), but the rendering doesn't surface the **actor → next owner** hand-off pattern. There's also no way to dial down noise when scanning, or dial up detail when debugging.

### a) Standard line shape

Every event renders as:
```
[time]  @actor  →  verb  [→ @target]   summary
```

Mappings per type:
- `AssignedEvent` — `@actor reassigned → @to_actor: <reason>`
- `AgentRunCompletedEvent` — `@skill ran ([from_status → to_status]?): <summary>`
- `GroomingStatusChangedEvent` — `@actor moved <from> → <to>`
- `CreatedEvent` — `@actor created from <source>`
- `ThreadMessagePostedEvent` — `@actor posted <kind>` (clickable, scrolls to thread)
- `RejectionEvent` (new — see Section 4) — `@actor rejected from <from_status> → @to_owner: <reason>`

Actor renders with a kind badge (human / agent / system) so the chain is unambiguous.

### b) Verbosity levels

Three modes, controlled by a 3-segment toggle above the activity log inside the modal:

| Level    | Renders |
|----------|---------|
| Compact (default) | Single line: time, actor, verb, target |
| Detailed | + status transition chip, + summary, + cost chip if present |
| Debug    | + decisions list, + reasoning blockquote, + token counts (in/out/cached), + skill_id, + dispatch_id, + duration_ms, + truncated `log_lines` (collapsed `<details>`) |

Choice persists per-user via LocalStorage initially. Backend pref-store later when user prefs system exists.

### c) Filter chips

Above the verbosity toggle: `all` `status` `agent runs` `assignments` `thread`. Multi-select. Default = all.

### d) Runtime logs from skills

Add `log_lines: string[] | null` to `AgentRunCompletedEvent`. Hermes appends key log lines (≤ 50, truncated to 200 chars each) when the run completes. Rendered only at Debug verbosity, inside a collapsed `<details>`.

Streaming logs during a run is Phase 2 — out of scope here.

### e) Cost surfacing

`AgentRunCompletedEvent` already carries `cost_usd`, `tokens_in`, `tokens_out`, `tokens_cached`. The recent commit dropped these from the chip rendering. Bring back at **Detailed** verbosity only, as a faint trailing chip on the event row.

**Acceptance:**
- Compact mode shows ≤ 2 lines per event.
- Detailed mode shows the same fields the Compact does + summary + transition + cost.
- Debug mode shows everything available on the event payload.
- Verbosity choice persists across page reloads.
- Filter chips reduce visible events but don't reorder them.

---

## Section 3 — Acceptance-criteria verbosity policing

**Problem.** The `vault-decompose` skill emits multi-sentence acceptance-criteria blobs that are hard to test against. Example from a real run:
> "Event listings can be filtered by Free and Covers. Filter controls are visible from the main event view. Filtering updates results dynamically. Both filter states can be active simultaneously or toggled independently."

This should be 3–5 tight assertions, one testable claim each.

### Layer 1 — hermes prompt change (vault-decompose skill)

In the hermes repo at `skills/dispatch/vault-decompose/`, update the prompt to require:
- 3–5 criteria total, no more
- Each criterion ≤ 120 chars
- Single testable assertion per line — no "and" chains, no rationale
- Preferred forms: `User can X`, `Given X, when Y, then Z`, `<Subject> shows/persists/blocks <state>`
- Few-shot examples in the prompt show good and bad shapes side-by-side

This change lives in the hermes repo, not the dashboard. Captured here so the change is tracked alongside the dashboard guard.

### Layer 2 — dashboard guard (defence-in-depth)

When `acceptance_criteria` lands on a `VaultItem` (from any source — agent or human), validate each item:
- ≤ 120 chars: clean
- 121–200 chars: warning chip "verbose" on that AC row in the modal
- \> 200 chars: red chip "AC exceeds length policy"; tooltip suggests reject or edit

Validation is **non-blocking** — data still saves. Operator decides whether to reject or accept. This catches drift if the prompt regresses.

### Layer 3 — operator override

Inline-edit per AC row should already exist (confirm during implementation; add if missing). Operator shortens manually without rejecting the whole run.

### Coordination with reject flow

If verbose AC is the only problem, operator clicks Reject (Section 4) with reason "AC too verbose, retry — see thread for guidance" and reassigns to `vault-decompose`. Skill re-runs with tighter prompt. Closes the loop.

**Acceptance:**
- AC rows ≤ 120 chars render plain.
- AC rows 121–200 chars render with a warning chip.
- AC rows > 200 chars render with an error chip.
- AC editing in modal is inline (per row).

---

## Section 4 — Reject-with-reason flow

**Problem.** When agents produce bad output, there's no clean operator action to send the work back through the chain. Today the operator can only edit the form or move the item manually via dropdown — neither captures intent or audit.

### a) New status

Add `needs_rework` to `GroomingStatus`. Place as the **leftmost** kanban column on the grooming board — the "things that need my attention" lane. Typical operator scan starts there.

### b) Reject button

A `Reject` button in the modal header (Section 5 covers placement). Visible from any status **except** `ungroomed` and `needs_rework`.

Clicking opens an inline reject form within the modal (no separate dialog):

```
Reject this item

Reason (required, ≥ 12 chars)
[textarea — supports markdown]

Reassign to
[dropdown: defaults to last actor]
  ▸ @marvin (human)
  ▸ @boris (agent — last actor) ◀ default
  ▸ @ralph (agent)
  ▸ @vault-decompose (skill)
  ▸ @intake-quality (skill)
  ▸ @vault-classify (skill)

[Cancel]   [Reject and reassign]
```

Default new owner = the actor who produced the most recent `AgentRunCompletedEvent` (i.e., whose work is being rejected). If no agent has run yet on this item (e.g., rejecting from `intake_complete` after a human intake), the default falls back to the current `owner`. Operator can override to any actor.

### c) Wire effect (atomic transaction)

A single `POST /vault-items/:id/reject` API call:

1. `grooming_status` → `needs_rework`
2. `owner` → selected actor
3. New thread message of kind `rejection`, body = reason text
4. New `RejectionEvent` activity row written:
   - `actor_id` (rejector)
   - `from_status`
   - `to_status` = `needs_rework`
   - `from_owner` (previous owner)
   - `to_owner` (new assignee)
   - `reason` (full text, also linked to the thread message id)

### d) Card shape for `needs_rework`

Treat as another card-shape variant within the existing pattern (`grooming-card.ts` already uses computed signals + `.card--<state>` modifiers for epic, draft, blocker, etc.).

- New computed signal: `needsRework = computed(() => item.grooming_status === 'needs_rework')`
- New CSS class hook: `.card--needs-rework` — warning-tinted container, follows draft-badge precedent (scss:58–70)
- New template branch: `@if (needsRework())` renders an `<app-rework-badge>` (mirrors `app-blocker-badge` and `app-epic-badge` shape) showing reason snippet + reassignment target

No bespoke layout. Same pattern as the others.

### e) Adjacent latent shape — make subitem visible on cards

Cards with a `parent_id` have no visual cue today. Add a small `↳ #parent` chip in the card header (same pattern as the modal's parent line) — same surface area, low cost. Rationale (`ai_rationale`) stays in the modal only; not surfaced on the card.

### f) New types

- `GroomingStatus`: extend with `'needs_rework'`
- `ThreadMessageKind`: extend with `'rejection'`
- `RejectionEvent` activity type (new)
- API endpoint: `POST /vault-items/:id/reject` with `{reason, new_owner_id}`

### g) Out of scope

- Auto-retry by hermes when items land in `needs_rework`
- Multi-stage rejection history rendering on cards (latest only on card; full history in activity log)
- Cancel/undo of a rejection

**Acceptance:**
- A `Reject` button appears in the modal header for items not in `ungroomed` or `needs_rework`.
- Submission requires a non-empty reason ≥ 12 chars.
- After submit: status, owner, thread message, and activity event all written atomically.
- The card moves to the new leftmost `needs_rework` column.
- The card renders a rework badge with the reason snippet.
- Clicking the rework card reopens the modal showing the full reason in the activity log and as a thread message.

---

## Section 5 — Modal header + info hierarchy

**Problem.** The current header strip is flat — STATUS, READINESS, OWNER, PROJECT, PRIORITY (AI + Manual + eff%), RATIONALE, GROOMING all on one line. Duplicate info (PROJECT label + chip; AI P1 + Manual P1 + eff P1 when they agree) competes with the title.

### Restructure into 4 visual zones

**Zone 1 — Identity** (top line, compact):
```
#2352  [task]  LocalShout: add Free / Covers filter…       [edit] [reject] [archive] [delete]
```
The new `Reject` button (Section 4) sits between edit and archive.

**Zone 2 — Pipeline stepper** (replaces the GROOMING text label):
```
ungroomed → intake_complete → classified → ●decomposed● → ready
                                                ↑
                                              current
```
Visual stepper, current state highlighted. `needs_rework` renders as a side-branch state with red colour when the item is in it. Stepper is read-only in this spec — clicking a step is a no-op for now. (Possible future enhancement: clicking an earlier step opens the reject form pre-populated with "rewind to <step>" in the reason field. Out of scope.)

**Zone 3 — State row** (the meaningful chips, larger):
```
[active]  [@marvin]  [P1]  [Localshout]  [3/4 readiness — NOT_READY]
```
- Single priority chip = effective priority. Tooltip reveals AI vs Manual + confidence % if they differ. If they agree, the chip is just one number.
- Owner chip with avatar + kind badge.
- Project = one chip. Drops the PROJECT label.
- Readiness = slim bar + chip combo (current behaviour preserved).

**Zone 4 — Meta** (small, faint, fourth line):
```
created 3d ago  •  last activity 3d ago  •  rationale: "scoped coding task with three concrete steps…" [expand]
```
Rationale collapsed to one truncated line; click `[expand]` for full text. Currently it eats horizontal space when present.

### What's removed / consolidated

- "PROJECT" / "PRIORITY" / "GROOMING" / "OWNER" capital-letter labels — gone. Chips speak for themselves.
- `task` type chip — kept but smaller / inline with the seq.
- Duplicate project rendering — one place only.
- AI vs Manual priority — one chip, tooltip for divergence.
- "(eff: P1) 90%" inline math — moved to the priority tooltip.

**Acceptance:**
- Header renders in 4 distinct visual zones at the wide viewport.
- Pipeline stepper highlights the current grooming state.
- Priority shows a single chip; tooltip on hover reveals AI/Manual breakdown when they differ.
- Rationale is truncated by default; expand control reveals the full text.

---

## Cross-section dependencies

- Section 4's `RejectionEvent` is a new activity-log event type — Section 2's standard line shape includes it from the start.
- Section 4's `needs_rework` status is a new value in `GroomingStatus` — Section 5's pipeline stepper renders it as a side-branch and the `Reject` button is added to Section 5's Zone 1.
- Section 3's "verbose AC" warning chip should also feed into a quick-reject affordance in a follow-up: hovering a verbose AC row could surface "Reject for AC verbosity" — explicitly out of scope for this spec but worth noting.

## Implementation order (suggested)

1. **Domain + types**: extend `GroomingStatus`, `ThreadMessageKind`, add `RejectionEvent`. No UI yet.
2. **API**: add `POST /vault-items/:id/reject`. Wire transactional write.
3. **Section 1**: parent link fix. Tiny change, isolated.
4. **Section 4 (a–c, f)**: reject flow end-to-end (button, form, wire effect, new column).
5. **Section 4 (d, e)**: card shapes (`needs_rework` + subitem badge).
6. **Section 2**: activity log standard line + verbosity toggles + filter chips.
7. **Section 5**: modal header restructure including the pipeline stepper.
8. **Section 3 (Layer 2)**: AC length validation chips. (Layer 1 prompt change is in hermes repo, separate PR.)

This order ensures each step has a usable result and lets visual regressions surface early.
