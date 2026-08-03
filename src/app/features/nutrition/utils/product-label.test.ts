import { describe, expect, it } from 'vitest';
import { productDisplayName } from './product-label';
import { isPlausibleBarcode } from '../data-access/barcode-decoder';

// Shapes below are the real ones Open Food Facts returns for these products —
// the duplication is the point, not a contrived edge case.
describe('productDisplayName', () => {
  it('joins a distinct brand and name', () => {
    expect(productDisplayName('Barilla', 'Napoletana')).toBe('Barilla — Napoletana');
  });

  it('does not repeat a brand the name already carries', () => {
    expect(productDisplayName('Snickers', 'Snickers')).toBe('Snickers');
  });

  it('matches case-insensitively, as OFF casing is inconsistent', () => {
    expect(productDisplayName('Coca-Cola', 'coca-cola')).toBe('coca-cola');
  });

  it('falls back to the bare name when there is no brand', () => {
    expect(productDisplayName(null, 'Draught Guinness')).toBe('Draught Guinness');
  });
});

describe('isPlausibleBarcode', () => {
  it('accepts the retail lengths the API will take', () => {
    expect(isPlausibleBarcode('5449000000996')).toBe(true); // EAN-13
    expect(isPlausibleBarcode('50184142')).toBe(true); // EAN-8
  });

  it('rejects anything the API route would 400 on', () => {
    expect(isPlausibleBarcode('12345')).toBe(false); // too short
    expect(isPlausibleBarcode('123456789012345')).toBe(false); // too long
    expect(isPlausibleBarcode('5449-0000')).toBe(false); // not digits
    expect(isPlausibleBarcode('')).toBe(false);
  });
});
