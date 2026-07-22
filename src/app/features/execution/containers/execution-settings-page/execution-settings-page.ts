import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ToastService } from '@shared/components/toast/toast.service';
import { UiBackLink } from '@shared/components/ui-back-link/ui-back-link';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { ExecutionConfigService, type ExecutionConfigValue } from '@features/execution/data-access/execution-config.service';

@Component({
  selector: 'app-execution-settings-page',
  imports: [UiBackLink, UiButton, UiLoadingState, UiPage, UiPageHeader, UiSection, UiStack],
  templateUrl: './execution-settings-page.html',
  styleUrl: './execution-settings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExecutionSettingsPage {
  private readonly service = inject(ExecutionConfigService);
  private readonly toast = inject(ToastService);

  protected readonly loading = computed(() => this.service.config() === undefined);
  protected readonly saving = signal(false);

  // Editable as text so the field can be empty (= "never"); parsed to
  // number | null on save.
  protected readonly autoClearDays = signal('');

  private lastConfirmed: ExecutionConfigValue = { done_lane_auto_clear_days: null };

  protected readonly dirty = computed(() =>
    this.autoClearDays() !== (this.lastConfirmed.done_lane_auto_clear_days?.toString() ?? ''),
  );

  constructor() {
    effect(() => {
      const config = this.service.config();
      if (config !== undefined) {
        untracked(() => {
          this.autoClearDays.set(config.done_lane_auto_clear_days?.toString() ?? '');
          this.lastConfirmed = config;
        });
      }
    });
  }

  protected onAutoClearDaysChange(event: Event): void {
    this.autoClearDays.set((event.target as HTMLInputElement).value);
  }

  protected save(): void {
    const raw = this.autoClearDays().trim();
    const parsed = raw === '' ? null : Number(raw);
    if (parsed !== null && (!Number.isInteger(parsed) || parsed < 1)) {
      this.toast.error('Auto-clear days must be empty (never) or a whole number ≥ 1');
      return;
    }

    const value: ExecutionConfigValue = { done_lane_auto_clear_days: parsed };
    this.saving.set(true);
    this.service.saveConfig(value).subscribe({
      next: () => {
        this.saving.set(false);
        this.lastConfirmed = value;
        this.autoClearDays.set(parsed?.toString() ?? '');
        this.toast.success('Execution settings saved');
      },
      error: (err) => {
        this.saving.set(false);
        const detail = err?.error?.message ?? err?.message ?? 'Unknown error';
        this.toast.error(`Couldn't save: ${detail}`);
      },
    });
  }
}
