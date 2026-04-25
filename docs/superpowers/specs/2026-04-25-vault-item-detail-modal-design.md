# Vault Item Detail — Kanban Modal

**Date:** 2026-04-25
**Status:** Approved (design); implementation plan pending

## Goal

When a user opens a vault item from a kanban card (grooming or execution board), present the existing detail surface inside a modal layered over the board, instead of navigating away to `/vault-items/:seq`. Direct navigation, deep links, cmd-click, and middle-click must continue to land on the full-page route.

## Non-goals

- Editing the detail layout itself.
- Mobile bottom-sheet variant.
- Modal stacking (only one detail modal open at a time).
- Modal access from non-kanban surfaces in this iteration.

## Background

- Kanban cards (`grooming-card`, `execution-card`) currently render `<a [routerLink]="['/vault-items', seq]">` for both seq link and title.
- Detail container (`features/vault-items/containers/vault-item-detail`) is route-driven: it reads `:seq` from `ActivatedRoute`, resolves an item, fans out per-item loads (`activity`, `projects`, `deps`, `thread`), and exposes signals + mutation methods to a 424-line template.
- No existing dialog/overlay primitive — `archive`/`deleteItem` use `confirm()`. No `@angular/cdk` or `@angular/material` dependency.

## Design

### Approach

Route-driven CDK Dialog. URL is the single source of truth for "is the modal open?".

- Add a query param on the kanban routes: `?detail=<seq>`.
- Each board listens to that param. Param present → dialog open. Param cleared (close, backdrop, ESC) → dialog closes by writing the URL back.
- Detail body component is shared verbatim between full-page route and dialog host. No duplicated mutations.

Why route-driven:
- bookmarkable / shareable (`/grooming?detail=42`)
- browser back closes modal
- modal state survives reload of the kanban page
- cmd-click / middle-click on the card link still opens a new tab as the full page (preserves expected `<a>` semantics, satisfies a11y)

Why CDK Dialog (`@angular/cdk/dialog`) over hand-rolled `<dialog>`:
- focus trap, focus restore, ESC to close, backdrop, scroll lock, `role="dialog"`, `aria-modal` — all free
- portal-based; renders in `body` so kanban transforms / overflow don't clip it
- no Material styles imported — keep visual ownership in our SCSS
- ~40 KB gzip; acceptable for this app's footprint

### Component split

Three components; same body, two hosts.

#### `VaultItemDetailBody` (presentational — new)

`features/vault-items/components/vault-item-detail-body/`

- Inputs: `seq: input.required<number>()`.
- Internally identical to current `VaultItemDetail`: signals, computeds, mutation methods. The only change is sourcing `seq` from an `input()` instead of `ActivatedRoute.paramMap`.
- Owns `Title` updates *only when used by the page host* — title management moves to the page host so opening a modal does not change `<title>`. (The body component does not touch `Title`.)
- All current mutations stay here (`archive`, `deleteItem`, `reassign`, `addBlockerBySeq`, `onStatusChange`, etc.).

#### `VaultItemDetailPage` (route host — replaces current container)

`features/vault-items/containers/vault-item-detail/`

- Route: `/vault-items/:seq` (unchanged).
- Reads `:seq` from `ActivatedRoute`, sets document title, renders `<app-vault-item-detail-body [seq]="seq()" />`.

#### `VaultItemDetailDialog` (dialog host — new)

`features/vault-items/containers/vault-item-detail-dialog/`

- Receives `{ seq: number }` via `DIALOG_DATA`.
- Renders modal chrome (header bar with `#<seq> <title>`, close button, scrollable body slot, optional footer slot) wrapping `<app-vault-item-detail-body [seq]="data.seq" />`.
- Closes with `dialogRef.close()` from the close button. URL sync is the kanban host's job, not the dialog's.

### Modal shell

`shared/components/modal-shell/modal-shell.ts` — generic, reusable across future modals.

- Slots: `header`, `body` (scrollable), `footer` (optional).
- Inputs: `titleId: input<string>()`, `closeLabel: input<string>('Close')`.
- Outputs: `close: output<void>()`.
- Wires `aria-labelledby` to `titleId`.
- Pure presentation; no CDK imports — `VaultItemDetailDialog` brings the CDK pieces and embeds a `<app-modal-shell>` inside.

### Route / dialog wiring

