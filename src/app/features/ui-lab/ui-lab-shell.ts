import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UiBackLink } from '@shared/components/ui-back-link/ui-back-link';

export interface LabRegistryEntry {
  readonly id: string;
  readonly name: string;
  readonly selector?: string;
  readonly description: string;
}

export const componentRegistry: readonly LabRegistryEntry[] = [
  { id: 'library-surface',        name: 'Library Surface',       description: 'Badges, buttons, and meta-list overview.' },
  { id: 'toggle',                  name: 'Toggle',                selector: 'app-ui-toggle',         description: 'Boolean slide toggle with role="switch" accessibility.' },
  { id: 'entity-chip',             name: 'Entity Chip',           selector: 'app-entity-chip',       description: 'Inline chip for actors, projects, and vault items.' },
  { id: 'vault-detail-primitives', name: 'Vault Primitives',      description: 'Stat card, chip list, inline picker, dropdown, readiness panel, checklist, sticky action bar, subsection.' },
  { id: 'tab-bar',                 name: 'Tab Bar',               selector: 'app-ui-tab-bar',        description: 'Underline-style tab bar for router or signal-based tabs.' },
  { id: 'list-workflow',           name: 'List Workflow',         description: 'Typical page header + table pattern for browsable lists.' },
  { id: 'detail-workflow',         name: 'Detail Workflow',       description: 'Typical back-link + meta-list pattern for entity detail pages.' },
  { id: 'hybrid-edit',             name: 'Hybrid Edit',           description: 'Inline edit for scalar fields; advanced edit for structured fields.' },
  { id: 'expandable-rows',         name: 'Expandable Rows',       description: 'Whole-row trigger revealing inline context without leaving the table.' },
  { id: 'side-panel-inspector',    name: 'Side-Panel Inspector',  description: 'Persistent inspector panel for richer detail and actions.' },
  { id: 'loading-states',          name: 'Loading States',        selector: 'app-ui-loading-state',  description: 'Labelled loading spinner for async content.' },
  { id: 'datetime-pipes',          name: 'Date & Time Pipes',     description: 'datetime and relativeTime pipes for ISO string formatting.' },
  { id: 'form-actions',            name: 'Form Actions',          selector: 'app-ui-form-actions',   description: 'Standardised bottom-of-form action row layout.' },
  { id: 'project-card',            name: 'Project Card',          selector: 'app-project-card',      description: 'Project card with color accent, drag handle, repo link, and actions.' },
];

@Component({
  selector: 'app-ui-lab-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, UiBackLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-lab">
      <nav class="ui-lab__sidenav" aria-label="Component sections">
        <app-ui-back-link [to]="['/today']" class="ui-lab__back">← Today</app-ui-back-link>
        <ul class="ui-lab__sidenav-list">
          @for (entry of registry; track entry.id) {
            <li>
              <a class="ui-lab__sidenav-link"
                 [routerLink]="['/ui-lab', entry.id]"
                 routerLinkActive="ui-lab__sidenav-link--active">
                {{ entry.name }}
              </a>
            </li>
          }
        </ul>
      </nav>

      <div class="ui-lab__content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    .ui-lab {
      display: grid;
      grid-template-columns: 13rem 1fr;
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

    .ui-lab__sidenav-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .ui-lab__sidenav-link {
      display: block;
      padding: 0.35rem 0.75rem;
      font-size: 0.82rem;
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

      .ui-lab__content {
        padding: 1rem 1rem 2rem;
      }
    }
  `],
})
export class UiLabShell {
  protected readonly registry = componentRegistry;
}
