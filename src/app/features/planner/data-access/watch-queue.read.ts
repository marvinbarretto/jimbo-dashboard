// Type-narrowed read surface over WatchQueueService.
//
// Why this exists. The path-based ESLint rule (VAULT-COMMANDS-001) blocks
// runtime imports of `*.service` outside the seam directories (commands/,
// data-access/, containers/, dialog/, tests). `watch-queue-panel` is a leaf
// component that only reads, so it can `inject(WATCH_QUEUE_READ)` and import
// THIS file — the path doesn't end in `*.service`, so the rule allows it.
// See docs/architecture/lint-rules.md.
//
// WatchQueueService is read-only by design, not by accident: url-triage's
// first release booked these items straight into the calendar and produced an
// evening timetable nobody would follow. `load()` is a GET, so it belongs on
// the read surface. If a real mutation ever lands on the service it must NOT
// be added here — it belongs behind the command layer.
//
// The token uses `factory: () => inject(WatchQueueService)` so it never
// creates a second instance — the same singleton backs both surfaces.

import { InjectionToken, Signal, inject } from '@angular/core';

import { WatchQueueService, type WatchQueueItem } from './watch-queue.service';

/** Read-only view of the watch queue: the list, its rollups, and load state. */
export interface WatchQueueRead {
  readonly items: Signal<readonly WatchQueueItem[]>;
  readonly isLoading: Signal<boolean>;
  readonly hasError: Signal<boolean>;
  readonly totalMinutes: Signal<number>;
  readonly totalWatchMinutes: Signal<number>;
  readonly count: Signal<number>;
  readonly byShortest: Signal<readonly WatchQueueItem[]>;
  load(): Promise<void>;
}

/**
 * DI token for the read surface. Components that only read should
 * `inject(WATCH_QUEUE_READ)` rather than `inject(WatchQueueService)` — same
 * singleton, lint-clean import path.
 */
export const WATCH_QUEUE_READ = new InjectionToken<WatchQueueRead>('WATCH_QUEUE_READ', {
  providedIn: 'root',
  factory: () => inject(WatchQueueService),
});
