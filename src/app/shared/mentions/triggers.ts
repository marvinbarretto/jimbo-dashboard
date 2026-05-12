import { Observable, of, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import type { Signal } from '@angular/core';
import type { Project } from '@domain/projects';
import type { Actor } from '@domain/actors';
import type { VaultItem } from '@domain/vault';
import { environment } from '../../../environments/environment';
import type { MentionTrigger, MentionItem } from './mention-trigger';

/**
 * `#tag` — autocomplete from known tags + offer a "Create #foo" row when the
 * query doesn't match anything. `onSelect` always returns null because tags
 * are surfaced as chips outside the textarea, not inline text.
 */
export function tagTrigger(
  knownTags: Signal<readonly string[]>,
  onPick: (tag: string) => void,
): MentionTrigger {
  return {
    char: '#',
    search: (q) => {
      const ql = q.toLowerCase();
      const all = knownTags();
      const matches = all.filter(t => t.toLowerCase().includes(ql));
      const items: MentionItem[] = matches.slice(0, 8).map(t => ({
        id: `tag:${t}`,
        label: `#${t}`,
        group: 'Tags',
        payload: t,
      }));
      const trimmed = q.trim();
      if (trimmed && !all.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
        items.push({
          id: `tag:new:${trimmed}`,
          label: `Create #${trimmed}`,
          group: 'Tags',
          payload: trimmed,
        });
      }
      return of(items);
    },
    onSelect: (item) => {
      onPick(item.payload as string);
      return null;
    },
  };
}

/**
 * `@` — combined actor + project picker. Actors first (small fixed set, most
 * common), then projects. Each item carries its kind so the use-site dispatches
 * to the right metadata field (assigned_to vs project link).
 *
 * Reads the signals synchronously per keystroke. If a service is still loading
 * when the dialog opens, eager-inject it at app boot so this read always sees
 * data (see App constructor).
 */
export function projectActorTrigger(
  projects: Signal<readonly Project[]>,
  actors: Signal<readonly Actor[]>,
  onPickProject: (p: Project) => void,
  onPickActor: (a: Actor) => void,
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
          payload: { kind: 'actor' as const, actor: a },
        }));
      const projectItems: MentionItem[] = projects()
        .filter(p => p.id.toLowerCase().includes(ql) || p.display_name.toLowerCase().includes(ql))
        .slice(0, 8)
        .map(p => ({
          id: `project:${p.id}`,
          label: p.display_name,
          group: 'Projects',
          color: p.color_token,
          payload: { kind: 'project' as const, project: p },
        }));
      return of([...actorItems, ...projectItems]);
    },
    onSelect: (item) => {
      const p = item.payload as
        | { kind: 'actor'; actor: Actor }
        | { kind: 'project'; project: Project };
      if (p.kind === 'actor') onPickActor(p.actor);
      else onPickProject(p.project);
      return null;
    },
  };
}

/**
 * Project-only typeahead — used by the inline "Add project" picker on cards.
 * Driven via [appPickerInput] (focus-driven, not trigger-char). The trigger
 * `char` is unused for picker mode but kept for the MentionTrigger contract.
 */
export function projectPickerTrigger(
  projects: Signal<readonly Project[]>,
  onPick: (project: Project) => void,
): MentionTrigger {
  return {
    char: '/',
    search: (q) => {
      const ql = q.toLowerCase();
      return of(projects()
        .filter(p => p.id.toLowerCase().includes(ql) || p.display_name.toLowerCase().includes(ql))
        .slice(0, 10)
        .map<MentionItem>(p => ({
          id: `project:${p.id}`,
          label: p.display_name,
          group: 'Projects',
          color: p.color_token,
          payload: p,
        })));
    },
    onSelect: (item) => {
      onPick(item.payload as Project);
      return null;
    },
  };
}

/**
 * Epic-only typeahead — used by the inline "Add parent epic" picker on cards.
 * Surfaces vault items where `is_epic === true`. Searches by title or exact
 * seq number so the operator can type `12` to find #12.
 */
export function epicPickerTrigger(
  epics: Signal<readonly VaultItem[]>,
  onPick: (epic: VaultItem) => void,
): MentionTrigger {
  return {
    char: '↳',
    search: (q) => {
      const ql = q.trim().toLowerCase();
      return of(epics()
        .filter(e => !ql || e.title.toLowerCase().includes(ql) || String(e.seq) === ql)
        .slice(0, 12)
        .map<MentionItem>(e => ({
          id: `epic:${e.id}`,
          label: e.title,
          prefix: `#${e.seq}`,
          group: 'Epics',
          payload: e,
        })));
    },
    onSelect: (item) => {
      onPick(item.payload as VaultItem);
      return null;
    },
  };
}

interface VaultHitResponse {
  results: { source_id: string; title: string; seq?: number | null }[];
}

/**
 * `~` — search vault items for related-link selection. The seq number is shown
 * as a muted prefix so the operator can disambiguate identically-titled notes.
 */
export function vaultItemTrigger(
  http: HttpClient,
  onPick: (item: { id: string; title: string; seq?: number | null }) => void,
): MentionTrigger {
  return {
    char: '~',
    search: (q): Observable<MentionItem[]> => {
      if (q.length < 2) return of([]);
      return http.get<VaultHitResponse>(
        `${environment.dashboardApiUrl}/api/search`,
        { params: { q, limit: '8', sources: 'vault_notes' } },
      ).pipe(
        map(res => res.results.map(r => {
          const title = r.title || '(untitled)';
          return {
            id: `vault:${r.source_id}`,
            label: title,
            prefix: r.seq != null ? `#${r.seq}` : undefined,
            group: 'Vault items',
            payload: { id: r.source_id, title, seq: r.seq ?? null },
          } satisfies MentionItem;
        })),
      );
    },
    onSelect: (item) => {
      onPick(item.payload as { id: string; title: string; seq?: number | null });
      return null;
    },
  };
}
