import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Chip } from '@shared/components/chip/chip';
import { EntityChip } from '@shared/components/entity-chip/entity-chip';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { VaultItemsService } from '../../vault-items/data-access/vault-items.service';
import { StreamService, type SystemEventSummary } from '../stream.service';

interface NoteRef {
  seq: number | null;
  title: string;
}

interface DisplayRow {
  event: SystemEventSummary;
  time: string;
  // Resolved vault note (only populated when ref_type='vault_note').
  note: NoteRef | null;
}

interface DayGroup {
  day: string;
  rows: DisplayRow[];
}

// Default-hidden levels. `debug` is the high-volume noise tier
// (heartbeats, tool.pre/post). User toggles to see them.
const DEFAULT_HIDDEN_LEVELS = new Set(['debug']);

// Until hermes is updated to mark heartbeats/tool calls as level='debug',
// these kinds are suppressed by default as a stopgap. Remove entries from
// this list as the upstream emitter is corrected.
const DEFAULT_HIDDEN_KINDS = new Set(['heartbeat', 'tool.pre', 'tool.post']);

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

  readonly status = this.service.status;
  readonly lastError = this.service.lastError;
  readonly eventCount = computed(() => this.service.events().length);

  // Filters — null (or empty) = no constraint.
  protected readonly sourceFilter = signal<string | null>(null);
  protected readonly showDebug = signal(false);
  protected readonly showChattyKinds = signal(false);

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

  readonly grouped = computed<DayGroup[]>(() => {
    const lookup = this.noteIndex();
    const filtered = this.service.events().filter((e) => !this.isHidden(e));

    const map = new Map<string, DisplayRow[]>();
    for (const event of filtered) {
      const day = event.ts.slice(0, 10);
      const note =
        event.ref_type === 'vault_note' && event.ref_id
          ? lookup.get(event.ref_id) ?? { seq: null, title: event.ref_id }
          : null;
      const row: DisplayRow = { event, time: event.ts.slice(11, 19), note };
      const arr = map.get(day);
      if (arr) arr.push(row);
      else map.set(day, [row]);
    }
    // Days descending; within day, newest first.
    return [...map.entries()]
      .map(([day, rows]) => ({ day, rows: rows.slice().reverse() }))
      .sort((a, b) => b.day.localeCompare(a.day));
  });

  ngOnInit(): void {
    this.service.connect();
  }

  ngOnDestroy(): void {
    this.service.disconnect();
  }

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

  protected toggleDebug(): void {
    this.showDebug.update((v) => !v);
  }

  protected toggleChattyKinds(): void {
    this.showChattyKinds.update((v) => !v);
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

  protected levelTone(level: string): 'neutral' | 'warning' | 'danger' | 'info' {
    switch (level) {
      case 'error': return 'danger';
      case 'warn':  return 'warning';
      case 'debug': return 'neutral';
      default:      return 'info';
    }
  }
}
