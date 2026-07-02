import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ToastService } from '@shared/components/toast/toast.service';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { AutomationSettingsService, type AutomationConfigValue, type AutomationExecutor } from './automation-settings.service';

const EXECUTOR_OPTIONS: readonly AutomationExecutor[] = ['boris', 'ralph', 'jimbo', 'marvin'];

@Component({
  selector: 'app-automation-settings-page',
  imports: [UiButton, UiLoadingState, UiPageHeader, UiSection, UiStack],
  templateUrl: './automation-settings-page.html',
  styleUrl: './automation-settings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutomationSettingsPage {
  private readonly service = inject(AutomationSettingsService);
  private readonly toast = inject(ToastService);

  readonly executorOptions = EXECUTOR_OPTIONS;

  protected readonly loading = computed(() => this.service.config() === undefined);
  protected readonly saving = signal(false);

  protected readonly executor = signal<AutomationExecutor>('boris');
  protected readonly skill = signal('vault-grooming/analyse');
  // Editable as text so the field can be empty (= "never"); parsed to
  // number | null on save.
  protected readonly autoClearDays = signal('');

  private lastConfirmed: AutomationConfigValue = {
    github_assessment_executor: 'boris',
    github_assessment_skill: 'vault-grooming/analyse',
    done_lane_auto_clear_days: null,
  };

  protected readonly dirty = computed(() =>
    this.executor() !== this.lastConfirmed.github_assessment_executor
    || this.skill() !== this.lastConfirmed.github_assessment_skill
    || this.autoClearDays() !== (this.lastConfirmed.done_lane_auto_clear_days?.toString() ?? ''),
  );

  constructor() {
    // Seed local editable state once the server value arrives.
    effect(() => {
      const config = this.service.config();
      if (config !== undefined) {
        untracked(() => {
          this.executor.set(config.github_assessment_executor);
          this.skill.set(config.github_assessment_skill);
          this.autoClearDays.set(config.done_lane_auto_clear_days?.toString() ?? '');
          this.lastConfirmed = config;
        });
      }
    });
  }

  protected save(): void {
    const trimmedSkill = this.skill().trim();
    if (!trimmedSkill) {
      this.toast.error('Skill is required');
      return;
    }
    const rawDays = this.autoClearDays().trim();
    const parsedDays = rawDays === '' ? null : Number(rawDays);
    if (parsedDays !== null && (!Number.isInteger(parsedDays) || parsedDays < 1)) {
      this.toast.error('Auto-clear days must be empty (never) or a whole number ≥ 1');
      return;
    }

    const value: AutomationConfigValue = {
      github_assessment_executor: this.executor(),
      github_assessment_skill: trimmedSkill,
      done_lane_auto_clear_days: parsedDays,
    };

    this.saving.set(true);
    this.service.saveConfig(value).subscribe({
      next: () => {
        this.saving.set(false);
        this.lastConfirmed = value;
        this.skill.set(trimmedSkill);
        this.autoClearDays.set(parsedDays?.toString() ?? '');
        this.toast.success('Automation settings saved');
      },
      error: (err) => {
        this.saving.set(false);
        const detail = err?.error?.message ?? err?.message ?? 'Unknown error';
        this.toast.error(`Couldn't save: ${detail}`);
      },
    });
  }

  protected onExecutorChange(event: Event): void {
    this.executor.set((event.target as HTMLSelectElement).value as AutomationExecutor);
  }

  protected onSkillChange(event: Event): void {
    this.skill.set((event.target as HTMLInputElement).value);
  }

  protected onAutoClearDaysChange(event: Event): void {
    this.autoClearDays.set((event.target as HTMLInputElement).value);
  }
}
