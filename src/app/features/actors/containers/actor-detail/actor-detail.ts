import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ActorsService } from '../../data-access/actors.service';

@Component({
  selector: 'app-actor-detail',
  imports: [RouterLink],
  templateUrl: './actor-detail.html',
  styleUrl: './actor-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActorDetail {
  private readonly service = inject(ActorsService);
  private readonly route = inject(ActivatedRoute);

  private readonly id = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? '')));

  readonly actor = computed(() => this.service.getById(this.id() ?? ''));
}
