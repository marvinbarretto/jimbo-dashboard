import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Priority } from '@domain/vault/vault-item';
import type { ActorId } from '@domain/ids';
import { ProjectAvatar } from '@shared/components/project-avatar/project-avatar';
import { ActorAvatar } from '@shared/components/actor-avatar/actor-avatar';
import { PriorityBadge } from '@shared/components/priority-badge/priority-badge';

export type ItemHeaderSecondary = 'time' | 'epic' | 'none';

// Shared identity strip for both app-block-card (planner queue/calendar) and
// app-vault-card (grooming/execution kanban) — one colour band carrying
// project + priority + owner + (time or epic), so the same kind of thing
// reads the same way wherever it shows up. Evolved from VaultCard's existing
// .vault-card__project-bar (already a project-colour full-bleed strip with
// bg-coloured text) rather than invented from scratch — this is that same
// pattern with avatars/priority/lock added.
//
// Display-only: does not own priority-editing or reassignment. VaultCard's
// existing priority-dropdown and identity reassign-dropdown stay put and
// keep doing that job; this is the glance-strip, not the edit surface.
@Component({
  selector: 'app-item-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProjectAvatar, ActorAvatar, PriorityBadge],
  host: {
    class: 'item-header',
    '[style.background]': "projectColor() ?? 'var(--color-border)'",
  },
  template: `
    <span class="item-header__left">
      <app-project-avatar [name]="projectName()" color="var(--color-bg)" variant="outlined" size="sm" />
      @switch (secondary()) {
        @case ('time') {
          @if (timeText()) {
            <span class="item-header__time">{{ timeText() }}</span>
          }
        }
        @case ('epic') {
          @if (epicLabel()) {
            <span class="item-header__epic">{{ epicLabel() }}</span>
          }
        }
      }
    </span>
    <span class="item-header__right">
      @if (priority() !== null) {
        <app-priority-badge [priority]="priority()!" />
      }
      @if (owner()) {
        <app-actor-avatar [actor]="owner()!" variant="filled" size="sm" />
      }
      @if (showLock()) {
        <button type="button" class="item-header__lock" (click)="onLockClick($event)" aria-label="toggle lock">
          @if (locked()) {
            🔒
          } @else {
            <svg viewBox="0 0 10 16" width="10" height="16" fill="currentColor">
              <circle cx="2.5" cy="2.5" r="1.4" /><circle cx="7.5" cy="2.5" r="1.4" />
              <circle cx="2.5" cy="8" r="1.4" /><circle cx="7.5" cy="8" r="1.4" />
              <circle cx="2.5" cy="13.5" r="1.4" /><circle cx="7.5" cy="13.5" r="1.4" />
            </svg>
          }
        </button>
      }
    </span>
  `,
  styles: [`
    :host.item-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.4rem;
      padding: 0.3rem 0.6rem;
      color: var(--color-bg);
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
      font-size: 0.64rem;
      font-weight: 700;
    }
    .item-header__left, .item-header__right {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      min-width: 0;
    }
    .item-header__left { flex: 1; }
    .item-header__time {
      font-size: 0.6rem;
      font-weight: 500;
      opacity: 0.85;
      white-space: nowrap;
    }
    .item-header__epic {
      font-size: 0.62rem;
      opacity: 0.9;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }
    .item-header__lock {
      width: 18px; height: 18px;
      padding: 0; margin: 0; /* global button reset otherwise adds ~9px/15px */
      box-sizing: border-box;
      display: inline-flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      font-size: 0.65rem;
      font-family: inherit;
      border: none;
      border-radius: var(--radius);
      background: color-mix(in srgb, black 20%, transparent);
      color: var(--color-bg);
      cursor: pointer;
    }
    .item-header__lock:hover { background: color-mix(in srgb, black 35%, transparent); }
  `],
})
export class ItemHeader {
  readonly projectName = input.required<string>();
  readonly projectColor = input<string | null>(null);
  readonly priority = input<Priority | null>(null);
  readonly owner = input<ActorId | null>(null);
  readonly secondary = input<ItemHeaderSecondary>('none');
  readonly timeText = input<string | null>(null);
  readonly epicLabel = input<string | null>(null);
  readonly showLock = input(false);
  readonly locked = input(false);

  readonly lockToggle = output<void>();

  onLockClick(event: MouseEvent): void {
    event.stopPropagation();
    this.lockToggle.emit();
  }
}
