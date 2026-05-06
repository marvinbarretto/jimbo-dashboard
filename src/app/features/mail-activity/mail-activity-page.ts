import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiRefreshControl } from '@shared/components/ui-refresh-control/ui-refresh-control';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { relativeTime } from '@shared/utils/datetime.utils';
import { vaultItemId } from '@domain/ids';
import { VaultItemsService } from '../vault-items/data-access/vault-items.service';
import { MailActivityService, type EmailReport } from './mail-activity.service';

interface PipelineStage {
  readonly key: 'discovered' | 'body' | 'gated' | 'verdict';
  readonly label: string;
  readonly done: boolean;
  readonly title: string;
}

@Component({
  selector: 'app-mail-activity-page',
  imports: [RouterLink, UiBadge, UiCluster, UiEmptyState, UiPageHeader, UiRefreshControl, UiStack],
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

  protected verdictTone(item: EmailReport): 'success' | 'neutral' | 'warning' {
    if (item.verdict === 'keep') return 'success';
    if (item.verdict === 'toss') return 'neutral';
    return 'warning';
  }

  protected verdictLabel(item: EmailReport): string {
    return item.verdict ?? 'pending';
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
