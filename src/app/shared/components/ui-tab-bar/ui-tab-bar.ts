import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-tab-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="ui-tab-bar" [attr.aria-label]="label()">
      <ng-content />
    </nav>
  `,
  styles: [`
    // Sticks below the app header so core sub-nav stays reachable on long
    // pages. Offset comes from --app-header-height set on .app-shell.
    :host {
      display: block;
      position: sticky;
      top: var(--app-header-height, 0);
      z-index: 20;
      // Break out of the page gutter so the sticky strip + divider span the
      // full width; the inner padding re-aligns the tabs with page content.
      // Fallback 0px keeps it inert if used outside a gutter container.
      margin-inline: calc(-1 * var(--app-gutter, 0px));
    }

    // Background hue picks up the --section-accent var set on the app shell.
    // The border-bottom switches to the accent at full strength so the active
    // tab underline reads as part of the same tinted strip.
    // Solid base (--color-bg) + accent tint layered on top so content
    // scrolling underneath doesn't bleed through the sticky strip.
    .ui-tab-bar {
      display: flex;
      padding: 0 var(--app-gutter, 1.5rem);
      background-color: var(--color-bg);
      background-image: linear-gradient(
        color-mix(in oklch, var(--section-accent, var(--color-border)) 8%, transparent),
        color-mix(in oklch, var(--section-accent, var(--color-border)) 8%, transparent)
      );
      border-bottom: 1px solid color-mix(in oklch, var(--section-accent, var(--color-border)) 35%, var(--color-border));
    }
  `],
})
export class UiTabBar {
  readonly label = input('Navigation');
}
