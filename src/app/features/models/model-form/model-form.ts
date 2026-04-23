import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ModelsService } from '../models';
import type { ModelProvider, ModelTier } from '../model';

@Component({
  selector: 'app-model-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './model-form.html',
  styleUrl: './model-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelForm implements OnInit {
  private readonly service = inject(ModelsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  private readonly id = toSignal(this.route.paramMap.pipe(
    map(p => p.get('provider') ? `${p.get('provider')}/${p.get('name')}` : null),
  ));
  readonly isEdit = computed(() => !!this.id());

  readonly tiers: ModelTier[] = ['free', 'fast', 'balanced', 'powerful'];
  readonly providers: ModelProvider[] = ['anthropic', 'google', 'openai', 'x-ai', 'deepseek', 'meta'];

  readonly form = this.fb.nonNullable.group({
    id: ['', Validators.required],
    display_name: ['', Validators.required],
    provider: ['anthropic' as ModelProvider, Validators.required],
    tier: ['balanced' as ModelTier, Validators.required],
    context_window: [null as number | null],
    input_cost_per_mtok: [null as number | null],
    output_cost_per_mtok: [null as number | null],
    is_active: [true],
    notes: [null as string | null],
  });

  ngOnInit(): void {
    const id = this.id();
    if (id) {
      const model = this.service.getById(id);
      if (model) this.form.patchValue(model);
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    if (this.isEdit()) {
      this.service.update(value.id, value);
    } else {
      this.service.create(value);
    }
    this.router.navigate(['/models', ...value.id.split('/')]);
  }
}
