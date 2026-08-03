/**
 * Decode a product barcode from a live camera frame or a still photo.
 *
 * Two backends, chosen at runtime:
 *   - the native `BarcodeDetector` (Chrome/Android) — no download, fastest
 *   - a lazily-imported ZXing fallback (Safari/iOS, which has never shipped
 *     BarcodeDetector) — ~200 KB, so it is only fetched on the phones that
 *     actually need it, and only once this module is asked to decode.
 *
 * Everything is expressed as "give me an image, get back digits" rather than
 * ZXing's own camera loop, so both backends drive the same UI and the still-
 * photo path (`<input capture>`) and the live path share one code path.
 */

/** 1D retail symbologies only — QR codes aren't groceries. */
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] as const;

type NativeDetector = {
  detect(source: CanvasImageSource | Blob): Promise<{ rawValue: string }[]>;
};
type NativeDetectorCtor = new (opts: { formats: readonly string[] }) => NativeDetector;

function nativeCtor(): NativeDetectorCtor | null {
  const ctor = (globalThis as { BarcodeDetector?: NativeDetectorCtor }).BarcodeDetector;
  return typeof ctor === 'function' ? ctor : null;
}

export type DecoderBackend = 'native' | 'zxing';

/** What the UI tells the user about how scanning will work on their device. */
export function backendInUse(): DecoderBackend {
  return nativeCtor() ? 'native' : 'zxing';
}

// ── ZXing fallback ────────────────────────────────────────────────
// Held as a promise so concurrent frame decodes share one import, and so a
// failed load can't wedge the page — it just rethrows per call.

let zxingReader: Promise<{ decode(canvas: HTMLCanvasElement): string | null }> | null = null;

function loadZxing(): Promise<{ decode(canvas: HTMLCanvasElement): string | null }> {
  zxingReader ??= (async () => {
    const { MultiFormatReader, BarcodeFormat, DecodeHintType, HybridBinarizer, BinaryBitmap } =
      await import('@zxing/library');
    const { HTMLCanvasElementLuminanceSource } = await import('@zxing/browser');

    const reader = new MultiFormatReader();
    // Built imperatively rather than from an array literal: the enum arrives
    // through a dynamic import, so it exists as a value but not as a type here.
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
    ]);
    // Groceries are photographed head-on but rarely perfectly straight; the
    // extra passes cost milliseconds and materially raise hit rate.
    hints.set(DecodeHintType.TRY_HARDER, true);
    reader.setHints(hints);

    return {
      decode(canvas: HTMLCanvasElement): string | null {
        try {
          const source = new HTMLCanvasElementLuminanceSource(canvas);
          const bitmap = new BinaryBitmap(new HybridBinarizer(source));
          return reader.decode(bitmap).getText() || null;
        } catch {
          // ZXing throws NotFoundException per undecodable frame — that is the
          // normal case while the user is still lining the camera up, not an
          // error worth surfacing.
          return null;
        } finally {
          reader.reset();
        }
      },
    };
  })();
  return zxingReader;
}

// ── Shared plumbing ───────────────────────────────────────────────

/**
 * Draw any image source onto a canvas, capped so a 12-megapixel phone photo
 * doesn't cost a second of CPU per decode attempt. ZXing scans row by row, so
 * width is what matters for resolving thin bars — 1280px keeps EAN-13 legible
 * while staying fast enough for a live viewfinder.
 */
const MAX_WIDTH = 1280;

function toCanvas(source: HTMLVideoElement | HTMLImageElement): HTMLCanvasElement | null {
  const sw = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const sh = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
  if (!sw || !sh) return null;

  const scale = Math.min(1, MAX_WIDTH / sw);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function decodeSource(source: HTMLVideoElement | HTMLImageElement): Promise<string | null> {
  const ctor = nativeCtor();
  if (ctor) {
    try {
      const [hit] = await new ctor({ formats: FORMATS }).detect(source);
      return hit?.rawValue ?? null;
    } catch {
      // A native detector that exists but refuses this source (some builds
      // reject <video> before enough frames land) shouldn't kill the scan —
      // fall through to ZXing.
    }
  }
  const canvas = toCanvas(source);
  if (!canvas) return null;
  return (await loadZxing()).decode(canvas);
}

/** Decode one frame of a running <video>. Returns null when nothing is in shot. */
export function decodeFrame(video: HTMLVideoElement): Promise<string | null> {
  if (video.readyState < 2) return Promise.resolve(null); // no frame drawn yet
  return decodeSource(video);
}

/**
 * Decode a still photo — the `<input type="file" capture="environment">` path,
 * which is the only one that works without HTTPS and the fastest way to test on
 * a phone.
 */
export async function decodeImageFile(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return await decodeSource(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * A decoded EAN/UPC that the API will accept — its route param is `\d{6,14}`.
 * Worth checking client-side because a misread yields digits that look fine
 * and 404 slowly against Open Food Facts.
 */
export function isPlausibleBarcode(code: string): boolean {
  return /^\d{6,14}$/.test(code);
}
