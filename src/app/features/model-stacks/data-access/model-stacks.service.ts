// No-op shell — model_stacks table dropped in Phase A2 cleanup.

import { Injectable, signal, computed } from '@angular/core';
import type { ModelStack, CreateModelStackPayload, UpdateModelStackPayload } from '../utils/model-stack.types';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

@Injectable({ providedIn: 'root' })
export class ModelStacksService {
  private readonly _stacks = signal<ModelStack[]>(isSeedMode() ? [...SEED.model_stacks] : []);
  private readonly _loading = signal(false);

  readonly stacks = this._stacks.asReadonly();
  readonly activeStacks = computed(() => this._stacks().filter(s => s.is_active));
  readonly isLoading = this._loading.asReadonly();

  getById(id: string): ModelStack | undefined {
    return this._stacks().find(s => s.id === id);
  }

  create(_payload: CreateModelStackPayload): void {}
  update(_id: string, _patch: UpdateModelStackPayload): void {}
  remove(_id: string): void {}
}
