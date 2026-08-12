import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { loadOne } from '@shared/data-access/load-one';
import type { EmailReport } from './mail-activity.service';
import {
  toJourney, linksSkippedByPolicy,
  type EmailJourney, type JourneyLink,
} from './email-journey';

/** Why a link went unread, in the reader's language rather than the payload's. */
const SKIP_LABELS: Record<string, string> = {
  'noise-content-type': 'Not followed — the body was noise, so no link was opened',
  'over-max-links': 'Not followed — beyond the per-email link cap',
  'not-followable': 'Not followed — not a followable URL (unsubscribe, mailto, tracking)',
};

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

  /**
   * Links the email carried that kipper decided not to open, grouped by the
   * rule that stopped each one.
   *
   * These were a bare `continue` until 2026-08-12, so an email showing two
   * traces looked the same whether it held two links or twenty — and the cost
   * of the per-email cap was invisible precisely on the digests where it bit
   * hardest.
   */
  readonly linksNotFollowed = computed<{ reason: string; label: string; urls: string[] }[]>(() => {
    const j = this.journey();
    if (!j || !j.linksSkippedRecorded) return [];

    const byReason = new Map<string, { reason: string; label: string; urls: string[] }>();
    for (const link of j.linksSkipped) {
      const reason = link.rawReason ?? 'unrecorded-reason';
      const existing = byReason.get(reason);
      if (existing) {
        if (link.url) existing.urls.push(link.url);
        continue;
      }
      byReason.set(reason, {
        reason,
        label: SKIP_LABELS[reason] ?? `skipped (${reason})`,
        urls: link.url ? [link.url] : [],
      });
    }
    return [...byReason.values()];
  });

  /** True only when the writer recorded skips AND there were none — i.e. the
   *  positive claim "every link in this email was followed". Distinct from a
   *  row that never recorded skips at all. */
  readonly everyLinkFollowed = computed(() => {
    const j = this.journey();
    return !!j && j.linksSkippedRecorded && j.linksSkipped.length === 0 && j.links.length > 0;
  });

  setGmailId(id: string | null): void {
    this.gmailId.set(id);
  }
}
