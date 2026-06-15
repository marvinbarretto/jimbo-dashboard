import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Signal,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { swapDetailSeq, closeDetail } from '@shared/kanban/detail-nav';
import { RejectFormComponent, type RejectSubmission } from './reject-form/reject-form';
import { ThreadView } from '../../../thread/components/thread-view/thread-view';
import { lifecycleState, isArchived } from '@domain/vault/vault-item';
import { staleNorm, ancientNorm } from '@domain/vault';
import { ActivityLogComponent } from './activity-log/activity-log';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiMentionChipStrip } from '@shared/components/ui-mention-chip-strip/ui-mention-chip-strip';
import {
  UiChipList,
  type UiChipListItem,
  type UiChipListPickerOption,
} from '@shared/components/ui-chip-list/ui-chip-list';
import { MentionDirective } from '@shared/mentions';
import { actorId } from '@domain/ids';
import { CURRENT_ACTOR_ID } from '@domain/actors';
import { VaultItemActionBar } from './vault-item-action-bar/vault-item-action-bar';
import { VaultItemDeliveryBlock } from './vault-item-delivery-block/vault-item-delivery-block';
import { VaultItemIdentityHeader } from './vault-item-identity-header/vault-item-identity-header';
import { VaultItemIntakeBlock } from './vault-item-intake-block/vault-item-intake-block';
import { VaultItemIntakeRationale } from './vault-item-intake-rationale/vault-item-intake-rationale';
import { VaultItemLinksBlock } from './vault-item-links-block/vault-item-links-block';
import { VaultItemMetaLine } from './vault-item-meta-line/vault-item-meta-line';
import { VaultItemNextActionComponent } from './vault-item-next-action/vault-item-next-action';
import { VaultItemOverviewCards } from './vault-item-overview-cards/vault-item-overview-cards';
import { VaultItemQuestions } from './vault-item-questions/vault-item-questions';
import { VaultItemStatusChips } from './vault-item-status-chips/vault-item-status-chips';
import type { DialogMode } from '../../dialog/vault-item-dialog-mode';
import { VaultItemDialogStore } from '../../dialog/vault-item-dialog-store';
import type { CreateThreadMessagePayload } from '@domain/thread';

/**
 * Thin layout component for the unified vault-item dialog. Owns no state of
 * its own beyond `surface` (page vs modal, which drives navigation policy).
 * All focused-item state, draft state, and operations live in the
 * VaultItemDialogStore which the host (dialog shell or page route) provides.
 */
@Component({
  selector: 'app-vault-item-detail-body',
  imports: [
    RouterLink,
    ThreadView,
    RejectFormComponent,
    ActivityLogComponent,
    UiSection,
    UiButton,
    UiMentionChipStrip,
    UiChipList,
    MentionDirective,
    VaultItemActionBar,
    VaultItemDeliveryBlock,
    VaultItemIdentityHeader,
    VaultItemIntakeBlock,
    VaultItemIntakeRationale,
    VaultItemLinksBlock,
    VaultItemMetaLine,
    VaultItemNextActionComponent,
    VaultItemOverviewCards,
    VaultItemQuestions,
    VaultItemStatusChips,
  ],
  templateUrl: './vault-item-detail-body.html',
  styleUrl: './vault-item-detail-body.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // GH items age from off-white → pale yellow using the existing staleness
    // CSS var contract. Non-GH items bind 0 so the modifier has no effect.
    '[style.--stale-norm]':   'ghStaleNorm()',
    '[style.--ancient-norm]': 'ghAncientNorm()',
  },
})
export class VaultItemDetailBody {
  readonly mode = input.required<DialogMode>();
  /** 'page' shows the in-bar × back-to-vault link; 'modal' hides it because
   *  the dialog shell provides its own close affordance. */
  readonly surface = input<'page' | 'modal'>('page');
  /** Emitted after a Draft saves so the host can mirror the new mode. */
  readonly modeChange = output<DialogMode>();

  protected readonly store = inject(VaultItemDialogStore);
  private readonly router = inject(Router);
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  readonly stickyHeaderRef = viewChild<ElementRef<HTMLDivElement>>('stickyHeader');

  // Staleness norms are non-zero only for GH items — drives the yellow-aging
  // background modifier without affecting manually-created items.
  protected readonly ghStaleNorm = computed(() => {
    if (!this.store.isGitHubItem()) return 0;
    const item = this.store.item();
    if (!item) return 0;
    return staleNorm(item, this.store.lastActivityAt() ?? null);
  });

