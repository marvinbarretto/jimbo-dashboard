import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { ClarificationPrompt } from '@shared/components/clarification-prompt/clarification-prompt';
import { BriefingFeedback } from '../briefing-feedback/briefing-feedback';
import type {
  BriefingAnalysisData,
  WeekTrackingStatus,
} from '../../data-access/briefing.types';

// Reading surface for a schema_version 2 briefing, mapped onto the global
// report vocabulary (styles/_report.scss — serif = read, mono = scan).
// Interactive edges: open questions answer inline (BriefingQuestion), and
// every item/section takes hit/miss feedback (BriefingFeedback) from which
// the overall briefing rating is derived.
@Component({
  selector: 'app-briefing-report',
  imports: [UiBadge, ClarificationPrompt, BriefingFeedback, RouterLink],
  templateUrl: './briefing-report.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BriefingReport {
  readonly analysis = input.required<BriefingAnalysisData>();
  readonly briefingId = input.required<number>();
  // Set when the page renders suggested blocks elsewhere (the calendar
  // board on briefing-detail) so they don't appear twice.
  readonly hideSuggestedBlocks = input(false);

  protected readonly hasReview = computed(() => (this.analysis().yesterday_review?.length ?? 0) > 0);
  protected readonly hasWeek = computed(() => (this.analysis().week_tracking?.length ?? 0) > 0);
  protected readonly hasQuestions = computed(() => (this.analysis().open_questions?.length ?? 0) > 0);
  protected readonly hasInsights = computed(() => (this.analysis().insights?.length ?? 0) > 0);
  protected readonly hasOppThreats = computed(() => (this.analysis().opportunities_threats?.length ?? 0) > 0);
  protected readonly hasBlocks = computed(() =>
    !this.hideSuggestedBlocks() && (this.analysis().suggested_blocks?.length ?? 0) > 0);
  protected readonly hasTasks = computed(() => this.analysis().vault_tasks.length > 0);
  protected readonly hasReceipts = computed(() => (this.analysis().receipts?.length ?? 0) > 0);
  protected readonly hasStillOpen = computed(() => (this.analysis().still_open?.length ?? 0) > 0);

  // Evidence / ledger refs are either a URL or a vault seq. Seqs deep-link via
  // the ?detail= modal the briefing page already supports; URLs open as-is.
  protected isUrl(ref: string): boolean {
    return ref.startsWith('http://') || ref.startsWith('https://');
  }

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
