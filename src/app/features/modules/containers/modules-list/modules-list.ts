import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { ModuleDocsService } from '../../data-access/module-docs.service';
import { ModuleStalenessBadge } from '../../components/staleness-badge/staleness-badge';
import type { ModuleDocSummary } from '../../data-access/module-doc';

@Component({
  selector: 'app-modules-list',
  imports: [
    RouterLink,
    UiEmptyState,
    UiLoadingState,
    UiPageHeader,
    UiStack,
    ModuleStalenessBadge,
  ],
  templateUrl: './modules-list.html',
  styleUrl: './modules-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModulesList {
  private readonly service = inject(ModuleDocsService);

  readonly isLoading = this.service.isLoading;
  readonly error = this.service.error;
  readonly head = this.service.head;

  // Stale docs first — the list's job is to surface what needs re-verifying —
  // then unverified, then fresh; alphabetical within each band.
  readonly modules = computed<readonly ModuleDocSummary[]>(() => {
    const rank = { stale: 0, unknown: 1, fresh: 2 } as const;
    return [...this.service.modules()].sort((a, b) => {
      const byStatus = rank[a.staleness.status] - rank[b.staleness.status];
      if (byStatus !== 0) return byStatus;
      return a.module.localeCompare(b.module);
    });
  });

  // All docs in the index come from one repo checkout; show it once in the
  // header rather than per row. Falls back per-row only if repos ever mix.
  readonly repo = computed(() => this.service.modules()[0]?.repo ?? null);
}
