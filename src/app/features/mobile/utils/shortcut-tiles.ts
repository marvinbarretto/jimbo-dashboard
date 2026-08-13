import { type IconName } from '@shared/components/app-icon/icon-registry';

/**
 * The home screen's launcher: eight fixed destinations, so nothing in the suite
 * is more than two taps from opening the app.
 *
 * Two rules make it work, and both are asserted in the tests:
 *  - Position never changes. The grid is muscle memory; a tile that moves
 *    between releases is worse than no tile.
 *  - Tiles navigate, they never log. One-tap *recording* lives only in the
 *    quick-log grid, so a mistimed thumb can't write data.
 */

export interface ShortcutTile {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
  readonly route: string;
}

export interface ShortcutTileView extends ShortcutTile {
  /** Rendered badge text, or null when there's nothing worth interrupting for. */
  readonly badge: string | null;
  /** Accessible name — a bare "20" beside a label is silent to a screen reader. */
  readonly badgeLabel: string | null;
}

/** Above this the exact count stops mattering and the tile just needs to fit. */
const BADGE_MAX = 9;

export const SHORTCUT_TILES: readonly ShortcutTile[] = Object.freeze([
  { id: 'focus', label: 'Focus', icon: 'focus', route: '/pomo' },
  { id: 'capture', label: 'New item', icon: 'capture', route: '/m/log' },
  { id: 'scan', label: 'Scan', icon: 'scan', route: '/nutrition/scan' },
  { id: 'replay', label: 'Replay', icon: 'replay', route: '/journal/overview' },
  { id: 'fleet', label: 'Fleet', icon: 'fleet', route: '/review' },
  { id: 'briefing', label: 'Briefing', icon: 'briefing', route: '/briefings' },
  { id: 'close-day', label: 'Close day', icon: 'close-day', route: '/evening' },
  { id: 'inbox', label: 'Inbox', icon: 'inbox', route: '/vault-items' },
]);

/** What a tile's badge means when it has one — read aloud after the label. */
const BADGE_NOUN: Readonly<Record<string, string>> = {
  fleet: 'waiting',
  'close-day': 'left',
  inbox: 'to triage',
};

export function applyBadges(
  tiles: readonly ShortcutTile[],
  counts: Readonly<Record<string, number>>,
): ShortcutTileView[] {
  return tiles.map((tile) => {
    const count = counts[tile.id] ?? 0;
    if (count <= 0) return { ...tile, badge: null, badgeLabel: null };
    const badge = count > BADGE_MAX ? `${BADGE_MAX}+` : String(count);
    const noun = BADGE_NOUN[tile.id] ?? 'pending';
    return { ...tile, badge, badgeLabel: `${count} ${noun}` };
  });
}
