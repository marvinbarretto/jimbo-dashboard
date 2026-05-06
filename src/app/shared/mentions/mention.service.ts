import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Overlay, type OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Observable, Subject, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import type { MentionTrigger, MentionItem } from './mention-trigger';
import { MentionDropdown } from './mention-dropdown';

interface ActiveMention {
  trigger: MentionTrigger;
  query: string;
  anchorEl: HTMLElement;
}

/**
 * Singleton coordinator for inline mention dropdowns.
 *
 * The directive (per-textarea) calls `open` / `updateQuery` / `close`. The
 * service runs the search pipeline, owns the CDK overlay, and exposes signals
 * the dropdown component reads.
 */
@Injectable({ providedIn: 'root' })
export class MentionService {
  private readonly overlay = inject(Overlay);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _active = signal<ActiveMention | null>(null);
  private readonly _results = signal<MentionItem[]>([]);
  private readonly _selectedIndex = signal(0);
  private readonly _loading = signal(false);

  readonly active = this._active.asReadonly();
  readonly results = this._results.asReadonly();
  readonly selectedIndex = this._selectedIndex.asReadonly();
  readonly loading = this._loading.asReadonly();

  private overlayRef: OverlayRef | null = null;
  private readonly query$ = new Subject<{ trigger: MentionTrigger; query: string }>();
  private readonly commitSubject = new Subject<{ insert: string | null }>();
  /** Fires when a row is committed; the active directive applies the insertion. */
  readonly commit$: Observable<{ insert: string | null }> = this.commitSubject.asObservable();

  constructor() {
    this.query$.pipe(
      debounceTime(120),
      distinctUntilChanged((a, b) => a.trigger.char === b.trigger.char && a.query === b.query),
      switchMap(({ trigger, query }) => {
        this._loading.set(true);
        try {
          return trigger.search(query);
        } catch {
          return of<MentionItem[]>([]);
        }
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: items => {
        this._results.set(items);
        this._selectedIndex.set(0);
        this._loading.set(false);
      },
      error: () => {
        this._results.set([]);
        this._loading.set(false);
      },
    });
  }

  open(trigger: MentionTrigger, query: string, anchorEl: HTMLElement): void {
    const wasOpen = this._active() !== null;
    this._active.set({ trigger, query, anchorEl });
    this.query$.next({ trigger, query });
    if (!wasOpen) this.openOverlay(anchorEl);
  }

  updateQuery(query: string): void {
    const a = this._active();
    if (!a) return;
    this._active.set({ ...a, query });
    this.query$.next({ trigger: a.trigger, query });
  }

  close(): void {
    if (!this._active()) return;
    this._active.set(null);
    this._results.set([]);
    this._selectedIndex.set(0);
    this._loading.set(false);
    this.closeOverlay();
  }

  moveSelection(delta: number): void {
    const max = this._results().length - 1;
    if (max < 0) return;
    this._selectedIndex.update(i => {
      const next = i + delta;
      if (next < 0) return max;
      if (next > max) return 0;
      return next;
    });
  }

  setSelectedIndex(i: number): void {
    if (i < 0 || i >= this._results().length) return;
    this._selectedIndex.set(i);
  }

  /**
   * Commit the currently-selected row. Fires `commit$` so the active
   * directive can apply the insertion to its textarea, then closes.
   */
  commit(): void {
    const a = this._active();
    if (!a) return;
    const item = this._results()[this._selectedIndex()];
    if (!item) return;
    const insert = a.trigger.onSelect(item);
    this.commitSubject.next({ insert });
    this.close();
  }

  private openOverlay(anchorEl: HTMLElement): void {
    if (this.overlayRef) return;
    const positionStrategy = this.overlay.position()
      .flexibleConnectedTo(anchorEl)
      .withPositions([
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
      ]);
    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: false,
      panelClass: 'mention-overlay',
    });
    this.overlayRef.attach(new ComponentPortal(MentionDropdown));
  }

  private closeOverlay(): void {
    this.overlayRef?.dispose();
    this.overlayRef = null;
  }
}
