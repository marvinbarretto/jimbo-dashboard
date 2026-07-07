import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { ModuleDocsService } from './module-docs.service';
import type { ModuleDoc, ModuleDocListResponse } from './module-doc';

const LIST_RESPONSE: ModuleDocListResponse = {
  head: 'abc1234',
  items: [
    {
      module: 'vault',
      repo: 'jimbo-api',
      description: 'Vault notes CRUD.',
      generated_at: '2026-07-01',
      sections: { purpose: 'asserted', 'public-api': 'derived' },
      source_paths: ['src/routes/vault.ts'],
      staleness: {
        status: 'stale',
        reviewed_commit: 'dead123',
        commits_behind: 2,
        commits: ['aaa1111 feat: one', 'bbb2222 fix: two'],
        changed_files: ['src/routes/vault.ts'],
      },
    },
  ],
};

describe('ModuleDocsService', () => {
  let service: ModuleDocsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ModuleDocsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads the index on construction and exposes head + items', () => {
    expect(service.isLoading()).toBe(true);

    httpMock.expectOne('/api/modules').flush(LIST_RESPONSE);

    expect(service.isLoading()).toBe(false);
    expect(service.head()).toBe('abc1234');
    expect(service.modules()).toHaveLength(1);
    // Staleness must pass through untouched — the badge renders straight off it.
    expect(service.modules()[0].staleness.status).toBe('stale');
    expect(service.modules()[0].staleness.commits_behind).toBe(2);
  });

  it('records an error when the index fails', () => {
    httpMock.expectOne('/api/modules').flush('boom', { status: 500, statusText: 'Server Error' });

    expect(service.isLoading()).toBe(false);
    expect(service.error()).toBeTruthy();
    expect(service.modules()).toEqual([]);
  });

  it('getDoc fetches the detail with body', () => {
    httpMock.expectOne('/api/modules').flush(LIST_RESPONSE);

    let doc: ModuleDoc | undefined;
    service.getDoc('vault').subscribe(d => { doc = d; });

    httpMock.expectOne('/api/modules/vault').flush({
      ...LIST_RESPONSE.items[0],
      body: '# vault\n\nSome markdown.',
    });

    expect(doc?.module).toBe('vault');
    expect(doc?.body).toContain('Some markdown.');
  });
});
