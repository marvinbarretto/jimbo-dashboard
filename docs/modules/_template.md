---
module: module-name
repo: dashboard
description: One-line summary of what this module is for.
source_paths:
  - src/app/features/module-name/**
generated_at: YYYY-MM-DD
reviewed_commit: abc1234
sections:
  purpose: asserted
  responsibilities: asserted
  public-api: derived
  lifecycle: derived
  dependencies: derived
  tech-debt: asserted
---

# module-name

## Purpose

Why this module exists — the problem it solves and for whom. One or two
paragraphs. This is judgement, not code summary; it should survive refactors.

## Responsibilities

What this module owns (and, where it prevents confusion, what it explicitly
does NOT own). Bullet list.

## Public API

The surface other code/consumers use. For Angular features: the routes it
registers (`path` → component), the components/services it exports, and key
service methods. Not an exhaustive signature dump — the code is the reference.

## Lifecycle

How the module participates in the app's life: lazy-loaded route? Registered
in `app.routes.ts` or a child routes file? Guards/interceptors? Startup wiring
in `app.config.ts`? Include order-of-operations where it matters.

## Dependencies

- **Internal**: other features/domain models/shared components this one uses.
- **External**: jimbo-api endpoints it calls, third-party libs, env/config.

## Technical Debt

Known shortcuts, TODOs, missing tests, fragile spots — each with why it's
still acceptable (or when it stops being). Dated entries preferred:

- `2026-07-07` — description of the debt, and the "we know, because…" context.
