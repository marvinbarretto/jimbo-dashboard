import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { EntityChip } from '@shared/components/entity-chip/entity-chip';
import { QuestionReplyComposer } from '@shared/components/question-reply-composer/question-reply-composer';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';
import type { ActorId, VaultItemId } from '@domain/ids';
import type { CreateThreadMessagePayload, ThreadMessage } from '@domain/thread';

@Component({
  selector: 'app-vault-item-questions',
  imports: [EntityChip, QuestionReplyComposer, UiCluster, UiSection, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (questions().length > 0) {
      <app-ui-section
        title="Open Questions"
        tone="alert"
        [collapsible]="false"
        [meta]="meta()">
        @for (q of questions(); track q.id) {
          <div class="vault-item-questions__item">
            <app-ui-cluster align="baseline" gap="sm" class="vault-item-questions__who">
              <app-entity-chip type="actor" [id]="q.author_actor_id" [label]="q.author_actor_id" />
              <span class="vault-item-questions__kind">open question</span>
              <span class="vault-item-questions__age">{{ q.created_at | relativeTime }}</span>
            </app-ui-cluster>
            <p class="vault-item-questions__body">{{ q.body }}</p>
            <app-question-reply-composer
              [question]="q"
              [vaultItemId]="vaultItemId()"
              [currentActor]="currentActor()"
              (posted)="replyPosted.emit($event)"
            />
          </div>
        }
      </app-ui-section>
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    .vault-item-questions__item {
      padding: 0.4rem 0;
    }

    .vault-item-questions__item:not(:last-child) {
      border-bottom: 1px solid color-mix(in oklab, var(--color-danger) 30%, transparent);
    }

    .vault-item-questions__who {
      margin-bottom: 0.3rem;
    }

    .vault-item-questions__kind {
      font-size: 0.6rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-text-muted);
    }

    .vault-item-questions__age {
      font-size: 0.6rem;
      color: var(--color-text-muted);
      margin-left: auto;
    }

    .vault-item-questions__body {
      font-size: 0.78rem;
      line-height: 1.45;
      color: var(--color-text);
      margin: 0 0 0.5rem;
    }
  `],
})
export class VaultItemQuestions {
  readonly questions = input.required<readonly ThreadMessage[]>();
  readonly vaultItemId = input.required<VaultItemId>();
  readonly currentActor = input.required<ActorId>();

  readonly replyPosted = output<CreateThreadMessagePayload>();

  meta(): string {
    const n = this.questions().length;
    return `${n} blocking question${n === 1 ? '' : 's'}`;
  }
}
