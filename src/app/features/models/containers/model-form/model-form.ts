import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { ModelsService } from '../../data-access/models.service';
import { MODEL_CAPABILITIES } from '../../utils/model.types';
import type { ModelProvider, ModelTier, ModelCapability } from '../../utils/model.types';
import { modelId } from '../../../../domain/ids';

@Component({
  selector: 'app-model-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './model-form.html',
  styleUrl: './model-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelForm {
  private readonly service = inject(ModelsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  private readonly id = toSignal(this.route.paramMap.pipe(
    map(p => p.get('provider') ? `${p.get('provider')}/${p.get('name')}` : null),
  ));
  private readonly models$ = toObservable(this.service.models);
  readonly isEdit = computed(() => !!this.id());

  readonly tiers: ModelTier[] = ['free', 'budget', 'standard', 'premium'];
  readonly providers: ModelProvider[] = ['anthropic', 'google', 'openai', 'x-ai', 'deepseek', 'meta'];
  readonly capabilities = MODEL_CAPABILITIES;

  // Model ids follow OpenRouter convention: provider/name (slugs either side of a slash).
  private readonly idPattern = /^[a-z0-9][a-z0-9.-]*\/[a-z0-9][a-z0-9.-]*$/i;

  readonly form = this.fb.nonNullable.group({
    id: ['', [Validators.required, Validators.pattern(this.idPattern)]],
    display_name: ['', Validators.required],
    provider: ['anthropic' as ModelProvider, Validators.required],
    tier: ['standard' as ModelTier, Validators.required],
    // Individual boolean controls per capability, converted to string[] on submit.
    // A FormArray would work too, but boolean controls are simpler to bind in the
    // template and easier to pre-populate from an existing capabilities array.
    cap_code:      [false],
    cap_text:      [false],
    cap_vision:    [false],
    cap_reasoning: [false],
    cap_math:      [false],
    cap_video:     [false],
    context_window: [null as number | null],
    input_cost_per_mtok: [null as number | null],
    output_cost_per_mtok: [null as number | null],
    is_active: [true],
    notes: [null as string | null],
  });

  constructor() {
    const id = this.id();
    if (id) {
      this.models$.pipe(filter(ms => ms.length > 0), take(1)).subscribe(models => {
        const model = models.find(m => m.id === id);
        if (!model) return;
        this.form.patchValue({
          ...model,
          cap_code:      model.capabilities.includes('code'),
          cap_text:      model.capabilities.includes('text'),
          cap_vision:    model.capabilities.includes('vision'),
          cap_reasoning: model.capabilities.includes('reasoning'),
          cap_math:      model.capabilities.includes('math'),
          cap_video:     model.capabilities.includes('video'),
        });
      });
    }
  }

  private selectedCapabilities(): ModelCapability[] {
    const v = this.form.getRawValue();
    return ([
      v.cap_code      && 'code',
      v.cap_text      && 'text',
      v.cap_vision    && 'vision',
      v.cap_reasoning && 'reasoning',
      v.cap_math      && 'math',
      v.cap_video     && 'video',
    ] as (ModelCapability | false)[]).filter((c): c is ModelCapability => !!c);
  }

  submit(): void {
    if (this.form.invalid) {
      // Mark so validation errors render — silent return would hide the problem.
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const id = modelId(v.id);
    const payload = {
      id,
      display_name: v.display_name,
      provider: v.provider,
      tier: v.tier,
      capabilities: this.selectedCapabilities(),
      context_window: v.context_window,
      input_cost_per_mtok: v.input_cost_per_mtok,
      output_cost_per_mtok: v.output_cost_per_mtok,
      is_active: v.is_active,
      notes: v.notes,
    };
    if (this.isEdit()) {
      this.service.update(id, payload);
    } else {
      this.service.create(payload);
    }
    this.router.navigate(['/models', ...v.id.split('/')]);
  }
}