A composable, not a directive (matches existing `createKanban*` pattern in `shared/kanban/`).

`shared/kanban/detail-modal.ts`

```ts
export function withVaultDetailModal(): void {
  const dialog = inject(Dialog);
  const route = inject(ActivatedRoute);
  const router = inject(Router);

  // detail signal hydrated from query param
  const detailSeq = toSignal(
    route.queryParamMap.pipe(
      map(p => {
        const raw = p.get('detail');
        const n = raw ? Number(raw) : NaN;
        return Number.isNaN(n) ? null : n;
      }),
      distinctUntilChanged(),
    ),
    { initialValue: null },
  );

  let ref: DialogRef<unknown, VaultItemDetailDialogData> | null = null;

  effect(() => {
    const seq = detailSeq();
    if (seq === null) {
      ref?.close();
      ref = null;
      return;
    }
    if (ref) return; // already open for some seq; URL change drove this — fall through
    ref = dialog.open(VaultItemDetailDialog, {
      data: { seq },
      ariaModal: true,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      hasBackdrop: true,
      disableClose: false,
      panelClass: 'vault-detail-dialog',
    });
    ref.closed.subscribe(() => {
      // user closed via ESC / backdrop / close button — drop the query param
      ref = null;
      router.navigate([], {
        relativeTo: route,
        queryParams: { detail: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  });
}
```

Each kanban board calls `withVaultDetailModal()` from its constructor — one line per board. Both grooming and execution boards keep their existing query-param-merging URL machinery; `detail` is just another key.

### Card click interception

Cards keep `[routerLink]="['/vault-items', seq]"` so cmd/middle-click opens a new tab as the full page (a11y + expected link behaviour). Plain left-click sets `?detail=<seq>` instead.

```html
<a
  [routerLink]="['/vault-items', item().seq]"
  (click)="onCardLinkClick($event, item().seq)"
  class="card__title"
>
```

```ts
onCardLinkClick(event: MouseEvent, seq: number): void {
  // honour modifier keys → let routerLink handle navigation
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  event.preventDefault();
  this.router.navigate([], {
    relativeTo: this.route,
    queryParams: { detail: seq },
    queryParamsHandling: 'merge',
    replaceUrl: false, // pushes a history entry — back button closes modal
  });
}
```

Both card components (`grooming-card`, `execution-card`) get this handler. Lift to a shared `cardLinkClick` helper in `shared/kanban/` to avoid duplicating.

### Scope of click interception

Apply the interception to **the title link only** on each card. The seq link (`#42`) keeps default `routerLink` behaviour — clicking the seq is a power-user "show me the page" shortcut, the title is the affordance for "show me details in context". Easier to discover than a kbd modifier and matches GitHub/Linear conventions.

### A11y

CDK gives:
- `role="dialog"`, `aria-modal="true"`
- focus trap with `autoFocus: 'first-tabbable'`
- ESC closes
- focus restored to triggering card on close (`restoreFocus: true`)
- `inert` on background siblings (Angular CDK 18+)

We add:
- `aria-labelledby` on the dialog → `id` of the `#<seq> <title>` heading inside `modal-shell`
- close button labelled `Close detail` (not just "Close")
- live region: title heading is `<h2>` + `aria-live="polite"` so SR announces seq/title on open
- prefers-reduced-motion respected — CDK animations honour the media query; SCSS for `modal-shell` uses `@media (prefers-reduced-motion: reduce)` to skip transition
- 44×44 px close button hit target
- focus-visible ring on close button + interactive elements inside body
- ESC closes even when focus is in a `<select>`/`<input>` inside the body — verified in test

### CSS / scroll lock

- CDK applies `overflow: hidden` to the body via its overlay container — no manual scroll lock needed.
- `panelClass: 'vault-detail-dialog'` lets us style chrome in global styles or via `::ng-deep` (avoid; prefer global styles for CDK panels).
- Modal max-width 920px, max-height `min(900px, calc(100vh - 4rem))`, body scrolls within.
- Backdrop: `rgba(0, 0, 0, 0.55)`, no blur (perf on slower machines).

### State / data

- Per-item parallel loads (`ActivityEventsService.loadFor`, etc.) move from the route container to the body component (they trigger off `seq` changes there). Same effect, same lifecycle — body is the only thing reading `seq`, so it owns the loads.
- Mutations write through the same services as today; no change.
- Closing the modal doesn't unload data — services keep their per-item buckets cached. Reopening the same item is instant.

