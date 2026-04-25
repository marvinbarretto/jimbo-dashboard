import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { VaultItemsService } from '../../data-access/vault-items.service';
import { ActorsService } from '../../../actors/data-access/actors.service';
import { actorId, vaultItemId } from '@domain/ids';
import type { VaultItemType, GroomingStatus, Priority, Actionability, SourceKind, AcceptanceCriterion, Source } from '@domain/vault/vault-item';

// Priority options for selects — null = "— (unset)". Use [ngValue] to keep integer type.
const PRIORITY_OPTIONS: Array<Priority | null> = [null, 0, 1, 2, 3];

@Component({
  selector: 'app-vault-item-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './vault-item-form.html',
  styleUrl: './vault-item-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaultItemForm {
  private readonly service = inject(VaultItemsService);
  private readonly actorsService = inject(ActorsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  // seq from URL param — only present on edit route (:seq/edit).
  private readonly seq = toSignal(
    this.route.paramMap.pipe(map(p => {
      const raw = p.get('seq');
      const n = raw ? Number(raw) : NaN;
      return isNaN(n) ? null : n;
    }))
  );

  readonly isEdit = computed(() => this.seq() !== null && this.seq() !== undefined);

  // Actor dropdown — only active actors can be assigned on create/edit.
  readonly actors = this.actorsService.activeActors;

  // Static option lists
  readonly types: VaultItemType[] = ['task', 'bookmark', 'note'];
  // Lifecycle is derived from completed_at + archived_at, not editable on this form.
  // Mark-done lives on the detail view; archive is its own action.
  // All six grooming statuses shown; intake_rejected is system-managed but shown as an operator escape hatch.
  readonly groomingStatuses: GroomingStatus[] = ['ungroomed', 'intake_rejected', 'intake_complete', 'classified', 'decomposed', 'ready'];
  readonly priorityOptions = PRIORITY_OPTIONS;
  readonly sourceKinds: Array<SourceKind | ''> = ['', 'manual', 'email', 'telegram', 'agent', 'url', 'pr-comment'];

  readonly form = this.fb.nonNullable.group({
    title:               ['', Validators.required],
    body:                ['', Validators.required],
    type:                ['task' as VaultItemType, Validators.required],
    assigned_to:         ['' as string],
    tags:                ['' as string],             // comma-separated; split at submit
    acceptance_criteria: ['' as string],             // one per line; parse at submit
    grooming_status:     ['ungroomed' as GroomingStatus],
    // ai_priority / ai_rationale / priority_confidence / actionability are read-only —
    // hermes skills write these. Operator sees the classifier's decision but cannot override.
    ai_priority:         [{ value: null as Priority | null, disabled: true }],
    manual_priority:     [null as Priority | null],
    ai_rationale:        [{ value: null as string | null, disabled: true }],
    priority_confidence: [{ value: null as number | null, disabled: true }],
    actionability:       [{ value: null as Actionability | null, disabled: true }],
    parent_id:           ['' as string],
    due_at:              ['' as string],
    source_kind:         ['' as string],
    source_ref:          ['' as string],
    source_url:          ['' as string],
  });

  constructor() {
    const seq = this.seq();
    if (seq !== null && seq !== undefined) {
      // Wait for the items signal to be populated, then patch. Same pattern as ProjectForm.
      toObservable(this.service.items)
        .pipe(filter(items => items.length > 0), take(1))
        .subscribe(items => {
          const item = items.find(i => i.seq === seq);
          if (!item) return;
          this.form.patchValue({
            title:               item.title,
            body:                item.body,
            type:                item.type,
            assigned_to:         item.assigned_to ?? '',
            tags:                item.tags.join(', '),
            // Flatten AC to one line per criterion; done state is discarded on round-trip
            // (spec: parse back as {text, done:false}). Flag: existing `done:true` items
            // will be reset to done:false if re-saved — known limitation, noted in report.
            acceptance_criteria: item.acceptance_criteria.map(ac => ac.text).join('\n'),
            grooming_status:     item.grooming_status,
            ai_priority:         item.ai_priority,
            manual_priority:     item.manual_priority,
            ai_rationale:        item.ai_rationale,
            priority_confidence: item.priority_confidence,
            actionability:       item.actionability,
            parent_id:           item.parent_id ?? '',
            due_at:              item.due_at ?? '',
            source_kind:         item.source?.kind ?? '',
            source_ref:          item.source?.ref ?? '',
            source_url:          item.source?.url ?? '',
          });
        });
    } else {
      // Defaults for create: source_kind = manual, source_ref = operator slug.
      this.form.patchValue({ source_kind: 'manual', source_ref: 'marvin' });
    }
  }

  // Returns "P0", "P1", etc. or "—" for null. Used in templates to add the prefix at display time.
  priorityLabel(p: Priority | null): string {
    return p === null ? '—' : 'P' + p;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();

    // Parse tags: split on commas, trim whitespace, drop empty strings.
    const tags = v.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    // Parse AC: one criterion per line, all start as not-done.
    const acceptance_criteria: AcceptanceCriterion[] = v.acceptance_criteria
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(text => ({ text, done: false }));

    // Build source — discriminated union, each branch enforces its own URL nullability.
    const source: Source | null = buildSource(v.source_kind as SourceKind | '', v.source_ref, v.source_url);

    // Use ?? null (not || null) so Priority 0 is not coerced to null.
    const payload = {
      title:               v.title,
      body:                v.body,
      type:                v.type as VaultItemType,
      assigned_to:         v.assigned_to ? actorId(v.assigned_to) : null,
      tags,
      acceptance_criteria,
      grooming_status:     v.grooming_status as GroomingStatus,
      ai_priority:         v.ai_priority ?? null,
      manual_priority:     v.manual_priority ?? null,
      ai_rationale:        v.ai_rationale ?? null,
      priority_confidence: v.priority_confidence ?? null,
      actionability:       v.actionability ?? null,
      parent_id:           v.parent_id ? vaultItemId(v.parent_id) : null,
      due_at:              v.due_at || null,
      source,
    };

    if (this.isEdit()) {
      const seq = this.seq()!;
      const item = this.service.getBySeq(seq);
      if (!item) return;
      // completed_at intentionally omitted — owned by setCompleted() (K6).
      this.service.update(item.id, payload);
      this.router.navigate(['/vault-items', seq]);
    } else {
      // completed_at always null on create; setCompleted() is the only writer (K6).
      this.service.create({ ...payload, completed_at: null });
      // Navigate to list — we don't know the real seq until the server responds.
      this.router.navigate(['/vault-items']);
    }
  }
}

// Builds a typed `Source` from the form's three loose strings, applying each kind's
// rules (URL nullability, ref format). Returns null for blank kind. The discriminated
// union refuses any wrong-shape construction at the type level.
function buildSource(kind: SourceKind | '', ref: string, url: string): Source | null {
  if (kind === '') return null;
  switch (kind) {
    case 'manual':   return { kind, ref, url: null };
    case 'email':    return { kind, ref, url: url || null };
    case 'telegram': return { kind, ref, url: null };
    case 'agent':    return { kind, ref: actorId(ref), url: null };
    case 'url':      return { kind, ref, url: url || ref };
    case 'pr-comment': {
      // Enforce 'repo#N' shape at runtime — the type system requires the literal too.
      const match = /^.+#\d+$/.test(ref);
      if (!match || !url) return null;
      return { kind, ref: ref as `${string}#${number}`, url };
    }
  }
}
