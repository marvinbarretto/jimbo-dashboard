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
