import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PromptsService } from '../../data-access/prompts.service';

@Component({
  selector: 'app-prompts-list',
  imports: [RouterLink],
  templateUrl: './prompts-list.html',
  styleUrl: './prompts-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromptsList {
  private readonly service = inject(PromptsService);

  readonly prompts = this.service.prompts;

  remove(id: string): void {
    if (confirm(`Remove prompt ${id}?`)) {
      this.service.remove(id);
    }
  }
}