### Title (`<title>`) handling

Only the page host updates `document.title`. Opening a modal **does not** mutate the title. Rationale: the page underneath the modal is still the kanban; reading `#42 — fix x` in the tab while looking at a board would mislead. On close, no restore needed because we never set it.

### History behaviour

- Opening modal: `replaceUrl: false` → pushes a history entry. Back button closes.
- Closing modal (any path: ESC, backdrop, close button, "X"): `replaceUrl: true` → no extra entry, just clears the param in place.
- Direct paste of `/grooming?detail=42` in a fresh tab: board renders, effect sees the param, dialog opens. No flash.

### Refresh / cold-load

Refreshing `/grooming?detail=42` works because the effect hydrates from the query param post-mount. Brief delay (one tick) is acceptable; no skeleton needed for the modal itself — the body inside renders its own loading state if the item hasn't resolved yet.

### Out-of-scope cards

If `?detail=<seq>` is set but the item isn't visible on the current board (e.g. filtered out), the modal still opens — the modal works off the seq, not the kanban filter. Closing returns to the (still-filtered) board.

### Failure modes

- `?detail=<seq>` references a non-existent seq → body renders its existing "not found" state inside the modal chrome. Close button still works.
- `?detail` value isn't a number → effect treats as null, no dialog opens, param is silently cleared next URL write.
- Two `?detail` params written rapidly (race) → effect sees the latest via `distinctUntilChanged`; only the latest dialog opens.

## Testing

Per project convention: prefer Playwright E2E for user flows, unit tests for pure logic.

### E2E (Playwright)

`e2e/kanban-detail-modal.spec.ts`:

- click card title on grooming board → modal opens, URL has `?detail=<seq>`, focus inside modal
- ESC → modal closes, URL drops `detail`, focus restored to card
- backdrop click → same
- close button → same
- back button after open → modal closes
- cmd-click card title → opens new tab on `/vault-items/:seq` (full page)
- middle-click card title → same
- cmd-click seq link → opens new tab on full page
- direct nav to `/grooming?detail=42` → modal renders on load
- direct nav to `/vault-items/42` → full page renders, no modal
- modal mutations (e.g. archive flow up to confirm dialog) reach the same services as page mutations
- focus trap: Tab through dialog cycles within the modal
- run all the above on execution board too

### Unit

- `withVaultDetailModal` composable: signal hydration + open/close synchronisation (with stub `Dialog` and `Router`)
- card link click handler: modifier-key gating logic in isolation

### A11y check

Manual:
- VoiceOver: open modal → announce `#<seq> <title>` and "dialog"
- screen-reader Tab order: header → body content → close
- `prefers-reduced-motion`: open modal with reduce on → no transition

## Migration / rollout

One PR is fine. Feature isn't behind a flag — direct paths still work, fallback is the existing route. No data changes.

Order within the PR:
1. Add `@angular/cdk` dependency.
2. Create `VaultItemDetailBody`, move logic from current container.
3. Create `VaultItemDetailPage` (former container), thin wrapper.
4. Create `ModalShell` shared component.
5. Create `VaultItemDetailDialog` consuming body + shell.
6. Create `withVaultDetailModal` composable.
7. Wire into `GroomingBoard` and `ExecutionBoard` constructors.
8. Update both kanban cards: title link click handler + import shared helper.
9. E2E + unit tests.

## Risks

- **CDK bundle add (~40 KB gz).** Acceptable for an internal dashboard; flagged for review.
- **Effect-driven dialog open/close has a subtle bug shape: ref leakage on rapid URL changes.** Spec mitigates with `distinctUntilChanged` + the `if (ref) return` guard, but worth a focused unit test.
- **Body component refactor risks regressing the page route.** Mitigation: page route gets the same E2E coverage as before in this PR (verify `/vault-items/:seq` still passes existing tests).
- **Kanban filter URL machinery + new `detail` param.** Both boards already use `queryParamsHandling: 'merge'`; verify `replaceUrl: true` on filter writes doesn't clobber `detail` mid-flight.

## Open questions

None blocking. Future iterations:
- mobile bottom-sheet variant (CDK supports breakpoint-conditional dialog config)
- modal-from-anywhere (e.g. notifications): `withVaultDetailModal()` is already routable, so a notification deep link to `/grooming?detail=42` works today
