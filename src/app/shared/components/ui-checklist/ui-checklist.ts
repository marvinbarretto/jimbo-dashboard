import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, input, output, signal, viewChild } from '@angular/core';
import { UiProgressMeter } from '../ui-progress-meter/ui-progress-meter';
import { MentionDirective, type MentionTrigger } from '@shared/mentions';

export type UiChecklistTone = 'warn' | 'err';

export interface UiChecklistStatus {
  readonly label: string;
  readonly tone: UiChecklistTone;
  readonly title?: string;
}

export interface UiChecklistMeter {
  readonly current: number;
  readonly target: number;
  readonly unit?: string;
  /** 'dots' renders one pip per unit instead of a bar — better for tiny
   * targets (1–5) where a near-empty bar over-dramatises the gap. Targets
   * above 8 fall back to the bar regardless. */
  readonly display?: 'bar' | 'dots';
}

export interface UiChecklistItem {
  readonly text: string;
  readonly done: boolean;
  readonly status?: UiChecklistStatus | null;
  /** When set (read-only rows), the row shows a progress meter instead of plain
   * text — the item's `text` becomes the meter label. */
  readonly meter?: UiChecklistMeter | null;
}

// Editable mode emits granular events keyed by index so consumers don't have
// to mirror the array math. Append fires with the new text only; the consumer
// is responsible for pushing it onto whatever state shape it owns.
@Component({
  selector: 'app-ui-checklist',
  imports: [UiProgressMeter, MentionDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (items().length > 0) {
      <ul class="ui-checklist">
        @for (item of items(); track $index; let i = $index) {
          <li
            class="ui-checklist__item"
            [class.ui-checklist__item--done]="checkable() && item.done"
            [class.ui-checklist__item--warn]="item.status?.tone === 'warn'"
            [class.ui-checklist__item--err]="item.status?.tone === 'err'"
            [class.ui-checklist__item--editable]="editable()">
            @if (checkable()) {
              @if (editable()) {
                <input
                  type="checkbox"
                  class="ui-checklist__check"
                  [checked]="item.done"
                  [attr.aria-label]="'mark ' + (item.done ? 'pending' : 'done')"
                  (change)="onToggle(i)"
                />
              } @else {
                <span class="ui-checklist__mark" [attr.aria-label]="item.done ? 'done' : 'pending'">
                  {{ item.done ? '✓' : '○' }}
                </span>
              }
            } @else {
              <span class="ui-checklist__bullet" aria-hidden="true">•</span>
            }
            @if (editable() && editingIndex() === i) {
              <input
                #editInput
                type="text"
                class="ui-checklist__edit-input"
                [value]="draft()"
                [appMention]="triggers()"
                (input)="onDraftInput($event)"
                (keydown)="onDraftKey($event, i)"
                (blur)="commitEdit(i)"
              />
            } @else if (!editable() && useDots(item.meter) && item.meter; as meter) {
              <span class="ui-checklist__text">{{ item.text }}</span>
              <span
                class="ui-checklist__dots"
                role="meter"
                [attr.aria-valuenow]="meter.current"
                [attr.aria-valuemin]="0"
                [attr.aria-valuemax]="meter.target"
                [attr.aria-label]="item.text">
                @for (on of dotsFor(meter); track $index) {
                  <span class="ui-checklist__dot" [class.ui-checklist__dot--on]="on"></span>
                }
              </span>
              <span class="ui-checklist__dots-count">{{ meter.current }}/{{ meter.target }}</span>
            } @else if (!editable() && item.meter; as meter) {
              <app-ui-progress-meter
                class="ui-checklist__meter"
                [label]="item.text"
                [current]="meter.current"
                [target]="meter.target"
                [unit]="meter.unit ?? ''"
              />
            } @else {
              <span
                class="ui-checklist__text"
                [class.ui-checklist__text--clickable]="editable()"
                [attr.role]="editable() ? 'button' : null"
                [attr.tabindex]="editable() ? 0 : null"
                (click)="onTextClick(i)"
                (keydown.enter)="onTextEnter(i)">{{ item.text }}</span>
            }
            @if (item.status; as s) {
              <span
                class="ui-checklist__chip"
                [class.ui-checklist__chip--warn]="s.tone === 'warn'"
                [class.ui-checklist__chip--err]="s.tone === 'err'"
                [title]="s.title ?? null">
                {{ s.label }}
              </span>
            }
            @if (editable()) {
              <button
                type="button"
                class="ui-checklist__remove"
                aria-label="remove"
                (click)="onRemove(i)">×</button>
            }
          </li>
        }
      </ul>
    } @else if (emptyMessage(); as empty) {
      <div class="ui-checklist__empty">{{ empty }}</div>
    }

    @if (editable()) {
      <input
        #appendInput
        type="text"
        class="ui-checklist__append"
        [value]="appendDraft()"
        [placeholder]="appendPlaceholder()"
        [appMention]="triggers()"
        (input)="onAppendInput($event)"
        (keydown)="onAppendKey($event)"
      />
    }
  `,
  styles: [`
    /* List-item text reads like anywhere else in the app (briefings, prose
       fields) — the shared serif reading register, not a dense UI-chrome
       font. See src/styles/_report.scss .prose-read for the same values;
       hardcoded here rather than applied as a class since component-style
       vs global-stylesheet load order isn't guaranteed. */
    .ui-checklist {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .ui-checklist__item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.3rem 0;
      font-family: var(--font-serif);
      font-size: 1.02rem;
      line-height: 1.65;
    }

    .ui-checklist__item--done {
      color: var(--color-text-muted);
    }

    .ui-checklist__item--done .ui-checklist__text {
      text-decoration: line-through;
    }

    .ui-checklist__item--warn {
      border-left: 2px solid var(--color-warning, #d99);
      padding-left: 0.45rem;
    }

    .ui-checklist__item--err {
      border-left: 2px solid var(--color-error, #f88);
      padding-left: 0.45rem;
    }

    .ui-checklist__mark {
      flex-shrink: 0;
      width: 1rem;
    }

    .ui-checklist__bullet {
      flex-shrink: 0;
      color: var(--color-text-muted);
    }

    .ui-checklist__check {
      flex-shrink: 0;
      margin: 0;
    }

    .ui-checklist__text {
      flex: 1;
      padding: 0.1rem 0.3rem;
      border-radius: var(--radius);
      letter-spacing: 0.005em;
    }

    .ui-checklist__meter {
      flex: 1;
      min-width: 0;
      padding: 0.1rem 0.3rem;
    }

    .ui-checklist__dots {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .ui-checklist__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      border: 1.5px solid var(--color-text-muted);
      box-sizing: border-box;
    }

    .ui-checklist__dot--on {
      background: var(--color-success, #34d399);
      border-color: var(--color-success, #34d399);
    }

    .ui-checklist__dots-count {
      flex-shrink: 0;
      min-width: 2rem;
      text-align: right;
      font-size: 0.68rem;
      font-variant-numeric: tabular-nums;
      color: var(--color-text-muted);
    }

    // Underline cue reads better on serif prose than a highlight box.
    .ui-checklist__text--clickable {
      cursor: text;

      &:hover, &:focus-visible {
        text-decoration: underline dotted;
        text-decoration-color: var(--color-text-muted);
        outline: none;
      }
    }

    .ui-checklist__edit-input {
      flex: 1;
      padding: 0.1rem 0.3rem;
      font-family: var(--font-serif);
      font-size: 1.02rem;
      letter-spacing: 0.005em;
      border: 1px solid var(--color-accent);
      border-radius: var(--radius);
      background: var(--color-bg-elevated, var(--color-bg));
      color: var(--color-text);

      &:focus { outline: none; }
    }

    .ui-checklist__chip {
      font-size: 0.65rem;
      padding: 0 0.35rem;
      border-radius: 3px;
      white-space: nowrap;
    }

    .ui-checklist__chip--warn {
      background: color-mix(in oklab, var(--color-warning, #d99) 20%, transparent);
      color: var(--color-warning, #d99);
    }

    .ui-checklist__chip--err {
      background: color-mix(in oklab, var(--color-error, #f88) 20%, transparent);
      color: var(--color-error, #f88);
    }

    .ui-checklist__remove {
      padding: 0 0.4rem;
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--color-text-muted);
      font-size: 0.85rem;
      line-height: 1;

      &:hover { color: var(--color-danger); }
    }

    .ui-checklist__empty {
      padding: 0.4rem 0.6rem;
      background: #fbe7e7;
      border: 1px dashed #a33;
      color: #a33;
      font-size: 0.7rem;
    }

    .ui-checklist__append {
      margin-top: 0.4rem;
      width: 100%;
      box-sizing: border-box;
      padding: 0.4rem 0.3rem;
      font-family: var(--font-serif);
      font-size: 1.02rem;
      letter-spacing: 0.005em;
      background: transparent;
      border: none;
      border-bottom: 1px dashed var(--color-border);
      color: var(--color-text);

      &:focus {
        outline: none;
        border-bottom-color: var(--color-accent);
        border-bottom-style: solid;
      }
    }
  `],
})
export class UiChecklist {
  readonly items             = input.required<readonly UiChecklistItem[]>();
  readonly emptyMessage      = input<string | null>(null);
  readonly editable          = input<boolean>(false);
  readonly appendPlaceholder = input<string>('+ add item (Enter)');
  // false for plain editable-list use (e.g. brief bullets) where an item is
  // a standing statement, not a completable to-do — item.done is ignored
  // and a plain bullet marker replaces the checkbox/mark.
  readonly checkable         = input<boolean>(true);
  // @ / ~ mention support on the edit and append inputs — empty by default,
  // which leaves the directive inert.
  readonly triggers          = input<MentionTrigger[]>([]);

  readonly toggled  = output<number>();
  readonly edited   = output<{ index: number; text: string }>();
  readonly removed  = output<number>();
  readonly appended = output<string>();

  protected readonly editingIndex = signal<number | null>(null);
  protected readonly draft        = signal('');
  protected readonly appendDraft  = signal('');
  private readonly editRef        = viewChild<ElementRef<HTMLInputElement>>('editInput');
  private readonly appendRef      = viewChild<ElementRef<HTMLInputElement>>('appendInput');

  private renderCount = 0;

  constructor() {
    // Cancel in-flight edit when the items array changes underneath us
    // (consumer swapped the bound list). Logged so a runaway loop here (the
    // parent recreating `items` every cycle instead of memoizing it) shows
    // up as a burst of these lines with near-identical timestamps.
    effect(() => {
      const count = this.items().length;
      this.renderCount++;
      console.debug('[UiChecklist] items() changed — resetting editingIndex', {
        itemCount: count,
        effectRun: this.renderCount,
        at: performance.now(),
      });
      this.editingIndex.set(null);
    });
  }

  protected useDots(meter: UiChecklistMeter | null | undefined): boolean {
    return meter?.display === 'dots' && meter.target > 0 && meter.target <= 8;
  }

  protected dotsFor(meter: UiChecklistMeter): boolean[] {
    return Array.from({ length: meter.target }, (_, i) => i < meter.current);
  }

  protected onTextClick(i: number): void {
    if (this.editable()) this.startEdit(i);
  }

  protected onTextEnter(i: number): void {
    if (this.editable()) this.startEdit(i);
  }

  private startEdit(i: number): void {
    this.draft.set(this.items()[i]?.text ?? '');
    this.editingIndex.set(i);
    queueMicrotask(() => {
      const el = this.editRef()?.nativeElement;
      el?.focus();
      el?.select();
    });
  }

  protected onDraftInput(e: Event): void {
    this.draft.set((e.target as HTMLInputElement).value);
  }

  protected onDraftKey(e: KeyboardEvent, i: number): void {
    if (e.key === 'Enter')       { e.preventDefault(); this.commitEdit(i); }
    else if (e.key === 'Escape') { e.preventDefault(); this.cancelEdit(); }
  }

  protected commitEdit(i: number): void {
    if (this.editingIndex() !== i) return;
    const next = this.draft().trim();
    this.editingIndex.set(null);
    if (!next) {
      console.debug('[UiChecklist] commitEdit — blank draft, treating as remove', { index: i });
      this.removed.emit(i);
      return;
    }
    if (next === this.items()[i]?.text) {
      console.debug('[UiChecklist] commitEdit — unchanged, no emit', { index: i });
      return;
    }
    console.debug('[UiChecklist] commitEdit — emitting edited', { index: i, text: next });
    this.edited.emit({ index: i, text: next });
  }

  private cancelEdit(): void {
    this.editingIndex.set(null);
    this.draft.set('');
  }

  protected onToggle(i: number): void {
    console.debug('[UiChecklist] onToggle', { index: i });
    this.toggled.emit(i);
  }

  protected onRemove(i: number): void {
    console.debug('[UiChecklist] onRemove', { index: i });
    this.removed.emit(i);
  }

  protected onAppendInput(e: Event): void {
    this.appendDraft.set((e.target as HTMLInputElement).value);
  }

  protected onAppendKey(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      const text = this.appendDraft().trim();
      if (!text) return;
      console.debug('[UiChecklist] onAppendKey — emitting appended', { text });
      this.appended.emit(text);
      this.appendDraft.set('');
      queueMicrotask(() => this.appendRef()?.nativeElement.focus());
    } else if (e.key === 'Escape') {
      this.appendDraft.set('');
    }
  }
}
