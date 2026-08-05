import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import type { DayCheckItem } from '@domain/day-checks';
import { DayChecksService } from '../../data-access/day-checks.service';

/**
 * The one authoring surface in an otherwise read-only journal.
 *
 * Everything else on the day page reconstructs what happened from telemetry.
 * This is where Marvin says what the machine can't see — whether he started the
 * day on purpose, whether he made the call he meant to make.
 *
 * Deliberately a *pull* surface. Scheduled Telegram nudges were answered 2/44
 * over 21 Jul–5 Aug; the same buttons fired at the end of a pomodoro were
 * answered 10/10. A list you open when you want has no dismissal habit to form.
 */
@Component({
  selector: 'app-journal-checks-section',
  imports: [FormsModule, UiEmptyState, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journal-checks-section.html',
  styleUrl: './journal-checks-section.scss',
})
export class JournalChecksSection {
  /** Logical day key (YYYY-MM-DD). */
  readonly date = input.required<string>();

  private readonly service = inject(DayChecksService);

  protected readonly items = signal<DayCheckItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly adding = signal(false);
  protected readonly newLabel = signal('');
  /** Ids with a request in flight — used to disable just that row, not the list. */
  protected readonly pending = signal<ReadonlySet<string>>(new Set());

  protected readonly answered = computed(() => this.items().filter(i => i.entry !== null).length);
  protected readonly total = computed(() => this.items().length);

  protected readonly meta = computed(() => {
    const total = this.total();
    if (total === 0) return null;
    return `${this.answered()} of ${total}`;
  });

  protected readonly open = signal(true);

  constructor() {
    // Refetch whenever the page moves to a different day.
    effect(() => {
      const date = this.date();
      this.loading.set(true);
      this.error.set(null);
      this.service.day(date).subscribe({
        next: res => {
          this.items.set(res.items);
          this.loading.set(false);
        },
        error: () => {
          this.error.set("Couldn't load the day's checks.");
          this.loading.set(false);
        },
      });
    });
  }

  protected isPending(id: string): boolean {
    return this.pending().has(id);
  }

  private markPending(id: string, on: boolean): void {
    const next = new Set(this.pending());
    if (on) next.add(id); else next.delete(id);
    this.pending.set(next);
  }

  /** Replace one item in place so the list doesn't reorder under the cursor. */
  private patchItem(id: string, patch: Partial<DayCheckItem>): void {
    this.items.update(list => list.map(i => (i.id === id ? { ...i, ...patch } : i)));
  }

  protected toggle(item: DayCheckItem): void {
    if (this.isPending(item.id)) return;
    const wasTicked = item.entry !== null;
    this.markPending(item.id, true);

    const done = () => this.markPending(item.id, false);

    if (wasTicked) {
      // Un-tick clears the row entirely: absence means unanswered, which is a
      // different fact from "answered no" and the research depends on the gap.
      this.service.clearEntry(item.id, this.date()).subscribe({
        next: () => { this.patchItem(item.id, { entry: null }); done(); },
        error: done,
      });
    } else {
      this.service.setEntry(item.id, { date: this.date() }).subscribe({
        next: entry => { this.patchItem(item.id, { entry }); done(); },
        error: done,
      });
    }
  }

  protected setScale(item: DayCheckItem, value: number): void {
    if (this.isPending(item.id)) return;
    this.markPending(item.id, true);
    this.service.setEntry(item.id, { date: this.date(), value_int: value }).subscribe({
      next: entry => { this.patchItem(item.id, { entry }); this.markPending(item.id, false); },
      error: () => this.markPending(item.id, false),
    });
  }

  protected setText(item: DayCheckItem, value: string): void {
    const trimmed = value.trim();
    if (this.isPending(item.id) || trimmed === (item.entry?.value_text ?? '')) return;
    this.markPending(item.id, true);
    const req = trimmed
      ? this.service.setEntry(item.id, { date: this.date(), value_text: trimmed })
      : null;
    if (!req) {
      this.service.clearEntry(item.id, this.date()).subscribe({
        next: () => { this.patchItem(item.id, { entry: null }); this.markPending(item.id, false); },
        error: () => this.markPending(item.id, false),
      });
      return;
    }
    req.subscribe({
      next: entry => { this.patchItem(item.id, { entry }); this.markPending(item.id, false); },
      error: () => this.markPending(item.id, false),
    });
  }

  protected scaleValues(item: DayCheckItem): number[] {
    const min = item.scale_min ?? 1;
    const max = item.scale_max ?? 5;
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }

  /**
   * Ad-hoc items are created as cadence 'once' — "did I call X" is a today
   * question, and once answered it should leave rather than become permanent
   * furniture. Standing checks are created deliberately, not by typing into a
   * box on a day page.
   */
  protected addAdhoc(): void {
    const label = this.newLabel().trim();
    if (!label || this.adding()) return;
    this.adding.set(true);
    this.service.create({ label, cadence: 'once' }).subscribe({
      next: def => {
        this.items.update(list => [...list, { ...def, entry: null }]);
        this.newLabel.set('');
        this.adding.set(false);
      },
      error: () => this.adding.set(false),
    });
  }
}
