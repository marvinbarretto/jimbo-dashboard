import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { ModalShell } from '@shared/components/modal-shell/modal-shell';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiFormActions } from '@shared/components/ui-form-actions/ui-form-actions';
import { SlugFromDirective } from '@shared/forms/slug-from.directive';
import { UiTypeahead, type TypeaheadOption } from '@shared/components/ui-typeahead/ui-typeahead';
import { ProjectsService, PROJECT_PALETTE } from '../../data-access/projects.service';
import { ActorsService } from '../../../actors/data-access/actors.service';
import { projectId, actorId, type ProjectId } from '@domain/ids';
import type { ProjectKind } from '@domain/projects';

export interface ProjectFormDialogData {
  /** Pre-selected kind — set when ghost card is in the major or minor grid. */
  kind?: ProjectKind;
}

@Component({
  selector: 'app-project-form-dialog',
  imports: [ReactiveFormsModule, ModalShell, UiButton, UiFormActions, SlugFromDirective, UiTypeahead],
  templateUrl: './project-form-dialog.html',
  styleUrl: './project-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectFormDialog {
  private readonly service = inject(ProjectsService);
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject<DialogRef<ProjectId | null>>(DialogRef);
  protected readonly data = inject<ProjectFormDialogData>(DIALOG_DATA, { optional: true }) ?? {};

  readonly titleId = 'project-form-dialog-title';
  readonly kinds: ProjectKind[] = ['major', 'minor', 'admin'];
  readonly palette = PROJECT_PALETTE;
  readonly actors = inject(ActorsService).activeActors;
  readonly ownerOptions = computed<TypeaheadOption[]>(() =>
    this.actors().map(a => ({ id: a.id, label: a.display_name, hint: a.id })),
  );
  readonly existingIds = computed(() => this.service.projects().map(p => p.id));

  readonly form = this.fb.nonNullable.group({
    id:             ['', Validators.required],
    display_name:   ['', Validators.required],
    description:    [null as string | null],
    kind:           [(this.data.kind ?? 'major') as ProjectKind, Validators.required],
    owner_actor_id: ['', Validators.required],
    repo_url:       [null as string | null],
    color_token:    [null as string | null],
    // Short project key (e.g. LOC) — optional; 2–6 letters. See project-form.
    short_code:     [null as string | null, Validators.pattern(/^[A-Za-z]{2,6}$/)],
  });

  readonly selectedColor = toSignal(
    this.form.controls.color_token.valueChanges.pipe(startWith(this.form.controls.color_token.value)),
  );

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const id = projectId(v.id);
    this.service.create({
      id,
      display_name:   v.display_name,
      description:    v.description,
      status:         'active',
      kind:           v.kind,
      owner_actor_id: actorId(v.owner_actor_id),
      criteria:       null,
      repo_url:       v.repo_url,
      color_token:    v.color_token,
      short_code:     v.short_code?.trim() ? v.short_code.trim().toUpperCase() : null,
    });
    this.dialogRef.close(id);
  }

  cancel(): void { this.dialogRef.close(null); }
}
