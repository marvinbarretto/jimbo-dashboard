// No-op shell — the skills/prompts/tools/models DB tables were dropped in
// Phase A2 cleanup. Filesystem-backed editing lands in Phase B (M3 git editor).
// The page still mounts; consumers see an empty list.

import { Injectable, signal, computed } from '@angular/core';
import type { Skill, CreateSkillPayload, UpdateSkillPayload } from '@domain/skills';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

@Injectable({ providedIn: 'root' })
export class SkillsService {
  private readonly _skills = signal<Skill[]>(isSeedMode() ? [...SEED.skills] : []);
  private readonly _loading = signal(false);

  readonly skills = this._skills.asReadonly();
  readonly activeSkills = computed(() => this._skills().filter(s => s.is_active));
  readonly isLoading = this._loading.asReadonly();

  getById(id: string): Skill | undefined {
    return this._skills().find(s => s.id === id);
  }

  create(_payload: CreateSkillPayload): void {}
  update(_id: string, _patch: UpdateSkillPayload): void {}
  remove(_id: string): void {}
}
