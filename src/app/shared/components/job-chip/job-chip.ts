import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

// One chip for every place a job appears (Hermes pulse, control room, fleet
// folds, timelines) so kind and state read identically at a glance everywhere
// — the jobs sibling of actor-chip/entity-chip. Modeled on LocalShout's
// EntityChip grammar: kind glyph, status dot, muted-when-paused label, detail
// after a separator.
//
//   kind:  agent (plain LLM cron) · script (pre-run gate/context script)
//          · fold (schedule here, execution on the dispatch queue — see /fleet)
//   state: active (scheduled, healthy) · running · paused · failing · unknown

export type JobChipKind = 'agent' | 'script' | 'fold';
export type JobChipState = 'active' | 'running' | 'paused' | 'failing' | 'unknown';
export type JobChipSize = 'sm' | 'md' | 'lg';

/** Derive the chip kind from a job's pre-run script name. */
export function jobChipKind(script: string | null | undefined): JobChipKind {
  if (!script) return 'agent';
  return script.startsWith('fold_') ? 'fold' : 'script';
}

/** Derive the chip state from the Hermes job fields the API exposes. */
export function jobChipState(job: {
  state?: string | null;
  enabled?: boolean | null;
  last_status?: string | null;
}): JobChipState {
  if (job.state === 'paused' || job.enabled === false) return 'paused';
  if (job.state === 'running') return 'running';
  if (job.last_status && job.last_status !== 'ok') return 'failing';
  if (job.state === 'scheduled' || job.state === 'active') return 'active';
  return job.state ? 'active' : 'unknown';
}

const KIND_GLYPH: Record<JobChipKind, string> = {
  agent: '',
  script: '⏵',
  fold: '⇄',
};

const KIND_TITLE: Record<JobChipKind, string> = {
  agent: 'LLM cron job',
  script: 'Runs a pre-run script (gate or context injection)',
  fold: 'Folded job — Hermes keeps the schedule, Boris executes it on the dispatch queue (see /fleet)',
};

const STATE_TITLE: Record<JobChipState, string> = {
  active: 'scheduled, healthy',
  running: 'running now',
  paused: 'paused — scheduler skips it',
  failing: 'last run failed',
  unknown: 'state unknown',
};

@Component({
  selector: 'app-job-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="cls()" [title]="title()">
      <span class="job-chip__dot" aria-hidden="true"></span>
      @if (glyph()) {
        <span class="job-chip__glyph" aria-hidden="true">{{ glyph() }}</span>
      }
      <span class="job-chip__name">{{ name() }}</span>
      @if (detail(); as d) {
        <span class="job-chip__sep" aria-hidden="true">·</span>
        <span class="job-chip__detail">{{ d }}</span>
      }
    </span>
  `,
  styles: [`
    @use 'chip-size' as cs;

    .job-chip {
      display: inline-flex;
      align-items: center;
      font-family: var(--font-mono);
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-border) 40%, transparent);
      color: var(--color-text);
      line-height: 1.4;
      white-space: nowrap;
      vertical-align: baseline;

      @include cs.md;
    }

    .job-chip--sm { @include cs.sm; }
    .job-chip--lg { @include cs.lg; }

    .job-chip__dot {
      width: 0.45em;
      height: 0.45em;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .job-chip--active  .job-chip__dot { background: var(--color-success); }
    .job-chip--running .job-chip__dot { background: var(--color-info); box-shadow: 0 0 4px var(--color-info); }
    .job-chip--paused  .job-chip__dot { background: var(--color-warning); }
    .job-chip--failing .job-chip__dot { background: var(--color-danger); }
    .job-chip--unknown .job-chip__dot { background: var(--color-text-soft); }

    /* A paused job reads as switched off, like EntityChip's parked state. */
    .job-chip--paused .job-chip__name { color: var(--color-text-soft); }
    .job-chip--paused { border-style: dashed; }

    .job-chip--failing { border-color: color-mix(in srgb, var(--color-danger) 50%, var(--color-border)); }

    .job-chip__glyph { font-size: 0.85em; }
    .job-chip--fold   .job-chip__glyph { color: #e879f9; }  /* fleet accent — its other half lives there */
    .job-chip--script .job-chip__glyph { color: var(--color-info); }

    .job-chip__sep { color: var(--color-text-soft); }
    .job-chip__detail {
      color: var(--color-text-muted);
      font-size: 0.92em;
    }
  `],
})
export class JobChip {
  readonly name = input.required<string>();
  readonly state = input<JobChipState>('unknown');
  readonly kind = input<JobChipKind>('agent');
  readonly detail = input<string | null>(null);
  readonly size = input<JobChipSize>('md');

  readonly cls = computed(() => `job-chip job-chip--${this.state()} job-chip--${this.kind()} job-chip--${this.size()}`);
  readonly glyph = computed(() => KIND_GLYPH[this.kind()]);
  readonly title = computed(() => `${KIND_TITLE[this.kind()]} — ${STATE_TITLE[this.state()]}`);
}
