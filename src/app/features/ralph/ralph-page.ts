import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RalphService, type RalphRunRow } from './ralph.service';

interface RunViewModel extends RalphRunRow {
  durationSecs: number;
  hasErrors: boolean;
  summaryPairs: { key: string; value: string }[];
}

@Component({
  selector: 'app-ralph-page',
  imports: [DatePipe],
  templateUrl: './ralph-page.html',
  styleUrl: './ralph-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RalphPage {
  private readonly service = inject(RalphService);

  readonly runs = computed<RunViewModel[]>(() =>
    (this.service.runs() ?? []).map(r => this.toViewModel(r)),
  );

  readonly jobs = computed(() => {
    const seen = new Set<string>();
    const all = this.service.runs() ?? [];
    all.forEach(r => seen.add(r.job));
    return [...seen].sort();
  });

  readonly lastRunPerJob = computed(() => {
    const map = new Map<string, RunViewModel>();
    for (const run of this.runs()) {
      if (!map.has(run.job)) map.set(run.job, run);
    }
    return map;
  });

  private toViewModel(r: RalphRunRow): RunViewModel {
    const startMs = new Date(r.started_at).getTime();
    const endMs = new Date(r.finished_at).getTime();
    const durationSecs = Math.round((endMs - startMs) / 1000);

    const summaryPairs = Object.entries(r.summary)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => ({ key: k.replace(/_/g, ' '), value: String(v) }));

    const errorKeys = ['errors', 'failed', 'error'];
    const hasErrors = errorKeys.some(k => Number(r.summary[k]) > 0);

    return { ...r, durationSecs, hasErrors, summaryPairs };
  }
}
