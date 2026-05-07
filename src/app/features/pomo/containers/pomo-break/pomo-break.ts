import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { FocusSessionsService } from '../../data-access/focus-sessions.service';
import { VaultItemsService } from '../../../vault-items/data-access/vault-items.service';

const DEFAULT_BREAK_MINUTES = 5;

@Component({
  selector: 'app-pomo-break',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, UiStack, UiCard, UiButton, UiStatCard],
  templateUrl: './pomo-break.html',
  styleUrl: './pomo-break.scss',
})
export class PomoBreak implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly sessions = inject(FocusSessionsService);
  private readonly vaultItems = inject(VaultItemsService);

  private readonly breakMins = Number(this.route.snapshot.queryParamMap.get('mins')) || DEFAULT_BREAK_MINUTES;
  private readonly endTime = Date.now() + this.breakMins * 60 * 1000;
  private readonly now = signal(Date.now());
  private readonly handle = setInterval(() => this.now.set(Date.now()), 1000);

  readonly remainingSeconds = computed(() =>
    Math.max(0, Math.round((this.endTime - this.now()) / 1000)),
  );

  readonly displayTime = computed(() => {
    const t = this.remainingSeconds();
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  });

  readonly isOver = computed(() => this.remainingSeconds() === 0);

  readonly lastSession = computed(() => this.sessions.recent()[0] ?? null);

  readonly completedToday = computed(() => {
    const today = new Date().toDateString();
    return this.sessions.recent().filter(
      s => s.ended_at !== null && new Date(s.ended_at).toDateString() === today,
    ).length;
  });

  readonly personalItems = computed(() =>
    this.vaultItems.activeItems()
      .filter(i => !i.primary_project_id)
      .slice(0, 5),
  );

  async ngOnInit(): Promise<void> {
    await this.sessions.loadRecent(1);
  }

  ngOnDestroy(): void {
    clearInterval(this.handle);
  }
}
