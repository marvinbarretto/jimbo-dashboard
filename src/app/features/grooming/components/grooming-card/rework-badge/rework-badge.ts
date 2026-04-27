import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-rework-badge',
  imports: [],
  templateUrl: './rework-badge.html',
  styleUrl: './rework-badge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'rework-badge' },
})
export class ReworkBadgeComponent {
  readonly reasonSnippet = input.required<string>();
  readonly reassignedTo  = input<string | null>(null);
}
