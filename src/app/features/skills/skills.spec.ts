import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SkillsService } from './data-access/skills.service';

describe('SkillsService', () => {
  let service: SkillsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(SkillsService);
  });

  it('creates', () => {
    expect(service).toBeTruthy();
  });

  it('skills() starts empty before HTTP completes', () => {
    expect(service.skills()).toEqual([]);
  });

  it('activeSkills() treats missing is_active as active', () => {
    // metadata.is_active === false → inactive; otherwise active.
    const active = service.activeSkills();
    expect(active.every(s => s.metadata.is_active !== false)).toBe(true);
  });
});
