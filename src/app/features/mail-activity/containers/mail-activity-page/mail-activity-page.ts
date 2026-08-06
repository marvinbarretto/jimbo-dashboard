import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiRefreshControl } from '@shared/components/ui-refresh-control/ui-refresh-control';
import { UiProse } from '@shared/components/ui-prose/ui-prose';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { relativeTime } from '@shared/utils/datetime.utils';
import { MailTabs } from '../../components/mail-tabs/mail-tabs';
import { MailActivityService, type EmailReport, isRetained } from '../../mail-activity.service';

interface PipelineStage {
  readonly key: 'discovered' | 'body' | 'gated' | 'verdict';
  readonly label: string;
  readonly done: boolean;
  readonly title: string;
}

@Component({
  selector: 'app-mail-activity-page',
  imports: [MailTabs, RouterLink, UiBadge, UiCluster, UiEmptyState, UiPage, UiPageHeader, UiProse, UiRefreshControl, UiStack],
  templateUrl: './mail-activity-page.html',
  styleUrl: './mail-activity-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MailActivityPage implements OnInit, OnDestroy {
  private readonly service = inject(MailActivityService);

  readonly items = this.service.items;
  readonly loading = this.service.loading;
  readonly lastError = this.service.lastError;
  readonly lastFetch = this.service.lastFetch;
  readonly total = this.service.total;

  private readonly expanded = signal<ReadonlySet<string>>(new Set());

  ngOnInit(): void {
    this.service.start();
  }

  ngOnDestroy(): void {
    this.service.stop();
  }

  protected refresh(): void {
    void this.service.refresh();
  }

  protected isExpanded(item: EmailReport): boolean {
    return this.expanded().has(item.gmail_id);
  }

  protected toggle(item: EmailReport): void {
    const id = item.gmail_id;
    this.expanded.update((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected fromLabel(item: EmailReport): string {
    return item.from_name?.trim() || item.from_email;
  }

  protected subjectLabel(item: EmailReport): string {
    return item.subject?.trim() || '(no subject)';
  }

  // An alert is the one verdict that genuinely warrants the warning tone —
  // it means something has gone wrong (a declined payment, a cancelled
  // booking). Every other retained class is a success. Before 2026-08-06 this
  // tested `=== 'keep'`, so fact/alert/event/reference all fell through to
  // 'warning' and every kept email rendered as though something were wrong.
  protected verdictTone(item: EmailReport): 'success' | 'neutral' | 'warning' {
    if (item.verdict === 'alert') return 'warning';
    if (isRetained(item.verdict)) return 'success';
    if (item.verdict === 'toss') return 'neutral';
    return 'warning';
  }

  /** Exposed for the row stripe binding — same rule as verdictTone. */
  protected readonly isRetained = isRetained;

  protected verdictLabel(item: EmailReport): string {
    return item.verdict ?? 'pending';
  }

  /** Spell out the actor/model split on hover — they were one field until
   *  2026-08-06 and the distinction is not obvious from two badges. */
  protected actorTitle(item: EmailReport): string {
    if (!item.actor_id) return 'No actor recorded — gated before actor attribution existed';
    return item.verdict_model
      ? `Gated by ${item.actor_id} using ${item.verdict_model}`
      : `Gated by ${item.actor_id}`;
  }

  protected stages(item: EmailReport): PipelineStage[] {
    return [
      { key: 'discovered', label: 'D', done: !!item.discovered_at,   title: `discovered ${item.discovered_at}` },
      { key: 'body',       label: 'B', done: !!item.body_fetched_at, title: item.body_fetched_at ? `body ${item.body_fetched_at}` : 'body not fetched' },
      { key: 'gated',      label: 'G', done: !!item.gated_at,        title: item.gated_at ? `gated ${item.gated_at}` : 'not gated' },
      { key: 'verdict',    label: 'V', done: !!item.verdict,         title: item.verdict ? `verdict ${item.verdict}` : 'no verdict' },
    ];
  }

  /** Resolved server-side since 2026-08-06. This used to call into
   *  VaultItemsService, which meant the mail page loaded the entire vault board
   *  just to turn a UUID into a seq — and its own comment conceded the link
   *  vanished when the note wasn't in the loaded set. */
  protected vaultNoteSeq(item: EmailReport): number | null {
    return item.vault_note_seq ?? null;
  }

  protected fmtRelative = relativeTime;

  /** When the verdict was written — distinct from when the mail arrived. */
  protected gatedAt(item: EmailReport): string | null {
    return item.gated_at ? relativeTime(item.gated_at) : null;
  }

  /** Discovery → verdict. Shows how long mail actually waits for the gate,
   *  which is the number that tells you whether the backlog is moving. */
  protected timeToVerdict(item: EmailReport): string | null {
    if (!item.gated_at) return null;
    const ms = new Date(item.gated_at).getTime() - new Date(item.discovered_at).getTime();
    if (!Number.isFinite(ms) || ms < 0) return null;
    if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
    return `${Math.round(ms / 3_600_000)}h`;
  }

  /** The API truncates to 320 chars in SQL now; fall back to body_text for the
   *  detail fetch, which still carries the whole thing. */
  protected bodyPreview(item: EmailReport): string | null {
    const text = (item.body_preview ?? item.body_text)?.trim();
    if (!text) return null;
    if (text.length <= 320) return text;
    return `${text.slice(0, 317)}…`;
  }
}
