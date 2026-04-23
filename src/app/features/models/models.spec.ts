import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ModelsService } from './models';
import type { CreateModelPayload } from './model';

describe('ModelsService', () => {
  let service: ModelsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(ModelsService);
  });

  it('creates', () => {
    expect(service).toBeTruthy();
  });

  describe('models()', () => {
    it('returns seeded mock data', () => {
      expect(service.models().length).toBeGreaterThan(0);
    });

    it('activeModels() filters inactive', () => {
      const all = service.models();
      const active = service.activeModels();
      expect(active.length).toBeLessThanOrEqual(all.length);
      expect(active.every(m => m.is_active)).toBe(true);
    });
  });

  describe('getById()', () => {
    it('finds existing model', () => {
      const model = service.getById('openai/gpt-5-nano');
      expect(model).toBeDefined();
      expect(model?.display_name).toBe('GPT-5 Nano');
    });

    it('returns undefined for unknown id', () => {
      expect(service.getById('unknown/model')).toBeUndefined();
    });
  });

  describe('create()', () => {
    it('adds model to list', () => {
      const before = service.models().length;
      const payload: CreateModelPayload = {
        id: 'meta/llama-3-8b',
        display_name: 'Llama 3 8B',
        provider: 'meta',
        tier: 'free',
        context_window: 8192,
        input_cost_per_mtok: 0,
        output_cost_per_mtok: 0,
        is_active: true,
        notes: null,
      };
      service.create(payload);
      expect(service.models().length).toBe(before + 1);
    });

    it('new model is retrievable by id', () => {
      service.create({
        id: 'test/model-x',
        display_name: 'Test Model X',
        provider: 'openai',
        tier: 'fast',
        context_window: null,
        input_cost_per_mtok: null,
        output_cost_per_mtok: null,
        is_active: true,
        notes: null,
      });
      expect(service.getById('test/model-x')).toBeDefined();
    });
  });

  describe('update()', () => {
    it('patches existing model', () => {
      service.update('openai/gpt-5-nano', { is_active: false, notes: 'disabled' });
      const updated = service.getById('openai/gpt-5-nano');
      expect(updated?.is_active).toBe(false);
      expect(updated?.notes).toBe('disabled');
    });

    it('does not affect other models', () => {
      const before = service.getById('google/gemini-2.5-flash');
      service.update('openai/gpt-5-nano', { tier: 'free' });
      expect(service.getById('google/gemini-2.5-flash')?.tier).toBe(before?.tier);
    });

    it('update does not change id', () => {
      service.update('openai/gpt-5-nano', { display_name: 'Renamed' });
      expect(service.getById('openai/gpt-5-nano')?.id).toBe('openai/gpt-5-nano');
    });
  });

  describe('remove()', () => {
    it('removes model from list', () => {
      const before = service.models().length;
      service.remove('openai/gpt-5-nano');
      expect(service.models().length).toBe(before - 1);
    });

    it('removed model is no longer findable', () => {
      service.remove('openai/gpt-5-nano');
      expect(service.getById('openai/gpt-5-nano')).toBeUndefined();
    });

    it('remove non-existent id is a no-op', () => {
      const before = service.models().length;
      service.remove('does/not-exist');
      expect(service.models().length).toBe(before);
    });
  });

  describe('stats()', () => {
    it('getStatsFor returns stats for known model', () => {
      const stats = service.getStatsFor('openai/gpt-5-nano');
      expect(stats).toBeDefined();
      expect(stats?.total_runs).toBeGreaterThan(0);
    });

    it('getStatsFor returns undefined for model with no runs', () => {
      expect(service.getStatsFor('anthropic/claude-sonnet-4-6')).toBeUndefined();
    });
  });
});
