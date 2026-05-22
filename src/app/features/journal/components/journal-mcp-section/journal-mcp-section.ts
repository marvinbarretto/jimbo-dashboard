import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { catchError, of, switchMap, timer } from 'rxjs';
import {
  McpCallsService,
  type McpCallRollupRow,
} from '../../../hermes/data-access/mcp-calls.service';

@Component({
  selector: 'app-journal-mcp-section',
  imports: [
    UiBadge,
    UiEmptyState,
    UiLoadingState,
    UiSection,
    UiStack,
    UiStatCard,
    UiSubhead,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journal-mcp-section.html',
  styleUrl: './journal-mcp-section.scss',
})
export class JournalMcpSection {
  private readonly service = inject(McpCallsService);

  // YYYY-MM-DD UTC day window — MCP call ts uses NOW() (TIMESTAMPTZ),
  // matches the Hermes/agents-section convention.
  readonly date = input.required<string>();

  // Cheap query; refresh on the same 60s cadence as the agents section.
  private readonly result = toSignal(
    timer(0, 60_000).pipe(
      switchMap(() => this.service.rollup({
        since: `${this.date()}T00:00:00Z`,
        until: `${this.date()}T23:59:59.999Z`,
      }).pipe(catchError(() => of({ items: [] as McpCallRollupRow[] })))),
    ),
    { initialValue: null },
  );

  readonly loading = computed(() => this.result() === null);
  readonly items = computed<McpCallRollupRow[]>(() => this.result()?.items ?? []);

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

  // A tool fully clean today gets the muted "ok" badge; anything with at least
  // one error gets the warning tone with the count.
  badgeTone(row: McpCallRollupRow): 'success' | 'warning' {
    return row.error_count > 0 ? 'warning' : 'success';
  }

  badgeLabel(row: McpCallRollupRow): string {
    return row.error_count > 0 ? `${row.error_count} err` : 'ok';
  }
}
