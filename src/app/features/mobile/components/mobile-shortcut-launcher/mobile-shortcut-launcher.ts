import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppIcon } from '@shared/components/app-icon/app-icon';
import { type ShortcutTileView } from '../../utils/shortcut-tiles';

/**
 * The eight-tile launcher — the fast lane out of the home screen.
 *
 * Tiles are anchors, never buttons: navigation is all they do, so the "go
 * somewhere" affordance is structurally incapable of writing data the way the
 * quick-log grid below it does. Anchors also bring the right role and
 * long-press behaviour for free.
 *
 * Order comes from SHORTCUT_TILES and never varies — the grid is muscle memory.
 */
@Component({
  selector: 'app-mobile-shortcut-launcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AppIcon],
  templateUrl: './mobile-shortcut-launcher.html',
  styleUrl: './mobile-shortcut-launcher.scss',
  host: { 'data-testid': 'mobile-shortcut-launcher' },
})
export class MobileShortcutLauncher {
  readonly tiles = input.required<readonly ShortcutTileView[]>();
}