  protected readonly ghAncientNorm = computed(() => {
    if (!this.store.isGitHubItem()) return 0;
    const item = this.store.item();
    if (!item) return 0;
    return ancientNorm(item, this.store.lastActivityAt() ?? null);
  });

  // Template helpers — pure functions, kept here because the template
  // references them by reference (passing to <app-activity-log> inputs etc.)
  // and the store already exports actorLabelFn / actorKindFn for the same.
  protected readonly lifecycleOf = lifecycleState;
  protected readonly isItemArchived = isArchived;
  protected readonly currentActorId = CURRENT_ACTOR_ID;

  // Adapters for UiChipList — drive the draft form's project picker. Picker
  // options omit projects already on the draft so we don't show duplicates.
  protected readonly draftProjectChips = computed<readonly UiChipListItem[]>(() =>
    this.store.draftPayload().projects.map(p => ({
      id: p.id,
      label: p.display_name,
      entityType: 'project' as const,
      color: p.color_token,
    })),
  );

  /** Thread section meta — appends "· N open" when there are unresolved questions
   *  so the section header surfaces the needs-reply signal without an inner pill. */
  protected readonly threadMeta = computed(() => {
    const total = this.store.messages().length;
    const open = this.store.openQuestions().length;
    const base = `${total} ${total === 1 ? 'message' : 'messages'}`;
    return open > 0 ? `${base} · ${open} open` : base;
  });

  protected readonly draftProjectPickerOptions = computed<readonly UiChipListPickerOption[]>(() => {
    const taken = new Set(this.store.draftPayload().projects.map(p => p.id));
    return this.store.activeProjects()
      .filter(p => !taken.has(p.id))
      .map(p => ({
        id: p.id,
        label: p.display_name,
        entityType: 'project' as const,
        color: p.color_token,
      }));
  });

  constructor() {
    // Sync the store's mode to the host's input. The store is the source of
    // truth for transitions (Draft → Item via submitDraft); this effect just
    // keeps it in lockstep with whatever the host passes in.
    effect(() => {
      const incoming = this.mode();
      if (incoming !== this.store.mode()) {
        this.store.setMode(incoming);
      }
    });

    // Measure the rendered sticky-header zone and write the real pixel height
    // into --sticky-header-height so column section headers always clear it
    // exactly, even when chips wrap or rationale expands.
    effect(() => {
      const el = this.stickyHeaderRef()?.nativeElement;
      if (!el) return;
      const ro = new ResizeObserver(entries => {
        const height = entries[0]?.borderBoxSize[0]?.blockSize
          ?? entries[0]?.contentRect.height
          ?? 0;
        this.el.nativeElement.style.setProperty('--sticky-header-height', `${Math.ceil(height)}px`);
      });
      ro.observe(el, { box: 'border-box' });
      this.destroyRef.onDestroy(() => ro.disconnect());
    });
  }

  // ── Navigation handlers (need Router, so live here, not in store) ─────────

  /** Modal surface updates ?detail= so withVaultDetailModal swaps; page
   *  surface uses Router.navigate so URL stays meaningful. */
  swapToSeq(seq: number): void {
    if (this.surface() === 'modal') {
      swapDetailSeq(this.router, seq);
      return;
    }
    this.router.navigate(['/vault-items', seq]);
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
    // Close the modal entirely so the operator returns to the kanban and
    // sees the card has moved to the needs_rework column. In page surface
    // the item still exists at /vault-items/<seq> so we don't navigate away.
    if (this.surface() === 'modal') closeDetail(this.router);
  }

  // ── Submit-draft trampoline ───────────────────────────────────────────────

  /** Subscribes to the store's submitDraft and re-emits modeChange so the
   *  host (dialog shell) mirrors the morph. */
  submitDraft(): void {
    this.store.submitDraft().subscribe(next => this.modeChange.emit(next));
  }

  // ── Draft DOM event glue ──────────────────────────────────────────────────

  onDraftBodyInput(e: Event): void {
    this.store.setDraftBody((e.target as HTMLTextAreaElement).value);
  }

  onDraftBodyKey(e: KeyboardEvent): void {
    if (e.defaultPrevented) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.submitDraft();
    }
  }

  // ── Thread reply (template passes the payload up) ─────────────────────────
  postThreadReply(payload: CreateThreadMessagePayload): void {
    this.store.postThreadReply(payload);
  }
}
