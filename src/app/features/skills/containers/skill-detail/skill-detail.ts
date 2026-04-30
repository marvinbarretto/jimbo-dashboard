import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { formatPageTitle } from '@app/app-title-strategy';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiBackLink } from '@shared/components/ui-back-link/ui-back-link';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { SkillsService } from '../../data-access/skills.service';
import { skillNamespace, skillLocalName } from '@domain/skills';

@Component({
  selector: 'app-skill-detail',
  imports: [RouterLink, UiBackLink, UiBadge, UiCard, UiCluster, UiEmptyState, UiLoadingState, UiMetaList, UiPageHeader, UiSection, UiStack],
  templateUrl: './skill-detail.html',
  styleUrl: './skill-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillDetail {
  private readonly service = inject(SkillsService);
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);

  constructor() {
    effect(() => {
      const s = this.skill();
      if (s) this.titleService.setTitle(formatPageTitle(s.name));
    });
  }

  private readonly id = toSignal(
    this.route.paramMap.pipe(map(p => `${p.get('namespace')}/${p.get('name')}`)),
  );

  readonly skill = computed(() => this.service.getById(this.id() ?? ''));
  readonly isLoading = this.service.isLoading;

  readonly namespace = computed(() => {
    const id = this.id();
    return id ? skillNamespace(id) : null;
  });

  readonly localName = computed(() => {
    const id = this.id();
    return id ? skillLocalName(id) : '';
  });

  readonly isActive = computed(() => this.skill()?.metadata.is_active !== false);

  readonly statusLabel = computed(() => this.isActive() ? 'Active' : 'Inactive');
}
