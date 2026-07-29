import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectBriefBulletField } from './project-brief-bullet-field';

function build(value: string | null) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
    imports: [ProjectBriefBulletField],
  });
  const fixture = TestBed.createComponent(ProjectBriefBulletField);
  fixture.componentRef.setInput('label', 'Success criteria');
  fixture.componentRef.setInput('value', value);
  fixture.detectChanges();

  const saved: (string | null)[] = [];
  fixture.componentInstance.saved.subscribe(v => saved.push(v));

  return { fixture, comp: fixture.componentInstance, saved };
}

describe('ProjectBriefBulletField', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('parses a markdown bullet string into rows', () => {
    const { comp } = build('- one\n- two\n- three');
    expect(comp['items']().map(i => i.text)).toEqual(['one', 'two', 'three']);
  });

  it('treats a single unmarked paragraph as one row', () => {
    const { comp } = build('One long sentence with no bullets.');
    expect(comp['items']()).toEqual([{ text: 'One long sentence with no bullets.', done: false }]);
  });

  it('renders nothing to parse for a null value', () => {
    const { comp } = build(null);
    expect(comp['items']()).toEqual([]);
  });

  it('emits saved with the row replaced and re-serialized on edit', () => {
    const { comp, saved } = build('- one\n- two');
    comp['onEdited']({ index: 0, text: 'one (revised)' });
    expect(saved).toEqual(['- one (revised)\n- two']);
  });

  it('emits saved with the row dropped and re-serialized on remove', () => {
    const { comp, saved } = build('- one\n- two\n- three');
    comp['onRemoved'](1);
    expect(saved).toEqual(['- one\n- three']);
  });

  it('emits null when removing the last remaining row', () => {
    const { comp, saved } = build('- only one');
    comp['onRemoved'](0);
    expect(saved).toEqual([null]);
  });

  it('emits saved with the new row appended', () => {
    const { comp, saved } = build('- one');
    comp['onAppended']('two');
    expect(saved).toEqual(['- one\n- two']);
  });

  it('appends to an empty/null field', () => {
    const { comp, saved } = build(null);
    comp['onAppended']('first point');
    expect(saved).toEqual(['- first point']);
  });
});
