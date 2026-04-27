// Edit a SKILL.md via dashboard-api → jimbo-api → git pull/commit/push to hub.
// Slice 3 ships edit-only; the /skills/new route shows a placeholder until
// slice 4 adds creation (which requires picking a category folder + new file).
//
// Last-write-wins: the server pulls --ff-only before applying our patch, so a
// concurrent remote edit between page-load and save would silently overwrite
// the form's "from" values. Acceptable at single-operator scale.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { SkillsService } from '../../data-access/skills.service';
import type { Skill } from '@domain/skills';

// Comma-and-whitespace separated lists keep the form simple. Tag inputs are
// nicer UX but slice 3 prioritises shipping.
function parseList(s: string): string[] {
  return s.split(',').map(x => x.trim()).filter(Boolean);
}

function joinList(arr: readonly string[] | undefined): string {
  return arr?.join(', ') ?? '';
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  // /skills/:namespace/:name/edit — both params present means edit mode.
  // /skills/new — neither present, slice-4 placeholder.
  private readonly id = toSignal(
    this.route.paramMap.pipe(
      map(p => p.get('namespace') && p.get('name') ? `${p.get('namespace')}/${p.get('name')}` : null),
    ),
  );
  private readonly skills$ = toObservable(this.service.skills);

  readonly isEdit = computed(() => !!this.id());
  readonly skillId = this.id;

  readonly form = this.fb.nonNullable.group({
    name:                ['', Validators.required],
    description:         ['', Validators.required],
    executors:           ['', Validators.required],
    timeout_minutes:     [null as number | null],
    required_context:    [''],
    produces:            [''],
    completes_dispatch:  [false],
    is_active:           [true],
    body:                ['', Validators.required],
  });

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  constructor() {
    const id = this.id();
    if (id) {
      // Wait until the service has loaded skills, then prefill once.
      this.skills$.pipe(filter(ss => ss.length > 0), take(1)).subscribe(skills => {
        const skill = skills.find(s => s.id === id);
        if (!skill) return;
        this.form.patchValue({
          name:               skill.name,
          description:        skill.description,
          executors:          joinList(skill.metadata.executors),
          timeout_minutes:    skill.metadata.timeout_minutes ?? null,
          required_context:   joinList(skill.metadata.required_context),
          produces:           joinList(skill.metadata.produces),
          completes_dispatch: skill.metadata.completes_dispatch ?? false,
          is_active:          skill.metadata.is_active ?? true,
          body:               skill.body,
        });
      });
    }
  }

  submit(): void {
    if (this.form.invalid || !this.id()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const patch = {
      name: v.name,
      description: v.description,
      metadata: {
        executors: parseList(v.executors),
        timeout_minutes: v.timeout_minutes ?? undefined,
        required_context: parseList(v.required_context),
        produces: parseList(v.produces),
        completes_dispatch: v.completes_dispatch,
        is_active: v.is_active,
      },
      body: v.body,
    };

    this.saving.set(true);
    this.saveError.set(null);
    this.service.update(this.id()!, patch).subscribe({
      next: (skill: Skill) => {
        this.saving.set(false);
        this.router.navigate(['/skills', ...skill.id.split('/')]);
      },
      error: err => {
        this.saving.set(false);
        // Surface the upstream message verbatim; git-conflict and validation
        // errors carry actionable detail there.
        const msg = err?.error?.error?.message ?? err?.message ?? 'save failed';
        this.saveError.set(msg);
      },
    });
  }
}
