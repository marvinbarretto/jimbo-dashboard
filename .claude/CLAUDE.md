Expert in TypeScript, Angular, scalable web apps. Functional, maintainable, performant, accessible.

Rationale and philosophy live in `docs/conventions.md` — read it when a rule below feels surprising.

## Hard rules

### TypeScript
- Strict typing. No `any` — use `unknown`.
- Prefer type inference when obvious.
- String literal unions over enums (clean API serialisation).
- Lean on mapped types, `Record`, template literals, discriminated unions, `satisfies`.

### Angular (v20+)
- Standalone components. Do NOT set `standalone: true` — it's the default.
- `inject()` over constructor injection.
- `input()` / `output()` functions, not decorators.
- Signals for state. `computed()` for derived. `update`/`set`, never `mutate`.
- `ChangeDetectionStrategy.OnPush` on every `@Component`.
- Host bindings via `host` object, NOT `@HostBinding` / `@HostListener`.
- Lazy load feature routes.
- `NgOptimizedImage` for static images (not base64).
- Services: single responsibility, `providedIn: 'root'`.

### Templates
- Native control flow: `@if` `@for` `@switch` — never `*ngIf` etc.
- `class` bindings, not `ngClass`. `style` bindings, not `ngStyle`.
- Async pipe for observables.
- No globals (`new Date()` etc.) in templates.
- External template/style paths relative to component TS file.

### Forms
- **ReactiveFormsModule only.** Signal forms blocked — see `docs/conventions.md`.

### UX
- Errors over disabled states. Exception: truly read-only fields.

### Testing
- Prefer E2E (Playwright) over component tests. Unit test logic, not rendering.
- `ng test --no-watch` / `npx playwright test`.
- Full philosophy in `docs/conventions.md`.

### Comments
- WHY, not what. Skip anything the code already says.

## Experimental APIs

Welcomed. Tag with a short comment marking the risk surface.
