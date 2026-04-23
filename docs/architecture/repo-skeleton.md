# Dashboard Angular Repo Skeleton

This is the concrete Angular repository shape for the `dashboard` repo.

## Proposed Layout

```text
dashboard/
  apps/
    web/
      src/
        app/
          app.component.ts
          app.config.ts
          app.routes.ts
          shell/
          features/
          shared/
        assets/
        styles/
  libs/
    core/
      src/
        lib/
          domain/
          application/
          infrastructure/
          contracts/
    ui/
      src/
        lib/
          primitives/
          tables/
          forms/
          overlays/
    testing/
      src/
        lib/
          fixtures/
          helpers/
          page-objects/
  docs/
    vision/
    architecture/
    migration/
    decisions/
```

## Library Responsibilities

### `libs/core`

Owns the framework-agnostic core:

- domain models
- workflow rules
- application use-cases
- query/command contracts
- API adapters
- schema validation

### `libs/ui`

Owns reusable UI primitives:

- buttons
- cards
- tables
- drawers
- modals
- badges
- notices

### `libs/testing`

Owns reusable test helpers:

- fixtures
- builders
- mocks
- page objects
- workflow test helpers

## Application Shell Responsibilities

`apps/web` owns:

- Angular bootstrap
- routing
- top-level layout
- global navigation
- feature composition
- auth/session wiring
- presentation-only state

