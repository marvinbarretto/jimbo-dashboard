export interface NavTab {
  readonly href: string;
  readonly label: string;
}

export interface NavSection {
  readonly id: string;
  readonly label: string;
  readonly accent: string;
  /** Tier-2 tabs. The first one is the section's landing target. */
  readonly tabs: readonly NavTab[];
  /**
   * First URL segments that belong to this section but aren't tabs — detail
   * views (`/briefing/:id`) and pages reachable only by deep link. Keeps the
   * section bar on screen instead of blinking out when you drill in.
   */
  readonly extraPaths?: readonly string[];
}

/**
 * Three-tier navigation:
 *   1. sections    — this list, rendered by <app-nav>
 *   2. tabs        — <app-ui-tab-bar>, sticky, one per section
 *   3. in-page     — <app-ui-tab-bar [sticky]="false"> or <app-ui-inline-tabs>
 *
 * Work's tabs are ordered as the actual pipeline — intake → vault → grooming
 * → planning → dispatch → review → fleet — so the bar reads left to right as
 * throughput rather than as an alphabet soup.
 */
export const navSections: readonly NavSection[] = [
  {
    id: 'life',
    label: 'Life',
    accent: '#fde68a',
    tabs: [
      { href: '/journal', label: 'Journal' },
      { href: '/nutrition', label: 'Nutrition' },
      { href: '/exercise', label: 'Exercise' },
      { href: '/checkins', label: 'Check-ins' },
      { href: '/pomo-reports', label: 'Pomo' },
      { href: '/picture', label: 'Picture' },
    ],
    extraPaths: ['pomo'],
  },
  {
    id: 'work',
    label: 'Work',
    accent: '#60a5fa',
    tabs: [
      { href: '/tasks', label: 'Triage' },
      { href: '/vault-items', label: 'Vault' },
      { href: '/grooming', label: 'Grooming' },
      { href: '/questions', label: 'Questions' },
      { href: '/planner', label: 'Planner' },
      { href: '/execution', label: 'Execution' },
      { href: '/review', label: 'Review' },
      { href: '/fleet', label: 'Fleet' },
    ],
  },
  {
    id: 'comms',
    label: 'Comms',
    accent: '#facc15',
    tabs: [
      { href: '/mail-activity', label: 'Mail' },
      { href: '/calendar-settings', label: 'Calendars' },
      { href: '/jimbo-workspace', label: 'Workspace' },
      { href: '/shopping', label: 'Shopping' },
    ],
    extraPaths: ['briefings', 'briefing'],
  },
  {
    id: 'system',
    label: 'System',
    accent: '#fb923c',
    tabs: [
      { href: '/hermes', label: 'Hermes' },
      { href: '/stream', label: 'Stream' },
      { href: '/api', label: 'API' },
      { href: '/modules', label: 'Modules' },
      { href: '/coverage', label: 'Coverage' },
      { href: '/ui-lab', label: 'UI Lab' },
    ],
    // activity/context stay: their `/:id` detail views are still top-level.
    extraPaths: ['activity', 'context', 'test-forms', 'test'],
  },
  {
    id: 'config',
    label: 'Config',
    accent: '#818cf8',
    tabs: [
      { href: '/config/projects', label: 'Projects' },
      { href: '/config/skills', label: 'Skills' },
      { href: '/config/models', label: 'Models' },
      { href: '/config/model-stacks', label: 'Stacks' },
      { href: '/config/actors', label: 'Actors' },
      { href: '/entities', label: 'Entities' },
      { href: '/config/settings', label: 'Settings' },
    ],
    // No 'actors': /actors redirects, and NavState reads urlAfterRedirects.
    // notification-settings is linked from Config → Settings, not a tab.
    extraPaths: ['projects', 'notification-settings'],
  },
];

/** First URL segment of every path a section owns, for O(1) active lookup. */
const sectionBySegment = new Map<string, NavSection>();
for (const section of navSections) {
  const segments = [
    ...section.tabs.map(t => t.href.split('/').filter(Boolean)[0]),
    ...(section.extraPaths ?? []),
  ];
  for (const segment of segments) {
    if (segment && !sectionBySegment.has(segment)) sectionBySegment.set(segment, section);
  }
}

export function sectionForUrl(url: string): NavSection | null {
  const segment = url.split('?')[0].split('#')[0].split('/').filter(Boolean)[0];
  return segment ? sectionBySegment.get(segment) ?? null : null;
}

/** Where a primary-nav click lands: the section's first tab. */
export function sectionLanding(section: NavSection): string {
  return section.tabs[0].href;
}
