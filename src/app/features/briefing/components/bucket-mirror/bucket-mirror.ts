import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

interface ProjectMinutes {
  project_id: string;
  minutes: number;
}

interface BucketMetric {
  label: string;
  value: number;
  unit: string;
}

interface BucketWeekly {
  key: string;
  label: string;
  kind: 'work' | 'life';
  minutes: number;
  hours: number;
  sessions: number;
  projects: ProjectMinutes[];
  metrics?: BucketMetric[];
  pending?: boolean;
}

interface WeeklyBucketsResponse {
  since: string;
  until: string;
  days: number;
  buckets: BucketWeekly[];
  unassigned: { minutes: number; projects: ProjectMinutes[] };
}

interface BucketRow extends BucketWeekly {
  pct: number;   // share of total measured work time
  barPct: number; // width relative to the busiest bucket
}

// The attention mirror: where Marvin's active time actually went this week,
// grouped into the agreed buckets (GET /api/buckets/weekly). Pure observability
// — no targets, no red/green judgement, just the split. Deliberately shows the
// drift (e.g. a LocalShout ship week that actually went to Jimbo). Life buckets
// render muted until their sources are wired server-side.
@Component({
  selector: 'app-bucket-mirror',
  imports: [],
  templateUrl: './bucket-mirror.html',
  styleUrl: './bucket-mirror.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BucketMirror {
  readonly days = input(7);

  private readonly resource = httpResource<WeeklyBucketsResponse>(() => ({
    url: `${environment.dashboardApiUrl}/api/buckets/weekly`,
    params: { days: this.days() },
  }));

  protected readonly loading = computed(() => this.resource.isLoading());
  protected readonly failed = computed(() => this.resource.error() !== undefined);

  protected readonly workRows = computed<BucketRow[]>(() => {
    const work = (this.resource.value()?.buckets ?? []).filter(b => b.kind === 'work');
    const total = work.reduce((n, b) => n + b.minutes, 0) || 1;
    const max = Math.max(1, ...work.map(b => b.minutes));
    return work.map(b => ({
      ...b,
      pct: Math.round((b.minutes / total) * 100),
      barPct: Math.round((b.minutes / max) * 100),
    }));
  });

  // Life buckets that have data — rendered as count chips, not bars.
  protected readonly lifeRows = computed(() =>
    (this.resource.value()?.buckets ?? []).filter(b => b.kind === 'life' && !b.pending));

  protected readonly pendingLabels = computed(() =>
    (this.resource.value()?.buckets ?? []).filter(b => b.pending).map(b => b.label));

  protected readonly totalHours = computed(() =>
    Math.round(this.workRows().reduce((n, b) => n + b.minutes, 0) / 6) / 10);

  protected readonly unassignedHours = computed(() => {
    const m = this.resource.value()?.unassigned.minutes ?? 0;
    return Math.round(m / 6) / 10;
  });
}
