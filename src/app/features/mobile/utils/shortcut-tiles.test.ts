import { describe, expect, it } from 'vitest';
import { SHORTCUT_TILES, applyBadges } from './shortcut-tiles';

describe('SHORTCUT_TILES — the muscle-memory contract', () => {
  it('is exactly eight tiles, in a frozen order', () => {
    // Position never changing is the whole value of the launcher. If a future
    // PR reorders or resizes this, it should have to argue with a test first.
    expect(SHORTCUT_TILES.map((t) => t.id)).toEqual([
      'focus',
      'capture',
      'scan',
      'replay',
      'fleet',
      'briefing',
      'close-day',
      'inbox',
    ]);
  });

  it('sends every tile somewhere absolute, because tiles only ever navigate', () => {
    for (const tile of SHORTCUT_TILES) {
      expect(tile.route.startsWith('/')).toBe(true);
    }
  });
});

describe('applyBadges', () => {
  it('leaves a quiet tile unbadged — only nonzero, only actionable', () => {
    const tiles = applyBadges(SHORTCUT_TILES, {});
    expect(tiles.every((t) => t.badge === null)).toBe(true);
  });

  it('badges only the tile the count belongs to', () => {
    const tiles = applyBadges(SHORTCUT_TILES, { fleet: 3 });
    expect(tiles.find((t) => t.id === 'fleet')?.badge).toBe('3');
    expect(tiles.find((t) => t.id === 'inbox')?.badge).toBeNull();
  });

  it('caps a runaway count so it still fits the tile', () => {
    // Production genuinely returns things like waiting_on_marvin: 20.
    expect(applyBadges(SHORTCUT_TILES, { fleet: 20 }).find((t) => t.id === 'fleet')?.badge).toBe(
      '9+',
    );
  });

  it('keeps the true count in the accessible name even when the badge is capped', () => {
    const fleet = applyBadges(SHORTCUT_TILES, { fleet: 20 }).find((t) => t.id === 'fleet');
    expect(fleet?.badgeLabel).toBe('20 waiting');
  });

  it('gives each badged tile a noun, so it never reads as a bare number', () => {
    const tiles = applyBadges(SHORTCUT_TILES, { fleet: 2, 'close-day': 6, inbox: 164 });
    expect(tiles.find((t) => t.id === 'close-day')?.badgeLabel).toBe('6 left');
    expect(tiles.find((t) => t.id === 'inbox')?.badgeLabel).toBe('164 to triage');
  });

  it('treats a negative or zero count as nothing to say', () => {
    const tiles = applyBadges(SHORTCUT_TILES, { fleet: 0, inbox: -1 });
    expect(tiles.find((t) => t.id === 'fleet')?.badge).toBeNull();
    expect(tiles.find((t) => t.id === 'inbox')?.badge).toBeNull();
  });
});
