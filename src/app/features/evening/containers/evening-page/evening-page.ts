import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { ToastService } from '@shared/components/toast/toast.service';
import {
  formatLondonTime,
  logicalToday,
  relativeDayLabel,
  shiftIsoDay,
} from '@shared/utils/datetime.utils';
import type {
  Commitment,
  CommitmentKind,
  CommitmentResolution,
  ReflectionDay,
} from '@domain/reflection';
import { EveningService } from '../../data-access/evening.service';

const KINDS: readonly { value: CommitmentKind; label: string }[] = [
  { value: 'do', label: 'do' },
  { value: 'avoid', label: 'avoid' },
  { value: 'decide', label: 'decide' },
];

/**
 * The evening reflection page.
 *
 * A **pull** surface, and the distinction is load-bearing: scheduled Telegram
 * nudges asking these same questions were answered 2/44 over 21 Jul–5 Aug,
 * while the same questions asked at a boundary Marvin had just crossed were
 * answered 10/10. Nothing here notifies, chases, scores or streaks. He opens
 * it when he opens it, and an evening he skips is missing data rather than a
 * failure.
 *
 * Three panels — today, gratitude, tomorrow. The spec's fourth ("against
 * goals") is deliberately absent until `interrogate_goals` has rows: a drift
 * question computed from zero goals could only be theatre.
 */
@Component({
  selector: 'app-evening-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UiPage, UiPageHeader, UiStack, UiCluster, UiCard, UiButton, UiBadge,
    UiSection, UiEmptyState, UiLoadingState,
  ],
  templateUrl: './evening-page.html',
  styleUrl: './evening-page.scss',
})
export class EveningPage {
  private readonly service = inject(EveningService);
  private readonly toast = inject(ToastService);

  protected readonly kinds = KINDS;

  /** Logical day: a session opened at 01:30 belongs to the evening that is ending. */
  protected readonly day = signal(logicalToday());
  protected readonly tomorrow = computed(() => shiftIsoDay(this.day(), 1));

  private readonly dayRes = httpResource<ReflectionDay>(() => `/api/reflection/day/${this.day()}`);

  protected readonly loading = computed(() => this.dayRes.isLoading() && !this.dayRes.hasValue());
  protected readonly failed = computed(() => this.dayRes.error() !== undefined);

  protected readonly session = computed(() => this.dayRes.value()?.session ?? null);
  protected readonly gratitude = computed(() => this.dayRes.value()?.gratitude ?? []);
  /** Offers, not records — they stay offers until he takes one. */
  protected readonly candidates = computed(() =>
    (this.dayRes.value()?.candidates ?? []).filter(c => !c.accepted),
  );
  protected readonly prep = computed(() => this.dayRes.value()?.prep ?? null);
  protected readonly madeTonight = computed(() => this.dayRes.value()?.made_tonight ?? []);
  protected readonly dueToday = computed(() => this.dayRes.value()?.due_today ?? []);
  protected readonly overdue = computed(() => this.dayRes.value()?.overdue ?? []);

  // "Tonight" rather than relativeDayLabel's answer: after midnight the logical
  // day is yesterday's date, and calling the evening he is sitting in
  // "Yesterday" would be technically true and actively confusing.
  protected readonly dayLabel = computed(() =>
    this.day() === logicalToday() ? 'Tonight' : relativeDayLabel(this.day()),
  );
  protected readonly tomorrowLabel = computed(() => relativeDayLabel(this.tomorrow()));

  protected readonly completedAt = computed(() => {
    const at = this.session()?.completed_at;
    return at ? formatLondonTime(at) : null;
  });

  protected readonly preparedAt = computed(() => {
    const p = this.prep();
    return p ? formatLondonTime(p.generated_at) : null;
  });

  /** The readback: what he said he'd do today, still unanswered. */
  protected readonly openReadback = computed(() => this.dueToday().filter(c => c.status === 'open'));
  protected readonly closedReadback = computed(() => this.dueToday().filter(c => c.status !== 'open'));

  protected readonly saving = signal(false);
  /**
   * Set briefly after a text field saves, so the page can confirm without a
   * toast per blur. Transient on purpose — a "saved" that never clears stops
   * meaning "just now" and starts meaning nothing.
   */
  protected readonly savedField = signal<string | null>(null);
  private savedTimer: ReturnType<typeof setTimeout> | null = null;

  private flashSaved(field: string): void {
    if (this.savedTimer) clearTimeout(this.savedTimer);
    this.savedField.set(field);
    this.savedTimer = setTimeout(() => this.savedField.set(null), 2000);
  }

  protected readonly newGratitude = signal('');
  protected readonly newCommitment = signal('');
  protected readonly newKind = signal<CommitmentKind>('do');
  protected readonly newDelegable = signal(false);

  protected shiftDay(delta: number): void {
    this.day.update(d => shiftIsoDay(d, delta));
  }

