import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UiBackLink } from '@shared/components/ui-back-link/ui-back-link';

export type LabGroup =
  | 'overview'
  | 'identity'
  | 'cards'
  | 'forms-editing'
  | 'detail-surfaces'
  | 'utilities'
  | 'workflows';

export interface LabRegistryEntry {
  readonly id: string;
  readonly name: string;
  readonly group: LabGroup;
  readonly selector?: string;
  readonly description: string;
}

const GROUP_ORDER: readonly LabGroup[] = [
  'overview',
  'identity',
  'cards',
  'forms-editing',
  'detail-surfaces',
  'utilities',
  'workflows',
];

const GROUP_LABEL: Record<LabGroup, string> = {
  'overview':         'Overview',
  'identity':         'Identity',
  'cards':            'Cards',
  'forms-editing':    'Forms & Editing',
  'detail-surfaces':  'Detail Surfaces',
  'utilities':        'Utilities',
  'workflows':        'Workflows',
};

export const componentRegistry: readonly LabRegistryEntry[] = [
  // Overview
  { id: 'library-surface',         name: 'Library Surface',       group: 'overview',        description: 'Badges, buttons, and meta-list overview.' },

  // Identity — chips that name an actor / project / vault item
  { id: 'entity-chip',             name: 'Entity Chip',           group: 'identity',        selector: 'app-entity-chip',       description: 'Inline chip for actors, projects, and vault items. Soft / solid variants.' },
  { id: 'actor-avatar',            name: 'Actor Avatar',          group: 'identity',        selector: 'app-actor-avatar',      description: 'Monochrome outlined ring with monogram. Outlined / filled.' },
  { id: 'actor-chip',              name: 'Actor Chip',            group: 'identity',        selector: 'app-actor-chip',        description: 'Actor name in a monochrome pill. Pair with actor-avatar for the dense / icon-only treatment.' },
  { id: 'vault-chip',              name: 'Vault Chip',            group: 'identity',        selector: 'app-vault-chip',        description: 'Task / subtask / epic — same shell, different prefix. Epic encodes creator class via border.' },

  // Cards — kanban surface and the slot primitives that compose into it
  { id: 'vault-card',              name: 'Vault Card',            group: 'cards',           selector: 'app-vault-card',        description: 'Unified kanban card driven by CardContext (grooming / dispatch / manual).' },
  { id: 'project-card',            name: 'Project Card',          group: 'cards',           selector: 'app-project-card',      description: 'Project card with color accent, drag handle, repo link, and actions.' },
  { id: 'epic-row',                name: 'Epic Row',              group: 'cards',           selector: 'app-epic-row',          description: 'Single-row epic with project, origin, threads, principles, progress, blocked count.' },
  { id: 'epic-rollup',             name: 'Epic Rollup',           group: 'cards',           selector: 'app-epic-rollup',       description: 'Per-child status strip + summary. Surfaces failures by name on the parent.' },
  { id: 'card-parent-link',        name: 'Card Parent Link',      group: 'cards',           selector: 'app-card-parent-link',  description: '"↳ ⊞ #N · title" row that sits between header and title on subtask cards.' },
  { id: 'card-callout',            name: 'Card Callout',          group: 'cards',           selector: 'app-card-callout',      description: 'Variant body slot — question / rework / draft / rationale / result / error.' },

  // Forms & editing — input controls and form chrome
  { id: 'ui-button',               name: 'Button',                group: 'forms-editing',   selector: 'app-ui-button',         description: 'Button primitives — UiButton (action) and UiButtonLink (navigation) sharing one visual contract.' },
  { id: 'app-icon',                name: 'Icon',                  group: 'forms-editing',   selector: 'app-icon',              description: 'Single primitive over lucide-angular. Curated semantic names, currentColor strokes.' },
  { id: 'ui-add-tile',             name: 'Add Tile',              group: 'forms-editing',   selector: 'app-ui-add-tile',       description: 'Dashed-outline tile that sits at the end of a card grid as the "+ Add" affordance.' },
  { id: 'toggle',                  name: 'Toggle',                group: 'forms-editing',   selector: 'app-ui-toggle',         description: 'Boolean slide toggle with role="switch" accessibility.' },
  { id: 'inline-edit',             name: 'Inline Edit',           group: 'forms-editing',   selector: 'app-ui-inline-edit',    description: 'Click-to-edit primitive — text/textarea/select with autofocus, save-on-blur, Esc cancel.' },
  { id: 'hybrid-edit',             name: 'Hybrid Edit',           group: 'forms-editing',                                      description: 'Inline edit for scalar fields; advanced edit for structured fields.' },
  { id: 'mention-chip-strip',      name: 'Mention Chip Strip',    group: 'forms-editing',   selector: 'app-ui-mention-chip-strip', description: 'Tags / projects / assignee / related-items chip strip with × remove.' },
  { id: 'form-actions',            name: 'Form Actions',          group: 'forms-editing',   selector: 'app-ui-form-actions',   description: 'Standardised bottom-of-form action row layout.' },
  { id: 'tab-bar',                 name: 'Tab Bar',               group: 'forms-editing',   selector: 'app-ui-tab-bar',        description: 'Underline-style tab bar for router or signal-based tabs.' },

  // Detail surfaces — patterns specific to the vault item detail modal
  { id: 'vault-detail-primitives', name: 'Vault Detail Primitives', group: 'detail-surfaces',                                  description: 'Stat card, chip list, inline picker, dropdown, readiness panel, checklist, sticky action bar, subsection.' },
  { id: 'side-panel-inspector',    name: 'Side-Panel Inspector',  group: 'detail-surfaces',                                    description: 'Persistent inspector panel for richer detail and actions.' },
  { id: 'expandable-rows',         name: 'Expandable Rows',       group: 'detail-surfaces',                                    description: 'Whole-row trigger revealing inline context without leaving the table.' },

  // Utilities — async / time / refresh primitives
  { id: 'loading-states',          name: 'Loading States',        group: 'utilities',       selector: 'app-ui-loading-state',  description: 'Labelled loading spinner for async content.' },
  { id: 'refresh-control',         name: 'Refresh Control',       group: 'utilities',       selector: 'app-ui-refresh-control', description: 'Freshness timestamp + reload button for activity-style polling pages.' },
  { id: 'datetime-pipes',          name: 'Date & Time Pipes',     group: 'utilities',                                          description: 'datetime and relativeTime pipes for ISO string formatting.' },

  // Workflows — page-level patterns
  { id: 'list-workflow',           name: 'List Workflow',         group: 'workflows',                                          description: 'Typical page header + table pattern for browsable lists.' },
  { id: 'detail-workflow',         name: 'Detail Workflow',       group: 'workflows',                                          description: 'Typical back-link + meta-list pattern for entity detail pages.' },
];

