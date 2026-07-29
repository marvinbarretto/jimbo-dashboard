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

  it('starts inline edit when the text is clicked while editable', () => {
    const { comp } = build([{ text: 'one', done: false }]);
    comp['onTextClick'](0);
    expect(comp['editingIndex']()).toBe(0);
    expect(comp['draft']()).toBe('one');
  });

  it('does not start edit when not editable', () => {
    const { comp } = build([{ text: 'one', done: false }], false);
    comp['onTextClick'](0);
    expect(comp['editingIndex']()).toBeNull();
  });

  it('commits the edited text on Enter and exits edit mode', () => {
    const { comp, edited } = build([{ text: 'one', done: false }]);
    comp['onTextClick'](0);
    comp['draft'].set('changed');
    comp['onDraftKey'](new KeyboardEvent('keydown', { key: 'Enter' }), 0);
    expect(edited).toEqual([{ index: 0, text: 'changed' }]);
    expect(comp['editingIndex']()).toBeNull();
  });

  it('commits on blur too, not just Enter', () => {
    const { comp, edited } = build([{ text: 'one', done: false }]);
    comp['onTextClick'](0);
    comp['draft'].set('changed via blur');
    comp['commitEdit'](0);
    expect(edited).toEqual([{ index: 0, text: 'changed via blur' }]);
  });

  it('does not emit edited when the committed text is unchanged', () => {
    const { comp, edited } = build([{ text: 'one', done: false }]);
    comp['onTextClick'](0);
    comp['commitEdit'](0);
    expect(edited).toEqual([]);
  });

  it('emits removed instead of edited when the edit is cleared to empty', () => {
    const { comp, edited, removed } = build([{ text: 'one', done: false }]);
    comp['onTextClick'](0);
    comp['draft'].set('   ');
    comp['commitEdit'](0);
    expect(edited).toEqual([]);
    expect(removed).toEqual([0]);
  });

  it('cancels on Escape without emitting, reverting the draft', () => {
    const { comp, edited } = build([{ text: 'one', done: false }]);
    comp['onTextClick'](0);
    comp['draft'].set('typed but escaped');
    comp['onDraftKey'](new KeyboardEvent('keydown', { key: 'Escape' }), 0);
    expect(comp['editingIndex']()).toBeNull();
    expect(edited).toEqual([]);
  });

  it('cancels any in-flight edit when the bound items array changes', () => {
    const { fixture, comp } = build([{ text: 'one', done: false }]);
    comp['onTextClick'](0);
    expect(comp['editingIndex']()).toBe(0);
    fixture.componentRef.setInput('items', [{ text: 'one', done: false }, { text: 'two', done: false }]);
    fixture.detectChanges();
    expect(comp['editingIndex']()).toBeNull();
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
