import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiDropdown } from '@shared/components/ui-dropdown/ui-dropdown';
import type { Actor } from '@domain/actors';
import type { Project } from '@domain/projects/project';
import type { LifecycleState, Priority, VaultItem } from '@domain/vault/vault-item';

@Component({
  selector: 'app-vault-item-status-chips',
  imports: [RouterLink, UiBadge, UiDropdown],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="vault-item-status-chips">

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

      <app-ui-badge [tone]="groomingTone()">{{ groomingLabel() }}</app-ui-badge>

      <app-ui-dropdown
        #ownerDrop
        ariaHaspopup="listbox"
        ariaLabel="Reassign owner">
        <span trigger [class]="ownerTriggerClass()">{{ ownerTriggerLabel() }}</span>
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

      @if (effectivePriority(); as p) {
        <app-ui-badge [tone]="priorityTone(p)" [title]="priorityTitle()">
          {{ priorityLabel(p) }}{{ priorityDiverges() ? ' *' : '' }}
        </app-ui-badge>
      }

      @if (item().actionability !== null) {
        <app-ui-badge [tone]="actionabilityTone()">{{ item().actionability }}</app-ui-badge>
      }

      @if (firstProject(); as p) {
        <a
          [routerLink]="['/projects', p.id]"
          [class]="'detail-link-badge detail-link-badge--project detail-link-badge--project-' + p.id">
          <span class="detail-link-badge__prefix">Project</span>
          {{ p.display_name }}
        </a>
      }

      @if (isGitHubItem()) {
        <app-ui-badge tone="info" [subtle]="true">github</app-ui-badge>
      }

    </div>
  `,
  styles: [`
    :host {
      display: block;
      margin-bottom: 0.5rem;
    }

    .vault-item-status-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      align-items: center;
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

    /* .detail-link-badge and modifiers live in _utilities.scss */
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
  readonly isGitHubItem = input(false);
  readonly activeActors = input.required<readonly Actor[]>();

  readonly statusChange = output<'active' | 'done'>();
  readonly reassign = output<string>();

  readonly statuses: readonly ('active' | 'done')[] = ['active', 'done'];

  readonly statusTone = computed(() =>
    this.lifecycle() === 'active' ? 'success' as const : 'neutral' as const
  );

  readonly ownerTriggerLabel = computed(() => {
    const o = this.owner();
    if (o) return `@${o.id}`;
    const assigned = this.item().assigned_to;
    return assigned ?? 'unassigned';
  });

  readonly ownerTriggerClass = computed(() => {
    const o = this.owner();
    const base = 'detail-link-badge detail-link-badge--owner';
    if (!o) return `${base} detail-link-badge--unassigned`;
    return `${base} detail-link-badge--actor-${o.kind}`;
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
