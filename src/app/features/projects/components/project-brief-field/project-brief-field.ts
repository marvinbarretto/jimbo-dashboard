import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { MentionDirective, type MentionTrigger } from '@shared/mentions';

// Labelled textarea for one brief field. Commits to the parent on blur (and
// only if the value actually changed), so the operator can type freely without
// clicking into / out of an edit mode. Supports `[appMention]` triggers so brief
// copy can reference other entities (#tag, @actor/project, ~vault-item).
//
// Local-only to the projects feature on purpose — the save-on-blur shape is
// project-brief-specific. Promoting to a shared primitive can wait until a
// second caller wants the same shape (per the "extend primitives" rule).
@Component({
  selector: 'app-project-brief-field',
  imports: [MentionDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="brief-field">
      <span class="brief-field__label">{{ label() }}</span>
      <textarea
        class="brief-field__input"
        [class.brief-field__input--locked]="readonly()"
        [rows]="rows()"
        [placeholder]="placeholder()"
        [value]="draft()"
        [readonly]="readonly()"
        [appMention]="triggers()"
        (input)="onInput($any($event.target).value)"
        (blur)="onBlur()"
        [attr.aria-label]="label()"
      ></textarea>
      @if (hint(); as h) {
        <span class="brief-field__hint">{{ h }}</span>
      }
    </label>
  `,
  styleUrl: './project-brief-field.scss',
})
export class ProjectBriefField {
  readonly label       = input.required<string>();
  readonly value       = input<string | null>(null);
  readonly placeholder = input<string>('');
  readonly rows        = input<number>(3);
  readonly hint        = input<string | null>(null);
  readonly triggers    = input<MentionTrigger[]>([]);
  // Repo-owned fields (synced from a manifest) render locked — visible + copyable
  // but not editable, since the repo is the source of truth.
  readonly readonly    = input<boolean>(false);

  readonly saved = output<string | null>();

  // `linkedSignal` resets the draft when `value()` changes externally (e.g.
  // optimistic patch resolves), but holds the user's in-flight edit otherwise.
  // Avoids the effect/allowSignalWrites dance that a hand-rolled sync would need.
  protected readonly draft = linkedSignal<string>(() => this.value() ?? '');

  // Used by the directive's selector binding; the directive itself only needs
  // a readonly array but `linkedSignal` typing wants the writable side.
  protected readonly displayed = computed(() => this.draft());

  protected onInput(next: string): void {
    if (this.readonly()) return;
    this.draft.set(next);
  }

  protected onBlur(): void {
    if (this.readonly()) return;
    const next = this.draft().trim();
    const current = (this.value() ?? '').trim();
    if (next === current) return;
    this.saved.emit(next === '' ? null : next);
  }
}
