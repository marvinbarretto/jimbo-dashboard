// @experimental: uses @angular/forms/signals (Angular 21). Chosen over ReactiveFormsModule
// because the form IS the signal — no separate FormGroup/FormControl layer, no patchValue
// gymnastics. The model signal is the source of truth; the form just adds validation logic.
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { form, FormField, FormRoot, required } from '@angular/forms/signals';
import { ModelStacksService } from '../../data-access/model-stacks.service';
import { ModelsService } from '../../../models/data-access/models.service';

interface ModelStackFormModel {
  id: string;
  display_name: string;
  description: string;
  model_ids: string[];
  fast_model_id: string;
  is_active: boolean;
}

@Component({
  selector: 'app-model-stack-form',
  imports: [RouterLink, FormField, FormRoot],
  templateUrl: './model-stack-form.html',
  styleUrl: './model-stack-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelStackForm implements OnInit {
  private readonly service = inject(ModelStacksService);
  private readonly modelsService = inject(ModelsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly routeId = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));
  readonly isEdit = computed(() => !!this.routeId());

  readonly availableModels = this.modelsService.activeModels;

  readonly formModel = signal<ModelStackFormModel>({
    id: '',
    display_name: '',
    description: '',
    model_ids: [],
    fast_model_id: '',
    is_active: true,
  });

  readonly stackForm = form(this.formModel, (fields) => {
    required(fields.id);
    required(fields.display_name);
  });

  ngOnInit(): void {
    const id = this.routeId();
    if (id) {
      const stack = this.service.getById(id);
      if (stack) {
        this.formModel.set({
          id: stack.id,
          display_name: stack.display_name,
          description: stack.description ?? '',
          model_ids: [...stack.model_ids],
          fast_model_id: stack.fast_model_id ?? '',
          is_active: stack.is_active,
        });
      }
    }
  }

  addModel(modelId: string): void {
    if (!modelId || this.formModel().model_ids.includes(modelId)) return;
    this.formModel.update(m => ({ ...m, model_ids: [...m.model_ids, modelId] }));
  }

  removeModel(index: number): void {
    this.formModel.update(m => ({
      ...m,
      model_ids: m.model_ids.filter((_, i) => i !== index),
    }));
  }

  submit(): void {
    const m = this.formModel();
    if (!m.id || !m.display_name) return;
    const payload = {
      id: m.id,
      display_name: m.display_name,
      description: m.description || null,
      model_ids: m.model_ids,
      fast_model_id: m.fast_model_id || null,
      is_active: m.is_active,
    };
    if (this.isEdit()) {
      this.service.update(m.id, payload);
    } else {
      this.service.create(payload);
    }
    this.router.navigate(['/model-stacks', m.id]);
  }
}
