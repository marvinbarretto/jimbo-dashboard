import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  Sparkles,
  Bot,
  Search,
  Pencil,
  Layers,
  Ban,
  Clock,
  type LucideIconData,
} from 'lucide-angular';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';
import { AppChip } from '@shared/components/app-chip/app-chip';
import { UiProse } from '@shared/components/ui-prose/ui-prose';
import type {
  EpicOrigin,
  EpicProjectRef,
  EpicActorRef,
} from '@shared/components/epic-row/epic-row';

export interface EpicThreadBreakdown {
  readonly name: string;
  readonly itemCount: number;
  readonly doneCount: number;
}

export interface EpicChildrenByType {
  readonly research: number;
  readonly task: number;
  readonly idea: number;
  readonly reference: number;
}

export interface EpicCardVM {
  readonly id: string;
  readonly seq: number;
  readonly title: string;
  readonly bodyExcerpt: string;
  readonly createdAt: string;
  readonly lastTouchedAt: string | null;

  readonly project: EpicProjectRef;
  readonly owner: EpicActorRef | null;

  readonly origin: EpicOrigin | null;

  readonly threads: readonly EpicThreadBreakdown[];
  readonly crossCuttingPrinciples: readonly string[];

  readonly childrenTotal: number;
  readonly childrenDone: number;
  readonly childrenBlocked: number;
  readonly childrenByType: EpicChildrenByType;
}

export type EpicCardVariant = 'compact' | 'detail' | 'narrative' | 'status';

@Component({
  selector: 'app-epic-card',
  imports: [RouterLink, RelativeTimePipe, LucideAngularModule, AppChip, UiProse],
  templateUrl: './epic-card.html',
  styleUrl: './epic-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'epic-card',
    '[class.epic-card--compact]':   'variant() === "compact"',
    '[class.epic-card--detail]':    'variant() === "detail"',
    '[class.epic-card--narrative]': 'variant() === "narrative"',
    '[class.epic-card--status]':    'variant() === "status"',
    '[style.--project-color]': 'epic().project.color ?? "var(--color-text-muted)"',
    '[attr.data-epic-id]': 'epic().id',
  },
})
export class EpicCard {
  readonly epic = input.required<EpicCardVM>();
  readonly variant = input<EpicCardVariant>('detail');

  protected readonly Layers = Layers;
  protected readonly Ban = Ban;
  protected readonly Clock = Clock;

  readonly originLabel = computed(() => {
    const o = this.epic().origin;
    return o ? `${o.kind}-${o.date}` : null;
  });

  readonly originIcon = computed<LucideIconData>(() => {
    const kind = this.epic().origin?.kind;
    switch (kind) {
      case 'synthesize':       return Sparkles;
      case 'jimbo-autonomous': return Bot;
      case 'deep-dive':        return Search;
      case 'manual':           return Pencil;
      default:                 return Pencil;
    }
  });

  readonly progressPct = computed(() => {
    const e = this.epic();
    return e.childrenTotal > 0 ? Math.round((e.childrenDone / e.childrenTotal) * 100) : 0;
  });

  readonly todoCount = computed(() => {
    const e = this.epic();
    return Math.max(0, e.childrenTotal - e.childrenDone - e.childrenBlocked);
  });
}
