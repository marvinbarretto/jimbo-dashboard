import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AppIcon } from '@shared/components/app-icon/app-icon';
import { ICON_NAMES } from '@shared/components/app-icon/icon-registry';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';

@Component({
  selector: 'app-app-icon-section',
  imports: [AppIcon, UiSection, UiStack, UiCluster],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Icon" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Single primitive over <code>lucide-angular</code>. Pick from a curated set of
          semantic names — the registry maps each to a lucide icon, so the underlying
          glyph can change without touching consumers. Strokes use <code>currentColor</code>
          so the parent's text colour cascades. Default size 16px; pass <code>ariaLabel</code>
          when the icon carries meaning on its own (e.g. icon-only button).
        </p>

        <div>
          <p class="ui-lab__subhead">Registry</p>
          <app-ui-cluster gap="lg">
            @for (name of names; track name) {
              <span class="ui-lab__icon-cell">
                <app-icon [name]="name" [size]="20" />
                <code>{{ name }}</code>
              </span>
            }
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">Sizes</p>
          <app-ui-cluster gap="md" align="center">
            <app-icon name="edit" [size]="12" />
            <app-icon name="edit" [size]="16" />
            <app-icon name="edit" [size]="20" />
            <app-icon name="edit" [size]="24" />
            <app-icon name="edit" [size]="32" />
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">Colour follows parent</p>
          <app-ui-cluster gap="md" align="center">
            <span style="color: var(--color-text)">          <app-icon name="clock" /> default</span>
            <span style="color: var(--color-text-muted)">    <app-icon name="clock" /> muted</span>
            <span style="color: var(--color-danger, #c0392b)"><app-icon name="delete" /> danger</span>
          </app-ui-cluster>
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
  styles: [`
    .ui-lab__icon-cell {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
  `],
})
export class AppIconSection {
  readonly names = ICON_NAMES;
}
