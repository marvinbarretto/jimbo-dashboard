import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { ModelStacksService } from '../../data-access/model-stacks.service';
import type { ModelStack } from '@domain/model-stacks';

const ID_PATTERN = /^[a-z0-9-]+$/;

function parseList(s: string): string[] {
  return s.split('\n').map(x => x.trim()).filter(Boolean);
}

function joinList(arr: readonly string[] | undefined): string {
  return arr?.join('\n') ?? '';
}

@Component({
  selector: 'app-model-stack-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './model-stack-form.html',
  styleUrl: './model-stack-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelStackForm {
  private readonly service = inject(ModelStacksService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly id = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));
  private readonly stacks$ = toObservable(this.service.stacks);

  readonly isEdit = computed(() => !!this.id());
  readonly stackId = this.id;

  readonly form = this.fb.nonNullable.group({
    id:          ['', [Validators.required, Validators.pattern(ID_PATTERN)]],
    name:        ['', Validators.required],
    description: [''],
    chain:       ['', Validators.required],   // newline-separated model ids
    is_active:   [true],
    body:        [''],
  });

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  constructor() {
    const id = this.id();
    if (id) {
      this.form.controls.id.disable();
      this.stacks$.pipe(filter(ss => ss.length > 0), take(1)).subscribe(stacks => {
        const s = stacks.find(x => x.id === id);
        if (!s) return;
        this.form.patchValue({
          id:          s.id,
          name:        s.name,
          description: s.description,
          chain:       joinList(s.metadata.chain),
          is_active:   s.metadata.is_active ?? true,
          body:        s.body,
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
    const metadata = {
      chain: parseList(v.chain),
      is_active: v.is_active,
    };

    this.saving.set(true);
    this.saveError.set(null);

    if (this.isEdit()) {
      this.service.update(this.id()!, {
        name: v.name, description: v.description, metadata, body: v.body,
      }).subscribe({
        next: s => this.afterSave(s),
        error: err => this.handleError(err),
      });
    } else {
      this.service.create({
        id: v.id, name: v.name, description: v.description, metadata, body: v.body,
      }).subscribe({
        next: s => this.afterSave(s),
        error: err => this.handleError(err),
      });
    }
  }

  delete(): void {
    const id = this.id();
    if (!id) return;
    if (!confirm(`Delete model stack ${id}?`)) return;
    this.saving.set(true);
    this.service.remove(id).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/model-stacks']);
      },
      error: err => this.handleError(err),
    });
  }

  private afterSave(s: ModelStack): void {
    this.saving.set(false);
    this.router.navigate(['/model-stacks', s.id]);
  }

  private handleError(err: unknown): void {
    this.saving.set(false);
    const msg = (err as { error?: { error?: { message?: string } }; message?: string })
      ?.error?.error?.message
      ?? (err as { message?: string })?.message
      ?? 'request failed';
    this.saveError.set(msg);
  }
}
