// No-op shell — tools table dropped in Phase A2 cleanup.
// Phase B will replace this with filesystem-backed editing.

import { Injectable, signal, computed } from '@angular/core';
import { Observable, of } from 'rxjs';
import type { Tool, ToolVersion, CreateToolPayload, UpdateToolPayload, CreateToolVersionPayload } from '../utils/tool.types';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

@Injectable({ providedIn: 'root' })
export class ToolsService {
  private readonly _tools = signal<Tool[]>(isSeedMode() ? [...SEED.tools] : []);
  private readonly _loading = signal(false);

  readonly tools = this._tools.asReadonly();
  readonly activeTools = computed(() => this._tools().filter(t => t.is_active));
  readonly isLoading = this._loading.asReadonly();

  getById(id: string): Tool | undefined {
    return this._tools().find(t => t.id === id);
  }

  loadVersions(_toolId: string): Observable<ToolVersion[]> {
    return of([]);
  }

  create(_payload: CreateToolPayload): void {}
  update(_id: string, _patch: UpdateToolPayload): void {}
  remove(_id: string): void {}
  createVersion(_payload: CreateToolVersionPayload, _autoPromote = true): Observable<ToolVersion> {
    return of(null as unknown as ToolVersion);
  }
  promoteVersion(_toolId: string, _versionId: string): void {}
}
