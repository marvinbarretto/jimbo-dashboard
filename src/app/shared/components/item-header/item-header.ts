import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Priority } from '@domain/vault/vault-item';
import type { ActorId } from '@domain/ids';
import { ProjectAvatar } from '@shared/components/project-avatar/project-avatar';
import { ActorAvatar } from '@shared/components/actor-avatar/actor-avatar';
import { PriorityBadge } from '@shared/components/priority-badge/priority-badge';

// 'both' exists because the vault card wants the clock in the identity row AND
// the epic chip beneath it. Kept as an explicit value rather than letting a set
// timeText imply it: block-card's queue variant passes both a time and an epic
// label and has always shown only the epic, and that is not this card's call to
// change.
export type ItemHeaderSecondary = 'time' | 'epic' | 'both' | 'none';

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
  imports: [RouterLink, ProjectAvatar, ActorAvatar, PriorityBadge],
  host: {
    class: 'item-header',
    // Drains toward --color-text-muted rather than a literal grey: that token
    // is dark in the light theme and light in the dark one, so the band's
    // --color-bg text stays legible at every fade in both.
    '[style.background]': 'bandColor()',
    '[style.color]': 'bandText()',
  },
  template: `
    <span class="item-header__main">
      <span class="item-header__left">
        <app-project-avatar
          class="item-header__pav"
          [class.item-header__pav--held]="fade() > 0"
          [name]="projectName()"
          [color]="avatarColor()"
          [variant]="avatarVariant()"
          size="sm" />
        @if (seq() !== null) {
          <span class="item-header__seq">{{ seqLabel() ?? '#' + seq() }}</span>
        }
        @if (timeText() && (secondary() === 'time' || secondary() === 'both')) {
          <span class="item-header__time">{{ timeText() }}</span>
        }
      </span>
      <span class="item-header__right">
        <!-- Projected so a consumer can supply an interactive control. The
             fallback keeps every existing caller on the display badge. -->
        <ng-content select="[priority]">
          @if (priority() !== null) {
            <app-priority-badge [priority]="priority()!" />
          }
        </ng-content>
        <!-- Projected for the same reason as priority: the card owns
             reassignment, this strip owns the glance. -->
        <ng-content select="[owner]">
          @if (owner()) {
            <app-actor-avatar [actor]="owner()!" variant="filled" size="sm" />
          }
        </ng-content>
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
        @if (showRemove()) {
          <button type="button" class="item-header__remove" (click)="onRemoveClick($event)" aria-label="remove">×</button>
        }
      </span>
    </span>
    @if (epicLabel() && (secondary() === 'epic' || secondary() === 'both')) {
      <!-- A contained chip, sized to its text — not a second full-bleed strip.
           Linked when the parent's seq is known; plain text otherwise, which is
           what the planner passes. -->
      @if (epicSeq() !== null) {
        <a
          class="item-header__epic item-header__epic--link"
          [routerLink]="['/vault-items', epicSeq()]"
          (click)="$event.stopPropagation()"
          >{{ epicLabel() }}</a>
      } @else {
        <span class="item-header__epic">{{ epicLabel() }}</span>
      }
    }
  `,
  styles: [`
    :host.item-header {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0.15rem;
      padding: 0.3rem 0.6rem;
      font-family: var(--font-sans);
      font-size: 0.64rem;
      font-weight: 700;
    }
    .item-header__main {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.4rem;
      min-width: 0;
    }
    /* The project initial is the one mark that must survive the drain: it is
       what keeps a mixed board scannable by project once the band has greyed
       out. Ringed so it still reads as a disc when band and token match. */
    .item-header__pav--held {
      display: inline-flex;
      /* Zero the inline strut: without it the host box is taller than the 1rem
         avatar inside it, and the ring traces that taller box — which rendered
         as a pair of brackets either side of the initial rather than a ring. */
      line-height: 0;
      border-radius: 25%;
      box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--color-bg) 55%, transparent);
    }
    .item-header__left, .item-header__right {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      min-width: 0;
    }
    /* overflow: hidden is load-bearing, not tidying — in a narrow calendar
       block the nowrap children (seq, time) otherwise spill out of this box
       and render *underneath* the lock/remove buttons. */
    .item-header__left { flex: 1; overflow: hidden; }
    /* The action buttons are the one thing that must never be squeezed or
       overlapped; the text to their left ellipsises instead. */
    .item-header__right { flex-shrink: 0; }
    .item-header__seq {
      font-size: 0.6rem;
      font-weight: 500;
      opacity: 0.75;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .item-header__time {
      font-size: 0.6rem;
      font-weight: 500;
      opacity: 0.85;
      white-space: nowrap;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    /* Wraps rather than truncates: an epic title is the answer to "what is this
       task FOR", and half of it answers nothing. It stays a chip — content-width
       and self-aligned when short — and becomes a small block when long. */
    .item-header__epic {
      align-self: flex-start;
      max-width: 100%;
      padding: 0.1rem 0.3rem;
      border-radius: var(--radius);
      /* The app's own base contrast pair — ground and the text that sits on it
         — so the chip is a hole punched in the band and stays legible in both
         themes without a literal anywhere. */
      background: var(--color-bg);
      color: var(--color-text);
      font-family: var(--font-sans);
      font-size: 0.6rem;
      font-weight: 600;
      line-height: 1.3;
      text-decoration: none;
      /* Long words (a URL, a hyphenated identifier) break rather than push the
         chip past the card's edge. */
      overflow-wrap: anywhere;
    }
    .item-header__epic--link:hover {
      background: var(--color-surface-soft);
      text-decoration: underline;
    }
    .item-header__lock, .item-header__remove {
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
    .item-header__lock:hover, .item-header__remove:hover { background: color-mix(in srgb, black 35%, transparent); }
    .item-header__remove { font-size: 0.85rem; line-height: 1; }
  `],
})
export class ItemHeader {
  readonly projectName = input.required<string>();
  readonly projectColor = input<string | null>(null);
  readonly seq = input<number | null>(null);
  readonly priority = input<Priority | null>(null);
  readonly owner = input<ActorId | null>(null);
  readonly secondary = input<ItemHeaderSecondary>('none');
  readonly timeText = input<string | null>(null);
  readonly epicLabel = input<string | null>(null);
  /** Parent epic's seq. When set, the epic chip links to it. */
  readonly epicSeq = input<number | null>(null);
  /** Operator-facing handle for the seq — e.g. `JIM-4650`. Falls back to `#4650`. */
  readonly seqLabel = input<string | null>(null);
  /**
   * How far the band has drained toward neutral, 0..1.
   *
   * Staleness on the card family is subtractive: fresh work keeps its project
   * colour and old work loses it. Capped below 1 so a trace of the project hue
   * survives even at the ancient end.
   */
  readonly fade = input(0);
  readonly showLock = input(false);
  readonly locked = input(false);
  readonly showRemove = input(false);

