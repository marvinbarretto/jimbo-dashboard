import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { swapDetailSeq, closeDetail } from '@shared/kanban/detail-nav';
import { lifecycleState, isArchived } from '@domain/vault/vault-item';
import { CURRENT_ACTOR_ID } from '@domain/actors';
import { UiInlineEdit } from '@shared/components/ui-inline-edit/ui-inline-edit';
import { UiDropdown } from '@shared/components/ui-dropdown/ui-dropdown';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiMentionChipStrip } from '@shared/components/ui-mention-chip-strip/ui-mention-chip-strip';
import {
  UiChipList,
  type UiChipListItem,
  type UiChipListPickerOption,
} from '@shared/components/ui-chip-list/ui-chip-list';
import { MentionDirective } from '@shared/mentions';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';
import { ThreadView } from '../../../thread/components/thread-view/thread-view';
import { ActivityLogComponent } from './activity-log/activity-log';
import { RejectFormComponent, type RejectSubmission } from './reject-form/reject-form';
import { VaultItemDeliveryBlock } from './vault-item-delivery-block/vault-item-delivery-block';
import { VaultItemIntakeBlock } from './vault-item-intake-block/vault-item-intake-block';
import { VaultItemLinksBlock } from './vault-item-links-block/vault-item-links-block';
import { VaultItemQuestions } from './vault-item-questions/vault-item-questions';
import type { DialogMode } from '../../dialog/vault-item-dialog-mode';
import { VaultItemDialogStore } from '../../dialog/vault-item-dialog-store';
import type { CreateThreadMessagePayload } from '@domain/thread';

/**
 * The vault-item detail surface — one component, two modes:
 *
 *  - **draft** (`mode.kind === 'draft'`): the quick-create form the dialog opens
 *    on ⌘N. Title + project/epic + notes + tags → submitDraft morphs it into an
 *    item.
 *  - **item**: the detail view. Layout answers five questions top-to-bottom
 *    (stream-row-anatomy extended to the detail surface): WHERE it lives (three
 *    colour bands, project → epic → title, one hue with an opacity ramp; `--epic`
 *    derived from `--proj` via oklch) · WHY it's on me (a notice stack that only
 *    renders when something is genuinely outstanding — pending replies included,
 *    so a question filed as a plain `comment` still surfaces) · WHAT the work is
 *    + WHAT "done" means (work panel beside a first-class AC checklist) · WHAT I
 *    can do (consequence-labelled actions). No tabs — the tab set is what let an
 *    unanswered question hide behind a badge.
 *
 * Owns no state beyond `surface` (page vs modal → navigation policy); focused
 * item, draft, and mutations live in VaultItemDialogStore which the host provides.
 */
@Component({
  selector: 'app-vault-item-detail-body',
  imports: [
    RouterLink,
    UiInlineEdit,
    UiDropdown,
    UiButton,
    UiMentionChipStrip,
    UiChipList,
    MentionDirective,
    RelativeTimePipe,
    ThreadView,
    ActivityLogComponent,
    RejectFormComponent,
    VaultItemDeliveryBlock,
    VaultItemIntakeBlock,
    VaultItemLinksBlock,
    VaultItemQuestions,
  ],
  templateUrl: './vault-item-detail-body.html',
  styleUrl: './vault-item-detail-body.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // Project identity drives the three hierarchy bands. `--epic` is derived
    // from `--proj` in SCSS via oklch — no epic colour token exists server-side.
    '[style.--proj]': 'projColor()',
  },
})
export class VaultItemDetailBody {
  readonly mode = input.required<DialogMode>();
  /** 'page' shows a back-to-vault link; 'modal' hides it (the shell has its own
   *  close affordance and navigation swaps ?detail= instead of the URL). */
  readonly surface = input<'page' | 'modal'>('page');
  /** Emitted after a Draft saves so the host can mirror the new mode. */
  readonly modeChange = output<DialogMode>();

  protected readonly store = inject(VaultItemDialogStore);
  private readonly router = inject(Router);

  protected readonly lifecycleOf = lifecycleState;
  protected readonly isItemArchived = isArchived;
  protected readonly currentActorId = CURRENT_ACTOR_ID;

  /** Project colour for the bands; accent when unfiled (drives the hatched slot). */
  protected readonly projColor = computed(
    () => this.store.projects()[0]?.color_token ?? 'var(--color-accent)',
  );
  protected readonly firstProject = computed(() => this.store.projects()[0]);

  /** Parent shown as the epic band only when it's genuinely an epic. */
  protected readonly epicParent = computed(() => {
    const p = this.store.parentItem();
    return p?.is_epic ? p : undefined;
  });

  /** Effort estimate in 25-minute pomodoro blocks; defaults to 1. */
  protected readonly estimateBlocks = computed(() => this.store.item()?.estimated_blocks ?? 1);

  /** The most recent message waiting on the viewer — kind-agnostic, so a
   *  question filed as a plain `comment` still answers "why is this on me?".
   *  Suppressed when a typed open-question already renders its own card. */
  protected readonly pendingAsk = computed(() => {
    if (this.store.openQuestions().length > 0) return null;
    const pending = this.store.pendingReplies();
    return pending.length ? pending[pending.length - 1] : null;
  });

  // Adapters for the draft form's UiChipList project picker. Picker options
  // omit projects already on the draft so we don't show duplicates.
  protected readonly draftProjectChips = computed<readonly UiChipListItem[]>(() =>
    this.store.draftPayload().projects.map(p => ({
      id: p.id,
      label: p.display_name,
      entityType: 'project' as const,
      color: p.color_token,
    })),
  );

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
    // Keep the store's mode in lockstep with the host input. The store owns the
    // Draft → Item transition (submitDraft); this just mirrors the input.
    effect(() => {
      const incoming = this.mode();
      if (incoming !== this.store.mode()) this.store.setMode(incoming);
    });
  }

  // ── Navigation (Router lives here, not the store) ─────────────────────────

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
    if (this.surface() === 'modal') closeDetail(this.router);
  }

  postThreadReply(payload: CreateThreadMessagePayload): void {
    this.store.postThreadReply(payload);
  }

  /** "Send for grooming" = hand the item to Boris, whom the grooming pump
   *  actually picks up (it only grooms active, boris-assigned items). */
  sendForGrooming(): void {
    this.store.reassign('boris');
  }

  incEstimate(): void { this.store.updateEstimatedBlocks(this.estimateBlocks() + 1); }
  decEstimate(): void { this.store.updateEstimatedBlocks(Math.max(1, this.estimateBlocks() - 1)); }

  // ── Draft form glue ───────────────────────────────────────────────────────

  /** Re-emits modeChange so the host (dialog shell) mirrors the Draft → Item morph. */
  submitDraft(): void {
    this.store.submitDraft().subscribe(next => this.modeChange.emit(next));
  }

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
}
