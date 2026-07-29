import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { UiChecklist, type UiChecklistItem } from './ui-checklist';

function build(items: UiChecklistItem[], editable = true, checkable = true) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
    imports: [UiChecklist],
  });
  const fixture = TestBed.createComponent(UiChecklist);
  fixture.componentRef.setInput('items', items);
  fixture.componentRef.setInput('editable', editable);
  fixture.componentRef.setInput('checkable', checkable);
  fixture.detectChanges();

  const toggled: number[] = [];
  const edited: { index: number; text: string }[] = [];
  const removed: number[] = [];
  const appended: string[] = [];
  fixture.componentInstance.toggled.subscribe(i => toggled.push(i));
  fixture.componentInstance.edited.subscribe(e => edited.push(e));
  fixture.componentInstance.removed.subscribe(i => removed.push(i));
  fixture.componentInstance.appended.subscribe(t => appended.push(t));

  return { fixture, comp: fixture.componentInstance, toggled, edited, removed, appended };
}

describe('UiChecklist', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('renders a checkbox per item when checkable (default)', () => {
    const { fixture } = build([{ text: 'one', done: false }, { text: 'two', done: true }]);
    const boxes = fixture.nativeElement.querySelectorAll('input[type="checkbox"]');
    expect(boxes.length).toBe(2);
    expect(boxes[1].checked).toBe(true);
  });

  it('emits toggled with the row index on checkbox change', () => {
    const { fixture, toggled } = build([{ text: 'one', done: false }]);
    const box = fixture.nativeElement.querySelector('input[type="checkbox"]');
    box.dispatchEvent(new Event('change'));
    expect(toggled).toEqual([0]);
  });

  it('renders a plain bullet marker instead of a checkbox when checkable is false', () => {
    const { fixture } = build([{ text: 'one', done: false }], true, false);
    expect(fixture.nativeElement.querySelector('input[type="checkbox"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.ui-checklist__bullet')).toBeTruthy();
  });

  it('renders one UiInlineEdit per row when editable, showing the row text in display mode', () => {
    const { fixture } = build([{ text: 'one', done: false }, { text: 'two', done: false }]);
    const rows = fixture.nativeElement.querySelectorAll('app-ui-inline-edit button.ui-inline-edit__display');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent.trim()).toBe('one');
    expect(rows[1].textContent.trim()).toBe('two');
  });

  it('clicking a row focuses an input immediately — no second click needed', async () => {
    const { fixture } = build([{ text: 'one', done: false }]);
    const display = fixture.nativeElement.querySelector('app-ui-inline-edit button.ui-inline-edit__display');
    display.click();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('app-ui-inline-edit input.ui-inline-edit__field');
    expect(input).toBeTruthy();
    expect(input.value).toBe('one');

    // startEdit() focuses via queueMicrotask — flush it.
    await Promise.resolve();
    expect(document.activeElement).toBe(input);
  });

  it('emits edited with the trimmed text after a full click → type → blur cycle', async () => {
    const { fixture, edited } = build([{ text: 'one', done: false }]);
    fixture.nativeElement.querySelector('app-ui-inline-edit button.ui-inline-edit__display').click();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('app-ui-inline-edit input.ui-inline-edit__field');
    input.value = 'one (revised)  ';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(edited).toEqual([{ index: 0, text: 'one (revised)' }]);
  });

  it('emits removed instead of edited when the row is cleared to empty', async () => {
    const { fixture, edited, removed } = build([{ text: 'one', done: false }]);
    fixture.nativeElement.querySelector('app-ui-inline-edit button.ui-inline-edit__display').click();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('app-ui-inline-edit input.ui-inline-edit__field');
    input.value = '   ';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(edited).toEqual([]);
    expect(removed).toEqual([0]);
  });

  it('does not emit edited when blurring without changing the text', async () => {
    const { fixture, edited } = build([{ text: 'one', done: false }]);
    fixture.nativeElement.querySelector('app-ui-inline-edit button.ui-inline-edit__display').click();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('app-ui-inline-edit input.ui-inline-edit__field');
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(edited).toEqual([]);
  });

  it('routes onRowSaved directly: blank text emits removed, non-blank emits edited', () => {
    const { comp, edited, removed } = build([{ text: 'one', done: false }]);
    comp['onRowSaved'](0, '  ');
    expect(removed).toEqual([0]);
    expect(edited).toEqual([]);

    comp['onRowSaved'](0, ' changed ');
    expect(edited).toEqual([{ index: 0, text: 'changed' }]);
  });

  it('emits removed with the row index when the remove button is clicked', () => {
    const { fixture, removed } = build([{ text: 'one', done: false }, { text: 'two', done: false }]);
    const buttons = fixture.nativeElement.querySelectorAll('.ui-checklist__remove');
    buttons[1].click();
    expect(removed).toEqual([1]);
  });

  it('emits appended and clears the draft on Enter in the append input', () => {
    const { comp, appended } = build([{ text: 'one', done: false }]);
    comp['appendDraft'].set('a new item');
    comp['onAppendKey'](new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(appended).toEqual(['a new item']);
    expect(comp['appendDraft']()).toBe('');
  });

  it('does not emit appended for a whitespace-only draft', () => {
    const { comp, appended } = build([{ text: 'one', done: false }]);
    comp['appendDraft'].set('   ');
    comp['onAppendKey'](new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(appended).toEqual([]);
  });

  it('clears the append draft on Escape', () => {
    const { comp } = build([{ text: 'one', done: false }]);
    comp['appendDraft'].set('half-typed');
    comp['onAppendKey'](new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(comp['appendDraft']()).toBe('');
  });

  it('renders emptyMessage when there are no items', () => {
    const { fixture } = build([]);
    fixture.componentRef.setInput('emptyMessage', 'Nothing here.');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.ui-checklist__empty').textContent.trim()).toBe('Nothing here.');
  });

  it('does not render the append input when not editable', () => {
    const { fixture } = build([{ text: 'one', done: false }], false);
    expect(fixture.nativeElement.querySelector('.ui-checklist__append')).toBeNull();
  });
});
