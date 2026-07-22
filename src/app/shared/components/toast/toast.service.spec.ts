import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';

import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ToastService],
    });
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pushes a single toast with count 1', () => {
    service.success('Saved');
    const ts = service.toasts();
    expect(ts.length).toBe(1);
    expect(ts[0].message).toBe('Saved');
    expect(ts[0].count).toBe(1);
  });

  it('does not coalesce outside a group window', () => {
    service.success('Archived #1');
    service.success('Archived #2');
    expect(service.toasts().length).toBe(2);
  });

  it('coalesces toasts of the same tone within an active group', () => {
    service.beginCoalescing({
      groupKey: 'vault.bulk-archive',
      successSummary: 'Archived items',
    });
    service.success('Archived #1');
    service.success('Archived #2');
    service.success('Archived #3');

    const ts = service.toasts();
    expect(ts.length).toBe(1);
    expect(ts[0].count).toBe(3);
    // First message stays for count=1; on bump, summary replaces it.
    expect(ts[0].message).toBe('Archived items');
  });

  it('keeps the initial message on a group with no summary', () => {
    service.beginCoalescing({ groupKey: 'x' });
    service.success('First');
    service.success('Second');
    const ts = service.toasts();
    expect(ts.length).toBe(1);
    expect(ts[0].count).toBe(2);
    // No summary supplied — coalesce keeps the latest individual message.
    expect(ts[0].message).toBe('Second');
  });

  it('keeps error and success tones in separate rows within one group', () => {
    service.beginCoalescing({
      groupKey: 'mixed',
      successSummary: 'OK items',
      errorSummary: 'Failed items',
    });
    service.success('a');
    service.success('b');
    service.error('c');
    const ts = service.toasts();
    expect(ts.length).toBe(2);
    expect(ts.find(t => t.tone === 'success')?.count).toBe(2);
    expect(ts.find(t => t.tone === 'error')?.count).toBe(1);
  });

  it('stops coalescing once the window expires', () => {
    service.beginCoalescing({ groupKey: 'g', windowMs: 1000 });
    service.success('first');
    vi.advanceTimersByTime(1500);
    service.success('second');
    // The first toast hasn't been dismissed (3s default), so we expect two
    // independent rows now — the second arrived after the window lapsed.
    const ts = service.toasts();
    expect(ts.length).toBe(2);
  });

  it('endCoalescing immediately closes the window', () => {
    service.beginCoalescing({ groupKey: 'g' });
    service.success('first');
    service.endCoalescing();
    service.success('second');
    expect(service.toasts().length).toBe(2);
  });

  it('carries the action on an actionable toast', () => {
    const run = vi.fn();
    service.actionable('3 blocks unscheduled', { label: 'Undo', run });
    const [toast] = service.toasts();
    expect(toast.action?.label).toBe('Undo');
    toast.action?.run();
    expect(run).toHaveBeenCalledOnce();
  });

  it('never coalesces actionable toasts, so an action cannot stand for two operations', () => {
    const first = vi.fn();
    const second = vi.fn();
    service.beginCoalescing({ groupKey: 'planner.unschedule', successSummary: 'unscheduled' });
    service.actionable('a', { label: 'Undo', run: first }, { tone: 'success' });
    service.actionable('b', { label: 'Undo', run: second }, { tone: 'success' });
    const ts = service.toasts();
    expect(ts.length).toBe(2);
    expect(ts[0].action?.run).toBe(first);
    expect(ts[1].action?.run).toBe(second);
  });

  it('gives an actionable toast longer to be reached than a plain one', () => {
    service.actionable('undo me', { label: 'Undo', run: vi.fn() });
    vi.advanceTimersByTime(5000);
    expect(service.toasts().length).toBe(1);
    vi.advanceTimersByTime(3000);
    expect(service.toasts().length).toBe(0);
  });

  it('extends the dismiss timer on each bump', () => {
    service.beginCoalescing({ groupKey: 'g', successSummary: 's' });
    service.success('a', 1000);
    vi.advanceTimersByTime(800);
    service.success('b', 1000);
    // 800ms after first push, before bump the toast would dismiss at +1000.
    // After bump the timer resets — at +800 from bump (1600ms total) it must still exist.
    vi.advanceTimersByTime(800);
    expect(service.toasts().length).toBe(1);
    vi.advanceTimersByTime(300);
    expect(service.toasts().length).toBe(0);
  });
});
