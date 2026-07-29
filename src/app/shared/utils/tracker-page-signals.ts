import { Signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { type PeriodWindow, type TrackerPeriod, periodWindow } from '@shared/components/ui-period-totals/period-window';
import { logicalToday, shiftIsoDay } from '@shared/utils/datetime.utils';
import { anchorIsoOf, defaultKey, isValidKey, sanitiseKey, shiftKey } from './period-routing';

export interface TrackerPageSignals {
  readonly granularity: TrackerPeriod;
  readonly todayIso: string;
  readonly key: Signal<string>;
  readonly window: Signal<PeriodWindow>;
  readonly isAtToday: Signal<boolean>;
  readonly windowDays: Signal<string[]>;
  readonly showPatterns: Signal<boolean>;
  previous(): void;
  next(): void;
  today(): void;
  onDateChange(value: string): void;
}

export function createTrackerPageSignals(config: {
  basePath: string;
  route: ActivatedRoute;
  router: Router;
}): TrackerPageSignals {
  const { route, router, basePath } = config;
  const granularity = route.snapshot.data['granularity'] as TrackerPeriod;
  const todayIso = logicalToday();

  const key = toSignal(
    route.paramMap.pipe(map((p) => sanitiseKey(granularity, p))),
    { initialValue: defaultKey(granularity) },
  );

  const anchorIso = computed(() => anchorIsoOf(granularity, key()));

  const window = computed(() => periodWindow(granularity, anchorIso(), todayIso));

  const isAtToday = computed(() => {
    const w = window();
    return w.start <= todayIso && todayIso <= w.end;
  });

  const windowDays = computed<string[]>(() => {
    const { start, end } = window();
    const out: string[] = [];
    let cur = start;
    for (let i = 0; i < 31 && cur <= end; i++) {
      out.push(cur);
      cur = shiftIsoDay(cur, 1);
    }
    return out;
  });

  const showPatterns = computed(() => granularity !== 'day');

  function navigateTo(k: string): void {
    router.navigate([`/${basePath}`, granularity, k]);
  }

  return {
    granularity,
    todayIso,
    key,
    window,
    isAtToday,
    windowDays,
    showPatterns,
    previous: () => navigateTo(shiftKey(granularity, key(), -1)),
    next: () => navigateTo(shiftKey(granularity, key(), 1)),
    today: () => navigateTo(defaultKey(granularity)),
    onDateChange: (value: string) => {
      if (isValidKey(granularity, value)) navigateTo(value);
    },
  };
}
