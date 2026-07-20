import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { AppIcon } from '@shared/components/app-icon/app-icon';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiInlineEdit } from '@shared/components/ui-inline-edit/ui-inline-edit';
import { UiTrackerRow } from '@shared/components/ui-tracker-row/ui-tracker-row';
import { UiQuickAddRow, type QuickAddOption } from '@shared/components/ui-quick-add-row/ui-quick-add-row';
import {
  isoToLocalInput,
  localInputToIso,
  type TrackerDraft,
  type TrackerEntry,
  type TrackerMeasure,
  type TrackerPatch,
} from '@shared/components/tracker/tracker.types';
import { formatLondonTime } from '@shared/utils/datetime.utils';
import type { CardioDetailed, SessionDetailed, SessionPatch, SetDetailed } from '../../data-access/exercise.service';
import { lastPerfBefore, lastTimeHint, type ExercisePerf } from '../../utils/exercise-history';

const CARDIO_MEASURES: readonly TrackerMeasure[] = [
  { key: 'duration_min', label: 'duration', unit: 'min', primary: true },
  { key: 'distance_km', label: 'distance', unit: 'km', kind: 'number' },
  { key: 'hr', label: 'heart rate', unit: 'bpm' },
];
const ADD_SET_MEASURES: readonly TrackerMeasure[] = [
  { key: 'sets', label: 'sets' },
  { key: 'reps', label: 'reps' },
  { key: 'weight_kg', label: 'kg', unit: 'kg', kind: 'number' },
  { key: 'rpe', label: 'RPE' },
];

type SetField = 'sets' | 'reps' | 'weight_kg' | 'rpe';

interface CardioPreset {
  readonly label: string;
  readonly duration_min: number;
  readonly distance_km?: number;
}

// The handful of activities that cover almost every backdated cardio guess.
// One tap logs a sensible estimate; edit the row inline after if it's off.
// Grow this list only if a new activity keeps recurring.
const CARDIO_PRESETS: readonly CardioPreset[] = [
  { label: '5k run', duration_min: 30, distance_km: 5 },
  { label: '10k run', duration_min: 60, distance_km: 10 },
  { label: '5k walk', duration_min: 60, distance_km: 5 },
  { label: '10k walk', duration_min: 120, distance_km: 10 },
  { label: '5-a-side football', duration_min: 60 },
];

/**
 * One gym session as an expandable, editable ledger row. Collapsed it's a
 * summary (time · focus · volume/sets); expanded it lists each set as
 * `sets × reps × weight kg` (every number edits in place), its cardio, and
 * add-set / add-cardio pickers. The session header (time, notes) edits in
 * place; delete removes the whole workout.
 *
 * Presentational: set/cardio edits bubble as {@link TrackerPatch}/remove with
 * `set:`/`cardio:`-prefixed ids so the page routes them to the right endpoint.
 */
