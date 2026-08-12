import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiChipList, type UiChipListItem } from '@shared/components/ui-chip-list/ui-chip-list';
import { UiProse } from '@shared/components/ui-prose/ui-prose';
import type { JourneyLink } from '../../../email-journey';
import { EmailDetailStore } from '../../../email-detail.store';

/** Links tab: each follow as a trace — why it happened, what happened,
 *  what it read, what it contributed. Repeat follows collapse to ×N. */
@Component({
  selector: 'app-email-links-panel',
  imports: [NgTemplateOutlet, UiBadge, UiChipList, UiProse],
  templateUrl: './links-panel.html',
  styleUrl: '../email-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailLinksPanel {
  protected readonly store = inject(EmailDetailStore);

  protected entityChips(entities: string[]): UiChipListItem[] {
    return entities.map((e) => ({ id: e, label: e }));
  }

  protected fetchTone(status: string | null): 'success' | 'danger' | 'neutral' {
    if (status === 'ok') return 'success';
    if (status === null) return 'neutral';
    return 'danger';
  }

  protected fetchLine(link: JourneyLink): string {
    if (link.fetchStatus === 'ok') {
      return link.screenshotUrl ? 'fetched ok, snapshot taken' : 'fetched ok, no snapshot stored';
    }
    return `fetch failed (${link.fetchStatus ?? 'unknown'}) — nothing was read, no snapshot`;
  }

  /** The per-link conclusion: what this follow contributed to the analysis. */
  protected yieldLine(link: JourneyLink): string {
    if (link.fetchStatus !== 'ok') return 'Contributed nothing — the fetch never returned a page.';
    const parts: string[] = [];
    if (link.events.length > 0) {
      parts.push(`${link.events.length} event${link.events.length === 1 ? '' : 's'}`);
    }
    if (link.entities.length > 0) {
      parts.push(`${link.entities.length} entit${link.entities.length === 1 ? 'y' : 'ies'}`);
    }
    return parts.length > 0
      ? `Contributed ${parts.join(' and ')} to the analysis.`
      : 'Read, but contributed nothing to the analysis.';
  }
}
