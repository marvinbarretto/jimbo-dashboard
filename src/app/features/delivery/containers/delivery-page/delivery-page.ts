import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DeliveryService } from '@features/delivery/data-access/delivery.service';
import type { CiState } from '@domain/delivery';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const CI_TONE: Record<CiState, BadgeTone> = {
  passing: 'success',
  failing: 'danger',
  pending: 'info',
  // Not a pass. A PR on a repo with no checks is merging on nobody's authority,
  // which is worth showing as a warning rather than a shrug.
  none:    'warning',
};

const CI_LABEL: Record<CiState, string> = {
  passing: 'CI green',
  failing: 'CI FAILED',
  pending: 'CI running',
  none:    'no checks',
};

/**
 * Delivery — the gap between what agents merged and what production has.
 *
 * Exists because the operating model is trunk-based with manual promotion:
 * agents merge continuously, Marvin decides when to release. Git can answer
 * "what is unshipped" for one repo; nothing answered it across all of them,
 * which is the view that matters once agents are building in several at once.
 */
@Component({
  selector: 'app-delivery-page',
  imports: [UiPage, UiBadge, RouterLink],
  templateUrl: './delivery-page.html',
  styleUrl: './delivery-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryPage {
  private readonly service = inject(DeliveryService);

  readonly projects = this.service.projects;
  readonly totals = this.service.totals;
  readonly failingPrs = this.service.failingPrs;
  readonly loading = this.service.loading;
  readonly loaded = this.service.loaded;

  constructor() { this.service.load(); }

  refresh(): void { this.service.load(true); }

  ciTone(ci: CiState): BadgeTone { return CI_TONE[ci]; }
  ciLabel(ci: CiState): string { return CI_LABEL[ci]; }
}
