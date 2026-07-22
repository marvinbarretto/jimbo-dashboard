import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import type { AnswerClarificationResponse, Clarification } from '@domain/clarifications';
import { environment } from '../../../../environments/environment';

type Mode = 'idle' | 'sending' | 'acked' | 'dismissed' | 'error';

// A question Jimbo asked, answerable exactly where it's shown — quick-answer
// options, a free-text reply, or dismiss — with the acknowledgement beat inline
// (act → ✓ → "Jimbo has your answer"). Backed by the clarifications rail, so
// any surface that files a clarification can drop this in: briefings, picture,
// vault cards. Renders with the global report-notice vocabulary (_report.scss).
@Component({
  selector: 'app-clarification-prompt',
  imports: [ReactiveFormsModule],
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
  protected readonly reply = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  protected readonly answerable = computed(() => !!this.clarificationId());
  protected readonly busy = computed(() => this.mode() === 'sending');

  protected async sendOption(option: string): Promise<void> {
    await this.send(option);
  }

  protected async sendReply(): Promise<void> {
    if (this.reply.invalid) return;
    await this.send(this.reply.value.trim());
  }

  private async send(text: string): Promise<void> {
    const id = this.clarificationId();
    if (!id || !text || this.busy()) return;
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
    if (!id || this.busy()) return;
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
