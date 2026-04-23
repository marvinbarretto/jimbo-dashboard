import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { ModelStacksService } from '../../data-access/model-stacks.service';
import { ModelsService } from '../../../models/data-access/models.service';

@Component({
  selector: 'app-model-stack-form',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './model-stack-form.html',
  styleUrl: './model-stack-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelStackForm {
  private readonly service = inject(ModelStacksService);
  private readonly modelsService = inject(ModelsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  private readonly routeId = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));
  readonly isEdit = computed(() => !!this.routeId());

  readonly availableModels = this.modelsService.activeModels;

  // model_ids is a cascade list managed outside the FormGroup — it's list
  // management, not a form field, so a signal is cleaner than FormArray.
  readonly modelIds = signal<string[]>([]);

  // toObservable must be created in the constructor/field context to have an injector.
  private readonly stacks$ = toObservable(this.service.stacks);

  readonly form = this.fb.nonNullable.group({
    id: ['', Validators.required],
    display_name: ['', Validators.required],
    description: [''],
    fast_model_id: [''],
    is_active: [true],
  });

  constructor() {
    const id = this.routeId();
    if (id) {
      this.stacks$.pipe(filter(ss => ss.length > 0), take(1)).subscribe(stacks => {
        const stack = stacks.find(s => s.id === id);
        if (!stack) return;
        this.form.patchValue({
          id: stack.id,
          display_name: stack.display_name,
          description: stack.description ?? '',
          fast_model_id: stack.fast_model_id ?? '',
          is_active: stack.is_active,
        });
        this.modelIds.set([...stack.model_ids]);
      });
    }
  }

  addModel(modelId: string): void {
    if (!modelId || this.modelIds().includes(modelId)) return;
    this.modelIds.update(ids => [...ids, modelId]);
  }

  removeModel(index: number): void {
    this.modelIds.update(ids => ids.filter((_, i) => i !== index));
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const payload = {
      id: v.id,
      display_name: v.display_name,
      description: v.description || null,
      model_ids: this.modelIds(),
      fast_model_id: v.fast_model_id || null,
      is_active: v.is_active,
    };
    if (this.isEdit()) {
      this.service.update(v.id, payload);
    } else {
      this.service.create(payload);
    }
    this.router.navigate(['/model-stacks', v.id]);
  }
}
