import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DialogRef } from '@angular/cdk/dialog';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectsService } from '@features/projects/data-access/projects.service';
import { ActorsService } from '@features/actors/data-access/actors.service';
import {
  MentionDirective,
  tagTrigger,
  projectActorTrigger,
  vaultItemTrigger,
} from '@shared/mentions';
import type { Project } from '@domain/projects';
import type { Actor } from '@domain/actors';

interface CaptureResponse { id: string; seq: number; title: string; }

@Component({
  selector: 'app-capture-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MentionDirective],
  host: { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Quick capture' },
  template: `
    <div class="cap">
      <header class="cap__header">
        <span class="cap__label">Quick capture</span>
        <span class="cap__hint">
          <kbd>#</kbd>tag · <kbd>{{ '@' }}</kbd>actor/project · <kbd>~</kbd>related · <kbd>↵</kbd> save
        </span>
      </header>

      <div class="cap__fields">
        <textarea
          #titleEl
          class="cap__title"
          [class.cap__title--flash]="flash()"
          [appMention]="triggers"
          [value]="title()"
          (input)="onTitleInput($event)"
          (keydown)="onTitleKey($event)"
          placeholder="Title…"
          [readonly]="submitting() || !!flash()"
          rows="1"
          aria-label="Title"
        ></textarea>

        <textarea
          class="cap__body"
          [appMention]="triggers"
          [value]="body()"
          (input)="onBodyInput($event)"
          (keydown)="onBodyKey($event)"
          placeholder="Notes — type # @ ~ for inline metadata; Shift+Enter for newline"
          rows="3"
          aria-label="Body"
        ></textarea>
      </div>

      @if (hasAnyMeta()) {
        <div class="cap__chips">
          @for (t of tagList(); track $index; let i = $index) {
            <span class="cap__chip cap__chip--tag">
              #{{ t }}
              <button type="button" class="cap__chip-x" (click)="removeTag(i)" aria-label="Remove tag">×</button>
            </span>
          }
          @for (p of selectedProjects(); track $index; let i = $index) {
            <span class="cap__chip" [style.--chip-color]="p.color_token ?? 'var(--color-border)'">
              <span class="cap__chip-dot" [style.background]="p.color_token ?? 'var(--color-border)'"></span>
              {{ p.display_name }}
              <button type="button" class="cap__chip-x" (click)="removeProject(i)" aria-label="Remove project">×</button>
            </span>
          }
          @if (assignedActor(); as a) {
            <span class="cap__chip" [style.--chip-color]="'var(--actor-color-' + a.id + ')'">
              <span class="cap__chip-dot" [style.background]="'var(--actor-color-' + a.id + ')'"></span>
              {{ '@' + a.display_name }}
              <button type="button" class="cap__chip-x" (click)="assignedActor.set(null)" aria-label="Remove assignee">×</button>
            </span>
          }
          @for (item of relatedItems(); track $index; let i = $index) {
            <span class="cap__chip cap__chip--related">
              ~ {{ item.title }}
              <button type="button" class="cap__chip-x" (click)="removeRelated(i)" aria-label="Remove">×</button>
            </span>
          }
        </div>
      }

      <footer class="cap__footer">
        @if (flash(); as msg) {
          <span class="cap__flash">{{ msg }}</span>
        } @else if (errorMsg(); as err) {
          <span class="cap__error">{{ err }}</span>
        } @else {
          <span></span>
        }
        <button
          type="button"
          class="btn btn--primary btn--sm"
          [disabled]="!title().trim() || submitting()"
          (click)="submit()">
          {{ submitting() ? 'Saving…' : 'Save' }}
        </button>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: calc(var(--radius) * 1.5);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
      overflow: hidden;
    }

    .cap__header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.55rem 1rem;
      border-bottom: 1px solid var(--color-border);
      background: var(--color-surface);
    }

    .cap__label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
    }

    .cap__hint {
      font-size: 0.68rem;
      color: var(--color-text-muted);
      display: flex;
      gap: 0.4rem;
      align-items: baseline;

      kbd {
        font-family: var(--font-mono);
        font-size: 0.65rem;
        background: var(--color-surface-soft, var(--color-surface));
        border: 1px solid var(--color-border);
        border-radius: 2px;
        padding: 0.02rem 0.25rem;
        color: var(--color-text);
      }
    }

    .cap__fields {
      padding: 0.75rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .cap__title,
    .cap__body {
      width: 100%;
      border: none;
      outline: none;
      background: transparent;
      color: var(--color-text);
      font: inherit;
      resize: none;
      line-height: 1.5;
      padding: 0;
      &::placeholder { color: var(--color-text-muted); }
      &:read-only { opacity: 0.6; cursor: progress; }
    }

    .cap__title {
      font-size: 1.05rem;
      font-weight: 500;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 0.5rem;
      &--flash { color: var(--color-accent); }
    }

    .cap__body {
      font-size: 0.9rem;
      color: var(--color-text-soft, var(--color-text-muted));
    }

    .cap__chips {
      border-top: 1px solid var(--color-border);
      padding: 0.5rem 1rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .cap__chip {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.72rem;
      background: color-mix(in srgb, var(--chip-color, var(--color-border)) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--chip-color, var(--color-border)) 40%, transparent);
      border-radius: 2px;
      padding: 0.1rem 0.4rem;
      color: var(--color-text);

      &--tag {
        --chip-color: var(--color-accent);
      }

      &--related {
        --chip-color: var(--color-info);
      }
    }

    .cap__chip-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
    }

    .cap__chip-x {
      border: none;
      background: none;
      padding: 0;
      cursor: pointer;
      font: inherit;
      font-size: 0.85rem;
      color: var(--color-text-muted);
      line-height: 1;
      &:hover { color: var(--color-danger); }
    }

    .cap__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.55rem 1rem;
      border-top: 1px solid var(--color-border);
      background: var(--color-surface);
      gap: 1rem;
    }

    .cap__flash { font-size: 0.8rem; color: var(--color-accent); }
    .cap__error { font-size: 0.8rem; color: var(--color-danger, #ef4444); }
  `],
})
export class CaptureDialog {
  private readonly http = inject(HttpClient);
  private readonly dialogRef = inject(DialogRef);
  private readonly projectsService = inject(ProjectsService);
  private readonly actorsService = inject(ActorsService);

