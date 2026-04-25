import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ProjectsService } from './data-access/projects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(ProjectsService);
  });

  it('creates', () => {
    expect(service).toBeTruthy();
  });

  it('projects() starts empty (no mock data — endpoint not yet live)', () => {
    expect(service.projects()).toEqual([]);
  });

  it('activeProjects() filters to status === active', () => {
    const active = service.activeProjects();
    expect(active.every(p => p.status === 'active')).toBe(true);
  });
});
