import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EntityChip } from '@shared/components/entity-chip/entity-chip';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';

// A momentum-oriented epic row — distinct from the provenance-oriented `epic-row`
// (threads / principles / origin) and `epic-card`. This one answers "is this epic
// *moving*?" via a progress bar plus velocity / active / blocked / stalled badges,
// and links straight to the vault item by seq. Used on the projects landing for both
// the cross-project "recently active" rail and the per-project breakdown.
export interface EpicMomentumRowVM {
  readonly id: string;
  readonly seq: number;
  readonly title: string;

  // When present, a project chip leads the row (cross-project rail). Omit (null) in
  // contexts already grouped by project, where the chip would be redundant.
  readonly project: {
    readonly id: string;
    readonly name: string;
    readonly color: string | null;
  } | null;

  readonly childrenTotal: number;
  readonly childrenDone: number;
  readonly childrenActive: number;
  readonly childrenBlocked: number;

  // Children completed in the last 7 days — forward velocity.
  readonly done7d: number;

  // Has incomplete children but no completion in ~30 days. Precomputed by the caller
  // so this component stays free of any ambient-clock dependency.
  readonly stalled: boolean;
}

@Component({
  selector: 'app-epic-momentum-row',
  imports: [RouterLink, EntityChip, UiBadge],
  templateUrl: './epic-momentum-row.html',
  styleUrl: './epic-momentum-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'epic-momentum-row',
  },
})
export class EpicMomentumRow {
  readonly epic = input.required<EpicMomentumRowVM>();

  readonly progressPct = computed(() => {
    const e = this.epic();
    return e.childrenTotal > 0 ? (e.childrenDone / e.childrenTotal) * 100 : 0;
  });

  readonly progressLabel = computed(() => {
    const e = this.epic();
    return `${e.childrenDone} of ${e.childrenTotal} tasks complete`;
  });
}
