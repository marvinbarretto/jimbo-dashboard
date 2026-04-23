import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ModelsService } from '../models';
import type { Model } from '../model';

@Component({
  selector: 'app-models-list',
  imports: [RouterLink],
  templateUrl: './models-list.html',
  styleUrl: './models-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelsList {
  private readonly service = inject(ModelsService);

  readonly models = this.service.models;

  modelLink(id: string): string[] {
    return id.split('/');
  }

  editLink(id: string): string[] {
    return [...id.split('/'), 'edit'];
  }

  tierLabel(tier: Model['tier']): string {
    return { free: 'Free', fast: 'Fast', balanced: 'Balanced', powerful: 'Powerful' }[tier];
  }

  remove(id: string): void {
    if (confirm(`Remove model ${id}?`)) {
      this.service.remove(id);
    }
  }
}
