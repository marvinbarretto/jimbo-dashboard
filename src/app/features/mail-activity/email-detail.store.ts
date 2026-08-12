import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { loadOne } from '@shared/data-access/load-one';
import type { EmailReport } from './mail-activity.service';
import {
  toJourney, linksSkippedByPolicy,
  type EmailJourney, type JourneyLink,
} from './email-journey';

/**
 * Shared state for the email-detail shell and its tab panels (analysis /
 * links / body / raw are child routes — see app.routes.ts). The shell sets
 * the gmail_id from the route param; panels read the same fetch instead of
 * each refetching the report on every tab switch.
 */
@Injectable({ providedIn: 'root' })
export class EmailDetailStore {
  private readonly http = inject(HttpClient);
  private readonly gmailId = signal<string | null>(null);

  readonly state = loadOne<EmailReport>(this.http, computed(() => {
    const id = this.gmailId();
    return id ? `/api/emails/reports/${id}` : null;
  }));

  readonly email = computed(() => this.state().data);

  readonly journey = computed<EmailJourney | null>(() => {
    const email = this.email();
    return email ? toJourney(email.analysis) : null;
  });

  readonly linksSkipped = computed(() => {
    const j = this.journey();
    return j !== null && linksSkippedByPolicy(j);
  });

  /**
   * Links grouped for reading: the same page followed N times (Meetup's login
   * wall appeared 5× on one digest) collapses to one trace with a ×N count —
   * the repetition is itself a finding, so it's counted, not hidden.
   */
  readonly linkTraces = computed<{ link: JourneyLink; times: number }[]>(() => {
    const j = this.journey();
    if (!j) return [];
    const byKey = new Map<string, { link: JourneyLink; times: number }>();
    for (const link of j.links) {
      const key = link.pageTitle ?? link.url ?? `#${byKey.size}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.times += 1;
        // Prefer the follow that actually captured something.
        if (!existing.link.screenshotUrl && link.screenshotUrl) existing.link = link;
      } else {
        byKey.set(key, { link, times: 1 });
      }
    }
    return [...byKey.values()];
  });

  setGmailId(id: string | null): void {
    this.gmailId.set(id);
  }
}
