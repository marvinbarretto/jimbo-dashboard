import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { UiBackLink } from '@shared/components/ui-back-link/ui-back-link';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { ToastService } from '@shared/components/toast/toast.service';
import { relativeTime } from '@shared/utils/datetime.utils';
import { JunkSendersService, type SenderStat } from '../../junk-senders.service';

/**
 * Ranks senders as unsubscribe / blocklist candidates. Proposes only — every
 * block is Marvin's explicit click.
 *
 * That restraint is the design, not caution for its own sake:
 * notifications@github.com is ~98% noise but the other 2% is security
 * advisories and direct mentions, and the gate's blocklist rule is "toss
 * immediately, do not even read the analysis". Auto-blocking on a toss rate
 * would eventually silence something that mattered.
 */
@Component({
  selector: 'app-junk-senders-page',
  imports: [UiBackLink, UiBadge, UiButton, UiCluster, UiEmptyState, UiPage, UiPageHeader, UiStack],
  templateUrl: './junk-senders-page.html',
  styleUrl: './junk-senders-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JunkSendersPage implements OnInit {
  private readonly svc = inject(JunkSendersService);
  private readonly toast = inject(ToastService);

  protected readonly loading = this.svc.loading;
  protected readonly lastError = this.svc.lastError;
  protected readonly minTotal = signal(8);
  protected readonly hideBlocked = signal(true);
  /** Per-sender in-flight guard so a double click can't double-write. */
  protected readonly busy = signal<string | null>(null);

  protected readonly rows = computed(() => {
    const all = this.svc.senders();
    return this.hideBlocked() ? all.filter((s) => !s.blocked) : all;
  });

  /** What silencing everything currently listed would actually save. */
  protected readonly reclaimable = computed(() =>
    this.rows().filter((s) => this.isCandidate(s)).reduce((n, s) => n + s.total, 0),
  );

  protected readonly candidateCount = computed(() =>
    this.rows().filter((s) => this.isCandidate(s)).length,
  );

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

  protected toggleHideBlocked(): void {
    this.hideBlocked.update((v) => !v);
  }

  /**
   * A candidate is a sender that has never once produced something worth
   * keeping. `kept > 0` disqualifies outright, however bad the ratio — one
   * booking confirmation a year is the whole reason the gate exists.
   * `trusted` senders are excluded because Marvin has already said otherwise.
   */
  protected isCandidate(s: SenderStat): boolean {
    return !s.blocked && !s.trusted && s.kept === 0 && s.total >= 5 && s.toss_rate >= 0.9;
  }

  /**
   * The string we put on the blocklist. Full address by default — the gate
   * matches on substring, so a bare brand word ("observer") would over-match
   * senders we never assessed. Only reach for the domain when the local part
   * is clearly rotating (noreply-1234@…).
   */
  protected blockNeedle(s: SenderStat): string {
    return s.from_email;
  }

  protected tone(s: SenderStat): 'neutral' | 'success' | 'warning' {
    if (s.blocked) return 'neutral';
    if (s.kept > 0) return 'success';
    return 'warning';
  }

  protected pct(rate: number): string {
    return `${Math.round(rate * 100)}%`;
  }

  protected lastSeen(s: SenderStat): string {
    return relativeTime(s.last_seen);
  }

  protected async block(s: SenderStat): Promise<void> {
    this.busy.set(s.from_email);
    try {
      await this.svc.block(this.blockNeedle(s));
      this.toast.success(`Blocked ${s.from_email} — ${s.total} past emails, ${s.tossed} tossed`);
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
