import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { SkillsService } from '../../data-access/skills.service';
import { ModelStacksService } from '../../../model-stacks/data-access/model-stacks.service';

@Component({
  selector: 'app-skill-form',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './skill-form.html',
  styleUrl: './skill-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillForm {
  private readonly service = inject(SkillsService);
  private readonly stacksService = inject(ModelStacksService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  private readonly routeId = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));
  readonly isEdit = computed(() => !!this.routeId());

  readonly availableStacks = this.stacksService.activeStacks;

  // toObservable must be created in the constructor/field context to have an injector.
  private readonly skills$ = toObservable(this.service.skills);

  readonly form = this.fb.nonNullable.group({
    id: ['', Validators.required],
    display_name: ['', Validators.required],
    description: [''],
    model_stack_id: [''],
    is_active: [true],
    notes: [''],
  });

  constructor() {
    // Patch the form once the service has loaded and the route ID is known.
    // take(1) auto-unsubscribes after the first non-empty emission.
    const id = this.routeId();
    if (id) {
      this.skills$.pipe(filter(ss => ss.length > 0), take(1)).subscribe(skills => {
        const skill = skills.find(s => s.id === id);
        if (!skill) return;
        this.form.patchValue({
          id: skill.id,
          display_name: skill.display_name,
          description: skill.description ?? '',
          model_stack_id: skill.model_stack_id ?? '',
          is_active: skill.is_active,
          notes: skill.notes ?? '',
        });
      });
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const payload = {
      id: v.id,
      display_name: v.display_name,
      description: v.description || null,
      model_stack_id: v.model_stack_id || null,
      is_active: v.is_active,
      notes: v.notes || null,
    };
    if (this.isEdit()) {
      this.service.update(v.id, payload);
    } else {
      this.service.create(payload);
    }
    this.router.navigate(['/skills', v.id]);
  }
}
