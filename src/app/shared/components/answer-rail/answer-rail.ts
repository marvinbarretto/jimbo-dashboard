import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SmartComposerInput } from '@shared/components/smart-composer-input/smart-composer-input';

export type AnswerRailState = 'open' | 'sending' | 'acked' | 'dismissed' | 'error';

// The shared inline answer interaction: quick-option buttons (optional),
// a free-text fallback, dismiss (optional), and the settled states
// (acked/dismissed/error). State is host-owned — this component is a pure
// shell over whatever async answer/dismiss call the host makes, so the same
// rail drops into a briefing interrupt, a vault item's open-questions block,
// or a full question/clarification card without knowing which backend
// concept (ThreadMessage vs Clarification) it's fronting.
@Component({
  selector: 'app-answer-rail',
  imports: [ReactiveFormsModule, SmartComposerInput],
  host: {
    class: 'rail',
    '[attr.data-state]': 'state()',
  },
  templateUrl: './answer-rail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnswerRail {
  readonly options = input<readonly string[] | undefined>(undefined);
  // Thread questions have no dismiss capability — only clarifications do.
  readonly dismissible = input(false);
  readonly state = input<AnswerRailState>('open');
  // Host composes this (it needs the answer text interpolated in).
  readonly ackMessage = input<string | null>(null);
  readonly dismissedMessage = input('Dismissed.');
  readonly errorMessage = input('Couldn\'t reach Jimbo.');
  readonly inputPlaceholder = input('or answer in your own words…');
  // Thread replies want @actor/#task//project mentions; a Discord-native
  // clarification's quick answer doesn't — swaps the plain input for
  // app-smart-composer-input.
  readonly richText = input(false);

  readonly optionSelected = output<string>();
  readonly textSubmitted = output<string>();
  readonly dismissRequested = output<void>();
  readonly retryRequested = output<void>();

  // [formGroup] (not a bare [formControl]) so FormGroupDirective claims the
  // form's native submit event and prevent-defaults it — without it,
  // (ngSubmit) has nothing bound to it and the browser full-page-reloads.
  protected readonly form = new FormGroup({
    reply: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  protected readonly busy = computed(() => this.state() === 'sending');

  protected selectOption(option: string): void {
    if (this.busy()) return;
    this.optionSelected.emit(option);
  }

  protected submitText(): void {
    if (this.form.invalid || this.busy()) return;
    const text = this.form.controls.reply.value.trim();
    if (!text) return;
    this.textSubmitted.emit(text);
    this.form.reset();
  }
}
