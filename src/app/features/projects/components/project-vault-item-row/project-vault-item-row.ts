import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';
import type { VaultItem } from '@domain/vault/vault-item';
import { lifecycleState } from '@domain/vault/vault-item';

// Compact one-line presentation of a vault item belonging to a project.
// Used by the project landing page; the grooming/execution boards have their
// own richer cards.
@Component({
  selector: 'app-project-vault-item-row',
  imports: [RouterLink, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="project-vault-item-row" [routerLink]="['/vault-items', item().seq]">
      <span class="project-vault-item-row__seq">#{{ item().seq }}</span>
      <span class="project-vault-item-row__title">{{ item().title }}</span>
      <span class="project-vault-item-row__meta">
        <span class="project-vault-item-row__type">{{ item().type }}</span>
        <span class="project-vault-item-row__status" [attr.data-state]="state()">{{ state() }}</span>
        @if (latest(); as ts) {
          <span class="project-vault-item-row__when">· {{ ts | relativeTime }}</span>
        }
      </span>
    </a>
  `,
  styles: [`
    .project-vault-item-row {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 0.6rem;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-md, 8px);
      color: var(--color-text);
      text-decoration: none;
    }
    .project-vault-item-row:hover {
      background: var(--color-surface-soft);
    }
    .project-vault-item-row__seq {
      font-family: var(--font-mono, monospace);
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }
    .project-vault-item-row__title {
      font-size: 0.9rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .project-vault-item-row__meta {
      display: inline-flex;
      gap: 0.35rem;
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
    .project-vault-item-row__status[data-state="done"] {
      color: var(--color-success, #2e7d32);
    }
    .project-vault-item-row__status[data-state="archived"] {
      color: var(--color-text-muted);
    }
  `],
})
export class ProjectVaultItemRow {
  readonly item = input.required<VaultItem>();

  readonly state = computed(() => lifecycleState(this.item()));
  readonly latest = computed(() => this.item().latest_activity_at ?? this.item().created_at);
}
