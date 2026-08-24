import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
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
  { id: 'tag-chip',                name: 'Tag Chip',              group: 'identity',        selector: 'app-tag-chip',          description: 'Free-text tag pill (no entity backing). Muted / accent tones, optional prefix + remove ×.' },
  { id: 'actor-avatar',            name: 'Actor Avatar',          group: 'identity',        selector: 'app-actor-avatar',      description: 'Monochrome outlined ring with monogram. Outlined / filled.' },
  { id: 'project-avatar',          name: 'Project Avatar',        group: 'identity',        selector: 'app-project-avatar',    description: 'Project initials in a colour-filled rounded square. Actor=circle, project=rounded-square — shape disambiguates identity.' },
  { id: 'actor-chip',              name: 'Actor Chip',            group: 'identity',        selector: 'app-actor-chip',        description: 'Actor name in a monochrome pill. Pair with actor-avatar for the dense / icon-only treatment.' },
  { id: 'vault-chip',              name: 'Vault Chip',            group: 'identity',        selector: 'app-vault-chip',        description: 'Task / subtask / epic — same shell, different prefix. Epic encodes creator class via border.' },
  { id: 'job-chip',                name: 'Job Chip',              group: 'identity',        selector: 'app-job-chip',          description: 'Hermes job identity — kind glyph, status dot, muted-when-paused label. The jobs sibling of actor-chip/entity-chip.' },
  { id: 'ui-select-chip',          name: 'Select Chip',           group: 'identity',        selector: 'app-ui-select-chip',    description: 'Prominent selectable picker pill with optional colour + leading swatch. Fills the gap between app-chip (colour, no select) and filter-pills (select, no colour).' },
  { id: 'chip-sizing-options',     name: 'Chip Sizing — Options', group: 'identity',                                            description: 'Decision aid: baseline vs. two chunkier sizing tiers for the identity-chip family, with hover/focus/selected/paused states to compare before rollout.' },

  // Cards — kanban surface and the slot primitives that compose into it
  { id: 'vault-card',              name: 'Vault Card',            group: 'cards',           selector: 'app-vault-card',        description: 'Unified kanban card driven by CardContext (grooming / dispatch / manual).' },
  { id: 'vault-card-kanban',       name: 'Vault Card · Kanban',   group: 'cards',           selector: 'app-vault-card-kanban-section', description: 'Interactive kanban board with live prop controls. Drag cards between columns; knobs update all cards simultaneously.' },
  { id: 'project-card',            name: 'Project Card',          group: 'cards',           selector: 'app-project-card',      description: 'Project card with color accent, drag handle, repo link, and actions.' },
  { id: 'epic-row',                name: 'Epic Row',              group: 'cards',           selector: 'app-epic-row',          description: 'Single-row epic with project, origin, threads, principles, progress, blocked count.' },
  { id: 'epic-momentum-row',       name: 'Epic Momentum Row',     group: 'cards',           selector: 'app-epic-momentum-row', description: 'Momentum-oriented epic row — progress bar + velocity / active / blocked / stalled badges. Links by seq.' },
  { id: 'epic-rollup',             name: 'Epic Rollup',           group: 'cards',           selector: 'app-epic-rollup',       description: 'Per-child status strip + summary. Surfaces failures by name on the parent.' },
  { id: 'card-parent-link',        name: 'Card Parent Link',      group: 'cards',           selector: 'app-card-parent-link',  description: '"↳ ⊞ #N · title" row that sits between header and title on subtask cards.' },
  { id: 'card-callout',            name: 'Card Callout',          group: 'cards',           selector: 'app-card-callout',      description: 'Variant body slot — question / rework / draft / rationale / result / error.' },
  { id: 'commission-stage-pill',   name: 'Commission Stage Pill', group: 'cards',           selector: 'app-commission-stage-pill', description: 'Atom — commission lifecycle stage pill (proposed → merged, + failed / rejected). Proposed/rejected stay distinct.' },
  { id: 'commission-card',         name: 'Commission Card',       group: 'cards',           selector: 'app-commission-card',       description: 'Organism — one card per item on the execution board: stage, assignee, PR link, ×N history drill-down.' },
  { id: 'dispatch-history-list',   name: 'Dispatch History List', group: 'cards',           selector: 'app-dispatch-history-list', description: 'Organism — per-item commission history (newest first); surfaces superseded attempts and their PRs.' },
  { id: 'block-card',              name: 'Block Card',            group: 'cards',           selector: 'app-block-card',        description: 'Planner pomodoro-block card. Same component, two variants — queue (draggable, not yet scheduled) and calendar (has a time, may be locked).' },
  { id: 'item-header',             name: 'Item Header',           group: 'cards',           selector: 'app-item-header',       description: 'Shared identity strip — project avatar + priority + owner + time-or-epic + optional lock. Used by both app-block-card and app-vault-card so the same kind of thing reads the same way everywhere.' },

  // Forms & editing — input controls and form chrome
  { id: 'ui-button',               name: 'Button',                group: 'forms-editing',   selector: 'app-ui-button',         description: 'Button primitives — UiButton (action) and UiButtonLink (navigation) sharing one visual contract.' },
  { id: 'app-icon',                name: 'Icon',                  group: 'forms-editing',   selector: 'app-icon',              description: 'Single primitive over lucide-angular. Curated semantic names, currentColor strokes.' },
  { id: 'ui-add-tile',             name: 'Add Tile',              group: 'forms-editing',   selector: 'app-ui-add-tile',       description: 'Dashed-outline tile that sits at the end of a card grid as the "+ Add" affordance.' },
  { id: 'toggle',                  name: 'Toggle',                group: 'forms-editing',   selector: 'app-ui-toggle',         description: 'Boolean slide toggle with role="switch" accessibility.' },
  { id: 'inline-edit',             name: 'Inline Edit',           group: 'forms-editing',   selector: 'app-ui-inline-edit',    description: 'Click-to-edit primitive — text/textarea/select/number with autofocus, save-on-blur, Esc cancel.' },
  { id: 'project-brief-bullet-field', name: 'Brief Bullet Field', group: 'forms-editing',   selector: 'app-project-brief-bullet-field', description: 'Isolation harness for the project Intent/Success-criteria bullet fields — real mention triggers, two fields at once, to reproduce the reported freeze away from project-landing.' },
  { id: 'nutrition-row',           name: 'Nutrition Row',         group: 'forms-editing',   selector: 'app-nutrition-row',     description: 'Editable food-log entry row — inline text + number fields, remove, live totals recalc.' },
  { id: 'tracker',                 name: 'Tracker (generic)',     group: 'forms-editing',   selector: 'app-ui-tracker-day-group', description: 'Measure-agnostic day-grouped logging: period totals + day groups + inline-edit rows + quick-add. One set of primitives, shown for nutrition AND project work.' },
  { id: 'hybrid-edit',             name: 'Hybrid Edit',           group: 'forms-editing',                                      description: 'Inline edit for scalar fields; advanced edit for structured fields.' },
  { id: 'mention-chip-strip',      name: 'Mention Chip Strip',    group: 'forms-editing',   selector: 'app-ui-mention-chip-strip', description: 'Tags / projects / assignee / related-items chip strip with × remove.' },
  { id: 'form-actions',            name: 'Form Actions',          group: 'forms-editing',   selector: 'app-ui-form-actions',   description: 'Standardised bottom-of-form action row layout.' },
  { id: 'tab-bar',                 name: 'Tab Bar',               group: 'forms-editing',   selector: 'app-ui-tab-bar',        description: 'Underline-style tab bar for router or signal-based tabs. Sticky page-level nav.' },
  { id: 'ui-inline-tabs',          name: 'Inline Tabs',           group: 'forms-editing',   selector: 'app-ui-inline-tabs',    description: 'Lightweight in-page tabs for facet-switching inside a content section. Counts + colour dots. No page chrome.' },
  { id: 'ui-segmented',            name: 'Segmented Control',     group: 'forms-editing',   selector: 'app-ui-segmented',      description: 'Single-select one-of-N control. View-mode toggles (verbosity, message kind, density).' },
  { id: 'ui-filter-pills',         name: 'Filter Pills',          group: 'forms-editing',   selector: 'app-ui-filter-pills',   description: 'Multi-select pill row. Host owns active-set semantics (including exclusive "all").' },
  { id: 'ui-stepper',              name: 'Stepper',               group: 'forms-editing',   selector: 'app-ui-stepper',        description: 'Horizontal step indicator for wizards. Host owns each step state (todo / active / done) so non-linear flows work.' },

  // Detail surfaces — patterns specific to the vault item detail modal
  { id: 'vault-detail-primitives', name: 'Vault Detail Primitives', group: 'detail-surfaces',                                  description: 'Stat card, chip list, inline picker, dropdown, readiness panel, checklist, sticky action bar, subsection.' },
  { id: 'side-panel-inspector',    name: 'Side-Panel Inspector',  group: 'detail-surfaces',                                    description: 'Persistent inspector panel for richer detail and actions.' },
  { id: 'briefing-report',         name: 'Briefing Report',       group: 'detail-surfaces', selector: 'app-briefing-report',   description: 'Reading surface for v2 briefings — questions first, insights as pull-quotes, honest deadlines.' },
  { id: 'clarification-prompt',    name: 'Clarification Prompt',  group: 'detail-surfaces', selector: 'app-clarification-prompt', description: 'Inline question/answer with options, free text, dismiss, and the ✓ acknowledgement beat. All states.' },
  { id: 'expandable-rows',         name: 'Expandable Rows',       group: 'detail-surfaces',                                    description: 'Whole-row trigger revealing inline context without leaving the table.' },

  // Utilities — async / time / refresh primitives
  { id: 'loading-states',          name: 'Loading States',        group: 'utilities',       selector: 'app-ui-loading-state',  description: 'Labelled loading spinner for async content.' },
  { id: 'refresh-control',         name: 'Refresh Control',       group: 'utilities',       selector: 'app-ui-refresh-control', description: 'Freshness timestamp + reload button for activity-style polling pages.' },
  { id: 'datetime-pipes',          name: 'Date & Time Pipes',     group: 'utilities',                                          description: 'datetime and relativeTime pipes for ISO string formatting.' },
  { id: 'ui-prose',                name: 'Prose',                 group: 'utilities',       selector: 'app-ui-prose',           description: 'Renders a plain-text field as a paragraph, splitting an inline enumerated list ("(1) foo, (2) bar") into a real <ol> — display-only, source string untouched.' },
  { id: 'notification-item',       name: 'Notification Item',    group: 'utilities',       selector: 'app-notification-item', description: 'Atom — sticky-until-dismissed alert row: source, message, when, optional deep link, dismiss ×. No auto-dismiss timer, unlike app-toast.' },
  { id: 'notification-bar',        name: 'Notification Bar',     group: 'utilities',       selector: 'app-notification-bar',  description: 'Organism — sticky top-of-shell stack of Notification Items. Fleet-wide, not scoped to the current page; the whole point is not having to go looking for it.' },

  // Workflows — page-level patterns
  { id: 'list-workflow',           name: 'List Workflow',         group: 'workflows',                                          description: 'Typical page header + table pattern for browsable lists.' },
  { id: 'detail-workflow',         name: 'Detail Workflow',       group: 'workflows',                                          description: 'Typical back-link + meta-list pattern for entity detail pages.' },
  { id: 'nutrition-mobile',        name: 'Nutrition · Mobile Wireframe', group: 'workflows',                                   description: 'Throwaway wireframe — mobile day ledger (settled anatomy) + interactions: tap-row bottom-sheet editing, one-field quick add with simulated async estimate. Local state, zero shared primitives; gets extracted into the tracker family.' },
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
  // Full-bleed layout — the lab owns its sidebar + content edges; opt out of the shell gutter.
  host: {
    class: 'page-bleed',
    '(document:keydown.escape)': 'menuOpen.set(false)',
  },
  template: `
    <div class="ui-lab">
      <!-- Mobile only: the ~50-section list is a wall at phone width, so it
           hides behind a drawer. Desktop keeps the permanent sidebar. -->
      <button
        type="button"
        class="ui-lab__menu-btn"
        [attr.aria-expanded]="menuOpen()"
        (click)="menuOpen.set(true)"
      >☰ Components</button>

      @if (menuOpen()) {
        <div class="ui-lab__scrim" (click)="menuOpen.set(false)"></div>
      }

      <nav
        class="ui-lab__sidenav"
        [class.ui-lab__sidenav--open]="menuOpen()"
        aria-label="Component sections"
      >
        <app-ui-back-link [to]="['/today']" class="ui-lab__back">← Today</app-ui-back-link>
        @for (section of groupedSections(); track section.group) {
          <div class="ui-lab__group">
            <p class="ui-lab__group-label">{{ section.label }}</p>
            <ul class="ui-lab__sidenav-list">
              @for (entry of section.entries; track entry.id) {
                <li>
                  <a class="ui-lab__sidenav-link"
                     [routerLink]="['/ui-lab', entry.id]"
                     routerLinkActive="ui-lab__sidenav-link--active"
                     (click)="menuOpen.set(false)">
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

    .ui-lab__menu-btn {
      display: none;
    }

    .ui-lab__scrim {
      position: fixed;
      inset: 0;
      z-index: 119; /* above the sticky app header (100) */
      background: rgb(0 0 0 / 0.55);
    }

    @media (max-width: 768px) {
      .ui-lab {
        grid-template-columns: 1fr;
      }

      .ui-lab__menu-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        width: fit-content;
        /* grid item in a min-height:100vh grid — don't let the row stretch it */
        align-self: start;
        justify-self: start;
        min-height: 2.75rem;
        margin: 0.6rem 0.75rem 0;
        padding: 0 0.85rem;
        font: inherit;
        font-size: 0.8rem;
        color: var(--color-text-muted);
        background: transparent;
        border: 1px solid var(--color-border);
        border-radius: var(--radius);
        cursor: pointer;

        &:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 1px;
        }
      }

      /* The sidenav becomes an off-canvas drawer; same markup, same grouped
         list — it just slides in over everything instead of living in a
         grid column. */
      .ui-lab__sidenav {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        z-index: 120;
        width: min(80vw, 18rem);
        height: 100dvh;
        padding-top: 1rem;
        transform: translateX(-100%);
        transition: transform 200ms ease;
      }

      .ui-lab__sidenav--open {
        transform: translateX(0);
        box-shadow: 0.5rem 0 2rem rgb(0 0 0 / 0.35);
      }

      @media (prefers-reduced-motion: reduce) {
        .ui-lab__sidenav {
          transition: none;
        }
      }

      /* Drawer links are touch targets, not desktop dense rows. */
      .ui-lab__sidenav-link {
        padding: 0.55rem 0.75rem;
        font-size: 0.9rem;
      }
    }
  `],
})
export class UiLabShell {
  protected readonly registry = componentRegistry;
  protected readonly menuOpen = signal(false);

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
