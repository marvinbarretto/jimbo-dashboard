import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSegmented, type UiSegmentedOption } from '@shared/components/ui-segmented/ui-segmented';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { KanbanColumn } from '@shared/components/kanban-column/kanban-column';
import { UiProse } from '@shared/components/ui-prose/ui-prose';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';
import { InterrogateSnapshotService } from '../../data-access/interrogate-snapshot.service';
import type { ContextFile, ContextItem, ContextItemCategory, ContextItemStatus } from '@domain/interrogate';

// ── Exploration only ─────────────────────────────────────────────────────────
// Comparing two ways to chart Priorities/Ambient context items across time
// horizon, fed by the SAME live data (no mock rows). The horizon bucket is
// derived from each item's section name — Marvin already hand-organizes the
// Priorities file into "This Week" / "Active Projects" / "Ongoing" /
// "Recurring Nudges" / "Deferred" sections, so that grouping is used as-is
// rather than guessing from the free-text `timeframe` string. `timeframe` is
// shown verbatim on each card instead, so a layout is judged on its own
// merits rather than on a reclassification guess.

type HorizonBucket = 'now' | 'ongoing' | 'recurring' | 'someday';

const SECTION_BUCKET: Record<string, HorizonBucket> = {
  'This Week': 'now',
  'Active Projects': 'ongoing',
  'Ongoing': 'ongoing',
  'Recurring Nudges': 'recurring',
  'Deferred': 'someday',
};

const BUCKET_ORDER: readonly HorizonBucket[] = ['now', 'ongoing', 'recurring', 'someday'];

const BUCKET_META: Record<HorizonBucket, { label: string; hint: string; icon: string }> = {
  now: { label: 'Now / This Week', hint: 'time-bound, immediate', icon: '●' },
  ongoing: { label: 'Ongoing', hint: 'active, no end date', icon: '∞' },
  recurring: { label: 'Recurring', hint: 'repeats on a cadence', icon: '↻' },
  someday: { label: 'Someday / Deferred', hint: 'unscheduled, parked', icon: '⋯' },
};

interface HorizonItem {
  readonly id: string;
  readonly title: string;
  readonly bucket: HorizonBucket;
  readonly sectionName: string;
  readonly timeframe: string | null;
  readonly status: ContextItemStatus | null;
  readonly category: ContextItemCategory | null;
  readonly expiresAt: string | null;
  readonly updatedAt: string;
}

// Falls back to expiry presence only for items outside the 5 named
// Priorities sections (e.g. Ambient) — everything inside Priorities uses
// the section mapping above, which is authoritative.
function bucketFor(sectionName: string, item: ContextItem): HorizonBucket {
  return SECTION_BUCKET[sectionName] ?? (item.expires_at ? 'now' : 'someday');
}

function toHorizonItems(file: ContextFile | undefined): HorizonItem[] {
  if (!file) return [];
  return file.sections.flatMap(section =>
    section.items.map(item => ({
      id: `${file.slug}-${item.id}`,
      title: item.content,
      bucket: bucketFor(section.name, item),
      sectionName: section.name,
      timeframe: item.timeframe,
      status: item.status,
      category: item.category,
      expiresAt: item.expires_at,
      updatedAt: item.updated_at,
    })),
  );
}

