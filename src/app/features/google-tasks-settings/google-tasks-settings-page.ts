import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastService } from '@shared/components/toast/toast.service';
import { UiBackLink } from '@shared/components/ui-back-link/ui-back-link';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiToggle } from '@shared/components/ui-toggle/ui-toggle';
import {
  GoogleTasksSettingsService,
  type GoogleTaskListEntry,
  type TaskListItemConfig,
} from './google-tasks-settings.service';

interface TaskListRow {
  readonly list: GoogleTaskListEntry;
  readonly enabled: boolean;
  readonly tag: string | null;
}

// Coalesces rapid toggle clicks into one PUT — the API takes a full-config
// blob, so flooding it on every click is wasteful and races prone.
const SAVE_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-google-tasks-settings-page',
  imports: [
    UiBackLink,
    UiEmptyState,
    UiLoadingState,
    UiPageHeader,
    UiSection,
    UiStack,
    UiToggle,
  ],
  templateUrl: './google-tasks-settings-page.html',
  styleUrl: './google-tasks-settings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleTasksSettingsPage {
  private readonly service = inject(GoogleTasksSettingsService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly localConfig = signal<Record<string, TaskListItemConfig>>({});

  // Last server-confirmed state. On a failed save we restore the UI to this
  // so the user sees the truth, not their stale optimistic toggle.
  private lastConfirmed: Record<string, TaskListItemConfig> = {};

  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Subscription | null = null;

  protected readonly loading = computed(
    () => this.service.lists() === undefined || this.service.config() === undefined,
  );

  protected readonly rows = computed<TaskListRow[]>(() => {
    const lists = this.service.lists() ?? [];
    const config = this.localConfig();
    return [...lists]
      .sort((a, b) => a.title.localeCompare(b.title))
      .map(list => ({
        list,
        enabled: config[list.id]?.enabled ?? false,
        tag: config[list.id]?.tag ?? null,
      }));
  });

  constructor() {
    effect(() => {
      const config = this.service.config();
      if (config !== undefined) {
        untracked(() => {
          this.localConfig.set({ ...config.lists });
          this.lastConfirmed = { ...config.lists };
        });
      }
    });

    this.destroyRef.onDestroy(() => {
      if (this.saveTimer) clearTimeout(this.saveTimer);
      this.inFlight?.unsubscribe();
    });
  }

  protected toggle(id: string, current: boolean): void {
    this.localConfig.update(cfg => ({
      ...cfg,
      [id]: { enabled: !current, tag: cfg[id]?.tag ?? null },
    }));
    this.scheduleSave();
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.persist(), SAVE_DEBOUNCE_MS);
  }

  private persist(): void {
    // Cancel any save that's already mid-flight — the snapshot we're about
    // to send is strictly newer, so the older response would be stale.
    this.inFlight?.unsubscribe();

    const snapshot = this.localConfig();
    this.inFlight = this.service.saveConfig({ lists: snapshot }).subscribe({
      next: () => {
        this.lastConfirmed = snapshot;
        this.inFlight = null;
        this.toast.success('Google Tasks settings saved');
      },
      error: (err) => {
        this.inFlight = null;
        this.localConfig.set({ ...this.lastConfirmed });
        const detail = err?.error?.message ?? err?.message ?? 'Unknown error';
        this.toast.error(`Couldn't save: ${detail}`);
        console.error('[GoogleTasksSettings] save error', err);
      },
    });
  }
}
