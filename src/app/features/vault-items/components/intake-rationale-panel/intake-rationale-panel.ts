import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiSubsection } from '@shared/components/ui-subsection/ui-subsection';
import type { IntakeRationale } from '@domain/vault/vault-item';

/**
 * The intake exam, surfaced.
 *
 * `dispatch/intake-quality` produces this on every note it grooms and calls it
 * "a quickfire exam the operator marks at a glance" — but until 2026-08-06
 * nothing rendered it anywhere, so 400+ answers had been generated and never
 * read. It is shown here so its quality can be judged and the skill kept or
 * dropped on evidence.
 *
 * The two inferred_* fields are the interesting ones: `inferred_project` agrees
 * with the eventual human link 74 times out of 85, and 201 notes carry an
 * inference that was never acted on. Rendering them as claims-with-a-verdict
 * rather than plain text is the point — the operator is marking, not reading.
 */
@Component({
  selector: 'app-intake-rationale-panel',
  imports: [UiBadge, UiSubsection],
  templateUrl: './intake-rationale-panel.html',
  styleUrl: './intake-rationale-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntakeRationalePanel {
  readonly rationale = input.required<IntakeRationale>();
  /** The project actually linked, so the inference can be marked against it. */
  readonly actualProject = input<string | null>(null);

  protected readonly confidence = computed(() => this.rationale().confidence ?? null);

  /**
   * Self-rated confidence is near-useless as a signal on its own — 380 of 401
   * answers rate themselves "high" and none has ever said "low" — so it is
   * shown flat rather than given a colour that implies it discriminates.
   */
  protected readonly confidenceTone = computed<'neutral' | 'warning'>(() =>
    this.confidence() === 'low' ? 'warning' : 'neutral',
  );

  /** Did the inferred project match what the note is actually filed under? */
  protected readonly projectVerdict = computed<'agreed' | 'differs' | 'unlinked' | null>(() => {
    const inferred = this.rationale().inferred_project;
    if (!inferred) return null;
    const actual = this.actualProject();
    if (!actual) return 'unlinked';
    return actual === inferred ? 'agreed' : 'differs';
  });

  protected readonly rows = computed(() => {
    const r = this.rationale();
    return [
      { label: 'Goal', value: r.inferred_goal },
      { label: 'Done looks like', value: r.inferred_done },
      { label: 'Epic', value: r.inferred_epic },
    ].filter((row): row is { label: string; value: string } => !!row.value);
  });
}
