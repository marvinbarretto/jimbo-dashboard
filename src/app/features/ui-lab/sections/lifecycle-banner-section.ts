import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LifecycleBanner } from '@shared/components/lifecycle-banner/lifecycle-banner';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

@Component({
  selector: 'app-lifecycle-banner-section',
  imports: [LifecycleBanner, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Lifecycle Banner" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          States that mean "this is not live work", stated where they cannot be scanned past.
          A banner rather than a chip on purpose: an archived item used to look identical to an
          active one, so an archive that silently failed was indistinguishable from one that
          worked — and the items involved sat jamming a gate for sixteen days.
        </p>

        <div style="max-width: 520px;">
          <app-lifecycle-banner state="archived" detail="by @marvin · 22 Aug 18:45" />
        </div>

        <div style="max-width: 520px;">
          <app-lifecycle-banner state="done" detail="closed by PR #25 · 18 Jun" />
        </div>

        <div style="max-width: 520px;">
          <app-lifecycle-banner state="deferred" detail="pipeline saturated · swept back when it drains" />
        </div>

        <div style="max-width: 520px;">
          <app-lifecycle-banner state="deferred" detail="pipeline saturated" />
        </div>

        <p class="ui-lab__support-copy">
          <code>archived</code> is muted rather than alarming — it is usually the correct
          outcome, and colouring it as an error would train the operator to ignore it.
          <code>done</code> and <code>archived</code> stay distinct: finished and abandoned are
          different facts, and merging them loses the one a reader needs.
        </p>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class LifecycleBannerSection {}