interface GroupedSection {
  readonly group: LabGroup;
  readonly label: string;
  readonly entries: readonly LabRegistryEntry[];
}

@Component({
  selector: 'app-ui-lab-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, UiBackLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-lab">
      <nav class="ui-lab__sidenav" aria-label="Component sections">
        <app-ui-back-link [to]="['/today']" class="ui-lab__back">← Today</app-ui-back-link>
        @for (section of groupedSections(); track section.group) {
          <div class="ui-lab__group">
            <p class="ui-lab__group-label">{{ section.label }}</p>
            <ul class="ui-lab__sidenav-list">
              @for (entry of section.entries; track entry.id) {
                <li>
                  <a class="ui-lab__sidenav-link"
                     [routerLink]="['/ui-lab', entry.id]"
                     routerLinkActive="ui-lab__sidenav-link--active">
                    {{ entry.name }}
                  </a>
                </li>
              }
            </ul>
          </div>
        }
      </nav>

      <div class="ui-lab__content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    .ui-lab {
      display: grid;
      grid-template-columns: 14rem 1fr;
      min-height: 100vh;
    }

    .ui-lab__sidenav {
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
      padding: 1.5rem 0 3rem;
      scrollbar-width: thin;
      border-right: 1px solid var(--color-border, #e5e7eb);
      background: var(--color-surface, #fff);
    }

    .ui-lab__back {
      display: block;
      padding: 0 0.75rem 1rem;
    }

    .ui-lab__group {
      padding-top: 0.6rem;

      &:first-of-type { padding-top: 0; }
    }

    .ui-lab__group-label {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
      margin: 0 0 0.25rem 0.75rem;
      font-weight: 600;
    }

    .ui-lab__sidenav-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.05rem;
    }

    .ui-lab__sidenav-link {
      display: block;
      padding: 0.3rem 0.75rem;
      font-size: 0.8rem;
      text-decoration: none;
      color: var(--color-text-muted);
      border-radius: var(--radius);
      border-left: 2px solid transparent;
      transition: color 120ms ease, background 120ms ease, border-color 120ms ease;

      &:hover {
        color: var(--color-text);
        background: var(--color-surface-soft, var(--color-surface));
        border-left-color: var(--color-border);
      }

      &--active {
        color: var(--color-text);
        border-left-color: var(--color-accent);
        background: color-mix(in srgb, var(--color-accent) 8%, transparent);
      }
    }

    .ui-lab__content {
      padding: 1.5rem 2rem 3rem 1.5rem;
      min-width: 0;
    }

    @media (max-width: 768px) {
      .ui-lab {
        grid-template-columns: 1fr;
      }

      .ui-lab__sidenav {
        position: static;
        height: auto;
        border-right: none;
        border-bottom: 1px solid var(--color-border, #e5e7eb);
        padding: 0.75rem 0.5rem;
      }

      .ui-lab__group {
        padding-top: 0.4rem;
      }

      .ui-lab__group-label {
        margin-left: 0.5rem;
      }

      .ui-lab__sidenav-list {
        flex-direction: row;
        flex-wrap: wrap;
        gap: 0.25rem;
      }

      .ui-lab__sidenav-link {
        border-left: none;
        border-bottom: 2px solid transparent;
        border-radius: 0;
        padding: 0.3rem 0.5rem;

        &:hover {
          border-left-color: transparent;
          border-bottom-color: var(--color-border);
        }

        &--active {
          border-left-color: transparent;
          border-bottom-color: var(--color-accent);
        }
      }
    }
  `],
})
export class UiLabShell {
  protected readonly registry = componentRegistry;

  // Group sorted alphabetically within each group, groups in canonical order.
  protected readonly groupedSections = computed<readonly GroupedSection[]>(() => {
    const byGroup = new Map<LabGroup, LabRegistryEntry[]>();
    for (const entry of this.registry) {
      const arr = byGroup.get(entry.group) ?? [];
      arr.push(entry);
      byGroup.set(entry.group, arr);
    }
    return GROUP_ORDER
      .filter(g => byGroup.has(g))
      .map((group): GroupedSection => ({
        group,
        label: GROUP_LABEL[group],
        entries: [...(byGroup.get(group) ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
      }));
  });
}
