import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ModelStacksService } from '../../data-access/model-stacks.service';
import { ModelsService } from '../../../models/data-access/models.service';

@Component({
  selector: 'app-model-stack-detail',
  imports: [RouterLink],
  templateUrl: './model-stack-detail.html',
  styleUrl: './model-stack-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelStackDetail {
  private readonly service = inject(ModelStacksService);
  private readonly modelsService = inject(ModelsService);
  private readonly route = inject(ActivatedRoute);

  private readonly id = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? '')));

  readonly stack = computed(() => this.service.getById(this.id() ?? ''));

  // Resolve model display names for the cascade — avoids raw IDs in the template.
  readonly cascade = computed(() =>
    this.stack()?.model_ids.map(id => this.modelsService.getById(id) ?? { id, display_name: id })
  );

  readonly fastModel = computed(() => {
    const fid = this.stack()?.fast_model_id;
    return fid ? (this.modelsService.getById(fid) ?? { id: fid, display_name: fid }) : null;
  });
}
