import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatetimePipe } from '@shared/pipes/datetime.pipe';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';
import type { FocusSession } from '@domain/focus-sessions';

// Compact one-line presentation of a focus session. Renders the duration
// (planned vs actual) and status without pulling in the full pomo card.
@Component({
  selector: 'app-project-focus-session-row',
  imports: [DatetimePipe, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="project-focus-session-row">
      <span class="project-focus-session-row__when" [title]="session().started_at | datetime">
        {{ session().started_at | relativeTime }}
      </span>
      <span class="project-focus-session-row__duration">
        {{ minutes() }}m
        @if (overran()) {
          <span class="project-focus-session-row__overrun">(+{{ overran() }}m)</span>
        }
      </span>
      <span class="project-focus-session-row__status" [attr.data-status]="session().status">
        {{ session().status }}
      </span>
      @if (session().notes) {
        <span class="project-focus-session-row__notes">{{ session().notes }}</span>
      }
    </div>
  `,
  styles: [`
    .project-focus-session-row {
      display: grid;
      grid-template-columns: 8rem 5rem 6rem 1fr;
      align-items: center;
      gap: 0.6rem;
      padding: 0.5rem 0.75rem;
      font-size: 0.85rem;
      color: var(--color-text);
    }
    .project-focus-session-row__when,
    .project-focus-session-row__duration,
    .project-focus-session-row__notes {
      color: var(--color-text-muted);
    }
    .project-focus-session-row__notes {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .project-focus-session-row__overrun {
      color: var(--color-warning, #b25600);
      margin-left: 0.2rem;
    }
    .project-focus-session-row__status[data-status="completed"] { color: var(--color-success, #2e7d32); }
    .project-focus-session-row__status[data-status="abandoned"] { color: var(--color-text-muted); }
    .project-focus-session-row__status[data-status="running"]   { color: var(--color-accent, #1565c0); }
  `],
})
export class ProjectFocusSessionRow {
  readonly session = input.required<FocusSession>();

  readonly minutes = computed(() => {
    const s = this.session();
    const seconds = s.actual_seconds ?? s.planned_seconds;
    return Math.round(seconds / 60);
  });

  readonly overran = computed(() => {
    const s = this.session();
    if (s.actual_seconds == null) return 0;
    const diff = s.actual_seconds - s.planned_seconds;
    return diff > 0 ? Math.round(diff / 60) : 0;
  });
}
