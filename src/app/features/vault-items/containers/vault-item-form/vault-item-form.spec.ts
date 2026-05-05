import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { VaultItemForm } from './vault-item-form';
import type { AcceptanceCriterion } from '@domain/vault/vault-item';

// The interesting behaviour is the submit-boundary parsing, not Angular rendering.
// spyOn the service so we can intercept the parsed payload without needing a live API.
describe('VaultItemForm — submit boundary parsing', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [VaultItemForm],
      providers: [
        provideZonelessChangeDetection(),
        // submit() navigates to /vault-items[/seq]; wildcard route absorbs that
        // so the navigation promise resolves instead of rejecting with NG04002.
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const fixture = TestBed.createComponent(VaultItemForm);
    return { fixture, comp: fixture.componentInstance };
  }

  const baseFormValue = {
    title: 'Buy more biscuits',
    body: 'The tin is empty',
    type: 'task' as const,
    assigned_to: '',
    tags: '',
    acceptance_criteria: '',
    grooming_status: 'ungroomed' as const,
    // Disabled controls are still included in getRawValue() — null matches the new Priority integer type.
    ai_priority: null,
    manual_priority: null,
    ai_rationale: null,
    priority_confidence: null,
    actionability: null,
    parent_id: '',
    due_at: '',
    source_kind: '',
    source_ref: '',
    source_url: '',
  };

  it('splits comma-separated tags and trims whitespace at submit boundary', () => {
    const { comp } = setup();
    comp.form.setValue({ ...baseFormValue, tags: '  auth , bug,   v2  ' });

    let capturedTags: string[] | undefined;
    const service = (comp as unknown as { service: { create: (p: unknown) => void } }).service;
    vi.spyOn(service, 'create').mockImplementation((payload: unknown) => {
      capturedTags = (payload as { tags: string[] }).tags;
    });

    comp.submit();
    expect(capturedTags).toEqual(['auth', 'bug', 'v2']);
  });

  it('parses acceptance criteria from newline-delimited string, all done:false', () => {
    const { comp } = setup();
    comp.form.setValue({ ...baseFormValue, acceptance_criteria: 'It boils water\nIt whistles\n' });

    let capturedAC: AcceptanceCriterion[] | undefined;
    const service = (comp as unknown as { service: { create: (p: unknown) => void } }).service;
    vi.spyOn(service, 'create').mockImplementation((payload: unknown) => {
      capturedAC = (payload as { acceptance_criteria: AcceptanceCriterion[] }).acceptance_criteria;
    });

    comp.submit();
    expect(capturedAC).toEqual([
      { text: 'It boils water', done: false },
      { text: 'It whistles', done: false },
    ]);
  });
});
