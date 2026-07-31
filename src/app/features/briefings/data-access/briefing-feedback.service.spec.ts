import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BriefingFeedbackService, resolveNote } from './briefing-feedback.service';

// A feedback note is a miss's steer: the miss dialog writes `[reason] text`,
// and the briefing skill aggregates those reason tags across briefings to
// decide what to change about a section. So a note attached to the wrong
// verdict isn't cosmetic — it's a steer Marvin never gave, feeding the
// generator.

describe('resolveNote', () => {
  it('clears the note when a miss is changed to a hit', () => {
    // The bug: ▼ then ▲ left the hit carrying `[stale] …`, which the skill
    // reads as a miss reason.
    expect(resolveNote('hit', undefined, '[stale] already handled')).toBeNull();
  });

  it('keeps the stored note when re-saving a miss without retyping it', () => {
    // Required, not incidental: the server upsert overwrites `note` on every
    // PUT, so dropping it here would blank the reason on any re-press of ▼.
    expect(resolveNote('miss', undefined, '[stale] already handled')).toBe('[stale] already handled');
  });

  it('lets an explicit note win, including on a hit', () => {
    // Nothing supplies one today; the rule is scoped to inheritance so a
    // deliberate hit note stays possible.
    expect(resolveNote('hit', '[wrong-facts] no', '[stale] old')).toBe('[wrong-facts] no');
    expect(resolveNote('miss', '[wrong-facts] no', '[stale] old')).toBe('[wrong-facts] no');
  });

  it('treats an empty or whitespace note as a clear', () => {
    expect(resolveNote('miss', '', '[stale] old')).toBeNull();
    expect(resolveNote('miss', '   ', '[stale] old')).toBeNull();
  });

  it('trims a supplied note', () => {
    expect(resolveNote('miss', '  [stale] x  ', null)).toBe('[stale] x');
  });

  it('is null when there is nothing stored and nothing supplied', () => {
    expect(resolveNote('hit', undefined, null)).toBeNull();
    expect(resolveNote('miss', undefined, null)).toBeNull();
  });
});

describe('BriefingFeedbackService', () => {
  let service: BriefingFeedbackService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BriefingFeedbackService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BriefingFeedbackService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  /** Record a miss with a reason, as the dialog does, and settle its PUT. */
  async function recordMiss(note = '[stale] already handled'): Promise<void> {
    const pending = service.rate(1, 'priorities', 0, 'miss', note);
    httpMock.expectOne('/api/briefing/1/feedback').flush({});
    await pending;
  }

  it('sends no note on the PUT when a miss is changed to a hit', async () => {
    // Omitting `note` is what clears it server-side: putFeedback stores
    // `note ?? null` and the upsert overwrites on conflict.
    await recordMiss();

    const pending = service.rate(1, 'priorities', 0, 'hit');
    const req = httpMock.expectOne('/api/briefing/1/feedback');
    expect(req.request.body.verdict).toBe('hit');
    expect(req.request.body.note).toBeUndefined();
    req.flush({});
    await pending;

    expect(service.noteFor(1, 'priorities', 0)).toBeNull();
    expect(service.verdictFor(1, 'priorities', 0)).toBe('hit');
  });

  it('resends the stored note when a miss is re-saved without retyping', async () => {
    await recordMiss();

    const pending = service.rate(1, 'priorities', 0, 'miss');
    const req = httpMock.expectOne('/api/briefing/1/feedback');
    expect(req.request.body.note).toBe('[stale] already handled');
    req.flush({});
    await pending;
  });

  it('rolls the note back with the verdict when the PUT fails', async () => {
    // The optimistic paint must not leave a cleared note behind on a write
    // that never landed, or the UI would disagree with the server.
    await recordMiss();

    const pending = service.rate(1, 'priorities', 0, 'hit');
    httpMock.expectOne('/api/briefing/1/feedback').error(new ProgressEvent('network'));
    await pending;

    expect(service.verdictFor(1, 'priorities', 0)).toBe('miss');
    expect(service.noteFor(1, 'priorities', 0)).toBe('[stale] already handled');
  });

  it('paints the verdict before the PUT settles', async () => {
    // The whole point of the optimistic path: no waiting on the network.
    const pending = service.rate(1, 'insights', 1, 'hit');
    expect(service.verdictFor(1, 'insights', 1)).toBe('hit');

    httpMock.expectOne('/api/briefing/1/feedback').flush({});
    await pending;
  });
});
