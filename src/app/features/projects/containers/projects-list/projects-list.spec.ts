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
      // Wildcard route absorbs RouterLink validations — these specs don't
      // exercise routing, but the component template uses RouterLink and an
      // empty config makes the URL serializer throw NG04002.
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: '**', children: [] }]),
      ],
    })
      // The template instantiates <app-ui-data-table> which wraps tanstack-angular-table.
      // Tanstack reads its required `data` input at constructor time, before Angular
      // has bound the host's signal value, throwing NG0950. These tests assert via
      // direct method calls, not the DOM, so blank the template to sidestep the issue.
      .overrideComponent(ProjectsList, { set: { template: '' } })
      .compileComponents();

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
