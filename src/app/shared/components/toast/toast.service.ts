import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'error' | 'info' | 'warn';

/** A single inline affordance on a toast — in practice, undo. */
export interface ToastAction {
  label: string;
  run: () => void;
}

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
  count: number;
  action?: ToastAction;
  // Set when this toast is the live aggregate for a coalescing group. Other
  // toasts pushed within the active window with the same (groupKey, tone) bump
  // this one's count instead of stacking new rows.
  groupId?: string;
}

// Active group window — opened by `beginCoalescing`, closed by `endCoalescing`
// or by its `expiresAt` lapsing on the next push. Time-bounded so a forgotten
// open call can't permanently swallow unrelated toasts.
interface ActiveGroup {
  groupKey: string;
  summaries: Partial<Record<ToastTone, string>>;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  // Per-toast dismiss timers — keyed by id so coalesced toasts can extend their
  // own lifetime when the count bumps without leaving the original timer to fire.
  private readonly dismissTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private activeGroup: ActiveGroup | null = null;

  success(message: string, ms = 3000): void { this.push(message, 'success', ms); }
  error(message: string, ms = 5000): void   { this.push(message, 'error', ms); }
  info(message: string, ms = 3000): void    { this.push(message, 'info', ms); }
  warn(message: string, ms = 4000): void    { this.push(message, 'warn', ms); }

  /**
   * Toast carrying one inline action, typically undo.
   *
   * Deliberately skips coalescing: merging two of these would leave a single
   * button standing for two different actions, and firing the wrong undo is
   * worse than showing two rows. Longer default life than a plain toast for
   * the same reason an unreachable action is worse than no action at all.
   *
   * @param message Text shown beside the action button.
   * @param action  Label and callback for the button.
   * @param opts.tone Visual tone (default `info`).
   * @param opts.ms   Time before auto-dismiss (default 8000).
   */
  actionable(message: string, action: ToastAction, opts?: { tone?: ToastTone; ms?: number }): void {
    const id = crypto.randomUUID();
    this.toasts.update(ts => [...ts, { id, message, tone: opts?.tone ?? 'info', count: 1, action }]);
    this.scheduleDismiss(id, opts?.ms ?? 8000);
  }

  dismiss(id: string): void {
    this.toasts.update(ts => ts.filter(t => t.id !== id));
    const timer = this.dismissTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.dismissTimers.delete(id);
    }
  }

  /**
   * Open a coalescing window. Toasts pushed inside the window matching this
   * group's (key, tone) merge into one row whose count bumps and message swaps
   * to the per-tone summary. Use around bulk operations that loop per-row
   * mutators — the call sites stay unchanged.
   *
   * Time-bounded by `windowMs` (default 4s) so a missed `endCoalescing` can't
   * permanently capture unrelated toasts. The bulk caller should still close
   * explicitly once it knows the tail has landed.
   *
   * @param opts.groupKey         Stable identifier for this batch, e.g. `vault.archive`.
   * @param opts.successSummary   Replaces individual messages once count > 1 on success.
   * @param opts.errorSummary     Same, for error tone.
   * @param opts.windowMs         How long the window stays open (default 4000).
   */
  beginCoalescing(opts: {
    groupKey: string;
    successSummary?: string;
    errorSummary?: string;
    windowMs?: number;
  }): void {
    this.activeGroup = {
      groupKey: opts.groupKey,
      summaries: {
        success: opts.successSummary,
        error: opts.errorSummary,
      },
      expiresAt: Date.now() + (opts.windowMs ?? 4000),
    };
  }

  endCoalescing(): void {
    this.activeGroup = null;
  }

  private currentGroup(): ActiveGroup | null {
    if (!this.activeGroup) return null;
    if (Date.now() > this.activeGroup.expiresAt) {
      this.activeGroup = null;
      return null;
    }
    return this.activeGroup;
  }

  private push(message: string, tone: ToastTone, ms: number): void {
    const group = this.currentGroup();
    if (group) {
      const groupId = `${group.groupKey}:${tone}`;
      const existing = this.toasts().find(t => t.groupId === groupId);
      if (existing) {
        const summary = group.summaries[tone];
        const nextMessage = summary ?? message;
        this.toasts.update(ts =>
          ts.map(t => t.id === existing.id
            ? { ...t, count: t.count + 1, message: nextMessage }
            : t,
          ),
        );
        this.scheduleDismiss(existing.id, ms);
        return;
      }
      // First toast in the group — push normally but tag it so subsequent
      // toasts in the same window can find it. Count stays 1; summary doesn't
      // replace the message yet (the first one carries the most useful detail).
      const id = crypto.randomUUID();
      this.toasts.update(ts => [...ts, { id, message, tone, count: 1, groupId }]);
      this.scheduleDismiss(id, ms);
      return;
    }

    const id = crypto.randomUUID();
    this.toasts.update(ts => [...ts, { id, message, tone, count: 1 }]);
    this.scheduleDismiss(id, ms);
  }

  private scheduleDismiss(id: string, ms: number): void {
    const existing = this.dismissTimers.get(id);
    if (existing) clearTimeout(existing);
    this.dismissTimers.set(id, setTimeout(() => this.dismiss(id), ms));
  }
}
