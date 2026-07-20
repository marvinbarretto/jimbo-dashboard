import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiBarChart } from '@shared/components/ui-bar-chart/ui-bar-chart';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { UiSubsection } from '@shared/components/ui-subsection/ui-subsection';
import { catchError, combineLatest, of, startWith, switchMap, timer } from 'rxjs';
import { dayWindowIso } from '@shared/utils/date-keys';
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

interface CallRow {
  ts: string;
  time: string;
  tool: string;
  duration_ms: number;
  success: boolean;
  argsSummary: string;
  error: string | null;
}

const HOUR_LABELS: readonly string[] = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, '0'),
);

// Cap the visible per-call list. The tail itself fetches up to 1000 rows;
// the rollup and hour chart still aggregate over all of them, but rendering
// 1000 list items would be visual noise. 100 covers most days comfortably
// — busy spike days get a "+N more" footer.
const MAX_CALL_ROWS = 100;

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

  // YYYY-MM-DD, windowed as a LOCAL calendar day (dayWindowIso) — matching the
  // rest of the journal page. Hour buckets below are local for the same reason.
  readonly date = input.required<string>();

  // Fetch rollup + tail for the same window. Rollup gives stats; tail gives
  // per-call detail needed for the hour chart and error spotlight. Rekeyed on
  // the date input (immediate refetch + cancel on navigation), refreshed every
  // 60s; startWith(null) restores the loading state while a new day loads.
  private readonly result = toSignal(
    toObservable(this.date).pipe(
      switchMap((date) => timer(0, 60_000).pipe(
        switchMap(() => {
          const { since, until } = dayWindowIso(date);
          return combineLatest({
            rollup: this.service.rollup({ since, until }).pipe(
              catchError(() => of({ items: [] as McpCallRollupRow[] })),
            ),
            // 1000 is the server-side max — covers a very busy day. Falls
            // back to empty on error so the rollup view still renders.
            tail: this.service.tail({ limit: 1000, since, until }).pipe(
              catchError(() => of({ items: [] as McpCallTailRow[] })),
            ),
          });
        }),
        startWith(null),
      )),
    ),
    { initialValue: null },
  );

  readonly loading = computed(() => this.result() === null);
  readonly items = computed<McpCallRollupRow[]>(() => this.result()?.rollup.items ?? []);
  private readonly tail = computed<McpCallTailRow[]>(() => this.result()?.tail.items ?? []);

  readonly totalCalls = computed(() => this.items().reduce((s, r) => s + r.count, 0));

  // Collapse once we know the day had no MCP traffic; stay open while loading.
  readonly open = linkedSignal(() => this.loading() || this.totalCalls() > 0);
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

  // 24 local-hour buckets matching the existing focus-by-hour pattern in
  // day-page.html. Lets cron rhythms (06:15 morning briefing, 04:00 nightly
  // pulse, etc.) jump out at a glance.
  readonly hourLabels = computed(() => HOUR_LABELS);
  readonly hourValues = computed(() => {
    const buckets = new Array<number>(24).fill(0);
    for (const r of this.tail()) {
      const hour = new Date(r.ts).getHours();
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

  // Short local HH:MM for the error spotlight — same clock as the page.
  formatTime(ts: string): string {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  // Per-call rows for the "Recent calls" table. Newest-first (tail already
  // is). We cap at MAX_CALL_ROWS for rendering and surface "+N more" so
  // busy days don't fill the whole viewport. The args column shows a
  // compact one-line summary (id="...", limit=5, etc.); rows pre-args
  // migration get "—".
  readonly recentCalls = computed<CallRow[]>(() =>
    this.tail()
      .slice(0, MAX_CALL_ROWS)
      .map((r) => ({
        ts: r.ts,
        time: formatTimeFull(r.ts),
        tool: r.tool,
        duration_ms: r.duration_ms,
        success: r.success,
        argsSummary: summariseArgs(r.args),
        error: r.success ? null : (r.error_message ?? '(no message)'),
      })),
  );

  readonly hiddenCallCount = computed(() => Math.max(0, this.tail().length - MAX_CALL_ROWS));
}

function formatTimeFull(ts: string): string {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

// Compact one-line summary of a jsonb args object. Designed to be dense
// enough to fit on one row next to tool name + duration. Strings are
// quoted + truncated; nested objects/arrays render as their JSON form
// capped at 30 chars. Empty object → "(none)". Pre-migration null → "—".
function summariseArgs(args: Record<string, unknown> | null): string {
  if (args === null || args === undefined) return '—';
  const entries = Object.entries(args);
  if (entries.length === 0) return '(none)';

  const parts = entries.map(([k, v]) => `${k}=${formatArgValue(v)}`);
  const joined = parts.join(', ');
  return joined.length > 100 ? joined.slice(0, 97) + '…' : joined;
}

function formatArgValue(v: unknown): string {
  if (v === null) return 'null';
  if (typeof v === 'string') {
    const truncated = v.length > 40 ? v.slice(0, 37) + '…' : v;
    return `"${truncated}"`;
  }
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  // Objects / arrays — render as compact JSON, truncate aggressively.
  const json = JSON.stringify(v);
  return json.length > 30 ? json.slice(0, 27) + '…' : json;
}
