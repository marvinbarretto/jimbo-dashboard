import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-card-parent-link',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <a class="card-parent-link" [routerLink]="['/vault-items', parentSeq()]">
      <span class="card-parent-link__arrow" aria-hidden="true">↳</span>
      <span class="card-parent-link__seq">⊞ #{{ parentSeq() }}</span>
      <span class="card-parent-link__title">{{ parentTitle() }}</span>
    </a>
  `,
  styles: [`
    .card-parent-link {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--color-text-muted);
      text-decoration: none;
      padding: 0.2rem 0.4rem;
      border-radius: 0 var(--radius) var(--radius) 0;
      background: color-mix(in srgb, var(--proj-tint, var(--color-info)) 18%, transparent);
      border-left: 2px solid color-mix(in srgb, var(--proj-tint, var(--color-info)) 60%, var(--color-border));
    }
    .card-parent-link:hover {
      background: color-mix(in srgb, var(--proj-tint, var(--color-info)) 28%, transparent);
      text-decoration: none;
    }
    .card-parent-link__arrow {
      color: var(--color-text-muted);
    }
    .card-parent-link__seq {
      color: var(--color-text-muted);
      font-weight: 500;
    }
    .card-parent-link__title {
      color: var(--color-text);
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }
  `],
})
export class CardParentLink {
  readonly parentSeq   = input.required<number>();
  readonly parentTitle = input.required<string>();
}
