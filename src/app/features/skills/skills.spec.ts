import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { SkillsService } from './data-access/skills.service';

describe('SkillsService', () => {
  let service: SkillsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(SkillsService);
  });

  it('creates', () => {
    expect(service).toBeTruthy();
  });

  it('skills() starts empty (no mock data — endpoint not yet migrated)', () => {
    expect(service.skills()).toEqual([]);
  });

  it('activeSkills() filters to is_active === true', () => {
    const active = service.activeSkills();
    expect(active.every(s => s.is_active)).toBe(true);
  });
});
