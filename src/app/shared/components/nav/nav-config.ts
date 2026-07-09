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
  { href: '/picture',               label: 'Picture',        accent: '#2dd4bf' },
  { href: '/config',                label: 'Config',         accent: '#818cf8' },
  { href: '/journal',               label: 'Journal',        accent: '#fde68a' },
  { href: '/nutrition',             label: 'Nutrition',      accent: '#fda4af' },
  { href: '/exercise',              label: 'Exercise',       accent: '#38bdf8' },
  { href: '/pomo-reports',          label: 'Pomo reports',   accent: '#fb923c' },
  { href: '/calendar-settings',     label: 'Calendars',      accent: '#34d399' },
  { href: '/tasks',                 label: 'Tasks',          accent: '#60a5fa' },
  { href: '/mail-activity',         label: 'Mail',           accent: '#facc15' },
  { href: '/vault-items',           label: 'Vault',          accent: '#c084fc' },
  { href: '/grooming',              label: 'Grooming',       accent: '#22d3ee' },
  { href: '/execution',             label: 'Execution',      accent: '#f87171' },
  { href: '/review',                label: 'Review',         accent: '#fbbf24' },
  { href: '/fleet',                 label: 'Fleet',          accent: '#e879f9' },
  { href: '/shopping',              label: 'Shopping',       accent: '#4ade80' },
  { href: '/jimbo-workspace',       label: 'Jimbo Workspace', accent: '#f472b6' },
  { href: '/hermes',                label: 'Hermes',         accent: '#fb923c' },
  { href: '/stream',                label: 'Stream',         accent: '#5eead4' },
  { href: '/ui-lab',                label: 'UI Lab',         accent: '#a78bfa' },
];

export const navGroups: readonly NavGroup[] = [
  {
    id: 'archive',
    label: 'Archive',
    paths: [
      'today', 'shopping', 'mail-next', 'mail-activity', 'briefings', 'calendar-settings', 'tasks',
      'jimbo-workspace', 'nutrition', 'exercise',
      'config', 'grooming', 'execution', 'review', 'vault-items', 'questions', 'activity',
      'skills', 'models', 'model-stacks', 'context', 'coach', 'interrogate',
      'hermes', 'ops', 'triage', 'stream', 'coverage', 'grooming-admin', 'pomo-reports',
      'entities',
    ],
    items: [
      { href: '/today', label: 'Today' },
      { href: '/nutrition', label: 'Nutrition' },
      { href: '/exercise', label: 'Exercise' },
      { href: '/shopping', label: 'Shopping' },
      { href: '/mail-next', label: 'Mail' },
      { href: '/mail-activity', label: 'Mail activity' },
      { href: '/briefings', label: 'Briefings' },
      { href: '/config', label: 'Config' },
      { href: '/grooming', label: 'Grooming' },
      { href: '/execution', label: 'Execution' },
      { href: '/review', label: 'Review' },
      { href: '/vault-items', label: 'Vault' },
      { href: '/questions', label: 'Questions' },
      { href: '/entities', label: 'Entities' },
      { href: '/activity', label: 'Activity' },
      { href: '/config/skills', label: 'Skills' },
      { href: '/config/models', label: 'Models' },
      { href: '/config/model-stacks', label: 'Stacks' },
      { href: '/config/actors', label: 'Actors' },
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
