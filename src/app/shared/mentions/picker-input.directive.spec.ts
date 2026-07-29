import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Subject } from 'rxjs';
import { describe, it, expect, beforeEach } from 'vitest';
import { PickerInputDirective } from './picker-input.directive';
import { MentionService } from './mention.service';
import type { MentionTrigger } from './mention-trigger';

class FakeMentionService {
  readonly openCalls: { trigger: MentionTrigger; query: string }[] = [];
  closeCalls = 0;
  readonly results = signal<never[]>([]);
  private readonly commitSubject = new Subject<{ insert: string | null }>();
  readonly commit$ = this.commitSubject.asObservable();

  open(trigger: MentionTrigger, query: string): void {
    this.openCalls.push({ trigger, query });
  }
  updateQuery(): void {}
  close(): void {
    this.closeCalls++;
  }
  moveSelection(): void {}
  commit(): void {}
}

const pickerTrigger: MentionTrigger = {
  char: '@',
  search: () => { throw new Error('not used in these tests'); },
  onSelect: () => null,
};

@Component({
  template: `<input [appPickerInput]="trigger()" />`,
  imports: [PickerInputDirective],
})
class HostComponent {
  readonly trigger = signal<MentionTrigger>(pickerTrigger);
}

describe('PickerInputDirective', () => {
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

  it('opens the picker on focus', () => {
    input.dispatchEvent(new Event('focus'));
    expect(service.openCalls).toEqual([{ trigger: pickerTrigger, query: '' }]);
  });

  it('does not close on destroy when never focused', () => {
    fixture.destroy();
    expect(service.closeCalls).toBe(0);
  });

  // Same bug class as MentionDirective: the host can be destroyed while the
  // picker is still active (e.g. its parent row removed before blur's
  // deferred 150ms close fires). Without ngOnDestroy, MentionService is left
  // thinking a mention is open forever.
  it('closes the active picker when the host element is destroyed while active', () => {
    input.dispatchEvent(new Event('focus'));
    expect(service.closeCalls).toBe(0);

    fixture.destroy();

    expect(service.closeCalls).toBe(1);
  });
});
