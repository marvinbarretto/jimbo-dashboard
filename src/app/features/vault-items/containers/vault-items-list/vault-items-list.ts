import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VaultItemsService } from '../../data-access/vault-items.service';
import { ActorsService } from '../../../actors/data-access/actors.service';
import { ProjectsService } from '../../../projects/data-access/projects.service';
import { VaultItemProjectsService } from '../../data-access/vault-item-projects.service';
import { computeReadiness, effectivePriority } from '@domain/vault/readiness';
import type { VaultItem, Priority } from '@domain/vault/vault-item';
import { lifecycleState, isArchived } from '@domain/vault/vault-item';

@Component({
  selector: 'app-vault-items-list',
  imports: [RouterLink],
  templateUrl: './vault-items-list.html',
  styleUrl: './vault-items-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaultItemsList {
  private readonly vaultItemsService = inject(VaultItemsService);
  private readonly actorsService = inject(ActorsService);
  private readonly projectsService = inject(ProjectsService);
  private readonly vaultItemProjectsService = inject(VaultItemProjectsService);

  readonly items = this.vaultItemsService.items;
  readonly isLoading = this.vaultItemsService.isLoading;

  // Template helpers — derive lifecycle on demand.
  lifecycleOf = lifecycleState;
  isItemArchived = isArchived;

  ownerDisplay(item: VaultItem): string {
    if (!item.assigned_to) return '—';
    const actor = this.actorsService.getById(item.assigned_to);
    return actor ? `@${actor.id}` : item.assigned_to;
  }

  // First project in the junction for list display.
  // Most items have one; multi-project is an edge case. Full list shown in detail.
  primaryProjectDisplay(item: VaultItem): string {
    const junctions = this.vaultItemProjectsService.projectsFor(item.id)();
    if (!junctions.length) return '—';
    const project = this.projectsService.getById(junctions[0].project_id);
    return project ? project.display_name : junctions[0].project_id;
  }

  // Returns Priority integer or null — template calls priorityLabel() to display.
  effectivePriority(item: VaultItem): Priority | null {
    return effectivePriority(item);
  }

  // Returns "P0", "P1", etc. or "—" for null. Prefix added here, not in domain.
  priorityLabel(p: Priority | null): string {
    return p === null ? '—' : 'P' + p;
  }

  // Readiness verdict without messages — list view has no thread context loaded.
  // Full readiness (with open_questions) is shown in the detail view.
  readinessVerdict(item: VaultItem): 'ready' | 'not_ready' | 'blocked' {
    return computeReadiness(item, []).verdict;
  }
}
