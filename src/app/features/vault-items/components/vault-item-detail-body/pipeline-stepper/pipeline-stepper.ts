import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { GROOMING_STATUS_LABELS, type GroomingStatus } from '@domain/vault/vault-item';

const MAIN_PIPELINE: readonly GroomingStatus[] = [
  'ungroomed', 'intake_complete', 'classified', 'decomposed', 'ready',
];

@Component({
  selector: 'app-pipeline-stepper',
  imports: [],
  templateUrl: './pipeline-stepper.html',
  styleUrl: './pipeline-stepper.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineStepperComponent {
  readonly current = input.required<GroomingStatus>();

  readonly steps = computed(() =>
    MAIN_PIPELINE.map(s => ({
      status: s,
      label: GROOMING_STATUS_LABELS[s],
      active: s === this.current(),
    }))
  );

  readonly isSidebranch = computed(() =>
    this.current() === 'needs_rework' || this.current() === 'intake_rejected'
  );
  readonly sideLabel = computed(() => GROOMING_STATUS_LABELS[this.current()]);
}
