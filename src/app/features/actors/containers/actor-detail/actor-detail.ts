import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { formatPageTitle } from '@app/app-title-strategy';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiBackLink } from '@shared/components/ui-back-link/ui-back-link';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { ActorsService } from '../../data-access/actors.service';

@Component({
  selector: 'app-actor-detail',
  imports: [RouterLink, UiBackLink, UiBadge, UiEmptyState, UiMetaList, UiPageHeader, UiSection, UiStack],
  templateUrl: './actor-detail.html',
  styleUrl: './actor-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActorDetail {
  private readonly service = inject(ActorsService);
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);

  private readonly id = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? '')));

  readonly actor = computed(() => this.service.getById(this.id() ?? ''));

  constructor() {
    effect(() => {
      const a = this.actor();
      if (a) this.titleService.setTitle(formatPageTitle(a.display_name));
    });
  }

  activeLabel(isActive: boolean): string {
    return isActive ? 'active' : 'inactive';
  }

  activeTone(isActive: boolean): 'success' | 'neutral' {
    return isActive ? 'success' : 'neutral';
  }

  kindTone(kind: string): 'info' | 'warning' | 'accent' | 'neutral' {
    switch (kind) {
      case 'agent':
        return 'info';
      case 'human':
        return 'warning';
      case 'system':
        return 'accent';
      default:
        return 'neutral';
    }
  }
}
