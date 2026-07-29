import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Subject } from 'rxjs';
import { describe, it, expect, beforeEach } from 'vitest';
import { MentionDirective } from './mention.directive';
import { MentionService } from './mention.service';
import type { MentionTrigger } from './mention-trigger';

class FakeMentionService {
  readonly openCalls: { trigger: MentionTrigger; query: string }[] = [];
  readonly updateQueryCalls: string[] = [];
  closeCalls = 0;
  readonly results = signal<never[]>([]);
  private readonly commitSubject = new Subject<{ insert: string | null }>();
  readonly commit$ = this.commitSubject.asObservable();

  open(trigger: MentionTrigger, query: string): void {
    this.openCalls.push({ trigger, query });
  }
  updateQuery(q: string): void {
    this.updateQueryCalls.push(q);
  }
  close(): void {
    this.closeCalls++;
  }
  moveSelection(): void {}
  commit(): void {}
}

const atTrigger: MentionTrigger = {
  char: '@',
  search: () => { throw new Error('not used in these tests'); },
  onSelect: () => null,
};

@Component({
  template: `<input [appMention]="triggers()" />`,
  imports: [MentionDirective],
})
class HostComponent {
  readonly triggers = signal<MentionTrigger[]>([atTrigger]);
}

function typeInto(input: HTMLInputElement, value: string, cursor?: number): void {
  input.value = value;
  input.selectionStart = input.selectionEnd = cursor ?? value.length;
  input.dispatchEvent(new Event('input'));
}

describe('MentionDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let input: HTMLInputElement;
  let service: FakeMentionService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: MentionService, useClass: FakeMentionService }],
      imports: [HostComponent],
    });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('input');
    service = TestBed.inject(MentionService) as unknown as FakeMentionService;
  });

  it('opens on the trigger char typed at the start of the field', () => {
    typeInto(input, '@');
    expect(service.openCalls).toEqual([{ trigger: atTrigger, query: '' }]);
  });

  it('opens after whitespace but not mid-word (avoids emails/hashtags)', () => {
    typeInto(input, 'foo@');
    expect(service.openCalls).toEqual([]);

    typeInto(input, 'foo @');
    expect(service.openCalls).toEqual([{ trigger: atTrigger, query: '' }]);
  });

  it('forwards the growing query while active', () => {
    typeInto(input, '@');
    typeInto(input, '@ma');
    expect(service.updateQueryCalls).toEqual(['ma']);
  });

  it('deactivates (closes) when whitespace ends the query', () => {
    typeInto(input, '@');
    typeInto(input, '@ma');
    typeInto(input, '@ma ');
    expect(service.closeCalls).toBe(1);
  });

  it('deactivates on Escape', () => {
    typeInto(input, '@');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(service.closeCalls).toBe(1);
  });

  it('does not close on destroy when no mention was ever active', () => {
    fixture.destroy();
    expect(service.closeCalls).toBe(0);
  });

  // The actual bug: a click-to-edit field (UiInlineEdit) can destroy its
  // input while a mention is still open (commit-on-blur, no Escape first).
  // Before the ngOnDestroy fix, MentionService was left thinking a mention
  // was active — its CDK overlay stayed attached to the now-detached input
  // forever, and could never open again for any field on the page.
  it('closes the active mention when the host element is destroyed mid-mention', () => {
    typeInto(input, '@');
    typeInto(input, '@ma');
    expect(service.closeCalls).toBe(0);

    fixture.destroy();

    expect(service.closeCalls).toBe(1);
  });
});
