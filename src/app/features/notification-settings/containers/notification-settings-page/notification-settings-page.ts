import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { ToastService } from '@shared/components/toast/toast.service';
import { UiBackLink } from '@shared/components/ui-back-link/ui-back-link';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiToggle } from '@shared/components/ui-toggle/ui-toggle';

interface NotificationSchedule {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
  muted_until: string | null;
}

interface StructuredSettingResponse {
  key: 'notification_schedule';
  value: NotificationSchedule;
  updated_at: string;
}

const DEFAULT_SCHEDULE: NotificationSchedule = {
  enabled: true,
  start: '09:00',
  end: '22:00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  muted_until: null,
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

@Component({
  selector: 'app-notification-settings-page',
  imports: [DatePipe, UiBackLink, UiButton, UiCluster, UiLoadingState, UiPage, UiPageHeader, UiSection, UiStack, UiToggle],
  templateUrl: './notification-settings-page.html',
  styleUrl: './notification-settings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationSettingsPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  // 404s the first time this has never been saved — treated as "use defaults",
  // not an error state, so the page is always usable.
  private readonly scheduleRes = httpResource<StructuredSettingResponse>(
    () => '/api/settings/structured/notification_schedule',
  );

  protected readonly loading = computed(() => this.scheduleRes.isLoading() && !this.scheduleRes.hasValue());
  protected readonly saving = signal(false);

  protected readonly enabled = signal(DEFAULT_SCHEDULE.enabled);
  protected readonly start = signal(DEFAULT_SCHEDULE.start);
  protected readonly end = signal(DEFAULT_SCHEDULE.end);
  protected readonly timezone = signal(DEFAULT_SCHEDULE.timezone);
  protected readonly mutedUntil = signal<string | null>(DEFAULT_SCHEDULE.muted_until);

  private lastConfirmed: NotificationSchedule = DEFAULT_SCHEDULE;

  protected readonly dirty = computed(() =>
    this.enabled() !== this.lastConfirmed.enabled ||
    this.start() !== this.lastConfirmed.start ||
    this.end() !== this.lastConfirmed.end,
  );

  protected readonly isMuted = computed(() => {
    const until = this.mutedUntil();
    return until !== null && new Date(until).getTime() > Date.now();
  });

  protected readonly currentlyInterruptible = computed(() => {
    if (!this.enabled() || this.isMuted()) return false;
    return this.withinWindow(this.start(), this.end());
  });

  constructor() {
    effect(() => {
      const res = this.scheduleRes.value();
      if (res !== undefined) {
        untracked(() => {
          this.applySchedule(res.value);
          this.lastConfirmed = res.value;
        });
      }
    });
  }

  private applySchedule(schedule: NotificationSchedule): void {
    this.enabled.set(schedule.enabled);
    this.start.set(schedule.start);
    this.end.set(schedule.end);
    this.timezone.set(schedule.timezone);
    this.mutedUntil.set(schedule.muted_until);
  }

  private withinWindow(start: string, end: string): boolean {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    if (startMinutes <= endMinutes) {
      return nowMinutes >= startMinutes && nowMinutes < endMinutes;
    }
    // Window wraps past midnight (e.g. 22:00-06:00).
    return nowMinutes >= startMinutes || nowMinutes < endMinutes;
  }

  protected onEnabledChange(value: boolean): void {
    this.enabled.set(value);
  }

  protected onStartChange(event: Event): void {
    this.start.set((event.target as HTMLInputElement).value);
  }

  protected onEndChange(event: Event): void {
    this.end.set((event.target as HTMLInputElement).value);
  }

  protected muteFor(hours: number): void {
    const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    this.persist({ ...this.currentValue(), muted_until: until });
  }

  protected unmute(): void {
    this.persist({ ...this.currentValue(), muted_until: null });
  }

  protected save(): void {
    if (!HHMM.test(this.start()) || !HHMM.test(this.end())) {
      this.toast.error('Start/end must be in HH:mm format');
      return;
    }
    this.persist(this.currentValue());
  }

  private currentValue(): NotificationSchedule {
    return {
      enabled: this.enabled(),
      start: this.start(),
      end: this.end(),
      timezone: this.timezone(),
      muted_until: this.mutedUntil(),
    };
  }

  private persist(value: NotificationSchedule): void {
    this.saving.set(true);
    this.http.put('/api/settings/notification_schedule', { value }).subscribe({
      next: () => {
        this.saving.set(false);
        this.applySchedule(value);
        this.lastConfirmed = value;
        this.toast.success('Notification settings saved');
      },
      error: (err) => {
        this.saving.set(false);
        const detail = err?.error?.message ?? err?.message ?? 'Unknown error';
        this.toast.error(`Couldn't save: ${detail}`);
      },
    });
  }
}
