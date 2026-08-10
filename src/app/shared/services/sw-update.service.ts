import { DOCUMENT, Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

/**
 * Keeps the service-worker-cached app from going stale in surfaces that never
 * "close" — chiefly the jimbo-app WebView, which is backgrounded for days and
 * would otherwise serve the cached version indefinitely (ngsw only activates
 * a new version on a full reload, which a resumed WebView never does).
 *
 * Cycle: every return to visibility asks the SW to check for a new version;
 * when one is ready it's applied on the next transition to *hidden* — a
 * reload nobody is looking at costs nothing and can't interrupt a half-filled
 * sheet or a live gym session. Net effect: one background/resume cycle after
 * a deploy and the fresh build is on screen. This is also the migration
 * plan's "force-refresh escape hatch" — recovering from a bad deploy is a
 * single app-switch, not a cache-clear safari.
 *
 * No-ops wherever the SW isn't enabled (dev, unsupported browsers).
 */
@Injectable({ providedIn: 'root' })
export class SwUpdateService {
  private readonly updates = inject(SwUpdate);
  private readonly doc = inject(DOCUMENT);

  private updateReady = false;

  constructor() {
    if (!this.updates.isEnabled) return;

    this.updates.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => {
        this.updateReady = true;
        // Already backgrounded when the download finished? Apply right away.
        if (this.doc.visibilityState === 'hidden') this.reload();
      });

    this.doc.addEventListener('visibilitychange', () => {
      if (this.doc.visibilityState === 'hidden') {
        if (this.updateReady) this.reload();
      } else {
        // Fire-and-forget: a failed check (offline) just means we stay on the
        // cached version, which is the whole point of having one.
        void this.updates.checkForUpdate().catch(() => undefined);
      }
    });

    // Startup check — covers cold-launch-shortly-after-deploy; the resulting
    // VERSION_READY waits for the next hide like any other.
    void this.updates.checkForUpdate().catch(() => undefined);
  }

  private reload(): void {
    this.doc.defaultView?.location.reload();
  }
}
