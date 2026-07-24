import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type {
  AnswerClarificationCreate, AnswerClarificationResponse, Clarification,
  ClarificationKind, ClarificationSourceKind,
} from '@domain/clarifications';
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
  // The prompt is answerable when it either points at a filed clarification
  // (clarificationId) OR carries a sourceRef to file-on-answer. With neither
  // it's display-only (e.g. the briefing's "queue is full" notice).
  readonly clarificationId = input<string | undefined>(undefined);
  // File-on-answer: when there's no clarificationId, answering describes the
  // question via these and the server find-or-creates then answers it. Keeps a
  // cap-blocked briefing question answerable in place instead of dead prose.
  readonly sourceRef = input<string | undefined>(undefined);
  readonly sourceKind = input<ClarificationSourceKind>('briefing');
  readonly kind = input<ClarificationKind>('followup');
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

  protected readonly answerable = computed(() => !!this.clarificationId() || !!this.sourceRef());
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
    if (!text || !this.answerable() || this.mode() === 'sending') return;
    const id = this.clarificationId();
    // With an id we answer it directly; without, we hand the server enough to
    // find-or-create the question (cap-bypassed) and answer it in one call.
    const body = id
      ? { clarification_id: id, answer_text: text }
      : {
          create: {
            content: this.question(),
            kind: this.kind(),
            source_kind: this.sourceKind(),
            source_ref: this.sourceRef(),
          } satisfies AnswerClarificationCreate,
          answer_text: text,
        };
    this.mode.set('sending');
    try {
      await firstValueFrom(this.http.post<AnswerClarificationResponse>(
        `${this.base}/api/clarifications/answer`,
        body,
      ));
      this.sentAnswer.set(text);
      this.mode.set('acked');
    } catch {
      this.mode.set('error');
    }
  }

  protected async dismiss(): Promise<void> {
    if (this.mode() === 'sending') return;
    const id = this.clarificationId();
    // Nothing was ever filed for a file-on-answer question, so there's no row
    // to dismiss — just hide it. Its ref is briefing-scoped, so the next
    // briefing regenerates the question fresh if it still matters.
    if (!id) {
      this.mode.set('dismissed');
      return;
    }
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
