# Conventions

Rationale and context behind rules in `.claude/CLAUDE.md`.

## Signal forms are blocked

`@angular/forms/signals` is not used in this project.

Playwright synthetic DOM events do not trigger `FormField` listeners in a zoneless Angular app. This makes E2E testing impossible against signal forms. Revisit when Angular upgrades the event dispatch path.

Diagnostic page: `/test-forms`.

All forms use **ReactiveFormsModule** (`FormBuilder`, `formControlName`, `formGroup`).

## Experimental APIs are welcome

This is a showcase project. Leading-edge is the point. Tag experimental APIs with a brief comment so the risk surface is visible.

## UX — errors over disabled states

Disabled inputs are silent failures. Let the user act; explain what went wrong after.

Exception: truly read-only values (computed fields, audit timestamps) may be disabled.

## E2E selectors via `data-testid`

E2E specs select DOM via stable test hooks, not CSS class names.

**Hierarchy of selector preference** (most stable first):

1. **Semantic role queries** — `getByRole('button', { name: /approve/i })`,
   `getByRole('heading')`, etc. Where they exist, these double as
   accessibility regression tests: a missing `name` or wrong role becomes a
   test failure. Always prefer for buttons, links, headings, form fields.

2. **`data-testid` attributes** — for components, layout containers,
   identified entities, and anything without a natural accessible role.
   Set on the host via Angular's `host` object (e.g. `'data-testid': 'vault-card'`)
   so the testid lives in TypeScript and is visible during refactors.
   Combine with a discriminator data attribute when the same testid
   appears multiple times: `data-testid="vault-card" data-seq="2420"`.

3. **CSS class names** — last resort. A class can be renamed for visual
   reasons in any commit; tests break silently. We hit this in May 2026
   when the unified `vault-card` migration changed `.card__seq` →
   `.vault-card__seq` and broke half the kanban specs without anyone
   noticing until a fresh test ran.

**Naming**: kebab-case, component-scoped (`vault-card`, `kanban-column`,
`card-callout`). Discriminator attributes are short and meaningful
(`data-seq`, `data-status`, `data-variant`).

**When adding a new feature with E2E coverage**: tag the component's host
element with `data-testid` upfront. The cost is one line in `host: {...}`;
the benefit is tests survive future CSS work without churn.

## Rewrite-on-touch (E2E specs)

When a feature has been redesigned hard enough that the existing E2E spec
is testing a model that no longer exists — different schema, different
DOM, different routes — the right move is **`test.describe.fixme(...)`**
plus a header comment explaining the situation, not a half-fix.

A spec that fails for stale reasons is worse than a missing one: it
trains everyone to ignore failures. Marking it `fixme` keeps the intent
visible (Playwright reports it as expected-fail), keeps the file
discoverable, and signals "rewrite me when you're back in this code."

The header comment should:
1. Explain *why* it's broken (the specific schema/DOM drift).
2. Point at the canonical pattern to use during rewrite (currently
   `e2e/pages/grooming-board.page.ts` — testid-based page object,
   GroomingStatus-typed column API, role-based button selectors).
3. Tell the next reader to delete the comment and re-enable when done.

This is a one-way ratchet: never ratchet *up* (going from re-enabled
back to fixme) without a corresponding code-change reason recorded in
the comment. Drift is contagious; fixme accumulation isn't free.

## Testing philosophy

- **E2E over component tests.** Control-plane dashboard — Playwright on real flows catches more real bugs than DOM assertions.
- **Unit test logic, not rendering.** Service methods, computed signals, guards — yes. "Did Angular render my template" — no.
- **Delete low-value tests.** `expect(component).toBeTruthy()` is noise. If you can't describe what breaks on failure, delete it.
- **Component tests earn their place.** Only for non-trivial branching (conditional logic, confirm dialogs, validation) E2E can't cheaply cover.
- **Humour is welcome, subtly.** Dark UK style. One or two wry names per describe block. Never at the cost of readability.

Commands: `ng test --no-watch`, `npx playwright test`.

## Comments

Comment the WHY. Capture design decisions and rejected alternatives. Skip anything the code already says.

## Architectural rules are enforced via ESLint

The repo runs ESLint (`npm run lint`) with a hand-curated config. Rather
than adopting a recommended ruleset, we add architectural rules one at a
time, each documented in `docs/architecture/lint-rules.md` with a stable
rule ID, scope, exemptions, and known violations.

To add a new rule:
1. Reserve an ID in `lint-rules.md` (`<DOMAIN>-<TOPIC>-<NNN>`)
2. Document what / why / scope / known violations
3. Add the rule to `eslint.config.js`, mirroring the ID in the error
   message so a violator can find the doc

Rationale: the recommended rulesets bundle stylistic preferences that
don't match this codebase (no-explicit-any, no-output-native, etc.) and
would generate hundreds of false-positive errors. We earn each rule
deliberately. The shrinking list of "known violations" in lint-rules.md
is the visible maturity ratchet.

## Vault item mutations go through the command layer

`VaultItemsService` is the data-access layer — HTTP, optimistic state, low-level mutations. **Components, dialogs, and kanban boards do not call mutation methods on it directly.** They go through `VaultItemCommands` (`features/vault-items/commands/`).

Why: a vault item's lifecycle is a funnel. Each stage has preconditions (readiness, allowed transitions) and side-effects (audit events, thread messages, ownership changes). When that logic is scattered across UI callers, it drifts — the screenshot of dispatches failing with `expected ungroomed, got intake_rejected` is the symptom of a missing precondition gate. The command layer is where the funnel is enforced and read top-to-bottom.

Allowed in callers:
- `vaultItemsService.items()`, `getById`, `getBySeq` — read-only signals
- `commands.archive(id)`, `commands.complete(id)`, `commands.approveForDispatch(id)` etc. — gated mutations

Not allowed in callers:
- `vaultItemsService.archive`, `setCompleted`, `setGroomingStatus`, `rejectItem`, `reassign`, `update` — direct mutation methods. Use the command equivalent.

The transition allowlist (`domain/vault/transitions.ts`) is **advisory** at the operator boundary — kanban drag-drop passes `{ force: true }` so Marvin can shove items around during exploration. It is **strict** at programmatic boundaries — `approveForDispatch` refuses to advance an item that doesn't satisfy `computeReadiness`.

Optimistic-update boilerplate lives in `shared/data-access/with-optimistic.ts`. Three helpers — `withOptimisticUpdate`, `withOptimisticCreate`, `withOptimisticRemove` — own the rollback policy. Don't roll your own.
