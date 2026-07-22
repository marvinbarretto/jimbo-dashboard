import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import type {
  BriefingAnalysisData,
  WeekTrackingStatus,
} from '../../data-access/briefing.types';

// Reading surface for a schema_version 2 briefing. Purely presentational —
// hands the analysis blob to a typographic layout tuned for scanning: big
// bold leads, muted support lines, state colour only where it means something.
@Component({
  selector: 'app-briefing-report',
  imports: [UiBadge],
  templateUrl: './briefing-report.html',
  styleUrl: './briefing-report.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BriefingReport {
  readonly analysis = input.required<BriefingAnalysisData>();

  protected readonly hasReview = computed(() => (this.analysis().yesterday_review?.length ?? 0) > 0);
  protected readonly hasWeek = computed(() => (this.analysis().week_tracking?.length ?? 0) > 0);
  protected readonly hasQuestions = computed(() => (this.analysis().open_questions?.length ?? 0) > 0);
  protected readonly hasInsights = computed(() => (this.analysis().insights?.length ?? 0) > 0);
  protected readonly hasOppThreats = computed(() => (this.analysis().opportunities_threats?.length ?? 0) > 0);
  protected readonly hasBlocks = computed(() => (this.analysis().suggested_blocks?.length ?? 0) > 0);
  protected readonly hasTasks = computed(() => this.analysis().vault_tasks.length > 0);

  protected weekTone(status: WeekTrackingStatus): 'success' | 'warning' | 'danger' | 'neutral' {
    switch (status) {
      case 'on-track': return 'success';
      case 'at-risk': return 'warning';
      case 'off-track': return 'danger';
      case 'done': return 'neutral';
    }
  }

  // ▰-meter for block size: 1 glyph per pomodoro, capped so an outlier
  // suggestion can't wrap the row.
  protected sizeMeter(blocks: number): string {
    return '▰'.repeat(Math.min(blocks, 8));
  }

  protected sizeMinutes(blocks: number): number {
    return blocks * 25;
  }
}
