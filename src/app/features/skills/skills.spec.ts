import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { SkillsService } from './data-access/skills.service';
import type { CreateSkillPayload } from './utils/skill.types';

describe('SkillsService', () => {
  let service: SkillsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(SkillsService);
  });

  describe('skills()', () => {
    it('returns seeded mock data', () => {
      expect(service.skills().length).toBeGreaterThan(0);
    });

    it('activeSkills() filters inactive', () => {
      const all = service.skills();
      const active = service.activeSkills();
      expect(active.length).toBeLessThanOrEqual(all.length);
      expect(active.every(s => s.is_active)).toBe(true);
    });
  });

  describe('getById()', () => {
    it('finds existing skill', () => {
      const skill = service.getById('daily-briefing');
      expect(skill).toBeDefined();
      expect(skill?.display_name).toBe('Daily Briefing');
    });

    it('returns undefined for unknown id — vanished without a trace', () => {
      expect(service.getById('not-a-real-skill')).toBeUndefined();
    });
  });

  describe('create()', () => {
    it('adds skill to list', () => {
      const before = service.skills().length;
      const payload: CreateSkillPayload = {
        id: 'test-skill',
        display_name: 'Test Skill',
        description: null,
        model_stack_id: null,
        is_active: true,
        notes: null,
      };
      service.create(payload);
      expect(service.skills().length).toBe(before + 1);
    });

    it('new skill is retrievable by id', () => {
      service.create({
        id: 'another-skill',
        display_name: 'Another Skill',
        description: null,
        model_stack_id: null,
        is_active: true,
        notes: null,
      });
      expect(service.getById('another-skill')).toBeDefined();
    });
  });

  describe('update()', () => {
    it('patches existing skill', () => {
      service.update('daily-briefing', { is_active: false, notes: 'temporarily disabled' });
      const updated = service.getById('daily-briefing');
      expect(updated?.is_active).toBe(false);
      expect(updated?.notes).toBe('temporarily disabled');
    });

    it('does not affect other skills', () => {
      const before = service.getById('email-processor');
      service.update('daily-briefing', { model_stack_id: 'budget' });
      expect(service.getById('email-processor')?.model_stack_id).toBe(before?.model_stack_id);
    });
  });

  describe('remove()', () => {
    it('removes skill from list', () => {
      const before = service.skills().length;
      service.remove('daily-briefing');
      expect(service.skills().length).toBe(before - 1);
    });

    it('removed skill is no longer findable', () => {
      service.remove('daily-briefing');
      expect(service.getById('daily-briefing')).toBeUndefined();
    });

    it('remove non-existent id is a no-op', () => {
      const before = service.skills().length;
      service.remove('does-not-exist');
      expect(service.skills().length).toBe(before);
    });
  });
});
