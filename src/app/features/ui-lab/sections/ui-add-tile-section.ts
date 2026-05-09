import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { UiAddTile } from '@shared/components/ui-add-tile/ui-add-tile';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

@Component({
  selector: 'app-ui-add-tile-section',
  imports: [UiAddTile, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Add Tile" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Dashed-outline tile that sits at the end of a card grid as the "+ Add"
          affordance. Keeps the grid rhythm intact instead of pulling the create
          action out into a remote header button. Inputs: <code>label</code>
          (required), <code>ariaLabel</code> (optional). Output: <code>pressed</code>.
        </p>

        <div>
          <p class="ui-lab__subhead">In a grid</p>
          <div class="lab-card-grid">
            <div class="lab-fake-card">Card A</div>
            <div class="lab-fake-card">Card B</div>
            <div class="lab-fake-card">Card C</div>
            <app-ui-add-tile label="New project" (pressed)="onPressed()" />
          </div>
        </div>

        <div>
          <p class="ui-lab__subhead">Empty grid</p>
          <div class="lab-card-grid">
            <app-ui-add-tile label="New item" (pressed)="onPressed()" />
          </div>
        </div>

        <p class="ui-lab__support-copy">
          Last press: <code>{{ pressCount() }}</code>
        </p>
      </app-ui-stack>
    </app-ui-section>
  `,
  styles: [`
    .lab-card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1rem;
    }

    .lab-fake-card {
      padding: 1rem;
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 0.5rem;
      background: var(--color-surface, #fff);
      min-height: 5rem;
      display: flex;
      align-items: center;
      color: var(--color-text-muted, #6b7280);
      font-size: 0.85rem;
    }
  `],
})
export class UiAddTileSection {
  protected readonly pressCount = signal(0);
  protected onPressed(): void { this.pressCount.update(n => n + 1); }
}
