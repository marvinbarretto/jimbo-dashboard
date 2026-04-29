import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ModelsService } from '../../data-access/models.service';
import { modelProvider, modelLocalName } from '@domain/models';
import { TableShell } from '@shared/components/table-shell/table-shell';

@Component({
  selector: 'app-models-list',
  imports: [RouterLink, TableShell],
  templateUrl: './models-list.html',
  styleUrl: './models-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelsList {
  private readonly service = inject(ModelsService);

  readonly models = this.service.models;
  readonly isLoading = this.service.isLoading;
  readonly error = this.service.error;

  provider = modelProvider;
  localName = modelLocalName;

  modelLink(id: string): string[] {
    return id.split('/');
  }
}
