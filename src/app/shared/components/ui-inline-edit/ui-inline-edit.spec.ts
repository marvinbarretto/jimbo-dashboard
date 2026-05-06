import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { UiInlineEdit } from './ui-inline-edit';

function build(initial: string) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
    imports: [UiInlineEdit],
  });
  const fixture = TestBed.createComponent(UiInlineEdit);
  fixture.componentRef.setInput('value', initial);
  fixture.detectChanges();
  const emitted: string[] = [];
  fixture.componentInstance.saved.subscribe(v => emitted.push(v));
  return { fixture, comp: fixture.componentInstance, emitted };
}

describe('UiInlineEdit', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('renders display mode by default with the bound value', () => {
    const { fixture } = build('Hello world');
    const button = fixture.nativeElement.querySelector('button.ui-inline-edit__display');
    expect(button).toBeTruthy();
    expect(button.textContent.trim()).toBe('Hello world');
  });

  it('shows placeholder text when value is empty', () => {
    const { fixture, comp } = build('');
    fixture.componentRef.setInput('placeholder', 'Add a title…');
    fixture.detectChanges();
    expect(comp['displayValue']()).toBe('');
    const button = fixture.nativeElement.querySelector('button.ui-inline-edit__display');
    expect(button.textContent.trim()).toBe('Add a title…');
    expect(button.classList).toContain('ui-inline-edit__display--placeholder');
  });

  it('flips to editing on startEdit and seeds draft from value', () => {
    const { comp } = build('initial');
    comp.startEdit();
    expect(comp['editing']()).toBe(true);
    expect(comp['draft']()).toBe('initial');
  });

  it('emits saved with the new draft on commit when changed', () => {
    const { comp, emitted } = build('initial');
    comp.startEdit();
    comp['draft'].set('changed');
    comp.commit();
    expect(emitted).toEqual(['changed']);
    expect(comp['editing']()).toBe(false);
  });

  it('does not emit when commit fires with unchanged draft', () => {
    const { comp, emitted } = build('initial');
    comp.startEdit();
    comp.commit();
    expect(emitted).toEqual([]);
  });

  it('cancels on Escape and reverts draft to bound value', () => {
    const { comp, emitted } = build('initial');
    comp.startEdit();
    comp['draft'].set('typed but escaped');
    comp.onKey(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(comp['editing']()).toBe(false);
    expect(emitted).toEqual([]);
    expect(comp['draft']()).toBe('initial');
  });

  it('commits on plain Enter for kind=text', () => {
    const { comp, emitted } = build('initial');
    comp.startEdit();
    comp['draft'].set('next');
    comp.onKey(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(emitted).toEqual(['next']);
  });

  it('keeps Enter as newline for textarea (no commit unless meta/ctrl)', () => {
    const { fixture, comp, emitted } = build('initial');
    fixture.componentRef.setInput('kind', 'textarea');
    fixture.detectChanges();
    comp.startEdit();
    comp['draft'].set('multi\nline');

    // Plain Enter — no commit, editing still on.
    comp.onKey(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(emitted).toEqual([]);
    expect(comp['editing']()).toBe(true);

    // Cmd/Ctrl+Enter commits.
    comp.onKey(new KeyboardEvent('keydown', { key: 'Enter', metaKey: true }));
    expect(emitted).toEqual(['multi\nline']);
  });

  it('cancels in-flight edit when bound value changes externally', () => {
    const { fixture, comp } = build('first');
    comp.startEdit();
    comp['draft'].set('typing');
    fixture.componentRef.setInput('value', 'changed by host');
    fixture.detectChanges();
    expect(comp['editing']()).toBe(false);
  });

  it('uses displayFor to map raw value to a display label', () => {
    const { fixture, comp } = build('hermes');
    fixture.componentRef.setInput('displayFor', (v: string) => v.toUpperCase());
    fixture.detectChanges();
    expect(comp['displayValue']()).toBe('HERMES');
  });
});
