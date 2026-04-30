import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { formatPageTitle } from '@app/app-title-strategy';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { ModelsService } from '../../data-access/models.service';
import { modelProvider, modelLocalName } from '@domain/models';

@Component({
  selector: 'app-model-detail',
  imports: [RouterLink, UiLoadingState],
  templateUrl: './model-detail.html',
  styleUrl: './model-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelDetail {
  private readonly service = inject(ModelsService);
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);

  constructor() {
    effect(() => {
      const m = this.model();
      if (m) this.titleService.setTitle(formatPageTitle(m.name));
    });
  }

  private readonly id = toSignal(
    this.route.paramMap.pipe(map(p => `${p.get('provider')}/${p.get('name')}`)),
  );

  readonly model = computed(() => this.service.getById(this.id() ?? ''));
  readonly isLoading = this.service.isLoading;

  readonly provider = computed(() => {
    const id = this.id();
    return id ? modelProvider(id) : null;
  });

  readonly localName = computed(() => {
    const id = this.id();
    return id ? modelLocalName(id) : '';
  });
}
