import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiBarChart } from '@shared/components/ui-bar-chart/ui-bar-chart';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { UiSubsection } from '@shared/components/ui-subsection/ui-subsection';
import { catchError, combineLatest, of, switchMap, timer } from 'rxjs';
import {
  McpCallsService,
  type McpCallRollupRow,
  type McpCallTailRow,
} from '../../../hermes/data-access/mcp-calls.service';

interface ErrorRow {
  ts: string;
  tool: string;
  message: string;
}

const HOUR_LABELS: readonly string[] = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, '0'),
);

@Component({
  selector: 'app-journal-mcp-section',
  imports: [
    UiBadge,
    UiBarChart,
    UiEmptyState,
    UiLoadingState,
    UiSection,
    UiStack,
    UiStatCard,
    UiSubhead,
    UiSubsection,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journal-mcp-section.html',
  styleUrl: './journal-mcp-section.scss',
})
export class JournalMcpSection {
  private readonly service = inject(McpCallsService);

  // YYYY-MM-DD UTC day window — MCP call ts uses NOW() (TIMESTAMPTZ),
  // matches the Hermes/agents-section convention. Hour buckets below are
  // also UTC so they line up with the same window.
  readonly date = input.required<string>();

  // Fetch rollup + tail for the same window. Rollup gives stats; tail gives
  // per-call detail needed for the hour chart and error spotlight. Refresh
  // every 60s, same cadence as the agents section.
  private readonly result = toSignal(
    timer(0, 60_000).pipe(
      switchMap(() => {
        const since = `${this.date()}T00:00:00Z`;
        const until = `${this.date()}T23:59:59.999Z`;
        return combineLatest({
          rollup: this.service.rollup({ since, until }).pipe(
            catchError(() => of({ items: [] as McpCallRollupRow[] })),
          ),
          // 1000 is the new server-side max — covers a very busy day. Falls
          // back to empty on error so the rollup view still renders.
          tail: this.service.tail({ limit: 1000, since, until }).pipe(
            catchError(() => of({ items: [] as McpCallTailRow[] })),
          ),
        });
      }),
    ),
    { initialValue: null },
  );

  readonly loading = computed(() => this.result() === null);
  readonly items = computed<McpCallRollupRow[]>(() => this.result()?.rollup.items ?? []);
  private readonly tail = computed<McpCallTailRow[]>(() => this.result()?.tail.items ?? []);

  readonly totalCalls = computed(() => this.items().reduce((s, r) => s + r.count, 0));
  readonly totalErrors = computed(() => this.items().reduce((s, r) => s + r.error_count, 0));

  // Calls-weighted avg across tools — gives a single "how fast was MCP today"
  // number rather than averaging averages (which over-weights low-volume tools).
  readonly avgDurationMs = computed(() => {
    const items = this.items();
    if (!items.length) return 0;
    const total = items.reduce((s, r) => s + r.count, 0);
    if (total === 0) return 0;
    const weighted = items.reduce((s, r) => s + r.avg_duration_ms * r.count, 0);
    return Math.round(weighted / total);
  });

  readonly worstP95Ms = computed(() => {
    const items = this.items();
    if (!items.length) return 0;
    return items.reduce((m, r) => Math.max(m, r.p95_duration_ms), 0);
  });

  readonly sectionMeta = computed(() => {
    const t = this.totalCalls();
    if (t === 0) return 'no calls';
    const errs = this.totalErrors();
    return errs > 0 ? `${t} calls · ${errs} failed` : `${t} calls`;
  });

  // Rows sorted by call volume so the busiest tools are visually anchored.
  readonly rows = computed(() => [...this.items()]);

  // 24 UTC-hour buckets matching the existing focus-by-hour pattern in
  // day-page.html. Lets cron rhythms (06:15 morning briefing, 04:00 nightly
  // pulse, etc.) jump out at a glance.
  readonly hourLabels = computed(() => HOUR_LABELS);
  readonly hourValues = computed(() => {
    const buckets = new Array<number>(24).fill(0);
    for (const r of this.tail()) {
      const hour = new Date(r.ts).getUTCHours();
      buckets[hour]! += 1;
    }
    return buckets;
  });

  // Conditional error spotlight — invisible on healthy days, instantly
  // visible (with the actual error message) when something breaks. No
  // truncation here; the SCSS clamps line length for readability.
  readonly errorRows = computed<ErrorRow[]>(() =>
    this.tail()
      .filter((r) => !r.success)
      .map((r) => ({
        ts: r.ts,
        tool: r.tool,
        message: r.error_message ?? '(no message)',
      })),
  );

  // A tool fully clean today gets the muted "ok" badge; anything with at least
  // one error gets the warning tone with the count.
  badgeTone(row: McpCallRollupRow): 'success' | 'warning' {
    return row.error_count > 0 ? 'warning' : 'success';
  }

  badgeLabel(row: McpCallRollupRow): string {
    return row.error_count > 0 ? `${row.error_count} err` : 'ok';
  }

  // Short UTC HH:MM for the error spotlight. Matches the rest of the page's
  // implied UTC framing (the section date itself is a UTC day key).
  formatTimeUtc(ts: string): string {
    const d = new Date(ts);
    return `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}Z`;
  }
}
