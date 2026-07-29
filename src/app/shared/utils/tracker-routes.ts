import { type Routes } from '@angular/router';
import { thisMonthKey, thisWeekKey, todayKey } from '@shared/utils/date-keys';

export function trackerRoutes(config: {
  basePath: string;
  label: string;
  loadPage: () => Promise<{ [key: string]: unknown }>;
  pageExport: string;
}): Routes {
  const { basePath, label, loadPage, pageExport } = config;
  return [
    {
      path: '',
      loadComponent: () =>
        import('@shared/components/tracker-shell/tracker-shell').then((m) => m.TrackerShell),
      data: { basePath, label },
      children: [
        {
          path: 'day/:date',
          title: `${label} — Day`,
          loadComponent: () => loadPage().then((m) => m[pageExport] as never),
          data: { granularity: 'day' },
        },
        {
          path: 'week/:week',
          title: `${label} — Week`,
          loadComponent: () => loadPage().then((m) => m[pageExport] as never),
          data: { granularity: 'week' },
        },
        {
          path: 'month/:month',
          title: `${label} — Month`,
          loadComponent: () => loadPage().then((m) => m[pageExport] as never),
          data: { granularity: 'month' },
        },
        { path: 'day', redirectTo: () => `/${basePath}/day/${todayKey()}` },
        { path: 'week', redirectTo: () => `/${basePath}/week/${thisWeekKey()}` },
        { path: 'month', redirectTo: () => `/${basePath}/month/${thisMonthKey()}` },
        { path: '', pathMatch: 'full', redirectTo: () => `/${basePath}/day/${todayKey()}` },
      ],
    },
  ];
}
