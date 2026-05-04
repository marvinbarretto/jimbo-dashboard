import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastService } from '@shared/components/toast/toast.service';
import { UiBackLink } from '@shared/components/ui-back-link/ui-back-link';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiToggle } from '@shared/components/ui-toggle/ui-toggle';
import { CalendarSettingsService, type CalendarEntry, type CalendarItemConfig } from './calendar-settings.service';

interface CalendarRow {
  readonly calendar: CalendarEntry;
  readonly enabled: boolean;
  readonly tag: string | null;
  readonly potential: boolean;
}

// Coalesces rapid toggle clicks into one PUT — the API takes a full-config
// blob, so flooding it on every click is wasteful and races prone.
const SAVE_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-calendar-settings-page',
  imports: [
    UiBackLink,
    UiBadge,
    UiEmptyState,
    UiLoadingState,
    UiPageHeader,
    UiSection,
    UiStack,
    UiToggle,
  ],
  templateUrl: './calendar-settings-page.html',
  styleUrl: './calendar-settings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarSettingsPage {
  private readonly service = inject(CalendarSettingsService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly localConfig = signal<Record<string, CalendarItemConfig>>({});
  protected readonly readerExpanded = signal(true);

  // Last server-confirmed state. On a failed save we restore the UI to this
  // so the user sees the truth, not their stale optimistic toggle.
  private lastConfirmed: Record<string, CalendarItemConfig> = {};

  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Subscription | null = null;

  protected readonly loading = computed(
    () => this.service.calendars() === undefined || this.service.config() === undefined,
  );

  protected readonly ownedRows = computed<CalendarRow[]>(() => {
    const calendars = this.service.calendars() ?? [];
    const config = this.localConfig();
    return calendars
      .filter(c => c.accessRole === 'owner' || !!c.primary)
      .sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0))
      .map(c => ({
        calendar: c,
        enabled: config[c.id]?.enabled ?? !!c.primary,
        tag: config[c.id]?.tag ?? null,
        potential: config[c.id]?.potential ?? false,
      }));
  });

  protected readonly readerRows = computed<CalendarRow[]>(() => {
    const calendars = this.service.calendars() ?? [];
    const config = this.localConfig();
    return calendars
      .filter(c => c.accessRole !== 'owner' && !c.primary)
      .map(c => ({
        calendar: c,
        enabled: config[c.id]?.enabled ?? false,
        tag: config[c.id]?.tag ?? null,
        potential: config[c.id]?.potential ?? false,
      }));
  });

  constructor() {
    // Initialise local + last-confirmed state once config loads from the API.
    effect(() => {
      const config = this.service.config();
      if (config !== undefined) {
        untracked(() => {
          this.localConfig.set({ ...config.calendars });
          this.lastConfirmed = { ...config.calendars };
        });
      }
    });

    this.destroyRef.onDestroy(() => {
      if (this.saveTimer) clearTimeout(this.saveTimer);
      this.inFlight?.unsubscribe();
    });
  }

  protected toggle(id: string, current: boolean): void {
    this.localConfig.update(cfg => ({
      ...cfg,
      [id]: { enabled: !current, tag: cfg[id]?.tag ?? null, potential: cfg[id]?.potential ?? false },
    }));
    this.scheduleSave();
  }

  protected togglePotential(id: string, current: boolean): void {
    this.localConfig.update(cfg => ({
      ...cfg,
      [id]: { enabled: cfg[id]?.enabled ?? false, tag: cfg[id]?.tag ?? null, potential: !current },
    }));
    this.scheduleSave();
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.persist(), SAVE_DEBOUNCE_MS);
  }

  private persist(): void {
    // Cancel any save that's already mid-flight — the snapshot we're about
    // to send is strictly newer, so the older response would be stale.
    this.inFlight?.unsubscribe();

    const snapshot = this.localConfig();
    this.inFlight = this.service.saveConfig({ calendars: snapshot }).subscribe({
      next: () => {
        this.lastConfirmed = snapshot;
        this.inFlight = null;
        this.toast.success('Calendar settings saved');
      },
      error: (err) => {
        this.inFlight = null;
        this.localConfig.set({ ...this.lastConfirmed });
        const detail = err?.error?.message ?? err?.message ?? 'Unknown error';
        this.toast.error(`Couldn't save: ${detail}`);
        console.error('[CalendarSettings] save error', err);
      },
    });
  }
}
