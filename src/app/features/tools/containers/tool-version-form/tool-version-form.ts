import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ToolsService } from '../../data-access/tools.service';
import { toolId as brandToolId } from '@domain/ids';

@Component({
  selector: 'app-tool-version-form',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './tool-version-form.html',
  styleUrl: './tool-version-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolVersionForm {
  private readonly service = inject(ToolsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly toolId = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));
  readonly tool = computed(() => {
    const id = this.toolId();
    return id ? this.service.getById(id) : undefined;
  });

  readonly form = this.fb.nonNullable.group({
    description:   ['', Validators.required],
    input_schema:  [''],
    output_schema: [''],
    notes:         [''],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const id = this.toolId();
    if (!id) return;

    const v = this.form.getRawValue();

    const parseJson = (s: string): unknown => {
      if (!s.trim()) return null;
      try { return JSON.parse(s); } catch { return null; }
    };

    this.service.createVersion({
      tool_id:           brandToolId(id),
      description:       v.description,
      input_schema:      parseJson(v.input_schema),
      output_schema:     parseJson(v.output_schema),
      notes:             v.notes || null,
      parent_version_id: this.tool()?.current_version_id ?? null,
    }).subscribe({
      next: () => this.router.navigate(['/tools', id]),
    });
  }
}
