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
  readonly isLoading = this.service.isLoading;
  readonly error = this.service.error;

  isActive(s: { metadata: { is_active?: boolean } }): boolean {
    return s.metadata.is_active !== false;
  }
}
