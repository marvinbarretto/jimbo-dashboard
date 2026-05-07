import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideAngularModule, type LucideIconData } from 'lucide-angular';

// Visual treatments — each maps to a distinct chip kind in the system. Keep this list
// stable — adding new variants is fine, but renaming them ripples through every caller.
export type ChipVariant =
  | 'neutral'      // generic — for one-off labels with no semantic role
  | 'project'      // `/slug`, dot, color-tinted border + fill
  | 'actor'        // `@slug`, plain border, no fill
  | 'type-epic'    // EPIC — accent fill, uppercase, letterspaced
  | 'origin'       // rectangular corners, color-by-kind via [dataKind]
  | 'thread'       // small, low-contrast, descriptive
  | 'principle'    // outline-dashed, italic — signals "different kind of thing"
  | 'blocked';     // amber warning — only render when count > 0

export type ChipSize = 'sm' | 'md';

// Truly primitive chip — used everywhere we need an inline label with optional icon,
// prefix sigil, or color dot. Self-contained: pass `color` to drive border/fill/dot, or
// inherit `--project-color` from the parent (existing epic-row/epic-card pattern).
//
// Disambiguation built in: project chips render dotted + color-bordered; actor chips
// render plain-bordered + no fill. Same name (e.g. `jimbo`) reads differently in each
// even in monochrome.
//
// Content goes via projection — the label text, including any router-link wrapping,
// is the responsibility of the caller. The chip itself doesn't navigate.
@Component({
  selector: 'app-chip',
  imports: [LucideAngularModule],
  template: `
    @if (dotColor() || variant() === 'project') {
      <span class="chip__dot" aria-hidden="true"
            [style.background]="dotColor() ?? 'var(--chip-color)'"></span>
    }
    @if (icon()) {
      <lucide-icon [img]="icon()!" [size]="iconPx()" class="chip__icon" />
    }
    @if (prefix()) {
      <span class="chip__prefix" aria-hidden="true">{{ prefix() }}</span>
    }
    <ng-content />
  `,
  styleUrl: './app-chip.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'chip',
    '[class.chip--project]':   'variant() === "project"',
    '[class.chip--actor]':     'variant() === "actor"',
    '[class.chip--type-epic]': 'variant() === "type-epic"',
    '[class.chip--origin]':    'variant() === "origin"',
    '[class.chip--thread]':    'variant() === "thread"',
    '[class.chip--principle]': 'variant() === "principle"',
    '[class.chip--blocked]':   'variant() === "blocked"',
    '[class.chip--sm]':        'size() === "sm"',
    '[attr.data-kind]':        'dataKind()',
    // Color is plumbed via a CSS custom property so SCSS rules can mix/tint it.
    // Falls back to --project-color from a parent context, then to a muted default.
    '[style.--chip-color]':    'color() ?? "var(--project-color, var(--color-text-muted))"',
  },
})
export class AppChip {
  readonly variant = input<ChipVariant>('neutral');
  readonly size = input<ChipSize>('md');

  // Optional Lucide icon, rendered before the label.
  readonly icon = input<LucideIconData | null>(null);

  // Sigil rendered before the label — e.g. '/' for project, '@' for actor, '#' for vault item.
  readonly prefix = input<string | null>(null);

  // Override the chip's color (border/fill tint). Project chips also use this for the dot.
  // If null, inherits --project-color from the parent context, then falls back to muted.
  readonly color = input<string | null>(null);

  // Override the dot color independently of the chip color (rare — used when the dot
  // should reflect a different concept than the chip's tint). If null, follows --chip-color.
  readonly dotColor = input<string | null>(null);

  // Sets the data-kind attribute — used by the `origin` variant to color-code by origin
  // type (synthesize / deep-dive / jimbo-autonomous / manual).
  readonly dataKind = input<string | null>(null);

  // Icon size in pixels. Scales slightly with chip size.
  readonly iconPx = input<number>(11);
}
