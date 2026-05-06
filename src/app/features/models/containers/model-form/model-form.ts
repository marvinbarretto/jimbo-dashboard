import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormControl } from '@angular/forms';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { ModelsService } from '../../data-access/models.service';
import { ToastService } from '@shared/components/toast/toast.service';
import type { Model, ModelStatus, ModelSource } from '@domain/models';
import { ALL_CAPABILITIES, CAPABILITY_LABELS, type SkillCapability } from '@domain/capability';

const ID_PATTERN = /^[a-z0-9-]+\/[a-z0-9.-]+$/;

// OpenRouter stores prices as USD-per-token strings ("0.000003" = $3/MTok).
// The form takes $/MTok numbers for human-friendly entry — convert at boundary.
function mTokToTokenString(mtok: number): string {
  return (mtok / 1_000_000).toString();
}

function tokenStringToMTok(s: string | undefined): number | null {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n * 1_000_000 : null;
}

function parseList(s: string): string[] {
  return s.split(',').map(x => x.trim()).filter(Boolean);
}

function joinList(arr: readonly string[] | undefined): string {
  return arr?.join(', ') ?? '';
}

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
  private readonly toast = inject(ToastService);

  private readonly id = toSignal(
    this.route.paramMap.pipe(
      map(p => p.get('provider') && p.get('name') ? `${p.get('provider')}/${p.get('name')}` : null),
    ),
  );
  private readonly models$ = toObservable(this.service.models);

  readonly isEdit = computed(() => !!this.id());
  readonly modelId = this.id;

  readonly statuses: ModelStatus[] = ['candidate', 'preferred', 'deprecated'];
  readonly sources: ModelSource[] = ['openrouter', 'manual'];

  readonly capabilityOptions = ALL_CAPABILITIES;
  readonly capabilityLabel = (c: SkillCapability) => CAPABILITY_LABELS[c];

  // Pricing inputs are stored as OpenRouter-shaped strings ($/token) at the
  // boundary, but exposed here as $/MTok numbers for human-friendly entry.
  // Convert in submit() / patchValue().
  readonly form = this.fb.nonNullable.group({
    id:                  ['', [Validators.required, Validators.pattern(ID_PATTERN)]],
    name:                ['', Validators.required],
    description:         [''],
    status:              ['candidate' as ModelStatus, Validators.required],
    source:              ['openrouter' as ModelSource, Validators.required],
    provider:            ['', Validators.required],
    canonical_slug:      [''],
    context_length:      [null as number | null],
    // Pricing — entered in $/MTok for readability, converted to $/token strings on submit.
    prompt_price:        [null as number | null],
    completion_price:    [null as number | null],
    cache_read_price:    [null as number | null],
    cache_write_price:   [null as number | null],
    // Architecture — comma-separated for inputs.
    input_modalities:    [''],
    output_modalities:   [''],
    tokenizer:           [''],
    supported_parameters: [''],
    knowledge_cutoff:    [''],
    considered_at:       [''],
    deprecated_at:       [''],
    classes:             new FormArray(ALL_CAPABILITIES.map(() => new FormControl(false, { nonNullable: true }))),
    body:                [''],
  });

  get classesArray(): FormArray<FormControl<boolean>> {
    return this.form.controls.classes;
  }

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  constructor() {
    const id = this.id();
    if (id) {
      this.form.controls.id.disable();
      this.models$.pipe(filter(ms => ms.length > 0), take(1)).subscribe(models => {
        const m = models.find(x => x.id === id);
        if (!m) return;
        const p = m.metadata.pricing;
        this.form.patchValue({
          id:                   m.id,
          name:                 m.name,
          description:          m.description,
          status:               m.metadata.status,
          source:               m.metadata.source,
          provider:             m.metadata.provider,
          canonical_slug:       m.metadata.canonical_slug ?? '',
          context_length:       m.metadata.context_length ?? null,
          prompt_price:         tokenStringToMTok(p?.prompt),
          completion_price:     tokenStringToMTok(p?.completion),
          cache_read_price:     tokenStringToMTok(p?.input_cache_read),
          cache_write_price:    tokenStringToMTok(p?.input_cache_write),
          input_modalities:     joinList(m.metadata.architecture?.input_modalities),
          output_modalities:    joinList(m.metadata.architecture?.output_modalities),
          tokenizer:            m.metadata.architecture?.tokenizer ?? '',
          supported_parameters: joinList(m.metadata.supported_parameters),
          knowledge_cutoff:     m.metadata.knowledge_cutoff ?? '',
          considered_at:        m.metadata.considered_at ?? '',
          deprecated_at:        m.metadata.deprecated_at ?? '',
          body:                 m.body,
        });
        const classes = m.metadata.classes ?? [];
        ALL_CAPABILITIES.forEach((cap, i) => {
          this.classesArray.at(i).setValue(classes.includes(cap));
        });
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const pricing: Record<string, string> = {};
    if (v.prompt_price != null)      pricing['prompt']            = mTokToTokenString(v.prompt_price);
    if (v.completion_price != null)  pricing['completion']        = mTokToTokenString(v.completion_price);
    if (v.cache_read_price != null)  pricing['input_cache_read']  = mTokToTokenString(v.cache_read_price);
    if (v.cache_write_price != null) pricing['input_cache_write'] = mTokToTokenString(v.cache_write_price);

    const inputModalities = parseList(v.input_modalities);
    const outputModalities = parseList(v.output_modalities);
    const supportedParameters = parseList(v.supported_parameters);
    const classes = ALL_CAPABILITIES.filter((_, i) => v.classes[i]);

    const architecture = (inputModalities.length || outputModalities.length || v.tokenizer)
      ? {
          modality: inputModalities.length && outputModalities.length
            ? `${inputModalities.join('+')}->${outputModalities.join('+')}`
            : '',
          input_modalities: inputModalities,
          output_modalities: outputModalities,
          tokenizer: v.tokenizer,
          instruct_type: null,
        }
      : undefined;

    const metadata = {
      status: v.status,
      source: v.source,
      provider: v.provider,
      classes: classes.length > 0 ? classes : undefined,
      canonical_slug: v.canonical_slug || undefined,
      context_length: v.context_length ?? undefined,
      architecture,
      pricing: Object.keys(pricing).length > 0 ? pricing : undefined,
      supported_parameters: supportedParameters.length > 0 ? supportedParameters : undefined,
      knowledge_cutoff: v.knowledge_cutoff || undefined,
      considered_at: v.considered_at || undefined,
      deprecated_at: v.deprecated_at || null,
    };

    this.saving.set(true);
    this.saveError.set(null);

    if (this.isEdit()) {
      this.service.update(this.id()!, {
        name: v.name, description: v.description, metadata, body: v.body,
      }).subscribe({
        next: m => { this.toast.success(`Model "${v.name}" saved`); this.afterSave(m); },
        error: err => this.handleError(err),
      });
    } else {
      this.service.create({
        id: v.id, name: v.name, description: v.description, metadata, body: v.body,
      }).subscribe({
        next: m => { this.toast.success(`Model "${v.name}" created`); this.afterSave(m); },
        error: err => this.handleError(err),
      });
    }
  }

  delete(): void {
    const id = this.id();
    if (!id) return;
    if (!confirm(`Delete model ${id}? The file is removed and a delete commit pushed to hub.`)) return;
    this.saving.set(true);
    this.saveError.set(null);
    this.service.remove(id).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(`Model "${id}" deleted`);
        this.router.navigate(['/config/models']);
      },
      error: err => this.handleError(err),
    });
  }

  private afterSave(m: Model): void {
    this.saving.set(false);
    this.router.navigate(['/config/models', ...m.id.split('/')]);
  }

  private handleError(err: unknown): void {
    this.saving.set(false);
    const msg = (err as { error?: { error?: { message?: string } }; message?: string })
      ?.error?.error?.message
      ?? (err as { message?: string })?.message
      ?? 'request failed';
    this.saveError.set(msg);
    this.toast.error(msg);
  }
}
