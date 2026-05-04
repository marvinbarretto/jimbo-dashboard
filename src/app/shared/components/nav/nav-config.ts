export interface NavLink {
  readonly href: string;
  readonly label: string;
}

export interface NavGroup {
  readonly id: string;
  readonly label: string;
  readonly paths: readonly string[];
  readonly items: readonly NavLink[];
}

export const primaryNavItems: readonly NavLink[] = [
  { href: '/today', label: 'Today' },
  { href: '/shopping', label: 'Shopping' },
  { href: '/mail-next', label: 'Mail' },
  { href: '/briefings', label: 'Briefings' },
];

export const navGroups: readonly NavGroup[] = [
  {
    id: 'work',
    label: 'Work',
    paths: ['projects', 'grooming', 'execution', 'vault-items', 'questions', 'activity'],
    items: [
      { href: '/projects', label: 'Projects' },
      { href: '/grooming', label: 'Grooming' },
      { href: '/execution', label: 'Execution' },
      { href: '/vault-items', label: 'Vault' },
      { href: '/questions', label: 'Questions' },
      { href: '/activity', label: 'Activity' },
    ],
  },
  {
    id: 'agents',
    label: 'Agents',
    paths: ['actors', 'skills', 'models', 'model-stacks', 'context', 'coach', 'interrogate'],
    items: [
      { href: '/actors', label: 'Actors' },
      { href: '/skills', label: 'Skills' },
      { href: '/models', label: 'Models' },
      { href: '/model-stacks', label: 'Stacks' },
      { href: '/context', label: 'Context' },
      { href: '/coach', label: 'Coach' },
      { href: '/interrogate', label: 'Interrogate' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    paths: ['hermes', 'ops', 'triage', 'stream', 'coverage', 'ui-lab', 'grooming-admin'],
    items: [
      { href: '/hermes', label: 'Hermes' },
      { href: '/ops', label: 'Ops' },
      { href: '/triage', label: 'Triage' },
      { href: '/stream', label: 'Stream' },
      { href: '/coverage', label: 'Coverage' },
      { href: '/ui-lab', label: 'UI Lab' },
      { href: '/grooming-admin', label: 'Grooming API' },
    ],
  },
];
