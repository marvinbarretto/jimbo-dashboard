import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EntityChip } from '@shared/components/entity-chip/entity-chip';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiDropdown } from '@shared/components/ui-dropdown/ui-dropdown';
import type { Actor } from '@domain/actors';
import type { Project } from '@domain/projects/project';
import type { LifecycleState, Priority, VaultItem } from '@domain/vault/vault-item';

@Component({
  selector: 'app-vault-item-status-chips',
  imports: [RouterLink, EntityChip, UiBadge, UiCluster, UiDropdown],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="vault-item-status-chips">

      <!-- Primary tier: the three operational decisions -->
      <app-ui-cluster gap="sm" align="center">
        <app-ui-dropdown
          #statusDrop
          ariaHaspopup="listbox"
          ariaLabel="Change status"
          [disabled]="isArchived()">
          <app-ui-badge trigger [tone]="statusTone()">
            {{ isArchived() ? 'archived' : lifecycle() }}
          </app-ui-badge>
          <div panel role="listbox" class="vault-item-status-chips__panel">
            @for (s of statuses; track s) {
              <button
                class="vault-item-status-chips__option"
                role="option"
                [attr.aria-selected]="lifecycle() === s"
                (click)="statusChange.emit(s); statusDrop.close()">
                {{ s }}
              </button>
            }
          </div>
        </app-ui-dropdown>

        <app-ui-dropdown
          #ownerDrop
          ariaHaspopup="listbox"
          ariaLabel="Reassign owner">
          <app-entity-chip trigger type="actor" [id]="ownerChip().id" [label]="ownerChip().label" />
          <div panel role="listbox" class="vault-item-status-chips__panel">
            @for (a of activeActors(); track a.id) {
              <button
                class="vault-item-status-chips__option"
                role="option"
                [attr.aria-selected]="item().assigned_to === a.id"
                (click)="reassign.emit(a.id); ownerDrop.close()">
                &#64;{{ a.id }}
              </button>
            }
          </div>
        </app-ui-dropdown>

        <app-ui-dropdown
          #priorityDrop
          ariaHaspopup="listbox"
          ariaLabel="Set manual priority">
          @if (effectivePriority(); as p) {
            <app-ui-badge trigger [tone]="priorityTone(p)" [title]="priorityTitle()">
              {{ priorityLabel(p) }}{{ priorityDiverges() ? ' *' : '' }}
            </app-ui-badge>
          } @else {
            <app-ui-badge trigger tone="neutral" [subtle]="true" title="No priority set">—</app-ui-badge>
          }
          <div panel role="listbox" class="vault-item-status-chips__panel">
            @for (opt of priorityOptions; track opt.value) {
              <button
                class="vault-item-status-chips__option"
                role="option"
                [attr.aria-selected]="item().manual_priority === opt.value"
                (click)="priorityChange.emit(opt.value); priorityDrop.close()">
                {{ opt.label }}
              </button>
            }
          </div>
        </app-ui-dropdown>

        @if (firstProject(); as p) {
          <a class="chip-link" [routerLink]="['/projects', p.id]">
            <app-entity-chip type="project" [id]="p.id" [label]="p.display_name" />
          </a>
          @if (extraProjectCount() > 0) {
            <span class="vault-item-status-chips__extra-projects" [title]="extraProjectsTitle()">
              +{{ extraProjectCount() }}
            </span>
          }
        } @else {
          <app-ui-badge tone="neutral" [subtle]="true" title="Not linked to any project">
            standalone
          </app-ui-badge>
        }
      </app-ui-cluster>

      <!-- Secondary tier: classification metadata -->
      <app-ui-cluster gap="sm" align="center" class="vault-item-status-chips__secondary">
        <app-ui-badge [tone]="groomingTone()">{{ groomingLabel() }}</app-ui-badge>

        @if (item().actionability !== null) {
          <app-ui-badge [tone]="actionabilityTone()">{{ item().actionability }}</app-ui-badge>
        }

        @if (isGitHubItem()) {
          <app-ui-badge tone="info" [subtle]="true">github</app-ui-badge>
        }

        <button
          type="button"
          class="vault-item-status-chips__epic-toggle"
          [class.vault-item-status-chips__epic-toggle--active]="item().is_epic"
          (click)="epicToggle.emit(!item().is_epic)"
          [title]="item().is_epic ? 'Remove epic flag' : 'Mark as epic'">
          {{ item().is_epic ? 'EPIC ×' : '+ epic' }}
        </button>
      </app-ui-cluster>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      margin-bottom: 0.75rem;
    }

    .vault-item-status-chips {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }

    .vault-item-status-chips__secondary {
      opacity: 0.8;
      font-size: 0.8em;
    }

    .vault-item-status-chips__panel {
      display: flex;
      flex-direction: column;
    }

    .vault-item-status-chips__option {
      padding: 0.35rem 0.7rem;
      background: none;
      border: none;
      border-bottom: 1px solid var(--color-border);
      font: inherit;
      font-size: 0.72rem;
      cursor: pointer;
      text-align: left;
      color: var(--color-text);

      &:last-child { border-bottom: none; }
      &:hover { background: var(--color-surface); }
      &[aria-selected='true'] {
        background: color-mix(in oklab, var(--color-accent) 8%, var(--color-bg));
      }
      &:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: -2px;
      }
    }

    .chip-link {
      display: inline-flex;
      text-decoration: none;
    }

    .vault-item-status-chips__extra-projects {
      font-size: 0.7rem;
      color: var(--color-text-muted);
      cursor: default;
    }

    // Sits in the same row as UNGROOMED / CLEAR badges — match UiBadge
    // geometry exactly so the row reads as a flat tier of chips, not
    // chip + button. Dashed border (inactive) signals "add me"; solid accent
    // (active) signals "applied".
    .vault-item-status-chips__epic-toggle {
      display: inline-flex;
      align-items: center;
      min-height: 1.45rem;
      padding: 0.1rem 0.45rem;
      font-size: 0.64rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      line-height: 1.2;
      text-transform: uppercase;
      white-space: nowrap;
      border: 1px dashed var(--color-border);
      border-radius: var(--radius);
      background: none;
      color: var(--color-text-muted);
      cursor: pointer;

      &--active {
        border-style: solid;
        border-color: var(--color-accent);
        color: var(--color-accent);
        background: color-mix(in oklab, var(--color-accent) 10%, transparent);
      }

      &:hover {
        border-color: var(--color-accent);
        color: var(--color-accent);
      }

      &:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 1px;
      }
    }
  `],
})
export class VaultItemStatusChips {
  readonly item = input.required<VaultItem>();
  readonly owner = input<Actor | undefined>(undefined);
  readonly lifecycle = input.required<LifecycleState>();
  readonly isArchived = input.required<boolean>();
  readonly effectivePriority = input<Priority | null>(null);
  readonly priorityDiverges = input(false);
  readonly firstProject = input<Project | undefined>(undefined);
  readonly allProjects = input<readonly Project[]>([]);
  readonly isGitHubItem = input(false);
  readonly activeActors = input.required<readonly Actor[]>();

  readonly statusChange = output<'active' | 'done'>();
  readonly reassign = output<string>();
  readonly epicToggle = output<boolean>();
  readonly priorityChange = output<Priority | null>();

  readonly statuses: readonly ('active' | 'done')[] = ['active', 'done'];

  readonly priorityOptions: readonly { label: string; value: Priority | null }[] = [
    { label: 'P0 — urgent',  value: 0 },
    { label: 'P1 — high',    value: 1 },
    { label: 'P2 — normal',  value: 2 },
    { label: 'P3 — low',     value: 3 },
    { label: '— clear',      value: null },
  ];

  readonly extraProjectCount = computed(() => Math.max(0, this.allProjects().length - 1));
  readonly extraProjectsTitle = computed(() => {
    const extras = this.allProjects().slice(1);
    return extras.map(p => p.display_name).join(', ');
  });

  readonly statusTone = computed(() =>
    this.lifecycle() === 'active' ? 'success' as const : 'neutral' as const
  );

  readonly ownerChip = computed(() => {
    const o = this.owner();
    if (o) return { id: o.id as string, label: o.id as string };
    // Owner row hasn't resolved yet (actors not loaded, or stale lookup).
    // Falling back to "unassigned" here would lie about an item that DOES
    // have an assignee — render the raw id instead so the user sees truth.
    // Only treat null assigned_to as genuinely unassigned.
    const raw = this.item().assigned_to;
    if (raw) return { id: raw as string, label: raw as string };
    return { id: 'unassigned', label: 'unassigned' };
  });

  readonly groomingLabel = computed(() => this.item().grooming_status.replace(/_/g, ' '));

  readonly groomingTone = computed<'neutral' | 'success' | 'warning' | 'danger' | 'info'>(() => {
    switch (this.item().grooming_status) {
      case 'ready': return 'success';
      case 'needs_rework': return 'warning';
      case 'intake_rejected': return 'danger';
      case 'classified':
      case 'decomposed': return 'info';
      default: return 'neutral';
    }
  });

  readonly actionabilityTone = computed<'neutral' | 'success' | 'warning' | 'danger'>(() => {
    switch (this.item().actionability) {
      case 'clear': return 'success';
      case 'needs-breakdown': return 'warning';
      case 'vague': return 'danger';
      default: return 'neutral';
    }
  });

  readonly priorityTitle = computed(() => {
    const item = this.item();
    if (!this.priorityDiverges()) return 'Priority';
    return `AI: P${item.ai_priority}, Manual: P${item.manual_priority}`;
  });

  priorityLabel(p: Priority | null): string {
    return p === null ? '—' : 'P' + p;
  }

  priorityTone(p: Priority): 'danger' | 'warning' | 'info' {
    if (p <= 1) return 'danger';
    if (p === 2) return 'warning';
    return 'info';
  }
}
