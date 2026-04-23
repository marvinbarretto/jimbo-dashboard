# Current State Inventory

This document maps the existing `site` dashboard implementation to the target
`dashboard` repo.

It is the practical bridge between:

- the current implementation we are migrating away from
- the backend capabilities we already have
- the future Angular shell we are building toward

## Current Frontend Implementation

The existing dashboard admin UI lives in the `site` repo.

Key entry points:

- [`site/src/pages/app/jimbo/dashboard/index.astro`](/Users/marvinbarretto/development/site/src/pages/app/jimbo/dashboard/index.astro)
- [`site/src/pages/app/jimbo/dashboard/[...slug].astro`](/Users/marvinbarretto/development/site/src/pages/app/jimbo/dashboard/[...slug].astro)
- [`site/src/admin-app/App.tsx`](/Users/marvinbarretto/development/site/src/admin-app/App.tsx)
- [`site/src/admin-app/routes.tsx`](/Users/marvinbarretto/development/site/src/admin-app/routes.tsx)
- [`site/src/admin-app/dashboard/url-state.ts`](/Users/marvinbarretto/development/site/src/admin-app/dashboard/url-state.ts)

## Surface To Target Mapping

### Today

Current implementation:

- [`site/src/admin-app/views/today/TodayView.tsx`](/Users/marvinbarretto/development/site/src/admin-app/views/today/TodayView.tsx)

Target repo module:

- `dashboard/apps/web/src/app/features/today`

### Projects

Current implementation:

- [`site/src/admin-app/views/projects/ProjectsView.tsx`](/Users/marvinbarretto/development/site/src/admin-app/views/projects/ProjectsView.tsx)
- [`site/src/admin-app/views/projects/ProjectsContextView.tsx`](/Users/marvinbarretto/development/site/src/admin-app/views/projects/ProjectsContextView.tsx)

Target repo module:

- `dashboard/apps/web/src/app/features/projects`
- `dashboard/libs/core/src/lib/domain/context`

### Vault

Current implementation:

- [`site/src/admin-app/views/vault/VaultView.tsx`](/Users/marvinbarretto/development/site/src/admin-app/views/vault/VaultView.tsx)
- [`site/src/admin-app/views/vault/VaultNoteModal.tsx`](/Users/marvinbarretto/development/site/src/admin-app/views/vault/VaultNoteModal.tsx)
- [`site/src/admin-app/views/vault/note-modal/`](/Users/marvinbarretto/development/site/src/admin-app/views/vault/note-modal/)

Target repo module:

- `dashboard/apps/web/src/app/features/vault`
- `dashboard/libs/core/src/lib/domain/vault`

### Tasks

Current implementation:

- routed through the same vault views with `ready`/`assigned_to` logic

Target repo module:

- `dashboard/apps/web/src/app/features/tasks`
- `dashboard/libs/core/src/lib/application/tasks`

### Grooming

Current implementation:

- [`site/src/admin-app/views/grooming/GroomingPipelineView.tsx`](/Users/marvinbarretto/development/site/src/admin-app/views/grooming/GroomingPipelineView.tsx)
- [`site/src/admin-app/views/grooming/GroomingProposalView.tsx`](/Users/marvinbarretto/development/site/src/admin-app/views/grooming/GroomingProposalView.tsx)
- [`site/src/admin-app/views/grooming/GroomingLessonsView.tsx`](/Users/marvinbarretto/development/site/src/admin-app/views/grooming/GroomingLessonsView.tsx)

Target repo module:

- `dashboard/apps/web/src/app/features/grooming`
- `dashboard/libs/core/src/lib/domain/grooming`

### Stream

Current implementation:

- [`site/src/admin-app/views/activity/StreamView.tsx`](/Users/marvinbarretto/development/site/src/admin-app/views/activity/StreamView.tsx)
- [`site/src/admin-app/views/activity/SystemEventsView.tsx`](/Users/marvinbarretto/development/site/src/admin-app/views/activity/SystemEventsView.tsx)

Target repo module:

- `dashboard/apps/web/src/app/features/stream`
- `dashboard/libs/core/src/lib/application/stream`

### Board

Current implementation:

- [`site/src/admin-app/views/activity/InPlayBoardView.tsx`](/Users/marvinbarretto/development/site/src/admin-app/views/activity/InPlayBoardView.tsx)
- [`site/src/admin-app/views/dispatch/DispatchHistoryView.tsx`](/Users/marvinbarretto/development/site/src/admin-app/views/dispatch/DispatchHistoryView.tsx)

Target repo module:

- `dashboard/apps/web/src/app/features/board`
- `dashboard/libs/core/src/lib/domain/dispatch`
- `dashboard/libs/core/src/lib/application/board`

### Emails

Current implementation:

- [`site/src/admin-app/views/emails/EmailReportsView.tsx`](/Users/marvinbarretto/development/site/src/admin-app/views/emails/EmailReportsView.tsx)
- [`site/src/admin-app/views/emails/EmailStatsView.tsx`](/Users/marvinbarretto/development/site/src/admin-app/views/emails/EmailStatsView.tsx)

Target repo module:

- `dashboard/apps/web/src/app/features/emails`
- `dashboard/libs/core/src/lib/domain/email`

### System

Current implementation:

- [`site/src/admin-app/views/system/SystemHealthView.tsx`](/Users/marvinbarretto/development/site/src/admin-app/views/system/SystemHealthView.tsx)
- [`site/src/admin-app/views/system/SystemCostsView.tsx`](/Users/marvinbarretto/development/site/src/admin-app/views/system/SystemCostsView.tsx)
- [`site/src/admin-app/views/system/SystemSettingsView.tsx`](/Users/marvinbarretto/development/site/src/admin-app/views/system/SystemSettingsView.tsx)
- [`site/src/admin-app/views/system/SystemContextView.tsx`](/Users/marvinbarretto/development/site/src/admin-app/views/system/SystemContextView.tsx)
- [`site/src/admin-app/views/system/SystemCalendarView.tsx`](/Users/marvinbarretto/development/site/src/admin-app/views/system/SystemCalendarView.tsx)

Target repo module:

- `dashboard/apps/web/src/app/features/system`
- `dashboard/libs/core/src/lib/domain/system`

## Shared Shell Concerns In Current Site Code

These are the things that should be split out in the new repo rather than
recreated as one large component:

- URL state parsing and sync
- route-to-view mapping
- query orchestration
- tab/subnav logic
- note selection and modal orchestration
- global capture / search palette
- sort/pagination repair logic

## Useful Current Implementation References

- [`site/src/admin-app/dashboard/useDashboardCoreData.ts`](/Users/marvinbarretto/development/site/src/admin-app/dashboard/useDashboardCoreData.ts)
- [`site/src/admin-app/dashboard/useVaultData.ts`](/Users/marvinbarretto/development/site/src/admin-app/dashboard/useVaultData.ts)
- [`site/src/admin-app/dashboard/useHealth.ts`](/Users/marvinbarretto/development/site/src/admin-app/dashboard/useHealth.ts)
- [`site/src/admin-app/dashboard/useEmails.ts`](/Users/marvinbarretto/development/site/src/admin-app/dashboard/useEmails.ts)
- [`site/src/admin-app/routes.tsx`](/Users/marvinbarretto/development/site/src/admin-app/routes.tsx)
- [`site/src/admin-app/dashboard/url-state.ts`](/Users/marvinbarretto/development/site/src/admin-app/dashboard/url-state.ts)

## Why This Matters

This inventory gives new agents a direct bridge from:

- old implementation
- current backend capabilities
- target architecture

so they can stop guessing where a feature belongs.

