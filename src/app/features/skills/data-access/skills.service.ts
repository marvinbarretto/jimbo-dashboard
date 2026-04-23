import { Injectable, signal, computed } from '@angular/core';
import type { Skill, CreateSkillPayload, UpdateSkillPayload } from '../utils/skill.types';

const MOCK_SKILLS: Skill[] = [
  {
    id: 'daily-briefing',
    display_name: 'Daily Briefing',
    description: 'Assemble a structured morning/afternoon briefing from jimbo-api signals, POST to the analysis API, deliver a short summary to Telegram',
    model_stack_id: 'writing-analysis',
    is_active: true,
    notes: null,
    created_at: '2026-04-23T00:00:00Z',
    updated_at: '2026-04-23T00:00:00Z',
  },
  {
    id: 'email-processor',
    display_name: 'Email Processor',
    description: 'Fetch Gmail, triage, score, and surface important emails to Telegram',
    model_stack_id: 'writing-analysis',
    is_active: true,
    notes: null,
    created_at: '2026-04-23T00:00:00Z',
    updated_at: '2026-04-23T00:00:00Z',
  },
  {
    id: 'vault-groomer',
    display_name: 'Vault Groomer',
    description: 'Triage vault inbox, classify notes, archive stale items, cross-reference related notes',
    model_stack_id: 'writing-analysis',
    is_active: true,
    notes: null,
    created_at: '2026-04-23T00:00:00Z',
    updated_at: '2026-04-23T00:00:00Z',
  },
  {
    id: 'blog-publisher',
    display_name: 'Blog Publisher',
    description: 'Write and publish blog posts to jimbo.pages.dev',
    model_stack_id: 'writing-analysis',
    is_active: true,
    notes: null,
    created_at: '2026-04-23T00:00:00Z',
    updated_at: '2026-04-23T00:00:00Z',
  },
  {
    id: 'distill-lessons',
    display_name: 'Distill Lessons',
    description: null,
    model_stack_id: 'code-reasoning',
    is_active: false,
    notes: 'Not yet stable — prompt needs work before activating',
    created_at: '2026-04-23T00:00:00Z',
    updated_at: '2026-04-23T00:00:00Z',
  },
];

@Injectable({ providedIn: 'root' })
export class SkillsService {
  private readonly _skills = signal<Skill[]>(MOCK_SKILLS);

  readonly skills = this._skills.asReadonly();
  readonly activeSkills = computed(() => this._skills().filter(s => s.is_active));

  getById(id: string): Skill | undefined {
    return this._skills().find(s => s.id === id);
  }

  create(payload: CreateSkillPayload): void {
    const now = new Date().toISOString();
    this._skills.update(skills => [...skills, { ...payload, created_at: now, updated_at: now }]);
  }

  update(id: string, patch: UpdateSkillPayload): void {
    const now = new Date().toISOString();
    this._skills.update(skills =>
      skills.map(s => s.id === id ? { ...s, ...patch, updated_at: now } : s)
    );
  }

  remove(id: string): void {
    this._skills.update(skills => skills.filter(s => s.id !== id));
  }
}