  protected toToday(): void {
    this.day.set(logicalToday());
  }

  protected readonly isToday = computed(() => this.day() === logicalToday());

  // ── Authored text ────────────────────────────────────────────────
  //
  // Saved on blur and deliberately WITHOUT reloading the day: a reload would
  // rewrite the sibling textareas from the server mid-sentence, which is the
  // one thing a page holding his unsaved words must never do. Nothing else on
  // screen derives from these fields, so there is nothing to refresh.

  protected saveText(field: 'highs' | 'lows' | 'tomorrow_shape', event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value.trim();
    const current = this.session();
    if ((current?.[field] ?? '') === value) return;

    this.saving.set(true);
    // Empty clears rather than writes '' — striking a high he no longer stands
    // by has to leave no trace, not leave a blank one.
    this.service.saveSession(this.day(), { [field]: value || null }).subscribe({
      next: () => {
        this.saving.set(false);
        this.flashSaved(field);
        // The resource holds a stale session object now. Patching it locally
        // keeps `current` above honest without a refetch that would clobber
        // whatever he is typing next.
        this.dayRes.update(d => (d ? { ...d, session: d.session ? { ...d.session, [field]: value || null } : d.session } : d));
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Could not save — your text is still on screen');
      },
    });
  }

  protected complete(): void {
    this.service.complete(this.day()).subscribe({
      next: () => this.dayRes.reload(),
      error: () => this.toast.error('Could not close the evening'),
    });
  }

  protected reopen(): void {
    this.service.reopen(this.day()).subscribe({
      next: () => this.dayRes.reload(),
      error: () => this.toast.error('Could not re-open the evening'),
    });
  }

  // ── Gratitude ────────────────────────────────────────────────────

  protected addGratitude(): void {
    const content = this.newGratitude().trim();
    if (!content) return;
    this.service.addGratitude(this.day(), content).subscribe({
      next: () => {
        this.newGratitude.set('');
        this.dayRes.reload();
      },
      error: () => this.toast.error('Could not add that'),
    });
  }

  /** Take up an offer. Verbatim — rewording happens afterwards, on the row. */
  protected accept(ref: string): void {
    this.service.acceptCandidate(this.day(), ref).subscribe({
      next: () => this.dayRes.reload(),
      error: () => this.toast.error('Could not accept that'),
    });
  }

  protected editGratitude(id: number, event: Event): void {
    const content = (event.target as HTMLInputElement).value.trim();
    const existing = this.gratitude().find(g => g.id === id);
    if (!content || !existing || existing.content === content) return;
    this.service.updateGratitude(id, content).subscribe({
      next: () => this.dayRes.reload(),
      error: () => this.toast.error('Could not save that'),
    });
  }

  protected removeGratitude(id: number): void {
    this.service.deleteGratitude(id).subscribe({
      next: () => this.dayRes.reload(),
      error: () => this.toast.error('Could not remove that'),
    });
  }

  // ── Commitments ──────────────────────────────────────────────────

  protected addCommitment(): void {
    const content = this.newCommitment().trim();
    if (!content) return;
    this.service.createCommitment({
      content,
      for_day: this.tomorrow(),
      kind: this.newKind(),
      delegable: this.newDelegable(),
    }).subscribe({
      next: () => {
        this.newCommitment.set('');
        this.newKind.set('do');
        this.newDelegable.set(false);
        this.dayRes.reload();
      },
      error: () => this.toast.error('Could not save that commitment'),
    });
  }

  protected toggleDelegable(c: Commitment): void {
    this.service.patchCommitment(c.id, { delegable: !c.delegable }).subscribe({
      next: () => this.dayRes.reload(),
      error: () => this.toast.error('Could not update that'),
    });
  }

  /**
   * His call, always. Nothing on this page infers `kept` from a commit
   * landing — self-report is the entire signal, and an inferred resolution
   * would destroy the only honest measure of whether he does what he says.
   */
  protected resolve(id: string, status: CommitmentResolution): void {
    this.service.resolveCommitment(id, status).subscribe({
      next: () => this.dayRes.reload(),
      error: () => this.toast.error('Could not record that'),
    });
  }

  /** Defers by creating a successor. The original stays on the record as carried. */
  protected carry(id: string): void {
    this.service.carryCommitment(id, this.tomorrow()).subscribe({
      next: () => this.dayRes.reload(),
      error: () => this.toast.error('Could not carry that forward'),
    });
  }

  protected removeCommitment(id: string): void {
    this.service.deleteCommitment(id).subscribe({
      next: () => this.dayRes.reload(),
      error: () => this.toast.error('Could not remove that'),
    });
  }

  // ── Template helpers ─────────────────────────────────────────────

  protected onInput(target: EventTarget | null, into: { set: (v: string) => void }): void {
    into.set((target as HTMLInputElement).value);
  }

  protected time(iso: string): string {
    return formatLondonTime(iso);
  }
}
