import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
  viewChild,
  type ElementRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { ToastService } from '@shared/components/toast/toast.service';
import {
  NutritionService,
  type BarcodePortion,
  type BarcodeResolution,
} from '../../data-access/nutrition.service';
import {
  backendInUse,
  decodeFrame,
  decodeImageFile,
  isPlausibleBarcode,
} from '../../data-access/barcode-decoder';
import { productDisplayName } from '../../utils/product-label';

/**
 * Scan a product barcode and log it.
 *
 * Three ways in, because no single one works on every phone:
 *   - photo    — `<input capture>`; the only path that needs neither HTTPS nor
 *                getUserMedia, so it works when testing against a laptop over
 *                the LAN. Start here when something else misbehaves.
 *   - live     — a viewfinder polling frames; needs HTTPS (we have it in prod)
 *                and camera permission, but is the one that feels like a scanner.
 *   - manual   — type the digits. Always available, and the honest fallback for
 *                a torn or unreadable label.
 *
 * All three converge on the same digits → resolve → confirm → log flow. Nothing
 * is written until the user confirms, so a misread costs a tap, not a bad entry.
 */

/** How often to attempt a decode while the viewfinder is open. */
const FRAME_INTERVAL_MS = 350;

type Phase = 'idle' | 'decoding' | 'resolving' | 'preview' | 'logging';

