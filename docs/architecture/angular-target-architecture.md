# Dashboard Angular Target Architecture

This is the target architecture for the new Angular shell.

## Principles

- standalone components
- signals for local UI state
- `computed()` for derived state
- small focused components
- lazy-loaded routes
- strict TypeScript
- accessibility first
- Zod at the boundary

## Stack

- Angular 21
- TanStack Query
- TanStack Table
- Zod
- Playwright e2e
- Vitest unit/component tests

## Shell Rules

The Angular shell owns:

- routing
- layout
- command palette
- modal outlets
- toasts
- feature composition

The shell does not own:

- grooming rules
- dispatch rules
- vault invariants
- email classification rules
- context model rules

