import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { BriefingRating as Rating } from '../../data-access/briefing.types';
import { RATING_OPTIONS } from '../../data-access/briefing.types';

// Presentational rating control: four buttons (Great→Bad) plus an optional
// "why" note. Holds a working copy of the inputs (reset via linkedSignal when
// the row's saved values change) and emits a single `rate` event whenever the
// rating or note changes. The note can't be saved without a rating — the API
// requires one — so the note row only appears once a rating is picked.
@Component({
  selector: 'app-briefing-rating',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rating" [class.rating--pending]="pending()">
      <div class="rating__buttons" role="group" aria-label="Rate this briefing">
        @for (opt of options; track opt.value) {
          <button
            type="button"
            class="rating__btn"
            [class]="'rating__btn--' + opt.value"
            [class.rating__btn--active]="selected() === opt.value"
            [attr.aria-pressed]="selected() === opt.value"
            [disabled]="pending()"
            (click)="pick(opt.value)">
            {{ opt.label }}
          </button>
        }
      </div>

      @if (selected(); as sel) {
        <div class="rating__note">
          @if (editingNote()) {
            <input
              class="rating__note-input"
              type="text"
              placeholder="Why? (optional)"
              [(ngModel)]="noteDraft"
              (keydown.enter)="commitNote()"
              (blur)="commitNote()"
              [disabled]="pending()" />
          } @else {
            <button type="button" class="rating__note-toggle" (click)="startEditingNote()">
              {{ noteText() ? '“' + noteText() + '”' : '+ note' }}
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: inline-block; }
    .rating { display: flex; flex-direction: column; gap: 0.35rem; }
    .rating--pending { opacity: 0.6; pointer-events: none; }
    .rating__buttons { display: inline-flex; border-radius: 0.4rem; overflow: hidden; border: 1px solid var(--border, #2a2a33); width: fit-content; }
    .rating__btn {
      appearance: none; border: 0; border-right: 1px solid var(--border, #2a2a33);
      background: transparent; color: var(--text-muted, #9aa0aa);
      padding: 0.25rem 0.6rem; font-size: 0.8rem; cursor: pointer; line-height: 1.2;
    }
    .rating__btn:last-child { border-right: 0; }
    .rating__btn:hover:not(:disabled) { background: var(--surface-hover, #1d1d24); color: var(--text, #e6e6ea); }
    .rating__btn--active { color: #0b0b0e; font-weight: 600; }
    .rating__btn--great.rating__btn--active { background: #34d399; }
    .rating__btn--good.rating__btn--active  { background: #a3e635; }
    .rating__btn--ok.rating__btn--active    { background: #fbbf24; }
    .rating__btn--bad.rating__btn--active   { background: #f87171; }
    .rating__note-toggle, .rating__note-input {
      font-size: 0.78rem; color: var(--text-muted, #9aa0aa); background: transparent;
    }
    .rating__note-toggle { border: 0; cursor: pointer; padding: 0; text-align: left; }
    .rating__note-toggle:hover { color: var(--text, #e6e6ea); }
    .rating__note-input {
      border: 1px solid var(--border, #2a2a33); border-radius: 0.3rem;
      padding: 0.2rem 0.4rem; min-width: 14rem; color: var(--text, #e6e6ea);
    }
  `],
})
export class BriefingRating {
  readonly rating = input<Rating | null>(null);
  readonly note = input<string | null>(null);
  readonly pending = input(false);

  // Emitted whenever rating or note changes. Rating is always set (the note
  // can't exist without it), so the parent can persist unconditionally.
  readonly rate = output<{ rating: Rating; note: string | null }>();

  protected readonly options = RATING_OPTIONS;

  // Working copies, reset when the persisted inputs change (e.g. after reload).
  protected readonly selected = linkedSignal(() => this.rating());
  protected readonly noteDraft = linkedSignal(() => this.note() ?? '');
  protected readonly editingNote = signal(false);
  protected readonly noteText = computed(() => this.noteDraft().trim());

  protected pick(value: Rating): void {
    this.selected.set(value);
    this.rate.emit({ rating: value, note: this.noteText() || null });
  }

  protected startEditingNote(): void {
    this.editingNote.set(true);
  }

  protected commitNote(): void {
    this.editingNote.set(false);
    const rating = this.selected();
    if (!rating) return;
    if ((this.note() ?? '') === this.noteText()) return; // no change — skip write
    this.rate.emit({ rating, note: this.noteText() || null });
  }
}
