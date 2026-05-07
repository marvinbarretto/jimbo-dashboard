import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ProjectFocusSessionRow } from './project-focus-session-row';
import type { FocusSession } from '@domain/focus-sessions';
import { focusSessionId, projectId } from '@domain/ids';

function makeSession(overrides: Partial<FocusSession> = {}): FocusSession {
  return {
    id: focusSessionId('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    project_id: projectId('localshout'),
    started_at: '2025-02-01T10:00:00Z',
    ended_at: '2025-02-01T10:25:00Z',
    planned_seconds: 1500,
    actual_seconds: 1500,
    status: 'completed',
    mood: null,
    interrupted: false,
    notes: null,
    tags: [],
    activity: null,
    created_at: '2025-02-01T10:00:00Z',
    ...overrides,
  };
}

describe('ProjectFocusSessionRow', () => {
  let fixture: ComponentFixture<ProjectFocusSessionRow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectFocusSessionRow],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(ProjectFocusSessionRow);
  });

  it('falls back to planned_seconds when actual is null', async () => {
    fixture.componentRef.setInput('session', makeSession({ actual_seconds: null, planned_seconds: 600 }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.minutes()).toBe(10);
    expect(fixture.componentInstance.overran()).toBe(0);
  });

  it('reports overrun when actual exceeds planned', async () => {
    fixture.componentRef.setInput('session', makeSession({ planned_seconds: 1500, actual_seconds: 1800 }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.minutes()).toBe(30);
    expect(fixture.componentInstance.overran()).toBe(5);
  });

  it('does not report overrun when finished early', async () => {
    fixture.componentRef.setInput('session', makeSession({ planned_seconds: 1500, actual_seconds: 1200 }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.overran()).toBe(0);
  });
});
