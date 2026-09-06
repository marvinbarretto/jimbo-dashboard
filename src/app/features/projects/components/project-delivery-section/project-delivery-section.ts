import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import type { DeliveryPr, Project, ProjectStateDeliverySlice } from '@domain/projects';
import { deriveDeliveryRows, hasCodebase, sortPrsForAttention } from '@domain/projects';

// Delivery & autonomy — the four boundaries autonomous work crosses
// (commission → merge → review → promote), declared policy against live fact.
//
// The page is thick with vault data and had nothing about delivery, so only
// the first boundary was visible at all: whether agents may act, but not what
// they merged, whether CI is red, or what is sitting on master unshipped.
//
// Relevance-gated the same way the operating-context section is — a project
// with no codebase crosses none of these, and four "not declared" rows would
// be worse than nothing.
@Component({
  selector: 'app-project-delivery-section',
  imports: [UiBadge, UiCluster, UiSection, UiStack],
  templateUrl: './project-delivery-section.html',
  styleUrl: './project-delivery-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDeliverySection {
  readonly project = input.required<Project>();

  readonly isRelevant = computed(() => hasCodebase(this.project()));

  // One call for the whole widget: /state already composes delivery alongside
  // the dispatch counters the Commission row needs, and it is the same read
  // the steward tick and /pm make — so this panel cannot disagree with them.
  // experimental API (httpResource, Angular 19.2+) — no stability concern at 21.
  private readonly stateResource = httpResource<ProjectStateDeliverySlice>(() => {
    const p = this.project();
    if (!hasCodebase(p)) return undefined;
    return `/api/projects/${p.id}/state`;
  });

  readonly isLoading = this.stateResource.isLoading;
  readonly loadFailed = computed(() => this.stateResource.error() != null);

  readonly rows = computed(() => {
    const slice = this.stateResource.value();
    if (!slice) return [];
    return deriveDeliveryRows(this.project(), slice);
  });

  /** Non-null only when the sweep actually ran; drives the PR list below. */
  readonly delivery = computed(() => this.stateResource.value()?.delivery ?? null);

  readonly prs = computed(() => {
    const d = this.delivery();
    if (!d || d.error) return [];
    return sortPrsForAttention(d.open_prs);
  });

  ciTone(pr: DeliveryPr): 'danger' | 'success' | 'warning' | 'neutral' {
    switch (pr.ci) {
      case 'failing': return 'danger';
      case 'passing': return 'success';
      case 'pending': return 'warning';
      // 'no CI' is not a pass — a repo with no checks is a different problem
      // from one whose checks are green, and tone must not conflate them.
      case 'none':    return 'neutral';
    }
  }

  ciLabel(pr: DeliveryPr): string {
    return pr.ci === 'none' ? 'no CI' : pr.ci;
  }

  /**
   * Section header summary. Only ever states a failure or an outstanding
   * release — never "all clear", because a dark instrument would produce the
   * same silence and the header cannot tell them apart.
   */
  readonly meta = computed<string | null>(() => {
    const d = this.delivery();
    if (!d || d.error) return null;
    const parts: string[] = [];
    if (d.failing > 0) parts.push(`${d.failing} failing`);
    if (d.latest_tag && d.unshipped > 0) parts.push(`${d.unshipped} unshipped`);
    return parts.length > 0 ? parts.join(' · ') : null;
  });

  readonly expanded = signal(true);

  toggle(): void {
    this.expanded.update(v => !v);
  }
}