  private readonly titleEl = viewChild<ElementRef<HTMLTextAreaElement>>('titleEl');

  // core
  protected readonly title = signal('');
  protected readonly body = signal('');
  protected readonly submitting = signal(false);
  protected readonly flash = signal<string | null>(null);
  protected readonly errorMsg = signal<string | null>(null);

  // metadata
  protected readonly tagList = signal<string[]>([]);
  protected readonly selectedProjects = signal<Project[]>([]);
  protected readonly assignedActor = signal<Actor | null>(null);
  protected readonly relatedItems = signal<{ id: string; title: string }[]>([]);

  // For tag autocomplete: empty for v1 — `Create #foo` row covers all input.
  // TODO: load known tags from `/api/vault/tags` once that's exposed.
  private readonly knownTags = signal<readonly string[]>([]);

  protected readonly hasAnyMeta = computed(() =>
    this.tagList().length > 0
    || this.selectedProjects().length > 0
    || this.assignedActor() !== null
    || this.relatedItems().length > 0
  );

  /** Triggers wired into both title + body fields. */
  protected readonly triggers = [
    tagTrigger(this.knownTags, (t) => this.addTag(t)),
    projectActorTrigger(
      this.projectsService.activeProjects,
      this.actorsService.activeActors,
      (p) => this.addProject(p),
      (a) => this.assignedActor.set(a),
    ),
    vaultItemTrigger(this.http, (item) => this.addRelated(item)),
  ];

  protected onTitleInput(e: Event): void {
    this.title.set((e.target as HTMLTextAreaElement).value);
    this.autoresize(e.target as HTMLTextAreaElement, 160);
    this.errorMsg.set(null);
  }

  protected onBodyInput(e: Event): void {
    this.body.set((e.target as HTMLTextAreaElement).value);
    this.autoresize(e.target as HTMLTextAreaElement, 240);
  }

  protected onTitleKey(e: KeyboardEvent): void {
    if (e.defaultPrevented) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void this.submit(); }
    else if (e.key === 'Escape') { this.dialogRef.close(); }
  }

  protected onBodyKey(e: KeyboardEvent): void {
    if (e.defaultPrevented) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void this.submit(); }
    else if (e.key === 'Escape') { this.dialogRef.close(); }
  }

  protected addTag(tag: string): void {
    this.tagList.update(tags => [...tags, tag]);
  }

  protected removeTag(idx: number): void {
    this.tagList.update(tags => tags.filter((_, i) => i !== idx));
  }

  protected addProject(p: Project): void {
    this.selectedProjects.update(ps => [...ps, p]);
  }

  protected removeProject(idx: number): void {
    this.selectedProjects.update(ps => ps.filter((_, i) => i !== idx));
  }

  protected addRelated(item: { id: string; title: string }): void {
    this.relatedItems.update(items => [...items, item]);
  }

  protected removeRelated(idx: number): void {
    this.relatedItems.update(items => items.filter((_, i) => i !== idx));
  }

  protected async submit(): Promise<void> {
    const title = this.title().trim();
    if (!title || this.submitting()) return;

    this.submitting.set(true);
    this.errorMsg.set(null);

    const payload: Record<string, unknown> = { title };
    const body = this.body().trim();
    if (body) payload['body'] = body;
    // Dedupe tags at submit; the user is allowed to pick the same one twice
    // for fast-feedback chips, but the DB stores one value.
    const uniqueTags = Array.from(new Set(this.tagList()));
    if (uniqueTags.length) payload['tags'] = uniqueTags.join(', ');
    const actor = this.assignedActor();
    if (actor) payload['assigned_to'] = actor.id;
    const uniqueLinks = Array.from(
      new Map(this.relatedItems().map(i => [i.id, i])).values()
    );
    if (uniqueLinks.length) payload['links'] = uniqueLinks.map(i => ({
      target_type: 'vault_note' as const,
      target_id: i.id,
    }));

    this.http
      .post<CaptureResponse>(`${environment.dashboardApiUrl}/api/vault/notes`, payload)
      .subscribe({
        next: async (note) => {
          const uniqueProjects = Array.from(
            new Map(this.selectedProjects().map(p => [p.id, p])).values()
          );
          for (const project of uniqueProjects) {
            await lastValueFrom(
              this.http.post(`${environment.dashboardApiUrl}/api/vault-item-projects`, {
                vault_item_id: note.id,
                project_id: project.id,
              })
            ).catch(() => {});
          }
          this.flash.set(`saved · #${note.seq}`);
          this.title.set('');
          this.body.set('');
          this.tagList.set([]);
          this.selectedProjects.set([]);
          this.assignedActor.set(null);
          this.relatedItems.set([]);
          this.submitting.set(false);
          if (this.titleEl()?.nativeElement) {
            this.titleEl()!.nativeElement.style.height = 'auto';
          }
          setTimeout(() => this.dialogRef.close(), 1200);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMsg.set(err?.error?.error?.message ?? err?.message ?? 'save failed');
        },
      });
  }

  private autoresize(el: HTMLTextAreaElement, max: number): void {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, max) + 'px';
  }
}
