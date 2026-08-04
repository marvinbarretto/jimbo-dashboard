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
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiProgressMeter } from '@shared/components/ui-progress-meter/ui-progress-meter';
import { UiSegmented, type UiSegmentedOption } from '@shared/components/ui-segmented/ui-segmented';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { ToastService } from '@shared/components/toast/toast.service';
import {
  REFERENCE_INTAKES,
  intakeStatus,
  percentOfDaily,
  percentOfDailyLabel,
  portionBasisLabel,
} from '../../utils/reference-intake';
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
  imports: [
    UiPage,
    UiSection,
    UiStack,
    UiCluster,
    UiButton,
    UiBadge,
    UiStatCard,
    UiProgressMeter,
    UiSegmented,
    UiEmptyState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nutrition-scan-page.html',
  // The photo control has to be a <label> wrapping a file input — that is what
  // makes a phone open the camera rather than a file browser — so it can't be
  // <app-ui-button>. Pulling in the button family's shared visual contract lets
  // it wear the same classes and stay pixel-identical to the real buttons next
  // to it, the same way UiButtonLink does for anchors.
  styleUrls: [
    './nutrition-scan-page.scss',
    '../../../../shared/components/ui-button/ui-button.shared.scss',
  ],
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
  protected readonly portionModeOptions: readonly UiSegmentedOption[] = [
    { value: 'servings', label: 'Servings' },
    { value: 'grams', label: 'Amount' },
  ];

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

  /** The unit this product is measured in — ml for drinks, g for food. */
  protected readonly unit = computed(() => (this.product()?.kind === 'drink' ? 'ml' : 'g'));

  /** Plain-English basis for the amount, e.g. "the whole 330ml pack". */
  protected readonly portionBasis = computed(() => {
    const res = this.resolution();
    if (!res) return '';
    return portionBasisLabel(res.portion_source, this.unit(), res.product.pack_g);
  });

  /**
   * True when nobody actually knows the portion — no manufacturer serving and
   * no usable pack size. The headline number is then a per-100g figure wearing
   * a serving's clothes, which is the one case worth interrupting the user for.
   */
  protected readonly portionAssumed = computed(
    () => this.resolution()?.portion_source === 'default_100g',
  );

  /** Macros that always exist — the KPI row under the calorie figure. */
  protected readonly macroTiles = computed(() => {
    const t = this.resolution()?.totals;
    if (!t) return [];
    return [
      { label: 'Protein', value: `${Math.round(t.protein_g)}g` },
      { label: 'Carbs', value: `${Math.round(t.carbs_g)}g` },
      { label: 'Fat', value: `${Math.round(t.fat_g)}g` },
    ];
  });

  /**
   * Nutrients split by what they mean, because the two halves want opposite
   * renders and mixing them lies.
   *
   * A LIMIT (saturates, salt, sugars) is something a portion spends. More is
   * worse, so these carry a severity and never a progress bar — the shared
   * meter turns green on reaching its target, which for salt would congratulate
   * you for using a whole day's allowance on one pasty.
   *
   * A TARGET (fibre) is something a portion builds toward. There the meter's
   * goal semantics are exactly right, so it keeps the bar.
   *
   * Unmeasured nutrients stay in the list and say so. Dropping the row would
   * imply the product contains none of it.
   */
  private readonly intakeRow = (key: string) => {
    const t = this.resolution()?.totals as Record<string, number | null | undefined> | undefined;
    const grams = (t?.[key] ?? null) as number | null;
    const ref = REFERENCE_INTAKES[key];
    return {
      key,
      label: ref.label,
      grams,
      unit: ref.unit,
      daily: ref.daily,
      percent: percentOfDaily(key, grams),
      percentLabel: percentOfDailyLabel(key, grams),
      status: intakeStatus(key, grams),
      measured: grams != null,
    };
  };

  /** What this portion spends against a day's allowance. */
  protected readonly spends = computed(() =>
    ['sat_fat_g', 'salt_g', 'sugars_g'].map(this.intakeRow),
  );

  /** What this portion builds toward. */
  protected readonly builds = computed(() => ['fiber_g'].map(this.intakeRow));

  /** True when any reference nutrient came back measured. */
  protected readonly hasIntakeData = computed(
    () => [...this.spends(), ...this.builds()].some((r) => r.measured),
  );

  /**
   * Calories from ethanol alone, at 7 kcal/g — the "empty calories" figure.
   * Null for anything without a measured alcohol content, which includes every
   * soft drink and all food, so the block simply doesn't render.
   */
  protected readonly alcoholKcal = computed(() => {
    const g = this.resolution()?.totals.alcohol_g;
    return g == null ? null : Math.round(g * 7);
  });

  /** Share of this item's calories that are alcohol, 0–100. */
  protected readonly alcoholShare = computed(() => {
    const kcal = this.resolution()?.totals.kcal ?? 0;
    const alc = this.alcoholKcal();
    if (alc == null || kcal <= 0) return null;
    return Math.min(100, Math.round((alc / kcal) * 100));
  });

  /** Badge wording for how much the macros can be trusted. */
  protected readonly provenance = computed(() => {
    const res = this.resolution();
    if (!res) return null;
    return res.macro_source === 'openfoodfacts'
      ? { tone: 'info' as const, text: 'Manufacturer figures' }
      : { tone: 'warning' as const, text: 'Estimated from the name' };
  });

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
