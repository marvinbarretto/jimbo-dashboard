import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { SkillsService } from '../../data-access/skills.service';
import { ProjectsService } from '../../../projects/data-access/projects.service';
import { skillId, projectId, promptId } from '../../../../domain/ids';
import { skillNamespace } from '../../../../domain/skills';
import type { ModelTier } from '../../../../domain/skills';

// Slug pattern: {project}/{skill-name} — lowercase, digits, hyphens each side.
const slugPattern = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/;

function jsonValidator(control: AbstractControl): ValidationErrors | null {
  const v = control.value as string;
  if (!v || !v.trim()) return null;
  try {
    JSON.parse(v);
    return null;
  } catch {
    return { jsonSyntax: true };
  }
}

@Component({
  selector: 'app-skill-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './skill-form.html',
  styleUrl: './skill-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillForm {
  private readonly service = inject(SkillsService);
  private readonly projectsService = inject(ProjectsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  private readonly id = toSignal(
    this.route.paramMap.pipe(
      map(p => p.get('namespace') ? `${p.get('namespace')}/${p.get('name')}` : null),
    ),
  );
  private readonly skills$ = toObservable(this.service.skills);

  readonly isEdit = computed(() => !!this.id());
  readonly tiers: ModelTier[] = ['free', 'budget', 'standard', 'premium'];
  readonly activeProjects = this.projectsService.activeProjects;

  readonly form = this.fb.nonNullable.group({
    id:             ['', [Validators.required, Validators.pattern(slugPattern)]],
    display_name:   ['', Validators.required],
    description:    [null as string | null],
    prompt_id:      [null as string | null],
    model_hint:     ['budget' as ModelTier, Validators.required],
    source_repo:    ['', Validators.required],
    input_schema:   ['', [jsonValidator]],
    output_schema:  ['', [jsonValidator]],
    is_active:      [true],
  });

  // Cross-field warning: id prefix must match source_repo. Warn, don't block — a
  // mismatch indicates a data bug to fix, not a reason to refuse the save.
  readonly prefixMismatch = computed(() => {
    const idVal = this.form.getRawValue().id;
    const repo  = this.form.getRawValue().source_repo;
    if (!idVal || !repo) return false;
    return skillNamespace(skillId(idVal)) !== repo;
  });

  constructor() {
    const id = this.id();
    if (id) {
      // Lock the id field on edit — slug is immutable after creation.
      this.form.controls.id.disable();
      this.skills$.pipe(filter(ss => ss.length > 0), take(1)).subscribe(skills => {
        const skill = skills.find(s => s.id === id);
        if (!skill) return;
        this.form.patchValue({
          id:            skill.id,
          display_name:  skill.display_name,
          description:   skill.description,
          prompt_id:     skill.prompt_id,
          model_hint:    skill.model_hint,
          source_repo:   skill.source_repo,
          input_schema:  skill.input_schema != null ? JSON.stringify(skill.input_schema, null, 2) : '',
          output_schema: skill.output_schema != null ? JSON.stringify(skill.output_schema, null, 2) : '',
          is_active:     skill.is_active,
        });
      });
    }
  }

  private parseSchema(raw: string): unknown {
    if (!raw || !raw.trim()) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload = {
      // Cast at the API boundary — branded IDs are phantom types at runtime.
      id:           skillId(v.id),
      display_name: v.display_name,
      description:  v.description || null,
      prompt_id:    v.prompt_id ? promptId(v.prompt_id) : null,
      model_hint:   v.model_hint,
      source_repo:  projectId(v.source_repo),
      input_schema:  this.parseSchema(v.input_schema as string),
      output_schema: this.parseSchema(v.output_schema as string),
      is_active:    v.is_active,
      last_indexed_at: null,
    };
    if (this.isEdit()) {
      this.service.update(v.id, payload);
    } else {
      this.service.create(payload);
    }
    this.router.navigate(['/skills', ...v.id.split('/')]);
  }
}
