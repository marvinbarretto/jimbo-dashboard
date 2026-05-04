import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { ModelsService } from '../../data-access/models.service';
import { ToastService } from '@shared/components/toast/toast.service';
import type { Model, ModelStatus } from '@domain/models';

const ID_PATTERN = /^[a-z0-9-]+\/[a-z0-9.-]+$/;

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

  readonly form = this.fb.nonNullable.group({
    id:               ['', [Validators.required, Validators.pattern(ID_PATTERN)]],
    name:             ['', Validators.required],
    description:      [''],
    status:           ['candidate' as ModelStatus, Validators.required],
    provider:         ['', Validators.required],
    context_window:   [null as number | null],
    input_price:      [null as number | null],
    output_price:     [null as number | null],
    cache_read:       [null as number | null],
    cache_write:      [null as number | null],
    considered_at:    [''],
    deprecated_at:    [''],
    body:             [''],
  });

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  constructor() {
    const id = this.id();
    if (id) {
      this.form.controls.id.disable();
      this.models$.pipe(filter(ms => ms.length > 0), take(1)).subscribe(models => {
        const m = models.find(x => x.id === id);
        if (!m) return;
        const p = m.metadata.prices_usd_per_million ?? {};
        this.form.patchValue({
          id:             m.id,
          name:           m.name,
          description:    m.description,
          status:         m.metadata.status,
          provider:       m.metadata.provider,
          context_window: m.metadata.context_window ?? null,
          input_price:    p.input ?? null,
          output_price:   p.output ?? null,
          cache_read:     p.cache_read ?? null,
          cache_write:    p.cache_write ?? null,
          considered_at:  m.metadata.considered_at ?? '',
          deprecated_at:  m.metadata.deprecated_at ?? '',
          body:           m.body,
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
    const prices: Record<string, number> = {};
    if (v.input_price != null) prices['input'] = v.input_price;
    if (v.output_price != null) prices['output'] = v.output_price;
    if (v.cache_read != null) prices['cache_read'] = v.cache_read;
    if (v.cache_write != null) prices['cache_write'] = v.cache_write;

    const metadata = {
      status: v.status,
      provider: v.provider,
      context_window: v.context_window ?? undefined,
      prices_usd_per_million: Object.keys(prices).length > 0 ? prices : undefined,
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
        this.router.navigate(['/models']);
      },
      error: err => this.handleError(err),
    });
  }

  private afterSave(m: Model): void {
    this.saving.set(false);
    this.router.navigate(['/models', ...m.id.split('/')]);
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
