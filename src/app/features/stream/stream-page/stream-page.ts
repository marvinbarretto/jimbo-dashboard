import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Chip } from '@shared/components/chip/chip';
import { EntityChip } from '@shared/components/entity-chip/entity-chip';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { VaultItemsService } from '../../vault-items/data-access/vault-items.service';
import { ErrorAggregationService, type ErrorClass } from '../error-aggregation.service';
import { EventDetailService } from '../event-detail.service';
import { StreamService, type SystemEventSummary } from '../stream.service';
import { relativeTime } from '@shared/utils/datetime.utils';

// en-GB enforces 24h clock; en-CA gives ISO-style YYYY-MM-DD for sortable
// day keys. Both pick up the operator's local timezone automatically.
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour12: false });
const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-CA');

interface NoteRef {
  seq: number | null;
  title: string;
}

type LevelTone = 'neutral' | 'warning' | 'danger' | 'info';

interface DisplayRow {
  event: SystemEventSummary;
  time: string;
  // Resolved vault note (only populated when ref_type='vault_note').
  note: NoteRef | null;
}

interface Thread {
  // Stable key for tracking expand state. Uses correlation_id when present
  // so newly-arriving events in a live thread don't lose their expansion.
  key: string;
  cid: string | null;
  rows: DisplayRow[];
  head: DisplayRow;
  // Highest-severity level across rows. Drives the row tint and lead badge.
  topLevel: string;
  errorCount: number;
  warnCount: number;
  // Window covered by the thread — for duration display in the header.
  startTs: string;
  endTs: string;
  // ms — null when start === end (single event). Computed once per render.
  durationMs: number | null;
}

interface DayGroup {
  day: string;
  threads: Thread[];
}

// Default-hidden levels. `debug` is the high-volume noise tier
// (heartbeats, tool.pre/post). User toggles to see them.
const DEFAULT_HIDDEN_LEVELS = new Set(['debug']);

// Until hermes is updated to mark heartbeats/tool calls as level='debug',
// these kinds are suppressed by default as a stopgap. Remove entries from
// this list as the upstream emitter is corrected.
const DEFAULT_HIDDEN_KINDS = new Set(['heartbeat', 'tool.pre', 'tool.post']);

const LEVEL_RANK: Record<string, number> = { debug: -1, info: 0, warn: 1, error: 2 };

function fmtDuration(ms: number | null): string {
  if (ms === null) return '';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round((ms % 60_000) / 1000);
  return `${mins}m ${secs}s`;
}

