import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resetSeedModeCache } from '@shared/seed-mode';

import { VaultItemProjectsService } from './vault-item-projects.service';
import { ToastService } from '@shared/components/toast/toast.service';
import { environment } from '../../../../environments/environment';
import { projectId, vaultItemId } from '@domain/ids';

// Non-seed mode so add() actually POSTs. The constructor's bulk loadAll() GET is
// flushed first in each test so only the add() POST remains to assert on.
describe('VaultItemProjectsService.add — is_primary on first link (C2)', () => {
  let service: VaultItemProjectsService;
  let http: HttpTestingController;
  const url = `${environment.dashboardApiUrl}/api/vault-item-projects`;
  const item = vaultItemId('note_test');

  beforeEach(() => {
    window.history.replaceState({}, '', window.location.pathname);
    resetSeedModeCache();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        VaultItemProjectsService,
        { provide: ToastService, useValue: { error: () => {}, success: () => {} } },
      ],
    });
    service = TestBed.inject(VaultItemProjectsService);
    http = TestBed.inject(HttpTestingController);
    // Constructor fires the bulk junction load — answer it with an empty set.
    http.expectOne(url).flush([]);
  });

  afterEach(() => {
    http.verify();
    resetSeedModeCache();
  });

  it('marks the first project linked to an item as primary', () => {
    service.add(item, projectId('jimbo'));
    const req = http.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({ vault_item_id: item, project_id: 'jimbo', is_primary: true });
    req.flush({ vault_item_id: item, project_id: 'jimbo' });
  });

  it('keeps subsequent links secondary (does not steal primary)', () => {
    service.add(item, projectId('jimbo'));
    http.expectOne(url).flush({ vault_item_id: item, project_id: 'jimbo' });

    service.add(item, projectId('collectr'));
    const req = http.expectOne(url);
    expect(req.request.body).toMatchObject({ project_id: 'collectr', is_primary: false });
    req.flush({ vault_item_id: item, project_id: 'collectr' });
  });
});