@Component({
  selector: 'app-horizons-lab',
  imports: [NgTemplateOutlet, RouterLink, UiStack, UiPageHeader, UiSegmented, UiBadge, KanbanColumn, UiProse, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .horizons-lab__legend {
      font-size: 0.78rem;
      color: var(--color-text-muted);
      margin-bottom: 1rem;
    }

    .horizons-lab__board {
      display: flex;
      gap: 0.75rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
    }

    .h-card {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      padding: 0.75rem 0.85rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
    }

    /* Typography (font, size, line-height) is owned by app-ui-prose itself
       now — this just sets the text colour, which is a card-context concern. */
    .h-card__content {
      color: var(--color-text);
    }

    .h-card__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      align-items: center;
      font-size: 0.68rem;
      color: var(--color-text-muted);
    }

    .h-card__timeframe {
      font-style: italic;
    }

    /* ── Roadmap layout ── */

    .roadmap {
      display: flex;
      flex-direction: column;
    }

    .lane {
      display: flex;
      gap: 0.9rem;
      padding: 0.85rem 0;
      border-bottom: 1px solid var(--color-border);
    }

    .lane__axis {
      flex: 0 0 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.3rem;
    }

    .lane__icon {
      font-size: 1rem;
      color: var(--color-accent);
    }

    .lane__spine {
      flex: 1;
      width: 3px;
      border-radius: 2px;
      background: var(--color-border-strong);
    }

    .lane--now .lane__spine { background: var(--color-accent); }
    .lane--ongoing .lane__spine { background: repeating-linear-gradient(180deg, var(--color-border-strong) 0 6px, transparent 6px 10px); }
    .lane--recurring .lane__spine { background: repeating-linear-gradient(180deg, var(--color-accent) 0 3px, transparent 3px 7px); }
    .lane--someday .lane__spine { background: repeating-linear-gradient(180deg, var(--color-border) 0 2px, transparent 2px 8px); }

    .lane__body {
      flex: 1;
      min-width: 0;
    }

    .lane__header {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .lane__label {
      font-weight: 600;
    }

    .lane__hint {
      font-size: 0.7rem;
      color: var(--color-text-muted);
    }

    .lane__cards {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .lane__cards .h-card {
      flex: 0 1 22rem;
    }

    .lane__empty {
      font-size: 0.78rem;
      color: var(--color-text-muted);
      font-style: italic;
    }
  `],
  template: `
    <app-ui-stack gap="lg">
      <app-ui-page-header>
        <h1 uiPageHeaderTitle>Horizons Lab</h1>
        <p uiPageHeaderHint>
          Exploration only — comparing layouts for goals/priorities across time horizon, fed by real Priorities + Ambient
          context data. Not linked from nav.
        </p>
        <a uiPageHeaderActions routerLink="/picture" [queryParams]="{ tab: 'context' }">back to Picture</a>
      </app-ui-page-header>

      <p class="horizons-lab__legend">
        Bucket = the Priorities section each item already lives in (This Week → Now, Active Projects/Ongoing → Ongoing,
        Recurring Nudges → Recurring, Deferred → Someday). Raw <code>timeframe</code> text is shown on each card, unedited.
      </p>

      <app-ui-segmented [options]="layoutOptions" [value]="layout()" ariaLabel="Layout" (changed)="onLayoutChange($event)" />

      @if (layout() === 'kanban') {
        <div class="horizons-lab__board">
          @for (bucket of bucketOrder; track bucket) {
            <app-kanban-column
              [label]="bucketMeta[bucket].label"
              [count]="bucketed()[bucket].length"
              [emptyLabel]="'Nothing ' + bucketMeta[bucket].hint">
              @for (item of bucketed()[bucket]; track item.id) {
                <ng-container [ngTemplateOutlet]="cardTpl" [ngTemplateOutletContext]="{ $implicit: item }" />
              }
            </app-kanban-column>
          }
        </div>
      } @else {
        <div class="roadmap">
          @for (bucket of bucketOrder; track bucket) {
            <div class="lane" [class]="'lane--' + bucket">
              <div class="lane__axis">
                <span class="lane__icon">{{ bucketMeta[bucket].icon }}</span>
                <span class="lane__spine"></span>
              </div>
              <div class="lane__body">
                <div class="lane__header">
                  <span class="lane__label">{{ bucketMeta[bucket].label }}</span>
                  <span class="lane__hint">{{ bucketMeta[bucket].hint }} · {{ bucketed()[bucket].length }}</span>
                </div>
                @if (bucketed()[bucket].length === 0) {
                  <p class="lane__empty">Nothing {{ bucketMeta[bucket].hint }}</p>
                } @else {
                  <div class="lane__cards">
                    @for (item of bucketed()[bucket]; track item.id) {
                      <ng-container [ngTemplateOutlet]="cardTpl" [ngTemplateOutletContext]="{ $implicit: item }" />
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      <ng-template #cardTpl let-item>
        <div class="h-card">
          <app-ui-prose class="h-card__content" [text]="item.title" />
          <div class="h-card__meta">
            <span>{{ item.sectionName }}</span>
            @if (item.timeframe) {
              <span class="h-card__timeframe">· {{ item.timeframe }}</span>
            }
            @if (item.status) {
              <app-ui-badge tone="neutral">{{ item.status }}</app-ui-badge>
            }
            <span>· updated {{ item.updatedAt | relativeTime }}</span>
            @if (item.expiresAt) {
              <span>· expires {{ item.expiresAt | relativeTime }}</span>
            }
          </div>
        </div>
      </ng-template>
    </app-ui-stack>
  `,
})
export class HorizonsLab {
  private readonly snapshotService = inject(InterrogateSnapshotService);

  readonly bucketOrder = BUCKET_ORDER;
  readonly bucketMeta = BUCKET_META;
  readonly layoutOptions: UiSegmentedOption[] = [
    { value: 'kanban', label: 'Kanban' },
    { value: 'roadmap', label: 'Roadmap' },
  ];
  readonly layout = signal<'kanban' | 'roadmap'>('kanban');

  private readonly items = computed<HorizonItem[]>(() => {
    const ctx = this.snapshotService.context();
    return [...toHorizonItems(ctx['priorities']), ...toHorizonItems(ctx['ambient'])];
  });

  readonly bucketed = computed<Record<HorizonBucket, HorizonItem[]>>(() => {
    const groups: Record<HorizonBucket, HorizonItem[]> = { now: [], ongoing: [], recurring: [], someday: [] };
    for (const item of this.items()) groups[item.bucket].push(item);
    return groups;
  });

  constructor() {
    this.snapshotService.load();
  }

  onLayoutChange(value: string): void {
    if (value === 'kanban' || value === 'roadmap') this.layout.set(value);
  }
}
