export interface NavLink {
  readonly href: string;
  readonly label: string;
  readonly accent?: string;
}

export interface NavGroup {
  readonly id: string;
  readonly label: string;
  readonly paths: readonly string[];
  readonly items: readonly NavLink[];
}

export const primaryNavItems: readonly NavLink[] = [
  { href: '/ui-lab',                label: 'UI Lab',         accent: '#a78bfa' },
  { href: '/pomo-reports',          label: 'Pomo reports',   accent: '#fb923c' },
  { href: '/calendar-settings',     label: 'Calendars',      accent: '#34d399' },
  { href: '/google-tasks-settings', label: 'Tasks',          accent: '#60a5fa' },
  { href: '/triage-tasks',          label: 'Triage',         accent: '#fbbf24' },
  { href: '/config',                label: 'Config',         accent: '#818cf8' },
  { href: '/vault-items',           label: 'Vault',          accent: '#c084fc' },
  { href: '/grooming',              label: 'Grooming',       accent: '#22d3ee' },
  { href: '/execution',             label: 'Execution',      accent: '#f87171' },
  { href: '/shopping',              label: 'Shopping',       accent: '#4ade80' },
  { href: '/jimbo-workspace',       label: 'Jimbo Workspace', accent: '#f472b6' },
];

export const navGroups: readonly NavGroup[] = [
  {
    id: 'archive',
    label: 'Archive',
    paths: [
      'today', 'shopping', 'mail-next', 'briefings', 'calendar-settings', 'google-tasks-settings', 'triage-tasks',
      'jimbo-workspace',
      'config', 'grooming', 'execution', 'vault-items', 'questions', 'activity',
      'skills', 'models', 'model-stacks', 'context', 'coach', 'interrogate',
      'hermes', 'ops', 'triage', 'stream', 'coverage', 'grooming-admin', 'pomo-reports',
    ],
    items: [
      { href: '/today', label: 'Today' },
      { href: '/shopping', label: 'Shopping' },
      { href: '/mail-next', label: 'Mail' },
      { href: '/briefings', label: 'Briefings' },
      { href: '/config', label: 'Config' },
      { href: '/grooming', label: 'Grooming' },
      { href: '/execution', label: 'Execution' },
      { href: '/vault-items', label: 'Vault' },
      { href: '/questions', label: 'Questions' },
      { href: '/activity', label: 'Activity' },
      { href: '/config/skills', label: 'Skills' },
      { href: '/config/models', label: 'Models' },
      { href: '/config/model-stacks', label: 'Stacks' },
      { href: '/context', label: 'Context' },
      { href: '/coach', label: 'Coach' },
      { href: '/interrogate', label: 'Interrogate' },
      { href: '/hermes', label: 'Hermes' },
      { href: '/ops', label: 'Ops' },
      { href: '/triage', label: 'Triage' },
      { href: '/stream', label: 'Stream' },
      { href: '/coverage', label: 'Coverage' },
      { href: '/grooming-admin', label: 'Grooming API' },
    ],
  },
];
