import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiChipList, type UiChipListItem } from '@shared/components/ui-chip-list/ui-chip-list';
import { UiStepper, type UiStepperStep } from '@shared/components/ui-stepper/ui-stepper';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { VaultChip } from '@shared/components/vault-chip/vault-chip';
import { loadOne } from '@shared/data-access/load-one';
import type { EmailReport, EmailVerdict } from '../../mail-activity.service';
import { isRetained } from '../../mail-activity.service';
import { toJourney, linksSkippedByPolicy, type EmailJourney } from '../../email-journey';

/** Section ids for the ?open= disclosure state. */
type SectionId = 'analysis' | 'links' | 'body' | 'raw';

const DEFAULT_OPEN: readonly SectionId[] = ['analysis', 'links'];

/**
 * One email's complete journey through the pipeline: discovered → analysed →
 * links followed (with snapshots) → gated → filed. The reassurance surface —
 * every decision the machines made about this email is on this page or
 * explicitly stated as missing; absence is a finding, not a blank.
 *
 * Disclosure state lives in the `open` query param so a specific view of a
 * specific email is a shareable URL. `replaceUrl` keeps toggling out of
 * history — back should leave the email, not replay accordion clicks.
 */
@Component({
  selector: 'app-email-detail',
  imports: [
    DatePipe, JsonPipe,
    UiPage, UiPageHeader, UiSection, UiMetaList, UiStack, UiBadge, UiCard,
    UiChipList, UiStepper, UiLoadingState, UiEmptyState, VaultChip,
  ],
  templateUrl: './email-detail.html',
  styleUrl: './email-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailDetail {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Email is addressed by gmail_id across the mail feature (and the API:
  // GET /api/emails/reports/{gmail_id}), so the route param is the gmail_id.
  private readonly gmailId = toSignal(this.route.paramMap.pipe(map(p => p.get('gmailId'))));
  private readonly url = computed(() => {
    const id = this.gmailId();
    return id ? `/api/emails/reports/${id}` : null;
  });

  readonly state = loadOne<EmailReport>(this.http, this.url);

  protected readonly journey = computed<EmailJourney | null>(() => {
    const s = this.state();
    return s.data ? toJourney(s.data.ralph_analysis) : null;
  });

  protected readonly linksSkipped = computed(() => {
    const j = this.journey();
    return j !== null && linksSkippedByPolicy(j);
  });

  // --- Disclosure state (?open=analysis,links) ---------------------------

  private readonly openParam = toSignal(
    this.route.queryParamMap.pipe(map(p => p.get('open'))),
  );

  protected readonly openSections = computed<ReadonlySet<string>>(() => {
    const raw = this.openParam();
    if (raw === null || raw === undefined) return new Set(DEFAULT_OPEN);
    return new Set(raw.split(',').filter(Boolean));
  });

  protected isOpen(id: SectionId): boolean {
    return this.openSections().has(id);
  }

  protected toggle(id: SectionId): void {
    const next = new Set(this.openSections());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { open: [...next].join(',') },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  // --- Journey stepper ----------------------------------------------------

  protected readonly steps = computed<UiStepperStep[]>(() => {
    const email = this.state().data;
    const j = this.journey();
    if (!email || !j) return [];

    const analysed: UiStepperStep =
      j.shape === 'none'
        ? { label: 'Analysed', state: 'todo' }
        : { label: j.shape === 'deep' ? 'Analysed' : 'Analysed (triage only)', state: 'done' };

    let links: UiStepperStep;
    if (this.linksSkipped()) {
      // A policy skip is a completed decision, not pending work.
      links = { label: `Links skipped (${j.contentType})`, state: 'done' };
    } else if (j.links.length > 0) {
      links = { label: `Links (${j.links.length})`, state: 'done' };
    } else if (j.linksRecorded) {
      links = { label: 'Links (none followable)', state: 'done' };
    } else {
      links = { label: 'Links', state: j.shape === 'none' ? 'todo' : 'active' };
    }

    const gated: UiStepperStep = email.verdict
      ? { label: `Gated (${email.verdict})`, state: 'done' }
      : { label: 'Gated', state: 'active' };

    let filed: UiStepperStep;
    if (email.vault_note_id) {
      filed = { label: 'Filed', state: 'done' };
    } else if (email.verdict && !isRetained(email.verdict)) {
      // A toss is a deliberate end-state, not missing work.
      filed = { label: 'Tossed', state: 'done' };
    } else if (email.verdict) {
      // Kept but never became a note — the silent-loss case, left visibly open.
      filed = { label: 'Not filed', state: 'todo' };
    } else {
      filed = { label: 'Filed', state: 'todo' };
    }

    return [{ label: 'Discovered', state: 'done' }, analysed, links, gated, filed];
  });

  protected readonly gateDelay = computed(() => {
    const email = this.state().data;
    if (!email?.gated_at) return null;
    return this.delta(email.discovered_at, email.gated_at);
  });

  // --- Presentation helpers ----------------------------------------------

  protected entityChips(entities: string[]): UiChipListItem[] {
    return entities.map((e) => ({ id: e, label: e }));
  }

  protected verdictTone(verdict: EmailVerdict | null): 'success' | 'neutral' | 'warning' | 'info' {
    if (verdict === 'alert') return 'warning';
    if (verdict === 'toss') return 'neutral';
    if (verdict && isRetained(verdict)) return 'success';
    return 'info';
  }

  protected fetchTone(status: string | null): 'success' | 'danger' | 'neutral' {
    if (status === 'ok') return 'success';
    if (status === null) return 'neutral';
    return 'danger';
  }

  protected analysisMeta(j: EmailJourney): string {
    if (j.shape === 'none') return 'nothing recorded';
    const parts: string[] = [];
    if (j.contentType) parts.push(j.contentType);
    if (j.score !== null) parts.push(`score ${j.score}`);
    if (j.shape === 'triage') parts.push('triage only');
    return parts.join(' · ') || 'recorded';
  }

  protected linksMeta(j: EmailJourney): string {
    if (this.linksSkipped()) return `skipped — body classified ${j.contentType}`;
    if (j.links.length > 0) return `${j.links.length} followed`;
    if (j.linksRecorded) return 'none followable';
    return 'no link step recorded';
  }

  private delta(fromIso: string, toIso: string): string | null {
    const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
    if (!Number.isFinite(ms) || ms < 0) return null;
    if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
    return `${Math.round(ms / 3_600_000)}h`;
  }
}