@Component({
  selector: 'app-stream-page',
  imports: [
    Chip,
    EntityChip,
    UiBadge,
    UiCluster,
    UiEmptyState,
    UiPageHeader,
    UiStack,
  ],
  templateUrl: './stream-page.html',
  styleUrl: './stream-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreamPage implements OnInit, OnDestroy {
  private readonly service = inject(StreamService);
  private readonly vault = inject(VaultItemsService);
  private readonly detailService = inject(EventDetailService);
  private readonly errorAgg = inject(ErrorAggregationService);

  readonly status = this.service.status;
  readonly lastError = this.service.lastError;
  readonly eventCount = computed(() => this.service.events().length);

  readonly errorClasses = this.errorAgg.classes;
  readonly errorTotal = this.errorAgg.totalErrors;
  readonly errorLoading = this.errorAgg.loading;
  readonly errorLastFetch = this.errorAgg.lastFetch;
  readonly errorLastError = this.errorAgg.lastError;
  protected readonly errorPanelOpen = signal(true);

  // Filters — null (or empty) = no constraint.
  protected readonly sourceFilter = signal<string | null>(null);
  protected readonly cidFilter = signal<string | null>(null);
  protected readonly showDebug = signal(false);
  protected readonly showChattyKinds = signal(false);

  // Per-thread expansion: thread.key → bool. Persisted across re-renders so
  // a live thread keeps its open drawer while new tool calls land.
  private readonly expandedThreads = signal<ReadonlySet<string>>(new Set());
  // Per-event expansion (one event row's detail/payload drawer).
  private readonly expandedEvents = signal<ReadonlySet<number>>(new Set());

  // Vault-item lookup. Falls back to ref_id text if vault map hasn't loaded.
  private readonly noteIndex = computed(() => {
    const map = new Map<string, NoteRef>();
    for (const item of this.vault.items()) {
      map.set(item.id, { seq: item.seq, title: item.title });
    }
    return map;
  });

  readonly sources = computed(() => {
    const seen = new Set<string>();
    for (const e of this.service.events()) seen.add(e.source);
    return [...seen].sort();
  });

  readonly sourceCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const e of this.service.events()) {
      counts.set(e.source, (counts.get(e.source) ?? 0) + 1);
    }
    return counts;
  });

  // Hidden-by-default events: count what the toggles are filtering, so
  // the user has a sense of how much noise exists.
  readonly hiddenCount = computed(() => {
    let n = 0;
    for (const e of this.service.events()) {
      if (this.isHidden(e)) n++;
    }
    return n;
  });

  // Group → thread → day. Threads collapse rows by correlation_id; events
  // without a cid are singleton threads. Day grouping uses the thread's
  // most recent event so a long-running thread stays in "today" until it
  // finally ends.
  readonly grouped = computed<DayGroup[]>(() => {
    const lookup = this.noteIndex();
    const filtered = this.service.events().filter((e) => !this.isHidden(e));

    // Build threads in arrival order, then sort by recency at the end.
    const threadMap = new Map<string, DisplayRow[]>();
    for (const event of filtered) {
      const note =
        event.ref_type === 'vault_note' && event.ref_id
          ? lookup.get(event.ref_id) ?? { seq: null, title: event.ref_id }
          : null;
      const row: DisplayRow = { event, time: fmtTime(event.ts), note };
      const key = event.correlation_id ?? `_solo_${event.id}`;
      const arr = threadMap.get(key);
      if (arr) arr.push(row);
      else threadMap.set(key, [row]);
    }

    const threads: Thread[] = [];
    for (const [key, rows] of threadMap.entries()) {
      // Within a thread: oldest first (chronological), since the operator
      // is reading a sub-timeline. Lead row is the most recent — best
      // signal of "what's happening now".
      rows.sort((a, b) => a.event.ts.localeCompare(b.event.ts));
      const startTs = rows[0]!.event.ts;
      const endTs = rows[rows.length - 1]!.event.ts;
      const durationMs = startTs === endTs
        ? null
        : new Date(endTs).getTime() - new Date(startTs).getTime();

      let topRank = -2;
      let topLevel = 'info';
      let errorCount = 0;
      let warnCount = 0;
      for (const r of rows) {
        const rank = LEVEL_RANK[r.event.level] ?? 0;
        if (rank > topRank) {
          topRank = rank;
          topLevel = r.event.level;
        }
        if (r.event.level === 'error') errorCount++;
        else if (r.event.level === 'warn') warnCount++;
      }

      // Lead/head: prefer the most recent informative event. Skip
      // tool.* leads when there's a non-tool event available — agent.start
      // / dispatch.* etc. are far better summaries.
      const informative = rows.filter((r) => !r.event.kind.startsWith('tool.'));
      const head = informative.length > 0
        ? informative[informative.length - 1]!
        : rows[rows.length - 1]!;

      threads.push({
        key,
        cid: rows[0]!.event.correlation_id,
        rows,
        head,
        topLevel,
        errorCount,
        warnCount,
        startTs,
        endTs,
        durationMs,
      });
    }

    // Apply correlation_id filter at thread level.
    const cid = this.cidFilter();
    const visibleThreads = cid !== null
      ? threads.filter((t) => t.cid === cid)
      : threads;

    // Bucket by day using the thread's last event.
    const byDay = new Map<string, Thread[]>();
    for (const thread of visibleThreads) {
      const day = fmtDay(thread.endTs);
      const arr = byDay.get(day);
      if (arr) arr.push(thread);
      else byDay.set(day, [thread]);
    }

    // Within day: newest thread first (by endTs). Across days: newest day first.
    const days: DayGroup[] = [];
    for (const [day, dayThreads] of byDay.entries()) {
      dayThreads.sort((a, b) => b.endTs.localeCompare(a.endTs));
      days.push({ day, threads: dayThreads });
    }
    return days.sort((a, b) => b.day.localeCompare(a.day));
  });

  ngOnInit(): void {
    this.service.connect();
    this.errorAgg.start();
  }

  ngOnDestroy(): void {
    this.service.disconnect();
    this.errorAgg.stop();
  }

  protected refreshErrors(): void {
    void this.errorAgg.refresh();
  }

  protected toggleErrorPanel(): void {
    this.errorPanelOpen.update((v) => !v);
  }

  // Filter the stream to a failing thread by clicking an error class row.
  // Falls back to setting source=hermes if the sample has no cid (rare —
  // most tool-call errors carry a session cid).
  protected drilldownError(cls: ErrorClass): void {
    if (cls.sampleCorrelationId) {
      this.cidFilter.set(cls.sampleCorrelationId);
    } else {
      // Without a cid we can't filter to one thread — open the sample
      // event drawer so the operator at least sees the offender.
      this.expandedEvents.update((prev) => new Set(prev).add(cls.sampleEventId));
      this.detailService.load(cls.sampleEventId);
    }
  }

  protected fmtRelative = relativeTime;

  private isHidden(e: SystemEventSummary): boolean {
    const sourceOk = !this.sourceFilter() || e.source === this.sourceFilter();
    if (!sourceOk) return true;
    if (!this.showDebug() && DEFAULT_HIDDEN_LEVELS.has(e.level)) return true;
    if (!this.showChattyKinds() && DEFAULT_HIDDEN_KINDS.has(e.kind)) return true;
    return false;
  }

  protected setSource(src: string | null): void {
    this.sourceFilter.set(src);
  }

  protected setCidFilter(cid: string | null): void {
    this.cidFilter.set(cid);
  }

  protected toggleDebug(): void {
    this.showDebug.update((v) => !v);
  }

  protected toggleChattyKinds(): void {
    this.showChattyKinds.update((v) => !v);
  }

  protected isThreadExpanded(key: string): boolean {
    return this.expandedThreads().has(key);
  }

  protected toggleThread(key: string): void {
    this.expandedThreads.update((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  protected isEventExpanded(id: number): boolean {
    return this.expandedEvents().has(id);
  }

  protected toggleEvent(id: number): void {
    this.expandedEvents.update((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        // Fire-and-forget — the row template observes detailEntry().
        this.detailService.load(id);
      }
      return next;
    });
  }

  protected detailEntry(id: number) {
    return this.detailService.entry(id);
  }

  protected formatJson(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  // Pull a typed view of the structured payload for the row header. The
  // server returns payload as `unknown` (jsonb is free-form); these
  // accessors narrow it without enforcing a strict shape — different
  // event kinds populate different fields.
  protected payloadField(payload: unknown, key: string): unknown {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      return (payload as Record<string, unknown>)[key];
    }
    return undefined;
  }

  protected asString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  protected asNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  // Short ID helper — show first N chars with "…" suffix for chip display.
  // The full id stays on the chip's title attribute.
  protected shortId(id: string | null | undefined, take = 8): string {
    if (!id) return '';
    return id.length > take ? `${id.slice(0, take)}…` : id;
  }

  protected fmtDurationMs(ms: number | null | undefined): string {
    if (ms === null || ms === undefined) return '';
    return fmtDuration(ms);
  }

  // Detail blobs from hermes have `result.output` parsed one level deep
  // (terminal wrapping a JSON response). Surface the nested error here so
  // the renderer can show an error callout above the raw JSON.
  protected extractError(detail: unknown): string | null {
    if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return null;
    const d = detail as Record<string, unknown>;
    const result = d['result'];
    if (!result || typeof result !== 'object' || Array.isArray(result)) return null;
    const r = result as Record<string, unknown>;
    const direct = r['error'];
    if (typeof direct === 'string' && direct) return direct;
    if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
      const e = direct as Record<string, unknown>;
      const msg = e['message'] ?? e['code'];
      if (typeof msg === 'string' && msg) return msg;
    }
    const output = r['output'];
    if (output && typeof output === 'object' && !Array.isArray(output)) {
      const o = output as Record<string, unknown>;
      const innerErr = o['error'];
      if (typeof innerErr === 'string' && innerErr) return innerErr;
      if (innerErr && typeof innerErr === 'object' && !Array.isArray(innerErr)) {
        const e = innerErr as Record<string, unknown>;
        const code = e['code'];
        const msg = e['message'];
        if (typeof code === 'string' && typeof msg === 'string') return `${code}: ${msg}`;
        if (typeof msg === 'string' && msg) return msg;
        if (typeof code === 'string' && code) return code;
      }
    }
    return null;
  }

  protected statusTone(): 'success' | 'warning' | 'danger' | 'neutral' {
    switch (this.status()) {
      case 'open': return 'success';
      case 'connecting': return 'warning';
      case 'closed': return 'danger';
      default: return 'neutral';
    }
  }

  protected statusLabel(): string {
    switch (this.status()) {
      case 'open': return '● live';
      case 'connecting': return '◌ connecting';
      case 'closed': return '○ disconnected';
      default: return '· idle';
    }
  }

  protected levelTone(level: string): LevelTone {
    switch (level) {
      case 'error': return 'danger';
      case 'warn':  return 'warning';
      case 'debug': return 'neutral';
      default:      return 'info';
    }
  }

  protected fmtDuration = fmtDuration;
}
