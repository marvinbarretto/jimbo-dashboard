import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ProjectAutonomySection } from './project-autonomy-section';
import type { Project, ProjectAutonomyLevel } from '@domain/projects';
import { EMPTY_PROJECT_BRIEF } from '@domain/projects';
import { projectId } from '@domain/ids';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: projectId('localshout'),
    display_name: 'LocalShout',
    description: null,
    status: 'active',
    kind: 'major',
    owner_actor_id: null,
    criteria: null,
    repo_url: null,
    color_token: null,
    short_code: null,
    created_at: '2025-01-01T00:00:00Z',
    synced_at: null,
    synced_commit: null,
    repos: null,
    ...EMPTY_PROJECT_BRIEF,
    ...overrides,
  };
}

describe('ProjectAutonomySection', () => {
  let fixture: ComponentFixture<ProjectAutonomySection>;
  let component: ProjectAutonomySection;

  async function setup(project: Project) {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ProjectAutonomySection],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(ProjectAutonomySection);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('project', project);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  // The control applies to any project — a travel project can still be
  // dispatched to — but agent policy should not be the third thing on the
  // page of a project no agent will ever touch.
  it('opens where there is a codebase and folds shut where there is not', async () => {
    await setup(makeProject({ repo_url: 'https://github.com/x/y' }));
    expect(component.expanded()).toBe(true);

    await setup(makeProject());
    expect(component.expanded()).toBe(false);
    component.toggle();
    expect(component.expanded()).toBe(true);
  });

  it('says in the header whether a policy is set at all', async () => {
    await setup(makeProject());
    expect(component.meta()).toBe('no policy set');

    await setup(makeProject({ autonomy_level: 'ship' }));
    expect(component.meta()).toBe('policy: ship');
  });

  it('emits null for the inherit option and the level for the rest', async () => {
    await setup(makeProject());
    const seen: (ProjectAutonomyLevel | null)[] = [];
    component.changed.subscribe(v => seen.push(v));
    component.select('');
    component.select('ship');
    expect(seen).toEqual([null, 'ship']);
  });

  it('locks the control when the manifest sync owns the field', async () => {
    await setup(makeProject({ synced_at: '2025-06-01T00:00:00Z' }));
    expect(component.isRepoSynced()).toBe(true);
  });
});
