import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { UiSection } from '@shared/components/ui-section/ui-section';
import type { Project, ProjectAutonomyLevel } from '@domain/projects';
import { hasCodebase } from '@domain/projects';

/**
 * "May agents act here" — the declared half of Delivery.
 *
 * Sat alone at the bottom of the aside, as far from the delivery record as the
 * page could put it. It belongs next to it: one states the policy, the other
 * what actually shipped under that policy.
 *
 * Hints state what each value ACTUALLY causes, not what the word suggests. The
 * only check in the codebase is `autonomy_level !== 'ship'` (jimbo-api
 * dispatch.ts, the enqueueDispatch autonomy gate), so unset, 'none' and
 * 'propose' are indistinguishable at runtime — and saying otherwise turns this
 * into four controls, three of which do nothing.
 * See docs/architecture/autonomy-and-stewardship.md.
 */
@Component({
  selector: 'app-project-autonomy-section',
  imports: [UiSection],
  templateUrl: './project-autonomy-section.html',
  styleUrl: './project-autonomy-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectAutonomySection {
  readonly project = input.required<Project>();

  readonly changed = output<ProjectAutonomyLevel | null>();

  // Repo-synced projects mirror autonomy from docs/project.md — read-only here.
  readonly isRepoSynced = computed(() => !!this.project().synced_at);

  readonly current = computed<string>(() => this.project().autonomy_level ?? '');

  /**
   * Open by default only where agents plausibly act. A travel project can
   * still be dispatched to, so the control stays — but four radio rows about
   * agent policy should not be the third thing on its page.
   */
  readonly expanded = linkedSignal(() => hasCodebase(this.project()));

  toggle(): void {
    this.expanded.update(v => !v);
  }

  readonly meta = computed<string>(() => {
    const level = this.project().autonomy_level;
    return level ? `policy: ${level}` : 'no policy set';
  });

  readonly options: readonly { value: ProjectAutonomyLevel | ''; label: string; hint: string }[] = [
    { value: '',        label: 'Default (inherit)', hint: 'No project policy set. Behaves as Propose.' },
    { value: 'none',    label: 'None — read-only',  hint: 'Not enforced today — behaves as Propose. Kept for intent, not effect.' },
    { value: 'propose', label: 'Propose',           hint: 'A commission lands as “proposed” and waits for your approval.' },
    { value: 'ship',    label: 'Ship',              hint: 'A commission skips approval and enters the queue directly.' },
  ];

  select(value: string): void {
    this.changed.emit(value === '' ? null : (value as ProjectAutonomyLevel));
  }
}
