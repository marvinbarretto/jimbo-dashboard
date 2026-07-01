import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { ContextFile } from '@domain/interrogate';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { InterrogateSnapshotService } from '../../data-access/interrogate-snapshot.service';

// Read-only: context_files/sections/items have no confidence/evidence/audit
// machinery (unlike belief entities), so edit + feedback isn't offered here
// for v1 — see the Picture plan's "Context" section.
@Component({
  selector: 'app-context-tab',
  imports: [UiSection, UiEmptyState],
  templateUrl: './context-tab.html',
  styleUrl: './context-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextTab {
  private readonly snapshotService = inject(InterrogateSnapshotService);

  readonly files = computed<ContextFile[]>(() =>
    Object.values(this.snapshotService.context()).sort((a, b) => a.sort_order - b.sort_order),
  );
}
