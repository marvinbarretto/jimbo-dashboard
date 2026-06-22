import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { swapDetailSeq, closeDetail } from '@shared/kanban/detail-nav';
import { lifecycleState, isArchived } from '@domain/vault/vault-item';
import { CURRENT_ACTOR_ID } from '@domain/actors';
import {
  UiInlineTabs,
  type UiInlineTabOption,
} from '@shared/components/ui-inline-tabs/ui-inline-tabs';
import { UiInlineEdit } from '@shared/components/ui-inline-edit/ui-inline-edit';
import { ThreadView } from '../../../thread/components/thread-view/thread-view';
import { ActivityLogComponent } from '../vault-item-detail-body/activity-log/activity-log';
import { RejectFormComponent, type RejectSubmission } from '../vault-item-detail-body/reject-form/reject-form';
import { VaultItemActionBar } from '../vault-item-detail-body/vault-item-action-bar/vault-item-action-bar';
import { VaultItemDeliveryBlock } from '../vault-item-detail-body/vault-item-delivery-block/vault-item-delivery-block';
import { VaultItemIntakeBlock } from '../vault-item-detail-body/vault-item-intake-block/vault-item-intake-block';
import { VaultItemIntakeRationale } from '../vault-item-detail-body/vault-item-intake-rationale/vault-item-intake-rationale';
import { VaultItemLinksBlock } from '../vault-item-detail-body/vault-item-links-block/vault-item-links-block';
import { VaultItemMetaLine } from '../vault-item-detail-body/vault-item-meta-line/vault-item-meta-line';
import { VaultItemNextActionComponent } from '../vault-item-detail-body/vault-item-next-action/vault-item-next-action';
import { VaultItemOverviewCards } from '../vault-item-detail-body/vault-item-overview-cards/vault-item-overview-cards';
import { VaultItemQuestions } from '../vault-item-detail-body/vault-item-questions/vault-item-questions';
import { VaultItemStatusChips } from '../vault-item-detail-body/vault-item-status-chips/vault-item-status-chips';
import type { DialogMode } from '../../dialog/vault-item-dialog-mode';
import { VaultItemDialogStore } from '../../dialog/vault-item-dialog-store';
import type { CreateThreadMessagePayload } from '@domain/thread';

type V2Tab = 'brief' | 'criteria' | 'context' | 'activity' | 'thread';

/**
 * #10 ("native-09") redesign of the vault-item detail view — same store, same
 * data, same mutations as {@link VaultItemDetailBody}; only the layout and
 * visual language differ. Mounted at `/vault-items/<seq>/v2` for side-by-side
 * comparison (see `docs/prototypes/vault-item-detail/10-native-09.html`).
 *
 * Hierarchy reorg (the point of the audit): the open question is the hero at
 * the top; the verbose intake rationale is demoted into a Context tab; content
 * splits across Brief · Criteria · Context · Activity · Thread so no field is
 * lost — just relocated.
 *
 * Chrome (spine, family pill, hero band, tab bar, footer) is bespoke here;
 * the data-bearing panels are reused verbatim from the current body.
 */
@Component({
  selector: 'app-vault-item-detail-body-v2',
  imports: [
    RouterLink,
    UiInlineTabs,
    UiInlineEdit,
    ThreadView,
    ActivityLogComponent,
    RejectFormComponent,
    VaultItemActionBar,
    VaultItemDeliveryBlock,
    VaultItemIntakeBlock,
    VaultItemIntakeRationale,
    VaultItemLinksBlock,
    VaultItemMetaLine,
    VaultItemNextActionComponent,
    VaultItemOverviewCards,
    VaultItemQuestions,
    VaultItemStatusChips,
  ],
  templateUrl: './vault-item-detail-body-v2.html',
  styleUrl: './vault-item-detail-body-v2.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // Project identity drives the spine + family pill. `--epic` is derived from
    // `--proj` in SCSS via oklch (no epic colour token exists server-side).
    '[style.--proj]': 'projColor()',
  },
})
export class VaultItemDetailBodyV2 {
  readonly mode = input.required<DialogMode>();
  readonly surface = input<'page' | 'modal'>('page');
  readonly modeChange = output<DialogMode>();

  protected readonly store = inject(VaultItemDialogStore);
  private readonly router = inject(Router);

  protected readonly activeTab = signal<V2Tab>('brief');

  protected readonly lifecycleOf = lifecycleState;
  protected readonly isItemArchived = isArchived;
  protected readonly currentActorId = CURRENT_ACTOR_ID;

  /** Primary project colour for the spine + family pill; falls back to accent. */
  protected readonly projColor = computed(
    () => this.store.projects()[0]?.color_token ?? 'var(--color-accent)',
  );

  /** Parent shown as the "epic" half of the family pill only when it's an epic. */
  protected readonly epicParent = computed(() => {
    const p = this.store.parentItem();
    return p?.is_epic ? p : undefined;
  });

  protected readonly tabs = computed<readonly UiInlineTabOption[]>(() => {
    const item = this.store.item();
    const criteria = item?.acceptance_criteria.length ?? 0;
    return [
      { value: 'brief', label: 'Brief' },
      ...(item && !item.is_epic
        ? [{ value: 'criteria', label: 'Criteria', count: criteria } as UiInlineTabOption]
        : []),
      { value: 'context', label: 'Context' },
      { value: 'activity', label: 'Activity', count: this.store.events().length },
      { value: 'thread', label: 'Thread', count: this.store.messages().length },
    ];
  });

  constructor() {
    // Keep the store's mode in lockstep with the host input (mirrors the
    // original body; page surface is always Item mode).
    effect(() => {
      const incoming = this.mode();
      if (incoming !== this.store.mode()) this.store.setMode(incoming);
    });
  }

  // ── Navigation (Router lives here, not the store) ─────────────────────────

  /** Stay within the v2 surface when following subtask/blocker/parent links. */
  swapToSeq(seq: number): void {
    if (this.surface() === 'modal') {
      swapDetailSeq(this.router, seq);
      return;
    }
    this.router.navigate(['/vault-items', seq, 'v2']);
  }

  onProjectClicked(id: string): void {
    this.router.navigate(['/projects', id]);
  }

  onDeleted(): void {
    this.store.remove();
    this.router.navigate(['/vault-items']);
  }

  onRejectSubmitted(submission: RejectSubmission): void {
    const ok = this.store.submitReject(submission);
    if (!ok) return;
    if (this.surface() === 'modal') closeDetail(this.router);
  }

  postThreadReply(payload: CreateThreadMessagePayload): void {
    this.store.postThreadReply(payload);
  }

  setTab(value: string): void {
    this.activeTab.set(value as V2Tab);
  }
}
