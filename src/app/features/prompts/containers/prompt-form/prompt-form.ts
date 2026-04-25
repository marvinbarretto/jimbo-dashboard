import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { PromptsService } from '../../data-access/prompts.service';
import { promptId } from '../../../../domain/ids';

@Component({
  selector: 'app-prompt-form',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './prompt-form.html',
  styleUrl: './prompt-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromptForm {
  private readonly service = inject(PromptsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  private readonly routeId = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));
  readonly isEdit = computed(() => !!this.routeId());

  private readonly prompts$ = toObservable(this.service.prompts);

  readonly form = this.fb.nonNullable.group({
    id:           ['', Validators.required],
    display_name: ['', Validators.required],
    description:  [''],
    is_active:    [true],
  });

  constructor() {
    const id = this.routeId();
    if (id) {
      this.prompts$.pipe(filter(ps => ps.length > 0), take(1)).subscribe(prompts => {
        const prompt = prompts.find(p => p.id === id);
        if (!prompt) return;
        this.form.patchValue({
          id:           prompt.id,
          display_name: prompt.display_name,
          description:  prompt.description ?? '',
          is_active:    prompt.is_active,
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
    const id = promptId(v.id);
    const payload = {
      id,
      display_name: v.display_name,
      description:  v.description || null,
      is_active:    v.is_active,
    };
    if (this.isEdit()) {
      this.service.update(id, payload);
    } else {
      this.service.create(payload);
    }
    this.router.navigate(['/prompts', id]);
  }
}
