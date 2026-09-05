import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { ApiDispatchesResponseSchema, type ApiDispatchEntry } from '@domain/dispatch/dispatch.api-schema';
import { runElapsed } from './run-elapsed';

// Every machine run against one vault item — grooming passes and commissions
// alike, newest first, with whatever the agent actually wrote.
//
// This exists because the run summaries had nowhere else to live. They used to
// render on the kanban card, which was the wrong surface twice over: the text
// is prose (it wrapped to eight lines at card width) and a board's job is to
// say where an item is, not to relay what an agent said about it. Taking them
// off the card left them unreachable in the UI entirely — this closes that.
//
// Self-contained like the journal sections: it fetches its own slice rather
// than reading DispatchService, whose store is the execution board's
// commission-only window and would report "no runs" for every grooming pass and
// for any commission older than the board's 100-row budget.
//
// It leads with the run's own words. There is deliberately no derived verdict
// pill: `status` is the agent PROCESS's exit code, and on 2026-09-05 seven runs
// sharing the single value `completed` covered one merged PR, one research
// deliverable, three refusals on missing prerequisites, one prompt that never
// substituted, and one run abandoned mid-task. Until a run can state its own
// outcome, the summary is the only honest thing to show — so it is shown in
// full, not truncated behind an expander.
@Component({
  selector: 'app-vault-item-runs-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, UiSection, UiEmptyState],
  templateUrl: './vault-item-runs-section.html',
  styleUrl: './vault-item-runs-section.scss',
})
export class VaultItemRunsSection {
  /** The vault note id (note_xxx), not the seq — the API keys runs by task_id. */
  readonly noteId = input.required<string>();

  // Keyed on noteId so navigating between items refetches (and aborts the
  // in-flight request), rather than leaving one item's history under another's
  // title. `limit=100` is the API's cap; `truncated` below owns saying so.
  private readonly runsRes = httpResource<unknown>(() => {
    const id = this.noteId();
    return id
      ? `${environment.dashboardApiUrl}/api/dispatch/queue?task_id=${encodeURIComponent(id)}&limit=100`
      : undefined;
  });

  protected readonly loading = computed(() => this.runsRes.isLoading());

  // A schema failure must not read as "never dispatched" — that is exactly the
  // ambiguity this whole feature exists to remove — so parse failure and
  // network failure are surfaced, not swallowed into an empty list.
  private readonly parsed = computed(() => {
    const raw = this.runsRes.value();
    if (raw === undefined) return null;
    const result = ApiDispatchesResponseSchema.safeParse(raw);
    if (!result.success) {
      console.error('[runs] /api/dispatch/queue response failed schema:', result.error.issues);
      return null;
    }
    return result.data;
  });

  protected readonly failed = computed(
    () => this.runsRes.error() !== undefined || (!this.loading() && this.parsed() === null),
  );

  protected readonly runs = computed<readonly ApiDispatchEntry[]>(() =>
    [...(this.parsed()?.items ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)),
  );

  protected readonly total = computed(() => this.parsed()?.total ?? 0);
  protected readonly truncated = computed(() => this.total() > this.runs().length);

  protected readonly meta = computed(() => {
    if (this.loading()) return null;
    if (this.failed()) return null;
    const n = this.total();
    return n === 1 ? '1 run' : `${n} runs`;
  });

  protected elapsed(run: ApiDispatchEntry): string | null {
    return runElapsed(run.started_at, run.completed_at);
  }

  /** Short sha of the SKILL.md that ran, so a run can be tied to a skill edit. */
  protected skillVersion(run: ApiDispatchEntry): string | null {
    return run.skill_version ? run.skill_version.slice(0, 7) : null;
  }
}
