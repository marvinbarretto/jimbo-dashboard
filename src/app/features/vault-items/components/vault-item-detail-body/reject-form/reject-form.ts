import { Component, ChangeDetectionStrategy, input, output, computed, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import type { ActorId, VaultItemId } from '@domain/ids';
import type { VaultActivityEvent } from '@domain/activity/activity-event';

export interface RejectSubmission {
  reason: string;
  newOwnerId: ActorId;
}

export interface RejectActorOption {
  id:    ActorId;
  label: string;
  kind:  'human' | 'agent' | 'system';
}

@Component({
  selector: 'app-reject-form',
  imports: [ReactiveFormsModule],
  templateUrl: './reject-form.html',
  styleUrl: './reject-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RejectFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly itemId          = input.required<VaultItemId>();
  readonly currentOwner    = input<ActorId | null>(null);
  readonly recentEvents    = input<readonly VaultActivityEvent[]>([]);
  readonly availableActors = input<readonly RejectActorOption[]>([]);

  readonly cancelled = output<void>();
  readonly submitted = output<RejectSubmission>();

  // Events are sorted newest-first, so iterating forward finds the most recent
  // agent_run_completed. Falls back to currentOwner if no agent has run yet.
  readonly defaultOwner = computed<ActorId | null>(() => {
    const events = this.recentEvents();
    for (const e of events) {
      if (e.type === 'agent_run_completed') return e.actor_id;
    }
    return this.currentOwner();
  });

  readonly form = this.fb.nonNullable.group({
    reason:   ['', [Validators.required, Validators.minLength(12)]],
    newOwner: ['', [Validators.required]],
  });

  constructor() {
    // Seed newOwner once we have a default — done in a microtask so input
    // values from the parent are available.
    queueMicrotask(() => {
      const def = this.defaultOwner();
      if (def && !this.form.controls.newOwner.value) {
        this.form.controls.newOwner.setValue(def);
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { reason, newOwner } = this.form.getRawValue();
    this.submitted.emit({ reason: reason.trim(), newOwnerId: newOwner as ActorId });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
