import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { ActorsService } from '../../data-access/actors.service';
import { actorId } from '@domain/ids';
import type { ActorKind, ActorRuntime } from '@domain/actors';

@Component({
  selector: 'app-actor-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './actor-form.html',
  styleUrl: './actor-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActorForm {
  private readonly service = inject(ActorsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  private readonly id = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));
  private readonly actors$ = toObservable(this.service.actors);
  readonly isEdit = computed(() => !!this.id());

  readonly kinds: ActorKind[] = ['human', 'agent', 'system'];
  // Null sentinel as empty string — coerced at submit boundary.
  readonly runtimes: Array<{ label: string; value: ActorRuntime }> = [
    { label: '—', value: null },
    { label: 'ollama', value: 'ollama' },
    { label: 'anthropic', value: 'anthropic' },
    { label: 'openrouter', value: 'openrouter' },
    { label: 'hermes', value: 'hermes' },
  ];

  readonly form = this.fb.nonNullable.group({
    id:           ['', [Validators.required, Validators.pattern(/^[a-z][a-z0-9-]*$/)]],
    display_name: ['', Validators.required],
    kind:         ['human' as ActorKind, Validators.required],
    runtime:      ['' as string],   // empty string represents null at submit
    description:  [null as string | null],
    is_active:    [true],
  });

  constructor() {
    const id = this.id();
    if (id) {
      this.actors$.pipe(filter(as => as.length > 0), take(1)).subscribe(actors => {
        const actor = actors.find(a => a.id === id);
        if (!actor) return;
        this.form.patchValue({
          ...actor,
          // Coerce null runtime to empty string for the select control.
          runtime: actor.runtime ?? '',
        });
        this.form.controls.id.disable();
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      // Mark so validation errors render — silent return would hide the problem.
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload = {
      // Cast at the API boundary: branded IDs are phantom types at runtime.
      id:           actorId(v.id),
      display_name: v.display_name,
      kind:         v.kind,
      // Coerce empty string sentinel back to null.
      runtime:      (v.runtime || null) as ActorRuntime,
      description:  v.description,
      is_active:    v.is_active,
    };
    if (this.isEdit()) {
      this.service.update(v.id, payload);
    } else {
      this.service.create(payload);
    }
    this.router.navigate(['/actors', v.id]);
  }
}