@Component({
  selector: 'app-exercise-session-row',
  imports: [AppIcon, UiButton, UiInlineEdit, UiTrackerRow, UiQuickAddRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="session" [class.session--open]="open()">
      <div class="session__head">
        <button type="button" class="session__toggle" (click)="open.set(!open())"
          [attr.aria-expanded]="open()" [attr.aria-label]="open() ? 'Collapse' : 'Expand'">
          <app-icon name="demote" />
        </button>

        <span class="session__time">
          @if (editable()) {
            <app-ui-inline-edit kind="datetime" [value]="timeInput()" [displayFor]="displayTime" ariaLabel="Edit start time" (saved)="saveTime($event)" />
          } @else {
            {{ time() }}
          }
        </span>

        <span class="session__focus">
          @if (editable()) {
            <app-ui-inline-edit [value]="session().notes ?? ''" placeholder="workout focus / notes…" ariaLabel="Edit notes" (saved)="saveNotes($event)" />
          } @else {
            {{ session().notes || 'Workout' }}
          }
        </span>

        <span class="session__summary">{{ summary() }}</span>

        @if (editable()) {
          <app-ui-button variant="ghost" size="sm" [iconOnly]="true" ariaLabel="Delete workout" (pressed)="sessionRemove.emit(session().id)">
            <app-icon name="delete" />
          </app-ui-button>
        }
      </div>

      @if (open()) {
        <div class="session__body">
          @if (editable() || session().pre_energy !== null) {
            <div class="session__energy">
              <span class="session__energy-label" title="How fresh you felt going in: 1 = running on fumes, 5 = fully charged. Context for reading RPE — a hard set on a drained day isn't a strength loss.">pre-energy</span>
              @for (n of energyLevels; track n) {
                <button
                  type="button"
                  class="session__energy-dot"
                  [class.session__energy-dot--on]="(session().pre_energy ?? 0) >= n"
                  [disabled]="!editable()"
                  [attr.aria-label]="'Pre-workout energy ' + n + ' of 5'"
                  [attr.aria-pressed]="session().pre_energy === n"
                  (click)="setEnergy(n)"
                >{{ n }}</button>
              }
            </div>
          }

          @if (session().sets.length) {
            <ul class="session__list">
              @for (s of session().sets; track s.id) {
                <li class="setrow">
                  <span class="setrow__name">{{ s.exercise_name ?? s.exercise_id }}</span>
                  <span class="setrow__note" aria-label="sets by reps by weight">
                    @if (editable()) {
                      <app-ui-inline-edit kind="number" [min]="1" [value]="(s.sets ?? 1).toString()" ariaLabel="sets" (saved)="saveSet(s, 'sets', $event)" />
                    } @else { {{ s.sets ?? 1 }} }
                    <span class="setrow__x">×</span>
                    @if (editable()) {
                      <app-ui-inline-edit kind="number" [min]="0" [value]="(s.reps ?? 0).toString()" ariaLabel="reps" (saved)="saveSet(s, 'reps', $event)" />
                    } @else { {{ s.reps ?? 0 }} }
                    <span class="setrow__x">×</span>
                    @if (editable()) {
                      <app-ui-inline-edit kind="number" [min]="0" [step]="0.5" [value]="(s.weight_kg ?? 0).toString()" ariaLabel="weight in kg" (saved)="saveSet(s, 'weight_kg', $event)" />
                    } @else { {{ s.weight_kg ?? 0 }} }
                    <span class="setrow__unit">kg</span>
                  </span>
                  @if (editable()) {
                    <span class="setrow__rpe" title="RPE — Rate of Perceived Exertion (1–10): how hard it felt. 7 = 3 reps left in the tank, 8 = 2 left, 10 = nothing left. Aim for 7–8.">
                      RPE
                      <app-ui-inline-edit kind="number" [min]="1" [max]="10" [value]="s.rpe === null ? '' : s.rpe.toString()" placeholder="–" ariaLabel="RPE (1-10)" (saved)="saveSet(s, 'rpe', $event)" />
                    </span>
                  } @else if (s.rpe !== null) {
                    <span class="setrow__rpe" title="RPE — Rate of Perceived Exertion (1–10): how hard the set felt (10 = no reps left)">RPE {{ s.rpe }}</span>
                  }
                  @if (editable()) {
                    <app-ui-button variant="ghost" size="sm" [iconOnly]="true" ariaLabel="Remove set" (pressed)="childRemove.emit('set:' + s.id)">
                      <app-icon name="delete" />
                    </app-ui-button>
                  }
                </li>
              }
            </ul>
          }

          @if (cardioEntries().length) {
            <ul class="session__list">
              @for (e of cardioEntries(); track e.id) {
                <li><app-ui-tracker-row [entry]="e" [measures]="cardioMeasures" [editable]="editable()" [showTime]="false"
                  (patch)="childPatch.emit($event)" (remove)="childRemove.emit($event)" /></li>
              }
            </ul>
          }

          @if (!session().sets.length && !cardioEntries().length) {
            <p class="session__empty">No sets or cardio logged.</p>
          }

          @if (editable()) {
            <app-ui-quick-add-row class="session__add"
              [options]="exerciseOptions()" [measures]="addSetMeasures"
              [allowCreate]="true"
              [prefill]="setPrefills()" [hints]="setHints()"
              placeholder="search or add an exercise…" addLabel="Add"
              (add)="onAddSet($event)" />
            <div class="session__presets">
              @for (p of cardioPresets; track p.label) {
                <button type="button" class="session__preset" (click)="addPreset(p)">{{ p.label }}</button>
              }
            </div>
            <app-ui-quick-add-row class="session__add"
              [options]="exerciseOptions()" [measures]="cardioMeasures"
              [allowCreate]="true"
              placeholder="or search / add another cardio activity…" addLabel="Add cardio"
              (add)="onAddCardio($event)" />
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .session {
      border: 1px solid color-mix(in srgb, var(--color-border) 65%, transparent);
      border-radius: var(--radius);
    }
    .session--open { background: var(--color-surface-soft, transparent); }

    .session__head {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.4rem 0.5rem;
      font-size: 0.84rem;
    }
    .session__toggle {
      flex: 0 0 auto;
      display: inline-flex;
      background: none;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      padding: 0;
      transition: transform 0.12s ease;
    }
    .session--open .session__toggle { transform: rotate(180deg); }

    .session__time {
      flex: 0 0 auto;
      color: var(--color-text-soft, var(--color-text-muted));
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .session__focus { flex: 1 1 auto; min-width: 0; display: flex; }
    .session__summary {
      flex: 0 0 auto;
      color: var(--color-text-muted);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .session__body {
      padding: 0.1rem 0.6rem 0.5rem 1.8rem;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .session__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.2rem; }
    .session__empty { margin: 0; font-size: 0.78rem; font-style: italic; color: var(--color-text-muted); }

    .setrow {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.82rem;
    }
    .setrow__name { flex: 1 1 auto; min-width: 0; }
    .setrow__note {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: baseline;
      gap: 0.2rem;
      color: var(--color-text);
      font-variant-numeric: tabular-nums;
    }
    .setrow__note app-ui-inline-edit { flex: 0 0 auto; width: 2.4rem; }
    .setrow__x { color: var(--color-text-muted); opacity: 0.7; }
    .setrow__unit { font-size: 0.72rem; color: var(--color-text-muted); }
    .setrow__rpe {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: baseline;
      gap: 0.2rem;
      font-size: 0.68rem;
      letter-spacing: 0.02em;
      color: var(--color-text-muted);
      cursor: help;
    }
    .setrow__rpe app-ui-inline-edit { flex: 0 0 auto; width: 1.6rem; font-size: 0.82rem; }

    .session__energy {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      padding-top: 0.15rem;
    }
    .session__energy-label {
      font-size: 0.68rem;
      letter-spacing: 0.02em;
      color: var(--color-text-muted);
      cursor: help;
      margin-right: 0.2rem;
    }
    .session__energy-dot {
      font: inherit;
      font-size: 0.68rem;
      font-variant-numeric: tabular-nums;
      width: 1.35rem;
      height: 1.35rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-muted);
      background: transparent;
      border: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
      border-radius: 50%;
      cursor: pointer;
      padding: 0;

      &:hover:not(:disabled) { border-color: var(--color-accent); }
      &:disabled { cursor: default; }

      &--on {
        color: var(--color-accent-contrast, var(--color-text));
        background: color-mix(in srgb, var(--color-accent) 55%, transparent);
        border-color: var(--color-accent);
      }
    }

    .session__add {
      margin-top: 0.35rem;
      padding-top: 0.45rem;
      border-top: 1px dashed color-mix(in srgb, var(--color-border) 50%, transparent);
    }

    .session__presets {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-top: 0.35rem;
      padding-top: 0.45rem;
      border-top: 1px dashed color-mix(in srgb, var(--color-border) 50%, transparent);
    }
    .session__preset {
      font: inherit;
      font-size: 0.78rem;
      color: var(--color-text);
      background: var(--color-surface-soft, transparent);
      border: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
      border-radius: 999px;
      padding: 0.22rem 0.6rem;
      cursor: pointer;

      &:hover { border-color: var(--color-accent); }
    }
  `],
})
export class ExerciseSessionRow {
  readonly session = input.required<SessionDetailed>();
  readonly editable = input<boolean>(true);
  readonly exerciseOptions = input<readonly QuickAddOption[]>([]);
  /** Exercise history index (see buildExerciseHistory) powering "last time" hints + prefill. */
  readonly history = input<ReadonlyMap<string, readonly ExercisePerf[]>>(new Map());

  readonly sessionPatch = output<{ id: string; changes: SessionPatch }>();
  readonly sessionRemove = output<string>();
  readonly childPatch = output<TrackerPatch>();
  readonly childRemove = output<string>();
  readonly addSet = output<{ sessionId: string; draft: TrackerDraft }>();
  readonly addCardio = output<{ sessionId: string; draft: TrackerDraft }>();

  protected readonly cardioMeasures = CARDIO_MEASURES;
  protected readonly addSetMeasures = ADD_SET_MEASURES;
  protected readonly cardioPresets = CARDIO_PRESETS;
  protected readonly energyLevels = [1, 2, 3, 4, 5] as const;
  // Expanded by default — the sets are the point; the toggle is just for tucking
  // away a workout you're not editing.
  protected readonly open = signal(true);

  protected readonly time = computed(() => formatLondonTime(this.session().started_at));
  protected readonly timeInput = computed(() => isoToLocalInput(this.session().started_at));

  // The day group already shows the date — the session only needs its start
  // time. The datetime picker still edits the full instant.
  protected readonly displayTime = (v: string): string => (v.length >= 16 ? v.slice(11, 16) : v);

  protected readonly cardioEntries = computed<TrackerEntry[]>(() => this.session().cardio.map(cardioToEntry));

  // "Last time" per exercise, relative to THIS session's start — browsing a
  // past day cites only sessions before it, never later ones.
  private readonly lastPerfs = computed<ReadonlyMap<string, ExercisePerf>>(() => {
    const s = this.session();
    const out = new Map<string, ExercisePerf>();
    for (const exerciseId of this.history().keys()) {
      const perf = lastPerfBefore(this.history(), exerciseId, s);
      if (perf) out.set(exerciseId, perf);
    }
    return out;
  });

  protected readonly setPrefills = computed<Record<string, Readonly<Record<string, number>>>>(() => {
    const out: Record<string, Readonly<Record<string, number>>> = {};
    for (const [id, perf] of this.lastPerfs()) out[id] = perf.prefill;
    return out;
  });

  protected readonly setHints = computed<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const [id, perf] of this.lastPerfs()) out[id] = lastTimeHint(perf);
    return out;
  });

  protected readonly summary = computed(() => {
    const s = this.session();
    const totalSets = s.sets.reduce((acc, x) => acc + (x.sets ?? 1), 0);
    const volume = s.sets.reduce((acc, x) => acc + (x.reps ?? 0) * (x.weight_kg ?? 0) * (x.sets ?? 1), 0);
    const parts: string[] = [];
    if (totalSets) parts.push(`${totalSets} set${totalSets === 1 ? '' : 's'}`);
    if (volume > 0) parts.push(`${Math.round(volume)} kg`);
    if (s.cardio.length) parts.push(`${s.cardio.length} cardio`);
    return parts.join(' · ') || 'no sets yet';
  });

  protected saveTime(local: string): void {
    const at = localInputToIso(local);
    if (at && at !== this.session().started_at) {
      this.sessionPatch.emit({ id: this.session().id, changes: { started_at: at } });
    }
  }

  protected saveNotes(value: string): void {
    const notes = value.trim();
    if (notes !== (this.session().notes ?? '')) {
      this.sessionPatch.emit({ id: this.session().id, changes: { notes: notes || null } });
    }
  }

  protected saveSet(s: SetDetailed, field: SetField, value: string): void {
    // RPE is the one clearable field — an emptied input means "not rated".
    if (field === 'rpe' && value.trim() === '') {
      if (s.rpe !== null) this.childPatch.emit({ id: `set:${s.id}`, changes: { values: { rpe: null } } });
      return;
    }
    const n = field === 'weight_kg' ? Number(value) : Math.round(Number(value));
    if (!Number.isFinite(n) || n < 0 || (field === 'sets' && n < 1)) return;
    if (field === 'rpe' && (n < 1 || n > 10)) return;
    const current =
      field === 'sets' ? (s.sets ?? 1)
      : field === 'reps' ? (s.reps ?? 0)
      : field === 'weight_kg' ? (s.weight_kg ?? 0)
      : s.rpe;
    if (n === current) return;
    this.childPatch.emit({ id: `set:${s.id}`, changes: { values: { [field]: n } } });
  }

  protected setEnergy(level: number): void {
    // Tapping the current level clears it back to unrated.
    const next = this.session().pre_energy === level ? null : level;
    this.sessionPatch.emit({ id: this.session().id, changes: { pre_energy: next } });
  }

  protected onAddSet(draft: TrackerDraft): void {
    this.addSet.emit({ sessionId: this.session().id, draft });
  }

  protected onAddCardio(draft: TrackerDraft): void {
    this.addCardio.emit({ sessionId: this.session().id, draft });
  }

  protected addPreset(preset: CardioPreset): void {
    const values: Record<string, number> = { duration_min: preset.duration_min };
    if (preset.distance_km !== undefined) values['distance_km'] = preset.distance_km;
    this.onAddCardio({ label: preset.label, values });
  }
}

function cardioToEntry(c: CardioDetailed): TrackerEntry {
  // Only surface the metrics actually recorded — an untracked HR shouldn't read
  // as "0 bpm".
  const values: Record<string, number> = {};
  if (c.duration_s !== null) values['duration_min'] = Math.round(c.duration_s / 60);
  if (c.distance_km !== null) values['distance_km'] = c.distance_km;
  if (c.avg_heart_rate !== null && c.avg_heart_rate > 0) values['hr'] = c.avg_heart_rate;
  return {
    id: `cardio:${c.id}`,
    at: c.created_at,
    label: c.exercise_name ?? 'cardio',
    labelEditable: false,
    values,
  };
}
