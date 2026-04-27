import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { formatPageTitle } from '@app/app-title-strategy';
import { ModelStacksService } from '../../data-access/model-stacks.service';

@Component({
  selector: 'app-model-stack-detail',
  imports: [RouterLink],
  templateUrl: './model-stack-detail.html',
  styleUrl: './model-stack-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelStackDetail {
  private readonly service = inject(ModelStacksService);
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);

  constructor() {
    effect(() => {
      const s = this.stack();
      if (s) this.titleService.setTitle(formatPageTitle(s.name));
    });
  }

  readonly id = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? '')));
  readonly stack = computed(() => this.service.getById(this.id() ?? ''));
  readonly isLoading = this.service.isLoading;

  readonly isActive = computed(() => this.stack()?.metadata.is_active !== false);
}
