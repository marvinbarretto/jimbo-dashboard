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
import { vaultItemId } from '@domain/ids';
import { VaultItemsService } from '@features/vault-items/data-access/vault-items.service';
import { MailActivityService, type EmailReport, isRetained } from '../../mail-activity.service';

interface PipelineStage {
  readonly key: 'discovered' | 'body' | 'gated' | 'verdict';
  readonly label: string;
  readonly done: boolean;
  readonly title: string;
}

@Component({
  selector: 'app-mail-activity-page',
  imports: [RouterLink, UiBadge, UiCluster, UiEmptyState, UiPage, UiPageHeader, UiProse, UiRefreshControl, UiStack],
  templateUrl: './mail-activity-page.html',
  styleUrl: './mail-activity-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MailActivityPage implements OnInit, OnDestroy {
  private readonly service = inject(MailActivityService);
  private readonly vaultItems = inject(VaultItemsService);

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

  // Resolves vault_note_id (UUID) → seq for the detail-page link. The
  // VaultItemsService loads board items on construction, so this is
  // typically populated by the time mail rows render. Returns null if
  // the note isn't in the loaded list (deleted, archived, or still loading).
  protected vaultNoteSeq(item: EmailReport): number | null {
    if (!item.vault_note_id) return null;
    const note = this.vaultItems.getById(vaultItemId(item.vault_note_id));
    return note?.seq ?? null;
  }

  protected fmtRelative = relativeTime;

  protected bodyPreview(item: EmailReport): string | null {
    const text = item.body_text?.trim();
    if (!text) return null;
    if (text.length <= 320) return text;
    return `${text.slice(0, 317)}…`;
  }
}
