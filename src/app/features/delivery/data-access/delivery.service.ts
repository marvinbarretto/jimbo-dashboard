// Reads /api/delivery — the gap between what agents have merged and what
// production actually has.
//
// Deliberately NOT auto-refreshing: the numbers move on the scale of a working
// day, and the page is something you open when deciding whether to cut a
// release, not a live ticker. A manual refresh keeps the GitHub calls behind it
// honest (the server caches for 60s regardless).

import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { Delivery, DeliveryProject } from '@domain/delivery';
import { environment } from '../../../../environments/environment';
import { ToastService } from '@shared/components/toast/toast.service';
import { isSeedMode } from '@shared/seed-mode';

interface ApiPr {
  number: number; title: string; url: string;
  ci: 'passing' | 'failing' | 'pending' | 'none';
  auto_merge: boolean; age_days: number; note_seq: number | null; draft: boolean;
}
interface ApiProject {
  project_id: string; display_name: string; repo: string;
  latest_tag: string | null; unshipped: number;
  open_prs: ApiPr[]; failing: number; error: string | null;
}

const EMPTY: Delivery = { projects: [], totals: { unshipped: 0, openPrs: 0, failing: 0 } };

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly url = `${environment.dashboardApiUrl}/api/delivery`;

  private readonly _data = signal<Delivery>(EMPTY);
  private readonly _loaded = signal(false);
  readonly loading = signal(false);

  readonly totals = computed(() => this._data().totals);
  readonly loaded = this._loaded.asReadonly();

  /** Anything to show at all — projects with unshipped work or an open PR. */
  readonly projects = computed<DeliveryProject[]>(() =>
    this._data().projects
      .filter(p => p.unshipped > 0 || p.openPrs.length > 0 || p.error)
      // Failing first — it is the only state that asks for something. Then by
      // how much is waiting to ship.
      .sort((a, b) => (b.failing - a.failing) || (b.unshipped - a.unshipped)),
  );

  /** Every failing PR across every project, for the top-of-page callout. */
  readonly failingPrs = computed(() =>
    this._data().projects.flatMap(p =>
      p.openPrs.filter(pr => pr.ci === 'failing').map(pr => ({ project: p.displayName, pr })),
    ),
  );

  load(refresh = false): void {
    if (isSeedMode()) { this._data.set(EMPTY); this._loaded.set(true); return; }
    this.loading.set(true);
    const params = refresh ? new HttpParams().set('refresh', 'true') : new HttpParams();
    this.http.get<{ projects: ApiProject[]; totals: Delivery['totals'] }>(this.url, { params }).subscribe({
      next: res => {
        this._data.set({
          totals: res.totals,
          projects: (res.projects ?? []).map(p => ({
            projectId: p.project_id,
            displayName: p.display_name,
            repo: p.repo,
            latestTag: p.latest_tag,
            unshipped: p.unshipped,
            failing: p.failing,
            error: p.error,
            openPrs: (p.open_prs ?? []).map(pr => ({
              number: pr.number, title: pr.title, url: pr.url, ci: pr.ci,
              autoMerge: pr.auto_merge, ageDays: pr.age_days,
              noteSeq: pr.note_seq, draft: pr.draft,
            })),
          })),
        });
        this._loaded.set(true);
        this.loading.set(false);
      },
      error: () => { this.toast.error('Failed to load delivery status'); this.loading.set(false); },
    });
  }
}
