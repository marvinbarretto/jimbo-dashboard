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

export const TODAY_ENDPOINTS: EndpointConfig[] = [
  { title: 'Health', path: '/api/health', summary: 'Current API health and dependency status.' },
  { title: 'Hermes jobs', path: '/api/hermes/jobs', summary: 'Cron job state and recent run status.' },
  { title: 'Email gems', path: '/api/emails/reports/gems/today', summary: "Today's high-value processed email." },
  { title: 'Undecided email', path: '/api/emails/reports/undecided', summary: 'Email reports waiting for a decision.' },
  { title: 'Calendar', path: '/api/google-calendar/events', summary: 'Upcoming events over the next two days.', params: { days: 2 } },
  { title: 'Dispatch status', path: '/api/dispatch/status', summary: 'Current execution queue state.' },
  { title: 'Grooming pipeline', path: '/api/grooming/pipeline', summary: 'Grooming work currently moving through the pipeline.' },
  { title: 'Vault tasks', path: '/api/vault/tasks/summary', summary: 'Task summary from the vault.' },
  { title: 'Latest briefing', path: '/api/briefing/latest', summary: 'Most recent briefing analysis.' },
  { title: 'Recent system events', path: '/api/events', summary: 'Newest system-level events.', params: { limit: 20 } },
];

export const DATA_PAGES: DataPageConfig[] = [
  {
    key: 'mail',
    title: 'Mail',
    hint: 'Processed email intelligence, raw Gmail visibility, decisions, gems, and enrichment candidates.',
    endpoints: [
      { title: 'Email stats', path: '/api/emails/reports/stats', summary: 'Aggregate report counts and score distribution.' },
      { title: 'Today gems', path: '/api/emails/reports/gems/today', summary: 'High-value email surfaced today.' },
      { title: 'Undecided', path: '/api/emails/reports/undecided', summary: 'Reports still awaiting a score or operator decision.' },
      { title: 'Recent reports', path: '/api/emails/reports', summary: 'Latest processed email reports.', params: { limit: 50, sort: 'processed_at', order: 'desc' } },
      { title: 'Gmail profile', path: '/api/google-mail/profile', summary: 'Connected Gmail account metadata.' },
      { title: 'Recent Gmail', path: '/api/google-mail/messages', summary: 'Raw Gmail messages before processing.', params: { hours: 24, limit: 30 } },
    ],
  },
  {
    key: 'calendar',
    title: 'Calendar',
    hint: 'Calendar source configuration, visible calendars, upcoming events, and scheduling data.',
    endpoints: [
      { title: 'Upcoming events', path: '/api/google-calendar/events', summary: 'Events over the next 14 days.', params: { days: 14 } },
      { title: 'Google calendars', path: '/api/google-calendar/calendars', summary: 'Calendars visible through the Google integration.' },
      { title: 'Calendar config', path: '/api/calendar/config', summary: 'Jimbo calendar configuration.' },
      { title: 'Available calendars', path: '/api/calendar/available', summary: 'Calendars available for configuration.' },
    ],
  },
  {
    key: 'tasks',
    title: 'Tasks',
    hint: 'Google Tasks intake, vault task summaries, and inbox shape.',
    endpoints: [
      { title: 'Task lists', path: '/api/google-tasks/lists', summary: 'Google Task lists visible to Jimbo.' },
      { title: 'Incomplete Google tasks', path: '/api/google-tasks/tasks', summary: 'Current incomplete Google Tasks.' },
      { title: 'Vault task summary', path: '/api/vault/tasks/summary', summary: 'Task counts and priority shape in the vault.' },
      { title: 'Vault inbox summary', path: '/api/vault/inbox-summary', summary: 'Inbox grouped by type.' },
      { title: 'Active vault notes', path: '/api/vault/notes', summary: 'Recent active vault records.', params: { status: 'active', limit: 50, sort: 'updated_at', order: 'desc' } },
    ],
  },
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
    key: 'briefings',
    title: 'Briefings',
    hint: 'Generated briefings and the composite snapshot they depend on.',
    endpoints: [
      { title: 'Latest briefing', path: '/api/briefing/latest', summary: 'Current latest briefing analysis.' },
      { title: 'Briefing history', path: '/api/briefing/history', summary: 'Recent briefing analyses.' },
      { title: 'Snapshot', path: '/api/snapshot', summary: 'Composite priorities, goals, active tasks, task summary, and epics.' },
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
    key: 'context',
    title: 'Context',
    hint: 'Context files, expiring context items, and structured settings.',
    endpoints: [
      { title: 'Context files', path: '/api/context/files', summary: 'Context files with section and item counts.' },
      { title: 'Expiring items', path: '/api/context/items/expiring', summary: 'Context items expiring soon.', params: { days: 14 } },
      { title: 'Settings', path: '/api/settings', summary: 'Jimbo settings.' },
    ],
  },
  {
    key: 'triage',
    title: 'Triage',
    hint: 'Triage queue, queue stats, and review state.',
    endpoints: [
      { title: 'Stats', path: '/api/triage/stats', summary: 'Triage statistics.' },
      { title: 'Queue', path: '/api/triage/queue', summary: 'Items currently waiting for triage.' },
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
    key: 'activity',
    title: 'Activity',
    hint: 'Personal activity logs, costs, experiments, and product summaries.',
    endpoints: [
      { title: 'Activity stats', path: '/api/activity/stats', summary: 'Aggregate activity statistics.' },
      { title: 'Activity log', path: '/api/activity', summary: 'Recent activity entries.', params: { days: 14 } },
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
