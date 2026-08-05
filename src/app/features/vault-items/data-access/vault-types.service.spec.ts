import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VaultTypesService } from './vault-types.service';
import type { ApiVaultTypeSpec } from '@domain/vault/vault-type.api-schema';

// This service exists so the UI stops restating which vault types exist. The
// tests that matter are therefore about staying usable when the vocabulary
// can't be fetched, and about not silently promoting an unknown type to
// workable — an unfilterable or wrongly-workable type is how spike/decision/
// errand sat at zero rows in the first place.

function spec(overrides: Partial<ApiVaultTypeSpec> = {}): ApiVaultTypeSpec {
  return {
    type: 'task',
    label: 'Task',
    hint: 'Build work with a definable done.',
    actionable: true,
    needsAcceptanceCriteria: true,
    needsActionability: true,
    carriesPriority: true,
    ...overrides,
  };
}

describe('VaultTypesService', () => {
  let service: VaultTypesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [VaultTypesService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(VaultTypesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function flush(body: ApiVaultTypeSpec[]): void {
    httpMock.expectOne(r => r.url.endsWith('/api/vault/types')).flush(body);
  }

  it('serves the vocabulary the API returns', () => {
    flush([spec(), spec({ type: 'errand', label: 'Errand', actionable: true, needsAcceptanceCriteria: false })]);
    expect(service.specs().map(s => s.type)).toEqual(['task', 'errand']);
    expect(service.isLoading()).toBe(false);
  });

  it('splits workable types from reference material', () => {
    flush([
      spec({ type: 'spike', actionable: true }),
      spec({ type: 'note', actionable: false }),
    ]);
    expect(service.actionable().map(s => s.type)).toEqual(['spike']);
    expect(service.reference().map(s => s.type)).toEqual(['note']);
  });

  it('reports which types are gated on acceptance criteria', () => {
    flush([
      spec({ type: 'task', needsAcceptanceCriteria: true }),
      spec({ type: 'errand', needsAcceptanceCriteria: false }),
    ]);
    expect(service.needsAcceptanceCriteria('task')).toBe(true);
    expect(service.needsAcceptanceCriteria('errand')).toBe(false);
  });

  // vault_notes.type is free text server-side, so unknown values reach the UI.
  // They must not be treated as workable by default.
  it('treats an unknown type as not actionable', () => {
    flush([spec()]);
    expect(service.isActionable('wharrgarbl')).toBe(false);
    expect(service.isActionable(null)).toBe(false);
    expect(service.isActionable(undefined)).toBe(false);
  });

  it('falls back to the raw value when labelling an unknown type', () => {
    flush([spec()]);
    expect(service.label('task')).toBe('Task');
    expect(service.label('wharrgarbl')).toBe('wharrgarbl');
  });

  // An empty dropdown makes the create form unusable, which is worse than a
  // stale list — so a failed fetch keeps the built-in fallback.
  it('keeps a usable vocabulary when the request fails', () => {
    httpMock
      .expectOne(r => r.url.endsWith('/api/vault/types'))
      .error(new ProgressEvent('network error'));
    expect(service.specs().length).toBeGreaterThan(0);
    expect(service.isActionable('task')).toBe(true);
    expect(service.isLoading()).toBe(false);
  });

  it('keeps a usable vocabulary when the response is the wrong shape', () => {
    flush([{ type: 'task' } as unknown as ApiVaultTypeSpec]);
    expect(service.specs().length).toBeGreaterThan(0);
    expect(service.isActionable('task')).toBe(true);
  });

  it('defaults a create form to a workable type', () => {
    flush([spec({ type: 'note', actionable: false }), spec({ type: 'task', actionable: true })]);
    expect(service.defaultType()).toBe('task');
  });
});
