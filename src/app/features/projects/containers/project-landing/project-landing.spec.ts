import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ProjectLanding } from './project-landing';
import { ProjectsService } from '../../data-access/projects.service';
import { VaultItemsService } from '../../../vault-items/data-access/vault-items.service';
import { VaultItemProjectsService } from '../../../vault-items/data-access/vault-item-projects.service';
import { FocusSessionsService } from '../../../pomo/data-access/focus-sessions.service';
import { ProjectActivityEventsService } from '../../data-access/project-activity-events.service';
import type { Project } from '@domain/projects';
import { EMPTY_PROJECT_BRIEF } from '@domain/projects';
import type { VaultItem } from '@domain/vault/vault-item';
import type { FocusSession } from '@domain/focus-sessions';
import { projectId, vaultItemId, focusSessionId } from '@domain/ids';

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
    color_token: '#7a8fc4',
    short_code: null,
    created_at: '2025-01-01T00:00:00Z',
    synced_at: null,
    synced_commit: null,
    repos: null,
    ...EMPTY_PROJECT_BRIEF,
    ...overrides,
  };
}

function makeItem(overrides: Partial<VaultItem> = {}): VaultItem {
  return {
    id: vaultItemId('11111111-1111-1111-1111-111111111111'),
    seq: 1,
    title: 'Set up DNS',
    body: '',
    type: 'task',
    category: null,
    assigned_to: null,
    tags: [],
    acceptance_criteria: [],
    grooming_status: 'classified',
    ai_priority: null,
    manual_priority: null,
    ai_rationale: null,
    priority_confidence: null,
    actionability: null,
    parent_id: null,
    is_epic: false,
    archived_at: null,
    due_at: null,
    completed_at: null,
    source: null,
    created_at: '2025-01-02T00:00:00Z',
    primary_project_id: 'localshout',
    ...overrides,
  };
}

function makeSession(overrides: Partial<FocusSession> = {}): FocusSession {
  return {
    id: focusSessionId('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    project_id: projectId('localshout'),
    started_at: '2025-02-01T10:00:00Z',
    ended_at: '2025-02-01T10:25:00Z',
    planned_seconds: 1500,
    actual_seconds: 1500,
    status: 'completed',
    mood: 1,
    interrupted: false,
    notes: 'Wrote the spec',
    tags: [],
    activity: null,
    created_at: '2025-02-01T10:00:00Z',
    ...overrides,
  };
}

class FakeProjectsService {
  private readonly _projects = [makeProject()];
  projects = () => this._projects;
  getById = (id: string) => this._projects.find(p => p.id === id);
}

class FakeVaultItemsService {
  private readonly _items = signal<VaultItem[]>([]);
  items = this._items.asReadonly();
  setItems(items: VaultItem[]) { this._items.set(items); }
}

class FakeJunctions {
  projectsFor() { return () => []; }
}

class FakeFocusSessions {
  private readonly _recent = signal<FocusSession[]>([]);
  recent = this._recent.asReadonly();
  loadRecent = vi.fn(() => Promise.resolve());
  setRecent(s: FocusSession[]) { this._recent.set(s); }
}

class FakeProjectActivity {
  eventsFor() { return () => []; }
  loadFor = vi.fn();
}

describe('ProjectLanding', () => {
  let component: ProjectLanding;
  let fixture: ComponentFixture<ProjectLanding>;
  let vault: FakeVaultItemsService;
  let sessions: FakeFocusSessions;

  async function setup(id: string) {
    vault = new FakeVaultItemsService();
    sessions = new FakeFocusSessions();

    await TestBed.configureTestingModule({
      imports: [ProjectLanding],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          // `withVaultDetailModal` (used by ProjectLanding) reads
          // `route.queryParamMap` — mock both maps so the test bed doesn't
          // explode on construction.
          provide: ActivatedRoute,
          useValue: {
            paramMap:      of(new Map([['id', id]])),
            queryParamMap: of({ get: () => null }),
          },
        },
        { provide: ProjectsService, useClass: FakeProjectsService },
        { provide: VaultItemsService, useValue: vault },
        { provide: VaultItemProjectsService, useClass: FakeJunctions },
        { provide: FocusSessionsService, useValue: sessions },
        { provide: ProjectActivityEventsService, useClass: FakeProjectActivity },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectLanding);
    component = fixture.componentInstance;

    // ProjectLanding issues httpResource() reads on init (understanding /
    // dispatch / activity) that the fakes don't serve. Flush them so
    // whenStable() doesn't hang on perpetually-pending requests.
    const httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.match(() => true).forEach((req) => req.flush(null));

    await fixture.whenStable();
  }

  it('creates', async () => {
    await setup('localshout');
    expect(component).toBeTruthy();
  });

  it('project is undefined for unknown id', async () => {
    await setup('does-not-exist');
    expect(component.project()).toBeUndefined();
  });

  it('items() picks up rows whose primary_project_id matches', async () => {
    await setup('localshout');
    vault.setItems([
      makeItem({ id: vaultItemId('22222222-2222-2222-2222-222222222222'), seq: 2, primary_project_id: 'localshout' }),
      makeItem({ id: vaultItemId('33333333-3333-3333-3333-333333333333'), seq: 3, primary_project_id: 'other' }),
    ]);
    expect(component.items().map(i => i.seq)).toEqual([2]);
  });

  it('active vs done counts split by lifecycle', async () => {
    await setup('localshout');
    vault.setItems([
      makeItem({ id: vaultItemId('11111111-1111-1111-1111-111111111111'), seq: 1 }),
      makeItem({ id: vaultItemId('22222222-2222-2222-2222-222222222222'), seq: 2, completed_at: '2025-01-05T00:00:00Z' }),
    ]);
    expect(component.activeItems().length).toBe(1);
    expect(component.doneItems().length).toBe(1);
  });

  it('focusMinutes() sums session minutes for the project only', async () => {
    await setup('localshout');
    sessions.setRecent([
      makeSession({ id: focusSessionId('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), actual_seconds: 1800 }),
      makeSession({ id: focusSessionId('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), project_id: projectId('other'), actual_seconds: 9999 }),
    ]);
    expect(component.focusMinutes()).toBe(30);
    expect(component.sessionsForProject().length).toBe(1);
  });

  it('triggers loadRecent on construction', async () => {
    await setup('localshout');
    expect(sessions.loadRecent).toHaveBeenCalled();
  });
});
