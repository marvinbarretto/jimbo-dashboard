import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { filter, map, startWith, take } from 'rxjs';
import { UiBackLink } from '@shared/components/ui-back-link/ui-back-link';
import { UiFormActions } from '@shared/components/ui-form-actions/ui-form-actions';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { ProjectsService } from '../../data-access/projects.service';
import { ActorsService } from '../../../actors/data-access/actors.service';
import { projectId, actorId } from '@domain/ids';
import type { ProjectKind, ProjectStatus } from '@domain/projects';
import { PROJECT_PALETTE } from '../../data-access/projects.service';

@Component({
  selector: 'app-project-form',
  imports: [ReactiveFormsModule, RouterLink, UiBackLink, UiFormActions, UiPageHeader, UiStack],
  templateUrl: './project-form.html',
  styleUrl: './project-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectForm {
  private readonly service = inject(ProjectsService);
  private readonly actorsService = inject(ActorsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  private readonly id = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));
  private readonly projects$ = toObservable(this.service.projects);
  readonly isEdit = computed(() => !!this.id());

  readonly statuses: ProjectStatus[] = ['active', 'archived'];
  readonly kinds: ProjectKind[] = ['major', 'minor'];
  readonly palette = PROJECT_PALETTE;

  // Actor dropdown options — only active actors can own new projects.
  // For existing projects owned by a now-inactive actor, the id stays as a
  // plain string value even if it's not in the active list.
  readonly actors = this.actorsService.activeActors;

  readonly form = this.fb.nonNullable.group({
    id:             ['', Validators.required],
    display_name:   ['', Validators.required],
    description:    [null as string | null],
    status:         ['active' as ProjectStatus, Validators.required],
    kind:           ['major' as ProjectKind, Validators.required],
    owner_actor_id: ['', Validators.required],
    criteria:       [null as string | null],
    repo_url:       [null as string | null],
    color_token:    [null as string | null],
  });

  // Must be declared after `form` — reads form.controls at class field init time.
  readonly selectedColor = toSignal(
    this.form.controls.color_token.valueChanges.pipe(startWith(this.form.controls.color_token.value))
  );

  constructor() {
    const id = this.id();
    if (id) {
      this.projects$.pipe(filter(ps => ps.length > 0), take(1)).subscribe(projects => {
        const project = projects.find(p => p.id === id);
        if (!project) return;
        this.form.patchValue(project);
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      // Mark so validation errors render — silent return would hide the problem.
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload = {
      // Cast at the API boundary: branded IDs are phantom types at runtime.
      id:             projectId(v.id),
      display_name:   v.display_name,
      description:    v.description,
      status:         v.status,
      kind:           v.kind,
      owner_actor_id: actorId(v.owner_actor_id),
      criteria:       v.criteria,
      repo_url:       v.repo_url,
      color_token:    v.color_token,
    };
    if (this.isEdit()) {
      this.service.update(v.id, payload);
    } else {
      this.service.create(payload);
    }
    this.router.navigate(['/config/projects', v.id]);
  }
}
