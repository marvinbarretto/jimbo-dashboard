import type { Project } from './project';
import { actorId, projectId } from '../ids';

// Two projects exercise the cross-project case (Item C below) and the "hermes is a project"
// principle (P13 / row 17). LocalShout owns its event-qualifier skill; hermes owns the
// orchestrator-level skills (intake-quality, vault-classify, vault-decompose).

export const PROJECTS = [
  {
    id: projectId('localshout'),
    display_name: 'LocalShout',
    description: 'Hyperlocal events aggregator. Pulls events from multiple sources, qualifies them.',
    status: 'active',
    owner_actor_id: actorId('marvin'),
    criteria:
      '## Event qualification\n\n' +
      'A LocalShout event must have:\n' +
      '- A specific date and time (not "soon" or "next week")\n' +
      '- A physical location (postcode-resolvable)\n' +
      '- Public attendance (not invite-only)\n' +
      '- A named organiser\n',
    repo_url: 'https://github.com/marvinbarretto/localshout',
    created_at: '2026-03-12T09:00:00Z',
  },
  {
    id: projectId('hermes'),
    display_name: 'Hermes',
    description: 'The orchestrator itself. Hosts universal skills used across every project.',
    status: 'active',
    owner_actor_id: actorId('marvin'),
    criteria: null,
    repo_url: 'https://github.com/marvinbarretto/hermes',
    created_at: '2026-01-04T09:00:00Z',
  },
  {
    id: projectId('dashboard'),
    display_name: 'Dashboard',
    description: 'This Angular control plane. UI, kanban, vault-item screens.',
    status: 'active',
    owner_actor_id: actorId('marvin'),
    criteria: null,
    repo_url: 'https://github.com/marvinbarretto/jimbo-dashboard',
    created_at: '2026-02-01T09:00:00Z',
  },
  {
    id: projectId('personal'),
    display_name: 'Personal',
    description:
      'Life-admin items that don\'t belong to a software project. Errands, notes, ' +
      'follow-ups with people outside work. Operator-owned by default.',
    status: 'active',
    owner_actor_id: actorId('marvin'),
    criteria: null,
    repo_url: null,
    created_at: '2026-02-15T09:00:00Z',
  },
] as const satisfies readonly Project[];
