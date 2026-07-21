import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CheckinsService } from '../../data-access/checkins.service';
import { ToastService } from '@shared/components/toast/toast.service';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiBarChart } from '@shared/components/ui-bar-chart/ui-bar-chart';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiScorePicker } from '@shared/components/ui-score-picker/ui-score-picker';
import { MOOD_LABELS, ENERGY_LABELS, type MoodDailyRow } from '@domain/checkins';

const PERIODS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const;

@Component({
  selector: 'app-checkins-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiStack, UiCard, UiButton, UiCluster, UiBarChart, UiEmptyState, UiScorePicker],
  templateUrl: './checkins-page.html',
  styleUrl: './checkins-page.scss',
})
export class CheckinsPage implements OnInit {
  private readonly checkins = inject(CheckinsService);
  private readonly toast = inject(ToastService);

  readonly periods = PERIODS;
  readonly periodDays = signal<number>(30);
  readonly moodLabels = MOOD_LABELS;
  readonly energyLabels = ENERGY_LABELS;

  readonly mood = signal<number | null>(null);
  readonly energy = signal<number | null>(null);
  readonly saving = signal(false);

  readonly rows = signal<MoodDailyRow[]>([]);
  readonly loading = signal(true);

  async ngOnInit(): Promise<void> {
    await this.loadDaily();
  }

  async setPeriod(days: number): Promise<void> {
    this.periodDays.set(days);
    await this.loadDaily();
  }

  private async loadDaily(): Promise<void> {
    this.loading.set(true);
    try {
      const { days } = await firstValueFrom(this.checkins.daily({ days: this.periodDays() }));
      this.rows.set(days);
    } catch {
      this.toast.error('Could not load check-in trends');
    } finally {
      this.loading.set(false);
    }
  }

  labels(): string[] {
    return this.rows().map(r => r.date);
  }

  moodValues(): number[] {
    return this.rows().map(r => r.avg_mood);
  }

  energyValues(): number[] {
    return this.rows().map(r => r.avg_energy);
  }

  async save(): Promise<void> {
    const mood = this.mood();
    const energy = this.energy();
    if (mood == null || energy == null) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.checkins.create({ source: 'dashboard', mood, energy }));
      this.toast.success('Check-in logged');
      this.mood.set(null);
      this.energy.set(null);
      await this.loadDaily();
    } catch {
      this.toast.error('Could not log check-in');
    } finally {
      this.saving.set(false);
    }
  }
}
