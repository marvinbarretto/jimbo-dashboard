import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import type { ModuleDocStaleness } from '../../data-access/module-doc';

// The one visual grammar for doc freshness, shared by list and detail.
// A stale doc must LOOK stale — that badge is the whole point of the
// freshness contract, so the mapping lives in exactly one place.
@Component({
  selector: 'app-module-staleness-badge',
  imports: [UiBadge],
  template: `<app-ui-badge [tone]="tone()" [title]="hover()">{{ label() }}</app-ui-badge>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModuleStalenessBadge {
  readonly staleness = input.required<ModuleDocStaleness>();

  readonly tone = computed<'success' | 'warning' | 'neutral'>(() => {
    switch (this.staleness().status) {
      case 'fresh': return 'success';
      case 'stale': return 'warning';
      default: return 'neutral'; // unknown — never dress it up as fresh
    }
  });

  readonly label = computed(() => {
    const s = this.staleness();
    if (s.status === 'fresh') return 'fresh';
    if (s.status === 'stale') {
      const n = s.commits_behind ?? s.commits.length;
      return `${n} commit${n === 1 ? '' : 's'} behind`;
    }
    return 'unverified';
  });

  readonly hover = computed(() => {
    const rc = this.staleness().reviewed_commit;
    return rc ? `reviewed at ${rc}` : 'no reviewed commit recorded';
  });
}
