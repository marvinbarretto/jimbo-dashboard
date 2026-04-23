// @experimental: uses @angular/forms/signals (Angular 21)
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { form, FormField, FormRoot, required } from '@angular/forms/signals';
import { SkillsService } from '../../data-access/skills.service';
import { ModelStacksService } from '../../../model-stacks/data-access/model-stacks.service';

interface SkillFormModel {
  id: string;
  display_name: string;
  description: string;
  model_stack_id: string;
  is_active: boolean;
  notes: string;
}

@Component({
  selector: 'app-skill-form',
  imports: [RouterLink, FormField, FormRoot],
  templateUrl: './skill-form.html',
  styleUrl: './skill-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillForm implements OnInit {
  private readonly service = inject(SkillsService);
  private readonly stacksService = inject(ModelStacksService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly routeId = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));
  readonly isEdit = computed(() => !!this.routeId());

  readonly availableStacks = this.stacksService.activeStacks;

  readonly formModel = signal<SkillFormModel>({
    id: '',
    display_name: '',
    description: '',
    model_stack_id: '',
    is_active: true,
    notes: '',
  });

  readonly skillForm = form(this.formModel, (fields) => {
    required(fields.id);
    required(fields.display_name);
  });

  ngOnInit(): void {
    const id = this.routeId();
    if (id) {
      const skill = this.service.getById(id);
      if (skill) {
        this.formModel.set({
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
    const m = this.formModel();
    if (!m.id || !m.display_name) return;
    const payload = {
      id: m.id,
      display_name: m.display_name,
      description: m.description || null,
      model_stack_id: m.model_stack_id || null,
      is_active: m.is_active,
      notes: m.notes || null,
    };
    if (this.isEdit()) {
      this.service.update(m.id, payload);
    } else {
      this.service.create(payload);
    }
    this.router.navigate(['/skills', m.id]);
  }
}
