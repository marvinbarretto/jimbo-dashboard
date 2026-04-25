import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { PromptsService } from '../../data-access/prompts.service';
import { promptId as brandPromptId } from '../../../../domain/ids';

@Component({
  selector: 'app-prompt-version-form',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './prompt-version-form.html',
  styleUrl: './prompt-version-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromptVersionForm {
  private readonly service = inject(PromptsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly promptId = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));
  readonly prompt = computed(() => {
    const id = this.promptId();
    return id ? this.service.getById(id) : undefined;
  });

  readonly form = this.fb.nonNullable.group({
    system_content: ['', Validators.required],
    user_content:   [''],
    notes:          [''],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const id = this.promptId();
    if (!id) return;

    const v = this.form.getRawValue();
    const prompt = this.prompt();

    this.service.createVersion({
      prompt_id:         brandPromptId(id),
      system_content:    v.system_content,
      user_content:      v.user_content || null,
      notes:             v.notes || null,
      input_schema:      null,
      output_schema:     null,
      parent_version_id: prompt?.current_version_id ?? null,
    }).subscribe({
      next: () => this.router.navigate(['/prompts', id]),
    });
  }
}
