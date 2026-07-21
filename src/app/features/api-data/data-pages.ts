import type { EndpointParams } from './data-access/jimbo-data.service';

export interface EndpointConfig {
  title: string;
  path: string;
  summary: string;
  params?: EndpointParams;
}

export interface DataPageConfig {
  key: string;
  title: string;
  hint: string;
  endpoints: EndpointConfig[];
}

/**
 * Raw endpoint inspectors, one page per API domain — a debugging surface, not
 * product UI. Only domains with no real page of their own live here; the
 * mail/calendar/tasks/triage/briefings/context inspectors were retired once
 * /mail-activity, /calendar-settings, /tasks and /briefings covered them.
 */
export const DATA_PAGES: DataPageConfig[] = [
  {
    key: 'ops',
    title: 'Ops',
    hint: 'Runtime health, Hermes jobs, pipeline runs, dispatch state, system events, and search integrity.',
    endpoints: [
      { title: 'Health', path: '/api/health', summary: 'Comprehensive service health check.' },
      { title: 'Health trends', path: '/api/health/trends', summary: 'Recent health trends and streaks.', params: { days: 7 } },
      { title: 'Health history', path: '/api/health/history', summary: 'Recent health snapshots.', params: { days: 7 } },
      { title: 'Hermes jobs', path: '/api/hermes/jobs', summary: 'Cron jobs, pause state, and counters.' },
      { title: 'Dispatch status', path: '/api/dispatch/status', summary: 'Current dispatch state.' },
      { title: 'Dispatch history', path: '/api/dispatch/history', summary: 'Completed and failed dispatches.' },
      { title: 'Latest pipeline run', path: '/api/pipeline/runs/latest', summary: 'Most recent pipeline execution.' },
      { title: 'Pipeline runs', path: '/api/pipeline/runs', summary: 'Recent pipeline executions.' },
      { title: 'Events', path: '/api/events', summary: 'System events, newest first.', params: { limit: 50 } },
      { title: 'Search integrity', path: '/api/search/integrity', summary: 'Search index parity with source tables.' },
    ],
  },
  {
    key: 'coach',
    title: 'Coach',
    hint: 'Supplement nudges, inventory, and fitness records.',
    endpoints: [
      { title: 'Today nudges', path: '/api/coach/today', summary: 'Supplement nudges grouped by state.' },
      { title: 'Inventory', path: '/api/coach/inventory', summary: 'Supplement inventory with runout projections.' },
      { title: 'Fitness summary', path: '/api/fitness/summary', summary: 'Fitness summary and daily breakdowns.' },
      { title: 'Fitness records', path: '/api/fitness/records', summary: 'Recent synced fitness records.' },
    ],
  },
  {
    key: 'interrogate',
    title: 'Interrogate',
    hint: 'Values, interests, sessions, proposals, and staleness data from the self-interrogation system.',
    endpoints: [
      { title: 'Snapshot', path: '/api/interrogate/snapshot', summary: 'Composite interrogate snapshot.' },
      { title: 'Staleness', path: '/api/interrogate/staleness', summary: 'Staleness scoring across interrogate entities.' },
      { title: 'Values', path: '/api/interrogate/values', summary: 'Active values.' },
      { title: 'Interests', path: '/api/interrogate/interests', summary: 'Active interests.' },
      { title: 'Sessions', path: '/api/interrogate/sessions', summary: 'Recent interrogation sessions.' },
      { title: 'Proposals', path: '/api/interrogate/proposals', summary: 'Pending or decided proposals.' },
    ],
  },
  {
    // Trimmed to costs/experiments/summaries — the activities table itself is
    // dead in prod, so /api/activity and /api/activity/stats were dropped.
    key: 'costs',
    title: 'Costs & experiments',
    hint: 'Spend, experiment runs, and product metric summaries.',
    endpoints: [
      { title: 'Cost summary', path: '/api/costs/summary', summary: 'Cost summary for the current period.' },
      { title: 'Costs', path: '/api/costs', summary: 'Recent cost entries.' },
      { title: 'Experiment stats', path: '/api/experiments/stats', summary: 'Experiment aggregate statistics.' },
      { title: 'Experiments', path: '/api/experiments', summary: 'Recent experiment runs.' },
      { title: 'Product summaries', path: '/api/summaries/products', summary: 'Product metric summaries.' },
    ],
  },
  {
    key: 'grooming-admin',
    title: 'Grooming Admin',
    hint: 'The full grooming API surface behind the board: proposals, questions, corrections, lessons, and audit.',
    endpoints: [
      { title: 'Pipeline', path: '/api/grooming/pipeline', summary: 'Grooming pipeline overview.' },
      { title: 'Proposals', path: '/api/grooming/proposals', summary: 'Current grooming proposals.' },
      { title: 'Corrections', path: '/api/grooming/corrections', summary: 'Corrections recorded from feedback.' },
      { title: 'Stats', path: '/api/grooming/stats', summary: 'Correction statistics.' },
      { title: 'Uningested corrections', path: '/api/grooming/corrections/uningested', summary: 'Corrections waiting for lesson distillation.' },
      { title: 'Lessons', path: '/api/grooming/lessons', summary: 'Active and probationary grooming lessons.' },
    ],
  },
];

export const DATA_PAGE_BY_KEY = new Map(DATA_PAGES.map(page => [page.key, page]));
