import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToolsService } from '../../data-access/tools.service';

@Component({
  selector: 'app-tools-list',
  imports: [RouterLink],
  templateUrl: './tools-list.html',
  styleUrl: './tools-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolsList {
  readonly service = inject(ToolsService);
  readonly tools = this.service.tools;

  remove(id: string): void {
    if (!confirm(`Delete tool "${id}"?`)) return;
    this.service.remove(id);
  }
}