@Component({
  selector: 'app-nutrition-scan-page',
  imports: [UiPage, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nutrition-scan-page.html',
  styleUrl: './nutrition-scan-page.scss',
})
export class NutritionScanPage {
  private readonly service = inject(NutritionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');

  protected readonly phase = signal<Phase>('idle');
  protected readonly cameraOn = signal(false);
  protected readonly code = signal('');
  protected readonly manualCode = signal('');
  protected readonly resolution = signal<BarcodeResolution | null>(null);
  protected readonly error = signal<string | null>(null);
  /** Set when the code decoded fine but no such product exists upstream. */
  protected readonly unknownCode = signal<string | null>(null);

  // Portion. Servings is the friendly default; grams is the escape hatch for
  // "half the packet", and wins server-side when both are present.
  protected readonly portionMode = signal<'servings' | 'grams'>('servings');
  protected readonly servings = signal(1);
  protected readonly grams = signal(100);

  // Told to the user up front: on a browser without BarcodeDetector we pull a
  // ~200 KB decoder on first scan, which is worth warning about on mobile data.
  protected readonly backend = backendInUse();

  // Set the instant a portion field is touched and cleared only when the server
  // has re-priced. Without it there is a window where the macros on screen
  // belong to the previous portion while `confirm()` would log the new one —
  // a confirm step that shows a different number than it writes.
  protected readonly portionDirty = signal(false);

  protected readonly busy = computed(() => {
    const p = this.phase();
    return p === 'decoding' || p === 'resolving' || p === 'logging';
  });

  protected readonly product = computed(() => this.resolution()?.product ?? null);

  protected readonly displayName = computed(() => {
    const p = this.product();
    return p ? productDisplayName(p.brand, p.label) : '';
  });

  /** Grams the current portion works out to — mirrors the server's own rule. */
  protected readonly effectiveGrams = computed(() => {
    if (this.portionMode() === 'grams') return this.grams();
    return this.servings() * (this.product()?.serving_g ?? 100);
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.stopCamera();
      if (this.repriceTimer) clearTimeout(this.repriceTimer);
    });
  }

  // ── Input path 1: still photo ───────────────────────────────────
  protected async onPhoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Clear immediately: re-photographing the same product fires no change
    // event otherwise, which reads as the button being broken.
    input.value = '';
    if (!file) return;

    this.reset();
    this.phase.set('decoding');
    try {
      const found = await decodeImageFile(file);
      if (!found) {
        this.phase.set('idle');
        this.error.set('No barcode found in that photo. Fill the frame with the barcode and try again, or type the digits below.');
        return;
      }
      this.lookup(found);
    } catch {
      this.phase.set('idle');
      this.error.set('Could not read that image.');
    }
  }

  // ── Input path 2: live viewfinder ───────────────────────────────
  private stream: MediaStream | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  protected async toggleCamera(): Promise<void> {
    if (this.cameraOn()) {
      this.stopCamera();
      return;
    }
    this.reset();
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        // The rear camera is the one pointing at the shopping.
        video: { facingMode: { ideal: 'environment' } },
      });
    } catch {
      this.error.set(
        'Camera unavailable — needs HTTPS and permission. Use "Take a photo" or type the digits instead.',
      );
      return;
    }
    this.cameraOn.set(true);

    // The <video> only exists once cameraOn flips the template, so attach on
    // the next macrotask rather than reading the viewChild synchronously.
    setTimeout(() => {
      const el = this.video()?.nativeElement;
      if (!el || !this.stream) return;
      el.srcObject = this.stream;
      void el.play().catch(() => undefined);
      this.timer = setInterval(() => void this.tick(), FRAME_INTERVAL_MS);
    });
  }

  private async tick(): Promise<void> {
    const el = this.video()?.nativeElement;
    // Skip while a lookup is in flight — otherwise a held-still barcode fires
    // a request every 350 ms.
    if (!el || this.busy()) return;
    try {
      const found = await decodeFrame(el);
      if (found) {
        this.stopCamera();
        this.lookup(found);
      }
    } catch {
      // A single bad frame is normal; keep polling.
    }
  }

  protected stopCamera(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.cameraOn.set(false);
  }

  // ── Input path 3: typed digits ──────────────────────────────────
  protected onManualInput(event: Event): void {
    this.manualCode.set((event.target as HTMLInputElement).value.replace(/\D/g, ''));
  }

  protected submitManual(): void {
    const value = this.manualCode().trim();
    if (!isPlausibleBarcode(value)) {
      this.error.set('A barcode is 6–14 digits.');
      return;
    }
    this.reset();
    this.lookup(value);
  }

  // ── Resolve → confirm → log ─────────────────────────────────────
  private lookup(found: string): void {
    if (!isPlausibleBarcode(found)) {
      this.error.set(`Decoded "${found}", which isn't a product barcode.`);
      this.phase.set('idle');
      return;
    }
    this.code.set(found);
    this.phase.set('resolving');
    this.service.resolveBarcode(found, this.portion()).subscribe({
      next: (res) => {
        this.resolution.set(res);
        // Default the grams box to a real serving so switching mode isn't a
        // jump from 100 g to "whatever the packet says".
        this.grams.set(Math.round(res.product.serving_g ?? 100));
        this.phase.set('preview');
      },
      error: (err: HttpErrorResponse) => {
        this.phase.set('idle');
        if (err.status === 404) {
          this.unknownCode.set(found);
        } else {
          this.error.set(
            err.status === 0
              ? 'Could not reach the API.'
              : `Lookup failed (${err.status}). Open Food Facts may be down.`,
          );
        }
      },
    });
  }

  /**
   * Re-resolve at a changed portion so the previewed macros stay truthful.
   * Debounced: typing "250" would otherwise fire three lookups, and the
   * intermediate ones can land out of order.
   */
  private repriceTimer: ReturnType<typeof setTimeout> | null = null;

  protected scheduleReprice(): void {
    this.portionDirty.set(true);
    if (this.repriceTimer) clearTimeout(this.repriceTimer);
    this.repriceTimer = setTimeout(() => this.reprice(), 300);
  }

  protected reprice(): void {
    const code = this.code();
    if (!code || this.phase() !== 'preview') return;
    this.phase.set('resolving');
    this.service.resolveBarcode(code, this.portion()).subscribe({
      next: (res) => {
        this.resolution.set(res);
        this.portionDirty.set(false);
        this.phase.set('preview');
      },
      error: () => {
        this.phase.set('preview');
        this.toast.error('Could not update the portion');
      },
    });
  }

  protected confirm(): void {
    const code = this.code();
    if (!code) return;
    this.phase.set('logging');
    this.service.logBarcode(code, this.portion()).subscribe({
      next: (entry) => {
        this.toast.success(`Logged ${entry.raw_text} — ${entry.est_kcal ?? '?'} kcal`);
        this.reset();
        // Clear the typed code too, so the next scan starts from a blank page
        // rather than one tap away from logging the same product twice.
        this.manualCode.set('');
        this.servings.set(1);
        this.phase.set('idle');
      },
      error: () => {
        this.phase.set('preview');
        this.toast.error('Could not log that entry');
      },
    });
  }

  protected cancel(): void {
    this.reset();
    this.phase.set('idle');
  }

  protected goToLog(): void {
    void this.router.navigate(['/nutrition']);
  }

  private portion(): BarcodePortion {
    return this.portionMode() === 'grams'
      ? { grams: Math.max(1, this.grams()) }
      : { servings: Math.max(0.1, this.servings()) };
  }

  private reset(): void {
    this.resolution.set(null);
    this.error.set(null);
    this.unknownCode.set(null);
    this.code.set('');
  }

  // ── Template helpers (kept here so the template stays declarative) ──
  protected setMode(mode: 'servings' | 'grams'): void {
    this.portionMode.set(mode);
    this.scheduleReprice();
  }

  protected onServings(event: Event): void {
    const v = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(v) && v > 0) {
      this.servings.set(v);
      this.scheduleReprice();
    }
  }

  protected onGrams(event: Event): void {
    const v = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(v) && v > 0) {
      this.grams.set(v);
      this.scheduleReprice();
    }
  }
}
