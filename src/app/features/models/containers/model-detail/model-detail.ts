import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ModelsService } from '../../data-access/models.service';

@Component({
  selector: 'app-model-detail',
  imports: [RouterLink],
  templateUrl: './model-detail.html',
  styleUrl: './model-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelDetail {
  private readonly service = inject(ModelsService);
  private readonly route = inject(ActivatedRoute);

  private readonly id = toSignal(this.route.paramMap.pipe(map(p => `${p.get('provider')}/${p.get('name')}`)));

  readonly model = computed(() => this.service.getById(this.id() ?? ''));
  readonly stats = computed(() => this.service.getStatsFor(this.id() ?? ''));
}
