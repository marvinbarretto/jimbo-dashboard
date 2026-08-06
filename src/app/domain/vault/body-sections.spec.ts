import { describe, expect, it } from 'vitest';
import { hasBodySections, parseBodySections } from './body-sections';

describe('parseBodySections', () => {
  it('returns nothing for an empty body', () => {
    expect(parseBodySections(null)).toEqual([]);
    expect(parseBodySections(undefined)).toEqual([]);
    expect(parseBodySections('   \n\n ')).toEqual([]);
  });

  it('returns unlabelled prose as one section', () => {
    const out = parseBodySections('Just some notes.\nA second line.');
    expect(out).toEqual([
      { label: null, hint: null, content: 'Just some notes.\nA second line.' },
    ]);
  });

  it('splits on whole-line bold headings', () => {
    const out = parseBodySections(
      '**Now** \nchronological only\n\n**Do**\nlift series-collapse'
    );
    expect(out.map(s => s.label)).toEqual(['Now', 'Do']);
    expect(out[0].content).toBe('chronological only');
    expect(out[1].content).toBe('lift series-collapse');
  });

  it('splits on ATX headings', () => {
    const out = parseBodySections('## Context\nbackground\n### Scope\nnarrow');
    expect(out.map(s => s.label)).toEqual(['Context', 'Scope']);
  });

  it('keeps preamble before the first heading as an unlabelled section', () => {
    const out = parseBodySections('lead sentence\n\n**Do**\nthe thing');
    expect(out[0]).toEqual({ label: null, hint: null, content: 'lead sentence' });
    expect(out[1].label).toBe('Do');
  });

  // The failure that made a naive line-start rule unusable: real bodies bold
  // words mid-sentence (`how LocalShout **presents** its feed`).
  it('ignores bold that is not the whole line', () => {
    const out = parseBodySections('how LocalShout **presents** its event feed');
    expect(out).toHaveLength(1);
    expect(out[0].label).toBeNull();
  });

  it('strips a trailing colon from the label', () => {
    expect(parseBodySections('**Not this:**\nno rewrites')[0].label).toBe('Not this');
  });

  it('lifts a parenthetical out of an over-long label into the hint', () => {
    const out = parseBodySections(
      '**Why this matters (real Watford data, 1326 events / 25mi / 90d):**\nburied'
    );
    expect(out[0].label).toBe('Why this matters');
    expect(out[0].hint).toBe('real Watford data, 1326 events / 25mi / 90d');
    expect(out[0].content).toBe('buried');
  });

  it('splits an over-long label on an em dash', () => {
    const out = parseBodySections(
      '**What was built — all under prototype/, committed this session**\nthree presenters'
    );
    expect(out[0].label).toBe('What was built');
    expect(out[0].hint).toBe('all under prototype/, committed this session');
  });

  // Losslessness: an unsplittable long heading goes back into the prose rather
  // than being truncated into a misleading label.
  it('reflows an unsplittable long heading back into the content', () => {
    const long = 'a'.repeat(60);
    const out = parseBodySections(`**${long}**\nbody text`);
    expect(out).toHaveLength(1);
    expect(out[0].label).toBeNull();
    expect(out[0].content).toBe(`**${long}**\nbody text`);
  });

  // A long `##` heading must stay a `##` heading — reflowing it as bold would
  // silently demote a real markdown heading in 6 items of the live corpus.
  it('reflows a long ATX heading verbatim, not re-marked-up', () => {
    const line = '## 3. Time is presented as precise when it is a rough guess';
    const out = parseBodySections(`${line}\nbody text`);
    expect(out[0].label).toBeNull();
    expect(out[0].content).toBe(`${line}\nbody text`);
  });

  it('does not treat fenced code as headings', () => {
    const out = parseBodySections('**Do**\n```md\n## Not a heading\n**Nor this**\n```\ndone');
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe('Do');
    expect(out[0].content).toContain('## Not a heading');
  });

  it('keeps a heading with no content beneath it', () => {
    const out = parseBodySections('**Now**\nstate\n\n**Not this**');
    expect(out.map(s => s.label)).toEqual(['Now', 'Not this']);
    expect(out[1].content).toBe('');
  });

  it('preserves interior blank lines and list markup', () => {
    const out = parseBodySections('**Do**\n- one\n\n- two\n');
    expect(out[0].content).toBe('- one\n\n- two');
  });
});

// Round-trip guard: the `/vault-task` skill dictates the shape agents write, and
// this parser decides what renders. They drifted once already — the skill's first
// draft put label and content on one line, which parses as prose. If this fails,
// fix whichever of the two moved; don't relax the assertion.
describe('the /vault-task body contract', () => {
  const TEMPLATE = [
    '**Now**',
    'Current state, with concrete repo paths (`repo/src/file.ts`) and facts a cold',
    'session can verify.',
    '',
    '**Do**',
    'Approach sketch. What to change, in what order.',
    '',
    '**Not this**',
    'Scope guard. The tempting adjacent work this task is NOT.',
    '',
    '**Refs**',
    'Pointers: docs, prior items, commits.',
  ].join('\n');

  it('parses into exactly the four contract sections', () => {
    const out = parseBodySections(TEMPLATE);
    expect(out.map(s => s.label)).toEqual(['Now', 'Do', 'Not this', 'Refs']);
    expect(out.every(s => s.content.length > 0)).toBe(true);
    expect(out.every(s => s.hint === null)).toBe(true);
  });

  it('keeps every contract label inside the gutter width', () => {
    for (const s of parseBodySections(TEMPLATE)) {
      expect(s.label!.length).toBeLessThanOrEqual(40);
    }
  });

  // The exact regression: label and content sharing a line.
  it('does NOT section a one-line "label — content" body', () => {
    const out = parseBodySections('**Now** — current state, chronological only');
    expect(out.map(s => s.label)).toEqual([null]);
  });
});

describe('hasBodySections', () => {
  it('is false for unstructured prose and true once a label appears', () => {
    expect(hasBodySections('plain notes')).toBe(false);
    expect(hasBodySections('')).toBe(false);
    expect(hasBodySections('**Now**\nstate')).toBe(true);
  });
});
