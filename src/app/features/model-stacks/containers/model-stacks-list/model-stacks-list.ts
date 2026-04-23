import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ModelStacksService } from '../../data-access/model-stacks.service';

@Component({
  selector: 'app-model-stacks-list',
  imports: [RouterLink],
  templateUrl: './model-stacks-list.html',
  styleUrl: './model-stacks-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelStacksList {
  private readonly service = inject(ModelStacksService);

  readonly stacks = this.service.stacks;

  remove(id: string): void {
    if (confirm(`Remove stack ${id}?`)) {
      this.service.remove(id);
    }
  }
}
