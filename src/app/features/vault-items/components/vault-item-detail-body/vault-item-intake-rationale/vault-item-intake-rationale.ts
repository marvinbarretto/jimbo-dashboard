import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UiSection } from '@shared/components/ui-section/ui-section';
import type { IntakeRationale } from '@domain/vault/vault-item';

// Renders the structured "exam" written by hermes/intake-quality as a
// labelled grid. Each row is one of the skill's committed claims. Scanning
// it should take seconds — when something's wrong (e.g. project mis-inferred,
// goal hallucinated), the operator spots it before downstream stages compound
// the error. Hidden entirely when the rationale is absent (e.g. older notes,
// notes that never went through intake).
//
// The structure mirrors IntakeRationale in @domain/vault/vault-item.ts which
// in turn mirrors IntakeRationaleSchema in jimbo-api/src/schemas/grooming.ts.
@Component({
  selector: 'app-vault-item-intake-rationale',
  imports: [UiSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (rationale(); as r) {
      <app-ui-section
        title="Intake Rationale"
        [collapsible]="true"
        [collapsed]="false"
        [stickyHeader]="true"
        stickyTop="var(--sticky-header-height)"
        [meta]="metaText()"
      >
        <dl class="intake-rationale">
          <dt>What is this?</dt>
          <dd>{{ r.what_is_this }}</dd>

          <dt>Project</dt>
          <dd [class.intake-rationale__null]="!r.inferred_project">
            {{ r.inferred_project ?? '—' }}
          </dd>

          <dt>Epic</dt>
          <dd [class.intake-rationale__null]="!r.inferred_epic">
            {{ r.inferred_epic ?? '—' }}
          </dd>

          <dt>Goal</dt>
          <dd [class.intake-rationale__null]="!r.inferred_goal">
            {{ r.inferred_goal ?? '—' }}
          </dd>

          <dt>Done when</dt>
          <dd [class.intake-rationale__null]="!r.inferred_done">
            {{ r.inferred_done ?? '—' }}
          </dd>

          <dt>Verdict reasoning</dt>
          <dd>{{ r.why_verdict }}</dd>
        </dl>
      </app-ui-section>
    }
  `,
  styles: [`
    .intake-rationale {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 0.5rem 1.25rem;
      margin: 0;
      padding: 0.5rem 0.25rem;
    }
    .intake-rationale dt {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted, #888);
      font-weight: 600;
      align-self: start;
    }
    .intake-rationale dd {
      margin: 0;
      color: var(--text, #ddd);
      line-height: 1.45;
    }
    .intake-rationale__null {
      color: var(--text-muted, #666);
      font-style: italic;
    }
  `],
})
export class VaultItemIntakeRationale {
  readonly rationale = input.required<IntakeRationale | null>();

  // Surfaces the skill's self-rated confidence in the section header so the
  // operator can weight the answers before reading them.
  readonly metaText = computed<string>(() => {
    const r = this.rationale();
    return r?.confidence ? `confidence: ${r.confidence}` : '';
  });
}
