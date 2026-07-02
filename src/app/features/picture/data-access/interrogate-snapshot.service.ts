import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { AnyInterrogateEntity, ContextItem, InterrogateEntityType, InterrogateSnapshot } from '@domain/interrogate';
import { ENTITY_TYPE_SNAPSHOT_KEY } from '@domain/interrogate';
import { environment } from '../../../../environments/environment';
import { ToastService } from '@shared/components/toast/toast.service';

@Injectable({ providedIn: 'root' })
export class InterrogateSnapshotService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly url = `${environment.dashboardApiUrl}/api/interrogate/snapshot`;

  private readonly _snapshot = signal<InterrogateSnapshot | null>(null);
  readonly loading = signal(false);

  readonly values = computed(() => this._snapshot()?.values ?? []);
  readonly priorities = computed(() => this._snapshot()?.priorities ?? []);
  readonly goals = computed(() => this._snapshot()?.goals ?? []);
  readonly interests = computed(() => this._snapshot()?.interests ?? []);
  readonly experiments = computed(() => this._snapshot()?.experiments ?? []);
  readonly nogos = computed(() => this._snapshot()?.nogos ?? []);
  readonly tensions = computed(() => this._snapshot()?.tensions ?? []);
  readonly openQuestions = computed(() => this._snapshot()?.open_questions ?? []);
  readonly context = computed(() => this._snapshot()?.context ?? {});

  // Called by InterrogateEntityService after a successful write so the
  // Beliefs tab reflects the edit without a full snapshot refetch.
  patchEntity(entityType: InterrogateEntityType, updated: AnyInterrogateEntity): void {
    const key = ENTITY_TYPE_SNAPSHOT_KEY[entityType] as keyof InterrogateSnapshot;
    this._snapshot.update(snapshot => {
      if (!snapshot) return snapshot;
      const list = (snapshot[key] as AnyInterrogateEntity[]).map(e => e.id === updated.id ? updated : e);
      return { ...snapshot, [key]: list };
    });
  }

  // Context items are nested three levels deep (file -> section -> item) and
  // keyed by file slug rather than a flat array, so — unlike patchEntity —
  // these walk every file's sections to find the one holding `sectionId`.
  patchContextItem(sectionId: number, updated: ContextItem): void {
    this.updateSectionItems(sectionId, items => items.map(i => i.id === updated.id ? updated : i));
  }

  removeContextItem(sectionId: number, itemId: number): void {
    this.updateSectionItems(sectionId, items => items.filter(i => i.id !== itemId));
  }

  addContextItem(sectionId: number, created: ContextItem): void {
    this.updateSectionItems(sectionId, items => [...items, created]);
  }

  private updateSectionItems(sectionId: number, updateItems: (items: ContextItem[]) => ContextItem[]): void {
    this._snapshot.update(snapshot => {
      if (!snapshot) return snapshot;
      const context = { ...snapshot.context };
      for (const [slug, file] of Object.entries(context)) {
        const sectionIndex = file.sections.findIndex(s => s.id === sectionId);
        if (sectionIndex === -1) continue;
        const sections = [...file.sections];
        const section = sections[sectionIndex];
        sections[sectionIndex] = { ...section, items: updateItems(section.items) };
        context[slug] = { ...file, sections };
        break;
      }
      return { ...snapshot, context };
    });
  }

  load(): void {
    this.loading.set(true);
    this.http.get<InterrogateSnapshot>(this.url).subscribe({
      next: (snapshot) => { this._snapshot.set(snapshot); this.loading.set(false); },
      error: (err) => {
        const e = err as { error?: { error?: { message?: string } }; message?: string };
        this.toast.error(e?.error?.error?.message ?? e?.message ?? 'Failed to load the picture');
        this.loading.set(false);
      },
    });
  }
}
