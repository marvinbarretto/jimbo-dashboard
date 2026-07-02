import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { formatPageTitle } from '@app/app-title-strategy';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiBreadcrumb } from '@shared/components/ui-breadcrumb/ui-breadcrumb';
import { UiButtonLink } from '@shared/components/ui-button-link/ui-button-link';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiProse } from '@shared/components/ui-prose/ui-prose';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { DatetimePipe } from '@shared/pipes/datetime.pipe';
import { ActorsService } from '../../data-access/actors.service';
import { VaultItemsService } from '@features/vault-items/data-access/vault-items.service';
import { DispatchService } from '@features/execution/data-access/dispatch.service';
import { ProjectsService } from '@features/projects/data-access/projects.service';
import { ActorStatTile } from '../../components/actor-stat-tile/actor-stat-tile';
import { ActorVaultItemRow } from '../../components/actor-vault-item-row/actor-vault-item-row';
import { ActorDispatchRow } from '../../components/actor-dispatch-row/actor-dispatch-row';
import { ActorProjectRow } from '../../components/actor-project-row/actor-project-row';
import { isActive } from '@domain/vault/vault-item';
import { actorId } from '@domain/ids';
import type { ActorId } from '@domain/ids';
import type { Crumb } from '@shared/components/ui-breadcrumb/ui-breadcrumb';

@Component({
  selector: 'app-actor-page',
  imports: [
    RouterLink,
    UiBreadcrumb,
    UiBadge,
    UiButtonLink,
    UiCard,
    UiCluster,
    UiEmptyState,
    UiMetaList,
    UiPageHeader,
    UiProse,
    UiSection,
    UiStack,
    DatetimePipe,
    ActorStatTile,
    ActorVaultItemRow,
    ActorDispatchRow,
    ActorProjectRow,
  ],
  templateUrl: './actor-page.html',
  styleUrl: './actor-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActorPage {
  private readonly actors = inject(ActorsService);
  private readonly vault = inject(VaultItemsService);
  private readonly dispatch = inject(DispatchService);
  private readonly projects = inject(ProjectsService);
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);

  private readonly rawId = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? '')));
  private readonly id = computed<ActorId | null>(() => {
    const raw = this.rawId();
    return raw ? actorId(raw) : null;
  });

  readonly actor = computed(() => {
    const id = this.id();
    return id ? this.actors.getById(id) : undefined;
  });

  readonly crumbs = computed<readonly Crumb[]>(() => {
    const a = this.actor();
    return [
      { label: 'Actors', link: ['/actors'] },
      { label: a?.display_name ?? '…' },
    ];
  });

  readonly assignedItems = computed(() => {
    const id = this.id();
    if (!id) return [];
    return this.vault.items().filter(i => i.assigned_to === id);
  });

  readonly activeAssignedItems = computed(() => this.assignedItems().filter(isActive));

  readonly dispatches = computed(() => {
    const id = this.id();
    if (!id) return [];
    return this.dispatch.entries()
      .filter(e => e.executor === id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 20);
  });

  readonly recentDispatches = computed(() => this.dispatches().slice(0, 10));

  readonly failedDispatches = computed(() =>
    this.dispatches().filter(e => e.status === 'failed')
  );

  readonly completedDispatches = computed(() =>
    this.dispatches().filter(e => e.status === 'completed')
  );

  readonly ownedProjects = computed(() => {
    const id = this.id();
    if (!id) return [];
    return this.projects.projects().filter(p => p.owner_actor_id === id);
  });

  readonly successRate = computed(() => {
    const total = this.dispatches().length;
    if (!total) return null;
    return Math.round((this.completedDispatches().length / total) * 100);
  });

  constructor() {
    effect(() => {
      const a = this.actor();
      if (a) this.titleService.setTitle(formatPageTitle(a.display_name));
    });
  }

  activeLabel(isActiveFlag: boolean): string {
    return isActiveFlag ? 'active' : 'inactive';
  }

  activeTone(isActiveFlag: boolean): 'success' | 'neutral' {
    return isActiveFlag ? 'success' : 'neutral';
  }

  kindTone(kind: string): 'info' | 'warning' | 'accent' | 'neutral' {
    switch (kind) {
      case 'agent':  return 'info';
      case 'human':  return 'warning';
      case 'system': return 'accent';
      default:       return 'neutral';
    }
  }
}
