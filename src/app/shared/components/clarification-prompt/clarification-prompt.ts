import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { AnswerClarificationResponse, Clarification } from '@domain/clarifications';
import { AnswerRail, type AnswerRailState } from '@shared/components/answer-rail/answer-rail';
import { environment } from '../../../../environments/environment';

type Mode = 'idle' | 'sending' | 'acked' | 'dismissed' | 'error';

// A question Jimbo asked, answerable exactly where it's shown — quick-answer
// options, a free-text reply, or dismiss — with the acknowledgement beat inline
// (act → ✓ → "Jimbo has your answer"). Backed by the clarifications rail, so
// any surface that files a clarification can drop this in: briefings, picture,
// vault cards. Renders with the global report-notice vocabulary (_report.scss)
// for the lead/hint, and app-answer-rail for the answer interaction itself.
@Component({
  selector: 'app-clarification-prompt',
  imports: [AnswerRail],
  templateUrl: './clarification-prompt.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClarificationPrompt {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  readonly question = input.required<string>();
  // Small mono context line under the question (e.g. what it gates).
  readonly hint = input<string | undefined>(undefined);
  // Without an id the prompt is display-only.
  readonly clarificationId = input<string | undefined>(undefined);
  readonly options = input<string[] | undefined>(undefined);
  // Preview-only (ui-lab): start in a given state without touching the API.
  readonly initialMode = input<Mode>('idle');
  readonly initialAnswer = input<string | null>(null);

  protected readonly mode = signal<Mode>('idle');
  protected readonly sentAnswer = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.mode.set(this.initialMode());
      this.sentAnswer.set(this.initialAnswer());
    });
  }

  protected readonly answerable = computed(() => !!this.clarificationId());
  protected readonly railState = computed<AnswerRailState>(() => {
    const mode = this.mode();
    return mode === 'idle' ? 'open' : mode;
  });
  protected readonly ackMessage = computed(() => {
    const answer = this.sentAnswer();
    return answer ? `✓ "${answer}" — Jimbo has your answer. It feeds the next briefing.` : null;
  });

  protected async sendOption(option: string): Promise<void> {
    await this.send(option);
  }

  protected async sendReply(text: string): Promise<void> {
    await this.send(text);
  }

  private async send(text: string): Promise<void> {
    const id = this.clarificationId();
    if (!id || !text || this.mode() === 'sending') return;
    this.mode.set('sending');
    try {
      await firstValueFrom(this.http.post<AnswerClarificationResponse>(
        `${this.base}/api/clarifications/answer`,
        { clarification_id: id, answer_text: text },
      ));
      this.sentAnswer.set(text);
      this.mode.set('acked');
    } catch {
      this.mode.set('error');
    }
  }

  protected async dismiss(): Promise<void> {
    const id = this.clarificationId();
    if (!id || this.mode() === 'sending') return;
    this.mode.set('sending');
    try {
      await firstValueFrom(this.http.patch<Clarification>(
        `${this.base}/api/clarifications/${id}`,
        { status: 'dismissed' },
      ));
      this.mode.set('dismissed');
    } catch {
      this.mode.set('error');
    }
  }

  protected retry(): void {
    this.mode.set('idle');
  }
}
