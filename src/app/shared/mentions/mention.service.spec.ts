import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of, Subject } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MentionService } from './mention.service';
import type { MentionTrigger, MentionItem } from './mention-trigger';

// This app is zoneless — fakeAsync/tick rely on zone.js patching timers, so
// these tests wait on real timers instead (debounceTime is only 120ms).
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function makeItem(id: string): MentionItem {
  return { id, label: id, payload: { id } };
}

describe('MentionService', () => {
  let service: MentionService;
  let anchor: HTMLElement;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    service = TestBed.inject(MentionService);
    anchor = document.createElement('input');
    document.body.appendChild(anchor);
  });

  it('starts with no active mention and empty results', () => {
    expect(service.active()).toBeNull();
    expect(service.results()).toEqual([]);
  });

  it('debounces search calls — rapid updateQuery only searches once, for the latest query', async () => {
    const searchCalls: string[] = [];
    const trigger: MentionTrigger = {
      char: '@',
      search: (q) => { searchCalls.push(q); return of([makeItem(q)]); },
      onSelect: () => null,
    };

    service.open(trigger, '', anchor);
    service.updateQuery('m');
    service.updateQuery('ma');
    service.updateQuery('mar');
    await wait(200);

    // open()'s initial '' query and all three updateQuery calls happen
    // within the same 120ms debounce window (no await between them), so
    // they collapse into a single search for the last value — 'mar'.
    expect(searchCalls).toEqual(['mar']);
    expect(service.results()).toEqual([makeItem('mar')]);
  });

  it('cancels a slow in-flight search when a newer query supersedes it (switchMap)', async () => {
    const slow = new Subject<MentionItem[]>();
    let fastEmitted = false;
    const trigger: MentionTrigger = {
      char: '@',
      search: (q) => (q === 'slow' ? slow.asObservable() : of([makeItem('fast')]).pipe()),
      onSelect: () => null,
    };

    service.open(trigger, 'slow', anchor);
    await wait(200);
    service.updateQuery('fast');
    await wait(200);

    // The slow query's eventual emission should be ignored — switchMap
    // already unsubscribed it in favour of 'fast'.
    slow.next([makeItem('should-be-ignored')]);
    fastEmitted = service.results().some(r => r.id === 'fast');

    expect(fastEmitted).toBe(true);
    expect(service.results().some(r => r.id === 'should-be-ignored')).toBe(false);
  });

  it('sets loading while a search is in flight and clears it on resolve', async () => {
    const subject = new Subject<MentionItem[]>();
    const trigger: MentionTrigger = { char: '@', search: () => subject.asObservable(), onSelect: () => null };

    service.open(trigger, '', anchor);
    await wait(150);
    expect(service.loading()).toBe(true);

    subject.next([makeItem('a')]);
    expect(service.loading()).toBe(false);
  });

  it('resets results and selection on close', async () => {
    const trigger: MentionTrigger = { char: '@', search: () => of([makeItem('a'), makeItem('b')]), onSelect: () => null };
    service.open(trigger, '', anchor);
    await wait(150);
    expect(service.results().length).toBe(2);

    service.close();
    expect(service.active()).toBeNull();
    expect(service.results()).toEqual([]);
  });

  it('wraps selection with moveSelection in both directions', async () => {
    const trigger: MentionTrigger = { char: '@', search: () => of([makeItem('a'), makeItem('b'), makeItem('c')]), onSelect: () => null };
    service.open(trigger, '', anchor);
    await wait(150);

    expect(service.selectedIndex()).toBe(0);
    service.moveSelection(-1);
    expect(service.selectedIndex()).toBe(2); // wraps to last
    service.moveSelection(1);
    expect(service.selectedIndex()).toBe(0); // wraps back to first
  });

  it('commit() calls onSelect on the selected item, emits on commit$, and closes', async () => {
    const onSelect = vi.fn(() => '@resolved ');
    const trigger: MentionTrigger = { char: '@', search: () => of([makeItem('a')]), onSelect };
    const emitted: (string | null)[] = [];
    service.commit$.subscribe(({ insert }) => emitted.push(insert));

    service.open(trigger, '', anchor);
    await wait(150);
    service.commit();

    expect(onSelect).toHaveBeenCalledWith(makeItem('a'));
    expect(emitted).toEqual(['@resolved ']);
    expect(service.active()).toBeNull();
  });

  it('commit() with no results does nothing', async () => {
    const trigger: MentionTrigger = { char: '@', search: () => of([]), onSelect: () => null };
    const emitted: (string | null)[] = [];
    service.commit$.subscribe(({ insert }) => emitted.push(insert));

    service.open(trigger, '', anchor);
    await wait(150);
    service.commit();

    expect(emitted).toEqual([]);
  });

  it('a trigger.search that throws synchronously resolves to no results instead of breaking the pipeline', async () => {
    const trigger: MentionTrigger = {
      char: '@',
      search: () => { throw new Error('boom'); },
      onSelect: () => null,
    };
    service.open(trigger, '', anchor);
    await wait(150);
    expect(service.results()).toEqual([]);

    // Pipeline must still be alive for the next query.
    service.updateQuery('x');
    await wait(150);
  });
});
