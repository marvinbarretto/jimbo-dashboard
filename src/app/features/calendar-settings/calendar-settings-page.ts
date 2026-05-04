import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ToastService } from '@shared/components/toast/toast.service';
import { UiBackLink } from '@shared/components/ui-back-link/ui-back-link';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStickyActionBar } from '@shared/components/ui-sticky-action-bar/ui-sticky-action-bar';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiToggle } from '@shared/components/ui-toggle/ui-toggle';
import { CalendarSettingsService, type CalendarEntry, type CalendarItemConfig } from './calendar-settings.service';

interface CalendarRow {
  readonly calendar: CalendarEntry;
  readonly enabled: boolean;
  readonly tag: string | null;
}

@Component({
  selector: 'app-calendar-settings-page',
  imports: [
    UiBackLink,
    UiBadge,
    UiButton,
    UiEmptyState,
    UiLoadingState,
    UiPageHeader,
    UiSection,
    UiStickyActionBar,
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

  protected readonly localConfig = signal<Record<string, CalendarItemConfig>>({});
  protected readonly saving = signal(false);
  protected readonly readerExpanded = signal(true);

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
      }));
  });

  constructor() {
    // Initialise local editable state once config loads from the API.
    effect(() => {
      const config = this.service.config();
      if (config !== undefined) {
        untracked(() => this.localConfig.set({ ...config.calendars }));
      }
    });
  }

  protected toggle(id: string, current: boolean): void {
    this.localConfig.update(cfg => ({
      ...cfg,
      [id]: { enabled: !current, tag: cfg[id]?.tag ?? null },
    }));
  }

  protected save(): void {
    this.saving.set(true);
    this.service.saveConfig({ calendars: this.localConfig() }).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Calendar settings saved');
      },
      error: (err) => {
        this.saving.set(false);
        const detail = err?.error?.message ?? err?.message ?? 'Unknown error';
        this.toast.error(`Save failed: ${detail}`);
        console.error('[CalendarSettings] save error', err);
      },
    });
  }
}
