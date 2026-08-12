import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiStepper, type UiStepperStep } from '@shared/components/ui-stepper/ui-stepper';
import { UiTabBar } from '@shared/components/ui-tab-bar/ui-tab-bar';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { VaultChip } from '@shared/components/vault-chip/vault-chip';
import type { EmailVerdict } from '../../mail-activity.service';
import { isRetained } from '../../mail-activity.service';
import { EmailDetailStore } from '../../email-detail.store';

/**
 * Email-detail shell: the always-visible spine (journey stepper + overview,
 * so the verdict stays on screen for cross-reference) above a tab bar whose
 * tabs are CHILD ROUTES — analysis (default) / links / body / raw. Tabs, not
 * accordions: collapsing multi-screen sections made the page jump under the
 * pointer. Route-backed tabs are the repo idiom (tasks, hermes, api-data):
 * global `.ui-tab` class, `routerLinkActive`, the URL is the tab state.
 */
@Component({
  selector: 'app-email-detail',
  imports: [
    DatePipe, RouterLink, RouterLinkActive, RouterOutlet,
    UiPage, UiPageHeader, UiSection, UiMetaList, UiStack, UiBadge,
    UiStepper, UiTabBar, UiLoadingState, UiEmptyState, VaultChip,
  ],
  templateUrl: './email-detail.html',
  styleUrl: './email-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailDetail {
  private readonly route = inject(ActivatedRoute);
  protected readonly store = inject(EmailDetailStore);

  // Email is addressed by gmail_id across the mail feature (and the API:
  // GET /api/emails/reports/{gmail_id}), so the route param is the gmail_id.
  private readonly gmailId = toSignal(this.route.paramMap.pipe(map(p => p.get('gmailId'))));

  constructor() {
    effect(() => this.store.setGmailId(this.gmailId() ?? null));
  }

  protected readonly state = this.store.state;

  protected linksTabLabel(): string {
    const j = this.store.journey();
    if (!j) return 'Links';
    if (this.store.linksSkipped()) return 'Links · skipped';
    return `Links (${this.store.linkTraces().length})`;
  }

  protected readonly steps = computed<UiStepperStep[]>(() => {
    const email = this.store.email();
    const j = this.store.journey();
    if (!email || !j) return [];

    const analysed: UiStepperStep =
      j.shape === 'none'
        ? { label: 'Analysed', state: 'todo' }
        : { label: j.shape === 'deep' ? 'Analysed' : 'Analysed (triage only)', state: 'done' };

    let links: UiStepperStep;
    if (this.store.linksSkipped()) {
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
    const email = this.store.email();
    if (!email?.gated_at) return null;
    return this.delta(email.discovered_at, email.gated_at);
  });

  protected verdictTone(verdict: EmailVerdict | null): 'success' | 'neutral' | 'warning' | 'info' {
    if (verdict === 'alert') return 'warning';
    if (verdict === 'toss') return 'neutral';
    if (verdict && isRetained(verdict)) return 'success';
    return 'info';
  }

  private delta(fromIso: string, toIso: string): string | null {
    const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
    if (!Number.isFinite(ms) || ms < 0) return null;
    if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
    return `${Math.round(ms / 3_600_000)}h`;
  }
}
