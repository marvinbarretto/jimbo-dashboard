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
