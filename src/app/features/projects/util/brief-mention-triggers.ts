import { Observable, of, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import type { Signal } from '@angular/core';
import type { Project } from '@domain/projects';
import type { Actor } from '@domain/actors';
import { environment } from '../../../../environments/environment';
import type { MentionTrigger, MentionItem } from '@shared/mentions';

// Brief-scoped mention triggers. Distinct from `shared/mentions/triggers.ts`:
// those triggers consume the text (return null from onSelect) because their
// host UIs render chips outside the textarea. Brief copy is prose — the
// typed reference should STAY in the text so the saved brief carries the
// link as plain markdown-ish text. So `onSelect` returns the resolved
// reference string and the directive replaces the in-flight `<char><query>`
// with it.

// `@actor-or-project` — completes to `@<id>` inline. No callback; the text
// itself is the only artifact.
export function briefActorProjectTrigger(
  projects: Signal<readonly Project[]>,
  actors: Signal<readonly Actor[]>,
): MentionTrigger {
  return {
    char: '@',
    search: (q) => {
      const ql = q.toLowerCase();
      const actorItems: MentionItem[] = actors()
        .filter(a => a.id.toLowerCase().includes(ql) || a.display_name.toLowerCase().includes(ql))
        .slice(0, 5)
        .map(a => ({
          id: `actor:${a.id}`,
          label: a.display_name,
          group: 'Actors',
          color: `var(--actor-color-${a.id})`,
          payload: { kind: 'actor' as const, id: a.id },
        }));
      const projectItems: MentionItem[] = projects()
        .filter(p => p.id.toLowerCase().includes(ql) || p.display_name.toLowerCase().includes(ql))
        .slice(0, 8)
        .map(p => ({
          id: `project:${p.id}`,
          label: p.display_name,
          group: 'Projects',
          color: p.color_token,
          payload: { kind: 'project' as const, id: p.id },
        }));
      return of([...actorItems, ...projectItems]);
    },
    onSelect: (item) => {
      const p = item.payload as { kind: 'actor' | 'project'; id: string };
      return `@${p.id} `;
    },
  };
}

interface VaultHitResponse {
  results: { source_id: string; title: string; seq?: number | null }[];
}

// `~query` — searches vault items and completes to `#<seq>` inline (or
// `~<source_id>` when seq is unavailable). Plain-text reference that the
// reader can resolve back to a vault item.
export function briefVaultItemTrigger(http: HttpClient): MentionTrigger {
  return {
    char: '~',
    search: (q): Observable<MentionItem[]> => {
      if (q.length < 2) return of([]);
      return http.get<VaultHitResponse>(
        `${environment.dashboardApiUrl}/api/search`,
        { params: { q, limit: '8', sources: 'vault_notes' } },
      ).pipe(
        map(res => res.results.map(r => ({
          id: `vault:${r.source_id}`,
          label: r.title || '(untitled)',
          prefix: r.seq != null ? `#${r.seq}` : undefined,
          group: 'Vault items',
          payload: { id: r.source_id, seq: r.seq ?? null },
        } satisfies MentionItem))),
      );
    },
    onSelect: (item) => {
      const p = item.payload as { id: string; seq: number | null };
      return p.seq != null ? `#${p.seq} ` : `~${p.id} `;
    },
  };
}
