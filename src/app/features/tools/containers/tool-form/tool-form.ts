import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { ToolsService } from '../../data-access/tools.service';
import { toolId } from '../../../../domain/ids';

@Component({
  selector: 'app-tool-form',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './tool-form.html',
  styleUrl: './tool-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolForm {
  private readonly service = inject(ToolsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  private readonly routeId = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));
  readonly isEdit = computed(() => !!this.routeId());

  private readonly tools$ = toObservable(this.service.tools);

  readonly form = this.fb.nonNullable.group({
    id:           ['', Validators.required],
    display_name: ['', Validators.required],
    endpoint_url: [''],
    handler_type: ['webhook' as 'webhook' | 'builtin' | 'mcp', Validators.required],
    is_active:    [true],
  });

  constructor() {
    const id = this.routeId();
    if (id) {
      this.tools$.pipe(filter(ts => ts.length > 0), take(1)).subscribe(tools => {
        const tool = tools.find(t => t.id === id);
        if (!tool) return;
        this.form.patchValue({
          id:           tool.id,
          display_name: tool.display_name,
          endpoint_url: tool.endpoint_url ?? '',
          handler_type: tool.handler_type,
          is_active:    tool.is_active,
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
    const id = toolId(v.id);
    const payload = {
      id,
      display_name: v.display_name,
      endpoint_url: v.endpoint_url || null,
      handler_type: v.handler_type,
      is_active:    v.is_active,
    };
    if (this.isEdit()) {
      this.service.update(id, payload);
    } else {
      this.service.create(payload);
    }
    this.router.navigate(['/tools', id]);
  }
}
