import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiInlineTabs, type UiInlineTabOption } from '@shared/components/ui-inline-tabs/ui-inline-tabs';
import { InterrogateSnapshotService } from '../../data-access/interrogate-snapshot.service';
import { BeliefsTab } from '../beliefs-tab/beliefs-tab';
import { ClarificationsTab } from '../clarifications-tab/clarifications-tab';
import { ContextTab } from '../context-tab/context-tab';

type PictureTab = 'beliefs' | 'clarifications' | 'context';

const TAB_OPTIONS: readonly UiInlineTabOption[] = [
  { value: 'beliefs', label: 'Beliefs' },
  { value: 'clarifications', label: 'Clarifications' },
  { value: 'context', label: 'Context' },
];

@Component({
  selector: 'app-picture-page',
  imports: [UiStack, UiPageHeader, UiInlineTabs, BeliefsTab, ClarificationsTab, ContextTab],
  templateUrl: './picture-page.html',
  styleUrl: './picture-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PicturePage {
  private readonly snapshotService = inject(InterrogateSnapshotService);

  readonly tabOptions = TAB_OPTIONS;
  readonly activeTab = signal<PictureTab>('beliefs');

  constructor() {
    // Shared by the Beliefs and Context tabs — one fetch for the page.
    this.snapshotService.load();
  }

  onTabChange(value: string): void {
    this.activeTab.set(value as PictureTab);
  }
}
