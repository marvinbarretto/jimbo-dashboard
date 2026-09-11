import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProjectIdentitySection, type ProjectScale } from './project-identity-section';
import type { Project } from '@domain/projects';
import { EMPTY_PROJECT_BRIEF } from '@domain/projects';
import { projectId } from '@domain/ids';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: projectId('localshout'),
    display_name: 'LocalShout',
    description: 'Hyperlocal events',
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

function makeScale(overrides: Partial<ProjectScale> = {}): ProjectScale {
  return { items: 0, active: 0, done: 0, epics: 0, focusMinutes: 0, sessions: 0, focusWindowDays: 30, ...overrides };
}

describe('ProjectIdentitySection', () => {
  let fixture: ComponentFixture<ProjectIdentitySection>;
  let component: ProjectIdentitySection;

  async function setup(project: Project, scale: ProjectScale, hasStructuredBeliefs = false) {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ProjectIdentitySection],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(ProjectIdentitySection);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('project', project);
    fixture.componentRef.setInput('scale', scale);
    fixture.componentRef.setInput('hasStructuredBeliefs', hasStructuredBeliefs);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  // The six stat tiles that used to lead the page live in this one sentence.
  it('scale line carries all six former tile numbers with the focus window', async () => {
    await setup(makeProject(), makeScale({ items: 21, active: 14, done: 7, epics: 4, focusMinutes: 95, sessions: 6 }));
    expect(component.scaleLine()).toBe(
      '21 items linked, 14 active and 7 done, across 4 epics. 95m of focus across 6 sessions in the last 30 days.',
    );
  });

  // An unmeasured-looking zero must not read as an idle one: the window is
  // always stated, and "no items" is said rather than shown as 0.
  it('states absence rather than rendering zeros', async () => {
    await setup(makeProject(), makeScale());
    expect(component.scaleLine()).toBe(
      'No vault items linked to this project yet. No focus sessions in the last 30 days.',
    );
  });

  it('says so when a project has items but no epics', async () => {
    await setup(makeProject(), makeScale({ items: 3, active: 3, done: 0, sessions: 1, focusMinutes: 25 }));
    expect(component.scaleLine()).toBe(
      '3 items linked, 3 active and 0 done. No epics yet. 25m of focus across 1 session in the last 30 days.',
    );
  });

  it('singularises one item and one epic', async () => {
    await setup(makeProject(), makeScale({ items: 1, active: 1, epics: 1 }));
    expect(component.scaleLine()).toContain('1 item linked, 1 active and 0 done, across 1 epic.');
  });

  // current_state stores the belief markdown raw; showing it at full
  // prominence beside the rendered beliefs shows a store and its rendering.
  it('folds raw current_state away only when rendered beliefs exist', async () => {
    await setup(makeProject({ current_state: 'raw markdown' }), makeScale());
    expect(component.stateOpen()).toBe(true);

    await setup(makeProject({ current_state: 'raw markdown' }), makeScale(), true);
    expect(component.stateOpen()).toBe(false);
    component.toggleState();
    expect(component.stateOpen()).toBe(true);
  });

  it('only calls out a blocker that is actually set', async () => {
    await setup(makeProject({ current_blocker: '   ' }), makeScale());
    expect(component.hasBlocker()).toBe(false);

    await setup(makeProject({ current_blocker: 'Coverage is not good enough' }), makeScale());
    expect(component.hasBlocker()).toBe(true);
  });

  it('renders operating fields read-only once a manifest sync has stamped them', async () => {
    await setup(makeProject({ synced_at: '2025-06-01T00:00:00Z' }), makeScale());
    expect(component.isRepoSynced()).toBe(true);
  });

  // A zero count while the read is in flight is unknown, not empty. The page
  // asserted "No vault items linked" on a project with 170 of them, on every
  // load, until the rows arrived.
  it('does not claim an empty project while the vault read is outstanding', async () => {
    await setup(makeProject(), makeScale({ items: 0, active: 0, done: 0, epics: 0 }));

    // Settled and genuinely empty: the assertion is fair.
    expect(component.scaleLine()).toContain('No vault items linked');

    // Same zero, read still in flight: unknown, not empty.
    fixture.componentRef.setInput('scaleUnmeasured', true);
    await fixture.whenStable();
    expect(component.scaleLine()).toContain('Counting vault items…');
    expect(component.scaleLine()).not.toContain('No vault items linked');
  });

});
