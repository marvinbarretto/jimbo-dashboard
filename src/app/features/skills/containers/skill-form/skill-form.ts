// Edit / create / delete / rename a SKILL.md.
//
// Edit:   /skills/:namespace/:name/edit  → PATCH
// Create: /skills/new                    → POST
// Delete: confirm + DELETE in-place
// Rename: prompt + POST .../rename
//
// All four flows route through dashboard-api → jimbo-api → git pull/commit/push.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormControl } from '@angular/forms';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { SkillsService } from '../../data-access/skills.service';
import { ToastService } from '@shared/components/toast/toast.service';
import type { Skill } from '@domain/skills';
import { ALL_CAPABILITIES, CAPABILITY_LABELS, type SkillCapability } from '@domain/capability';

const ID_PATTERN = /^[a-z0-9-]+\/[a-z0-9-]+$/;

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
  private readonly toast = inject(ToastService);

  // /skills/:namespace/:name/edit — both params present means edit mode.
  // /skills/new — neither present, create mode.
  private readonly id = toSignal(
    this.route.paramMap.pipe(
      map(p => p.get('namespace') && p.get('name') ? `${p.get('namespace')}/${p.get('name')}` : null),
    ),
  );
  private readonly skills$ = toObservable(this.service.skills);

  readonly isEdit = computed(() => !!this.id());
  readonly skillId = this.id;

  // One checkbox per capability — keep parallel arrays so the template
  // iterates ALL_CAPABILITIES and binds [formControlName] by index.
  readonly capabilityOptions = ALL_CAPABILITIES;
  readonly capabilityLabel = (c: SkillCapability) => CAPABILITY_LABELS[c];

  readonly form = this.fb.nonNullable.group({
    id:                  ['', [Validators.required, Validators.pattern(ID_PATTERN)]],
    name:                ['', Validators.required],
    description:         ['', Validators.required],
    requires:            new FormArray(ALL_CAPABILITIES.map(() => new FormControl(false, { nonNullable: true }))),
    timeout_minutes:     [null as number | null],
    required_context:    [''],
    produces:            [''],
    completes_dispatch:  [false],
    is_active:           [true],
    body:                ['', Validators.required],
  });

  // Type-safe accessor for the requires FormArray — needed for template binding.
  get requiresArray(): FormArray<FormControl<boolean>> {
    return this.form.controls.requires;
  }

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  constructor() {
    const id = this.id();
    if (id) {
      // Edit mode — id is locked and pre-filled from the existing record.
      this.form.controls.id.disable();
      this.skills$.pipe(filter(ss => ss.length > 0), take(1)).subscribe(skills => {
        const skill = skills.find(s => s.id === id);
        if (!skill) return;
        this.form.patchValue({
          id:                 skill.id,
          name:               skill.name,
          description:        skill.description,
          timeout_minutes:    skill.metadata.timeout_minutes ?? null,
          required_context:   joinList(skill.metadata.required_context),
          produces:           joinList(skill.metadata.produces),
          completes_dispatch: skill.metadata.completes_dispatch ?? false,
          is_active:          skill.metadata.is_active ?? true,
          body:               skill.body,
        });
        // FormArray controls are positional — set each by index.
        const requires = skill.metadata.requires ?? [];
        ALL_CAPABILITIES.forEach((cap, i) => {
          this.requiresArray.at(i).setValue(requires.includes(cap));
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
    const requires = ALL_CAPABILITIES.filter((_, i) => v.requires[i]);
    const metadata = {
      requires,
      timeout_minutes: v.timeout_minutes ?? undefined,
      required_context: parseList(v.required_context),
      produces: parseList(v.produces),
      completes_dispatch: v.completes_dispatch,
      is_active: v.is_active,
    };

    this.saving.set(true);
    this.saveError.set(null);

    if (this.isEdit()) {
      const id = this.id()!;
      this.service.update(id, {
        name: v.name,
        description: v.description,
        metadata,
        body: v.body,
      }).subscribe({
        next: skill => { this.toast.success(`Skill "${v.name}" saved`); this.afterSave(skill); },
        error: err => this.handleError(err),
      });
    } else {
      this.service.create({
        id: v.id,
        name: v.name,
        description: v.description,
        metadata,
        body: v.body,
      }).subscribe({
        next: skill => { this.toast.success(`Skill "${v.name}" created`); this.afterSave(skill); },
        error: err => this.handleError(err),
      });
    }
  }

  // Wired to a button on the edit form — confirms, deletes, redirects.
  delete(): void {
    const id = this.id();
    if (!id) return;
    if (!confirm(`Delete skill ${id}? The SKILL.md file will be removed and a delete commit pushed to hub.`)) {
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    this.service.remove(id).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(`Skill "${id}" deleted`);
        this.router.navigate(['/config/skills']);
      },
      error: err => this.handleError(err),
    });
  }

  rename(): void {
    const oldId = this.id();
    if (!oldId) return;
    const to = prompt(
      `Rename ${oldId} to (format: <category>/<name>, lowercase + hyphens):`,
      oldId,
    );
    if (!to || to === oldId) return;
    if (!ID_PATTERN.test(to)) {
      alert('Invalid id — must match <category>/<name> (lowercase letters/digits/hyphens).');
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    this.service.rename(oldId, to).subscribe({
      next: skill => {
        this.saving.set(false);
        this.toast.success(`Skill renamed: ${oldId} → ${skill.id}`);
        this.router.navigate(['/config/skills', ...skill.id.split('/')]);
      },
      error: err => this.handleError(err),
    });
  }

  private afterSave(skill: Skill): void {
    this.saving.set(false);
    this.router.navigate(['/config/skills', ...skill.id.split('/')]);
  }

  private handleError(err: unknown): void {
    this.saving.set(false);
    // Surface the upstream message verbatim — git-conflict / in-use / dirty-tree
    // errors carry actionable detail there.
    const msg = (err as { error?: { error?: { message?: string } }; message?: string })
      ?.error?.error?.message
      ?? (err as { message?: string })?.message
      ?? 'request failed';
    this.saveError.set(msg);
    this.toast.error(msg);
  }
}
