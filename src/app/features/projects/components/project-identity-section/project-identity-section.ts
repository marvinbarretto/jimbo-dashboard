import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ActorChip } from '@shared/components/actor-chip/actor-chip';
import { UiInlineEdit } from '@shared/components/ui-inline-edit/ui-inline-edit';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';
import type { MentionTrigger } from '@shared/mentions';
import type { Project, UpdateProjectPayload } from '@domain/projects';
import { isSyncOverdue } from '@domain/projects/manifest-sync';
import { ProjectBriefField } from '../project-brief-field/project-brief-field';
import { ProjectBriefBulletField } from '../project-brief-bullet-field/project-brief-bullet-field';

/**
 * The six vault/focus counters that used to be the page's stat tiles.
 *
 * They are still worth knowing — they say how big this project is — but not
 * one of them answers "what is happening here now", which is why they now read
 * as a sentence under the identity block instead of leading the page. The
 * window is carried explicitly (`focusWindowDays`) because an undeclared
 * denominator turns an unmeasured zero into what looks like an idle one.
 */
export interface ProjectScale {
  readonly items: number;
  readonly active: number;
  readonly done: number;
  readonly epics: number;
  readonly focusMinutes: number;
  readonly sessions: number;
  readonly focusWindowDays: number;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * Zone 1 — what this project IS.
 *
 * Purpose, personas and success criteria used to sit at the bottom of the
 * right-hand column, below Facts and below the resources: the things that
 * define a project were the least prominent things on its page. They lead it
 * now. Nothing here is new — it is the old `Brief — purpose` / `Brief — state`
 * fields, still inline-editable, given the top of the page and room to read.
 *
 * Empty fields say what is missing rather than rendering a bare box, so a
 * project with no declared intent reads as undeclared, not as blank.
 */
@Component({
  selector: 'app-project-identity-section',
  imports: [ActorChip, UiInlineEdit, RelativeTimePipe, ProjectBriefField, ProjectBriefBulletField],
  templateUrl: './project-identity-section.html',
  styleUrl: './project-identity-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectIdentitySection {
  readonly project  = input.required<Project>();
  readonly triggers = input<MentionTrigger[]>([]);
  readonly scale    = input.required<ProjectScale>();

  /**
   * True when the Understanding block has structured beliefs. `current_state`
   * stores the same belief markdown raw, so showing both at full prominence
   * puts the store and its rendering side by side — it folds away instead.
   */
  readonly hasStructuredBeliefs = input(false);

  readonly saved = output<UpdateProjectPayload>();

  // Repo-owned when a manifest sync has stamped synced_at: the operating
  // fields the sync writes render read-only, because the repo is the source
  // of truth. Manifest-less projects keep full inline edit.
  readonly isRepoSynced = computed(() => !!this.project().synced_at);

  /** See `isSyncOverdue`: an overdue SWEEP, never merely an old value. */
  readonly syncOverdue = computed(() => isSyncOverdue(this.project().synced_at, Date.now()));

  private readonly _stateOpen = signal(false);

  /** Raw `current_state` is only folded when the rendered beliefs exist. */
  readonly stateOpen = computed(() => this._stateOpen() || !this.hasStructuredBeliefs());

  toggleState(): void {
    this._stateOpen.update(v => !v);
  }

  readonly hasBlocker = computed(() => !!this.project().current_blocker?.trim());

  readonly scaleLine = computed<string>(() => {
    const s = this.scale();
    const parts: string[] = [];

    if (s.items === 0) {
      parts.push('No vault items linked to this project yet.');
    } else {
      const base = `${plural(s.items, 'item')} linked, ${s.active} active and ${s.done} done`;
      parts.push(s.epics === 0 ? `${base}. No epics yet.` : `${base}, across ${plural(s.epics, 'epic')}.`);
    }

    parts.push(
      s.sessions === 0
        ? `No focus sessions in the last ${s.focusWindowDays} days.`
        : `${s.focusMinutes}m of focus across ${plural(s.sessions, 'session')} in the last ${s.focusWindowDays} days.`,
    );

    return parts.join(' ');
  });
}
