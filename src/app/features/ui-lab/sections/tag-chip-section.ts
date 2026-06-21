import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TagChip } from '@shared/components/tag-chip/tag-chip';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiSection } from '@shared/components/ui-section/ui-section';

@Component({
  selector: 'app-tag-chip-section',
  imports: [TagChip, UiStack, UiCluster, UiSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Tag Chip" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Primitive pill for a single <strong>free-text tag</strong>. Tags have no
          entity backing, so they deliberately don't go through
          <code>app-entity-chip</code> (which needs an actor / project / vault-item
          type). This is the shared home for the tag-pill markup that
          <code>vault-item-tag-list</code> and <code>ui-mention-chip-strip</code>
          used to hand-roll. Per-chip: the caller loops and owns list semantics.
        </p>

        <div>
          <p class="ui-lab__subhead">Muted — persisted tags (detail side-panel)</p>
          <app-ui-cluster gap="sm">
            <app-tag-chip label="positioning" />
            <app-tag-chip label="needs-review" />
            <app-tag-chip label="editorial" />
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">Accent + <code>#</code> prefix — freshly-captured (mention strip)</p>
          <app-ui-cluster gap="sm">
            <app-tag-chip label="urgent" prefix="#" tone="accent" />
            <app-tag-chip label="bug" prefix="#" tone="accent" />
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">Removable — emits <code>(removed)</code></p>
          <app-ui-cluster gap="sm" role="list">
            @for (t of liveTags(); track t) {
              <app-tag-chip
                role="listitem"
                [label]="t"
                [removable]="true"
                (removed)="drop(t)"
              />
            } @empty {
              <span class="ui-lab__support-copy">all removed — </span>
            }
          </app-ui-cluster>
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class TagChipSection {
  protected readonly liveTags = signal<readonly string[]>(['alpha', 'beta', 'gamma']);

  protected drop(tag: string): void {
    this.liveTags.update(tags => tags.filter(t => t !== tag));
  }
}
