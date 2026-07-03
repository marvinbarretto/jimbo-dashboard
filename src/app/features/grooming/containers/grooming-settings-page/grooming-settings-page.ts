import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ToastService } from '@shared/components/toast/toast.service';
import { UiBackLink } from '@shared/components/ui-back-link/ui-back-link';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { GroomingConfigService, type GroomingConfigValue, type GroomingAssessmentExecutor } from '@features/grooming/data-access/grooming-config.service';

const EXECUTOR_OPTIONS: readonly GroomingAssessmentExecutor[] = ['boris', 'ralph', 'jimbo', 'marvin'];

@Component({
  selector: 'app-grooming-settings-page',
  imports: [UiBackLink, UiButton, UiLoadingState, UiPageHeader, UiSection, UiStack],
  templateUrl: './grooming-settings-page.html',
  styleUrl: './grooming-settings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroomingSettingsPage {
  private readonly service = inject(GroomingConfigService);
  private readonly toast = inject(ToastService);

  readonly executorOptions = EXECUTOR_OPTIONS;

  protected readonly loading = computed(() => this.service.config() === undefined);
  protected readonly saving = signal(false);

  protected readonly executor = signal<GroomingAssessmentExecutor>('boris');
  protected readonly skill = signal('vault-grooming/analyse');

  private lastConfirmed: GroomingConfigValue = {
    github_assessment_executor: 'boris',
    github_assessment_skill: 'vault-grooming/analyse',
  };

  protected readonly dirty = computed(() =>
    this.executor() !== this.lastConfirmed.github_assessment_executor
    || this.skill() !== this.lastConfirmed.github_assessment_skill,
  );

  constructor() {
    effect(() => {
      const config = this.service.config();
      if (config !== undefined) {
        untracked(() => {
          this.executor.set(config.github_assessment_executor);
          this.skill.set(config.github_assessment_skill);
          this.lastConfirmed = config;
        });
      }
    });
  }

  protected onExecutorChange(event: Event): void {
    this.executor.set((event.target as HTMLSelectElement).value as GroomingAssessmentExecutor);
  }

  protected onSkillChange(event: Event): void {
    this.skill.set((event.target as HTMLInputElement).value);
  }

  protected save(): void {
    const trimmedSkill = this.skill().trim();
    if (!trimmedSkill) {
      this.toast.error('Skill is required');
      return;
    }

    const value: GroomingConfigValue = {
      github_assessment_executor: this.executor(),
      github_assessment_skill: trimmedSkill,
    };

    this.saving.set(true);
    this.service.saveConfig(value).subscribe({
      next: () => {
        this.saving.set(false);
        this.lastConfirmed = value;
        this.skill.set(trimmedSkill);
        this.toast.success('Grooming settings saved');
      },
      error: (err) => {
        this.saving.set(false);
        const detail = err?.error?.message ?? err?.message ?? 'Unknown error';
        this.toast.error(`Couldn't save: ${detail}`);
      },
    });
  }
}
