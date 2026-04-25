import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ProjectsList } from './projects-list';
import { ProjectsService } from '../../data-access/projects.service';

describe('ProjectsList', () => {
  let component: ProjectsList;
  let service: ProjectsService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectsList],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();

    service = TestBed.inject(ProjectsService);
    const fixture = TestBed.createComponent(ProjectsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('calls service.remove when confirm accepted', () => {
    const spy = vi.spyOn(service, 'remove');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.remove('localshout');
    expect(spy).toHaveBeenCalledWith('localshout');
  });

  it('does not call service.remove when confirm cancelled — British conflict avoidance', () => {
    const spy = vi.spyOn(service, 'remove');
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.remove('localshout');
    expect(spy).not.toHaveBeenCalled();
  });
});
