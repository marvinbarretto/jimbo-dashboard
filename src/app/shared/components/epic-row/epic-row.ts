import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Sparkles,
  Bot,
  Search,
  Pencil,
  Layers,
  Ban,
  type LucideIconData,
} from 'lucide-angular';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';
import { AppChip } from '@shared/components/app-chip/app-chip';

// Origin of an epic — kebab-case slug + ISO date. Captured at file-time and immutable.
// Future: 'jimbo-autonomous' becomes its own kind once Jimbo proposes ventures unattended.
export type EpicOriginKind = 'synthesize' | 'deep-dive' | 'manual' | 'jimbo-autonomous' | string;

export interface EpicOrigin {
  readonly kind: EpicOriginKind;
  readonly date: string;
}

export interface EpicProjectRef {
  readonly slug: string;
  readonly displayName: string;
  readonly color: string | null;
}

// Disambiguated from project via `@` prefix vs `/` prefix — necessary because some names
// (e.g. 'jimbo') exist as both an actor AND a project.
export interface EpicActorRef {
  readonly id: string;
  readonly displayName: string;
}

export interface EpicRowVM {
  readonly id: string;
  readonly seq: number;
  readonly title: string;
  readonly createdAt: string;

  readonly project: EpicProjectRef;
  readonly owner: EpicActorRef | null;

  readonly origin: EpicOrigin | null;
  readonly threads: readonly string[];
  readonly crossCuttingPrinciples: readonly string[];

  readonly childrenTotal: number;
  readonly childrenDone: number;
  readonly childrenBlocked: number;
}

export type EpicRowLayout = 'compact' | 'standard' | 'spacious';

@Component({
  selector: 'app-epic-row',
  imports: [RouterLink, RelativeTimePipe, AppChip],
  templateUrl: './epic-row.html',
  styleUrl: './epic-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'epic-row',
    '[class.epic-row--compact]':  'layout() === "compact"',
    '[class.epic-row--standard]': 'layout() === "standard"',
    '[class.epic-row--spacious]': 'layout() === "spacious"',
    '[style.--project-color]': 'epic().project.color ?? "var(--color-text-muted)"',
    '[attr.data-epic-id]': 'epic().id',
  },
})
export class EpicRow {
  readonly epic = input.required<EpicRowVM>();
  readonly layout = input<EpicRowLayout>('compact');

  protected readonly Layers = Layers;
  protected readonly Ban = Ban;

  readonly progressLabel = computed(() => {
    const e = this.epic();
    return `Progress: ${e.childrenDone} of ${e.childrenTotal} done${
      e.childrenBlocked > 0 ? `, ${e.childrenBlocked} blocked` : ''
    }`;
  });

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
}