  /**
   * The band, draining into the card it sits on.
   *
   * It drained toward --color-text-muted, which is a LIGHTER colour than a
   * project token in the dark theme — so an old card's band got brighter and
   * the stalest cards on the board were the loudest things on it, which is the
   * opposite of what the mechanism is for. Draining toward --color-surface
   * recedes in both themes by construction: the band dissolves into the card
   * rather than toward some third colour.
   */
  protected readonly bandColor = computed(() => {
    const base = this.projectColor() ?? 'var(--color-border)';
    const f = this.clampedFade();
    if (f === 0) return base;
    return `color-mix(in oklch, ${base}, var(--color-surface) ${Math.round(f * 82)}%)`;
  });

  /**
   * The band's text, tracking the band underneath it.
   *
   * A fresh band is a saturated project colour and takes --color-bg; a fully
   * drained one is essentially --color-surface and takes --color-text. Moving
   * the foreground along with the background keeps the pair legible at every
   * age, in both themes, instead of only at the ends.
   */
  protected readonly bandText = computed(() => {
    const f = this.clampedFade();
    if (f === 0) return 'var(--color-bg)';
    return `color-mix(in srgb, var(--color-bg), var(--color-text) ${Math.round(f * 100)}%)`;
  });

  private readonly clampedFade = computed(() => Math.min(1, Math.max(0, this.fade())));

  // Outlined against an undrained band (the token is the ground behind it, so a
  // fill would vanish); filled once the band starts draining, which is what
  // holds the project colour on an old card.
  protected readonly avatarVariant = computed(() => (this.fade() > 0 ? 'filled' : 'outlined'));
  protected readonly avatarColor = computed(() =>
    this.fade() > 0 ? (this.projectColor() ?? 'var(--color-border)') : 'var(--color-bg)',
  );

  readonly lockToggle = output<void>();
  readonly remove = output<void>();

  onLockClick(event: MouseEvent): void {
    event.stopPropagation();
    this.lockToggle.emit();
  }

  onRemoveClick(event: MouseEvent): void {
    event.stopPropagation();
    this.remove.emit();
  }
}
