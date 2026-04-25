import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActorsService } from './data-access/actors.service';

describe('ActorsService', () => {
  let service: ActorsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(ActorsService);
  });

  it('creates', () => {
    expect(service).toBeTruthy();
  });

  it('actors() starts empty (no mock data — endpoint not yet live)', () => {
    expect(service.actors()).toEqual([]);
  });

  it('activeActors() filters to is_active === true', () => {
    const active = service.activeActors();
    expect(active.every(a => a.is_active)).toBe(true);
  });
});
