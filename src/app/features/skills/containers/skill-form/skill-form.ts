import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { SkillsService } from '../../data-access/skills.service';
import { ModelStacksService } from '../../../model-stacks/data-access/model-stacks.service';

@Component({
  selector: 'app-skill-form',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './skill-form.html',
  styleUrl: './skill-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillForm implements OnInit {
  private readonly service = inject(SkillsService);
  private readonly stacksService = inject(ModelStacksService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  private readonly routeId = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));
  readonly isEdit = computed(() => !!this.routeId());

  readonly availableStacks = this.stacksService.activeStacks;

  readonly form = this.fb.nonNullable.group({
    id: ['', Validators.required],
    display_name: ['', Validators.required],
    description: [''],
    model_stack_id: [''],
    is_active: [true],
    notes: [''],
  });

  ngOnInit(): void {
    const id = this.routeId();
    if (id) {
      const skill = this.service.getById(id);
      if (skill) {
        this.form.patchValue({
          id: skill.id,
          display_name: skill.display_name,
          description: skill.description ?? '',
          model_stack_id: skill.model_stack_id ?? '',
          is_active: skill.is_active,
          notes: skill.notes ?? '',
        });
      }
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
