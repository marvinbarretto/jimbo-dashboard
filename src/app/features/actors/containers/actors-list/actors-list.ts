import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActorsService } from '../../data-access/actors.service';

@Component({
  selector: 'app-actors-list',
  imports: [RouterLink],
  templateUrl: './actors-list.html',
  styleUrl: './actors-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActorsList {
  private readonly service = inject(ActorsService);

  readonly actors = this.service.actors;

  remove(id: string): void {
    if (confirm(`Remove actor ${id}?`)) {
      this.service.remove(id);
    }
  }
}
