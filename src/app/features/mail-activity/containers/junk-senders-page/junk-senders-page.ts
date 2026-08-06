import { ChangeDetectionStrategy, Component, OnInit, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { type CellContext, createColumnHelper, type ColumnDef } from '@tanstack/angular-table';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiDataTable } from '@shared/components/ui-data-table/ui-data-table';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSegmented, type UiSegmentedOption } from '@shared/components/ui-segmented/ui-segmented';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { ToastService } from '@shared/components/toast/toast.service';
import { relativeTime } from '@shared/utils/datetime.utils';
import { MailTabs } from '../../components/mail-tabs/mail-tabs';
import { JunkSendersService, type SenderStat } from '../../junk-senders.service';

/**
 * Ranks senders as unsubscribe / blocklist candidates. Proposes only — every
 * block is an explicit click.
 *
 * That restraint is the design, not caution for its own sake:
 * notifications@github.com is ~98% noise but the other 2% is security
 * advisories and direct mentions, and the gate's blocklist rule is "toss
 * immediately, do not even read the analysis". Auto-blocking on a toss rate
 * would eventually silence something that mattered.
 */
@Component({
  selector: 'app-junk-senders-page',
  imports: [
    MailTabs, UiBadge, UiButton, UiCluster, UiDataTable,
    UiPage, UiPageHeader, UiSegmented, UiStack, UiStatCard,
  ],
  templateUrl: './junk-senders-page.html',
  styleUrl: './junk-senders-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JunkSendersPage implements OnInit {
  private readonly svc = inject(JunkSendersService);
  private readonly toast = inject(ToastService);
  private readonly columnHelper = createColumnHelper<SenderStat>();

  protected readonly loading = this.svc.loading;
  protected readonly lastError = this.svc.lastError;
  protected readonly minTotal = signal(8);
  protected readonly scope = signal<'candidates' | 'all' | 'blocked'>('candidates');
  /** Per-sender in-flight guard so a double click can't double-write. */
  protected readonly busy = signal<string | null>(null);

  protected readonly scopeOptions: readonly UiSegmentedOption[] = [
    { value: 'candidates', label: 'Candidates' },
    { value: 'all', label: 'All senders' },
    { value: 'blocked', label: 'Blocked' },
  ];

  private readonly senderCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<SenderStat, string> }>>('senderCell');
  private readonly rateCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<SenderStat, number> }>>('rateCell');
  private readonly keptCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<SenderStat, number> }>>('keptCell');
  private readonly unsubCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<SenderStat, boolean> }>>('unsubCell');
  private readonly actionCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<SenderStat, string> }>>('actionCell');

  protected readonly columns: ColumnDef<SenderStat, any>[] = [
    this.columnHelper.accessor(row => row.from_name ?? row.from_email, {
      id: 'sender',
      header: 'Sender',
      cell: () => this.senderCell(),
      sortingFn: 'alphanumeric',
    }),
    this.columnHelper.accessor(row => row.total, { id: 'total', header: 'Seen' }),
    this.columnHelper.accessor(row => row.tossed, { id: 'tossed', header: 'Tossed' }),
    this.columnHelper.accessor(row => row.kept, {
      id: 'kept',
      header: 'Kept',
      cell: () => this.keptCell(),
    }),
    this.columnHelper.accessor(row => row.toss_rate, {
      id: 'rate',
      header: 'Toss rate',
      cell: () => this.rateCell(),
    }),
    // Sort on the raw timestamp, not the rendered "3d ago" — sorting the
    // formatted string puts "3d" next to "30d".
    this.columnHelper.accessor(row => row.last_seen, {
      id: 'last_seen',
      header: 'Last seen',
      cell: info => relativeTime(info.getValue() as string),
    }),
    // Its own column rather than stacked into the action cell: crammed
    // together the badge wrapped above the button and doubled every row's
    // height, which is the opposite of scannable in a list you work down.
    this.columnHelper.accessor(row => row.has_unsubscribe, {
      id: 'unsub',
      header: 'Unsub',
      cell: () => this.unsubCell(),
    }),
    this.columnHelper.accessor(row => row.from_email, {
      id: 'action',
      header: '',
      cell: () => this.actionCell(),
      enableSorting: false,
    }),
  ];

  protected readonly rows = computed(() => {
    const all = this.svc.senders();
    switch (this.scope()) {
      case 'blocked': return all.filter(s => s.blocked);
      case 'candidates': return all.filter(s => this.isCandidate(s));
      default: return all;
    }
  });

  private readonly candidates = computed(() => this.svc.senders().filter(s => this.isCandidate(s)));

  protected readonly candidateCount = computed(() => this.candidates().length);
  /** What silencing every candidate would take off the gate's queue. */
  protected readonly reclaimable = computed(() =>
    this.candidates().reduce((n, s) => n + s.total, 0),
  );
  protected readonly blockedCount = computed(() => this.svc.senders().filter(s => s.blocked).length);
  protected readonly unsubscribable = computed(() =>
    this.candidates().filter(s => s.has_unsubscribe).length,
  );

  protected readonly rowClass = (s: SenderStat): string =>
    s.blocked ? 'row--blocked' : this.isCandidate(s) ? 'row--candidate' : '';

  ngOnInit(): void {
    void this.svc.load(this.minTotal());
  }

  protected refresh(): void {
    void this.svc.load(this.minTotal());
  }

  protected onMinTotal(event: Event): void {
    this.minTotal.set(Number((event.target as HTMLInputElement).value) || 5);
    void this.svc.load(this.minTotal());
  }

  protected onScope(value: string): void {
    this.scope.set(value as 'candidates' | 'all' | 'blocked');
  }

  /**
   * A candidate has never once produced something worth keeping. `kept > 0`
   * disqualifies outright however bad the ratio — one booking confirmation a
   * year is the whole reason the gate exists. `trusted` senders are excluded
   * because Marvin has already ruled on them.
   */
  protected isCandidate(s: SenderStat): boolean {
    return !s.blocked && !s.trusted && s.kept === 0 && s.total >= 5 && s.toss_rate >= 0.9;
  }

  /**
   * What goes on the blocklist. The gate matches on case-insensitive
   * substring, so the full address is the safe default — a bare brand word
   * ("observer") would over-match senders nobody has assessed.
   */
  protected blockNeedle(s: SenderStat): string {
    return s.from_email;
  }

  protected pct(rate: number): string {
    return `${Math.round(rate * 100)}%`;
  }

  protected rateTone(s: SenderStat): 'neutral' | 'success' | 'warning' {
    if (s.blocked) return 'neutral';
    if (s.kept > 0) return 'success';
    return 'warning';
  }

  protected async block(s: SenderStat): Promise<void> {
    this.busy.set(s.from_email);
    try {
      await this.svc.block(this.blockNeedle(s));
      this.toast.success(`Blocked ${s.from_email} — ${s.total} seen, ${s.tossed} tossed`);
      await this.svc.load(this.minTotal());
    } catch (err: unknown) {
      this.toast.error(`Couldn't block: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      this.busy.set(null);
    }
  }

  protected async unblock(s: SenderStat): Promise<void> {
    this.busy.set(s.from_email);
    try {
      await this.svc.unblock(this.blockNeedle(s));
      this.toast.success(`Unblocked ${s.from_email}`);
      await this.svc.load(this.minTotal());
    } catch (err: unknown) {
      this.toast.error(`Couldn't unblock: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      this.busy.set(null);
    }
  }
}
