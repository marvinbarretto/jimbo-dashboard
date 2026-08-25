import { describe, expect, it } from 'vitest';
import { formatMetric, formatMetricDelta, formatMetricPercent } from './metric-format';

describe('formatMetric', () => {
  it('renders minutes as hours and minutes', () => {
    expect(formatMetric(192, 'minutes')).toBe('3h 12m');
    expect(formatMetric(48, 'minutes')).toBe('48m');
    expect(formatMetric(120, 'minutes')).toBe('2h');
  });

  it('rounds fractional minutes rather than showing a decimal', () => {
    expect(formatMetric(38.6, 'minutes')).toBe('39m');
  });

  // Fleet spend is routinely sub-cent; 2dp would render most days as $0.00.
  it('keeps four decimals for sub-dollar currency and two above', () => {
    expect(formatMetric(0.0032, 'currency')).toBe('$0.0032');
    expect(formatMetric(12.5, 'currency')).toBe('$12.50');
  });

  // 6.22km rendered as "6" discards a fifth of the walk; distance is the one
  // unit here where the decimal carries most of the signal.
  it('keeps one decimal for distance', () => {
    expect(formatMetric(6.22, 'km')).toBe('6.2km');
    expect(formatMetric(10, 'km')).toBe('10.0km');
  });

  it('groups large counts', () => {
    expect(formatMetric(2140, 'count')).toBe('2,140');
  });
});

describe('formatMetricDelta', () => {
  it('always carries an explicit sign', () => {
    expect(formatMetricDelta(4, 'count')).toBe('+4');
    expect(formatMetricDelta(-4, 'count')).toBe('−4');
  });

  it('formats the magnitude in the metric unit, not raw', () => {
    expect(formatMetricDelta(-64, 'minutes')).toBe('−1h 4m');
  });
});

describe('formatMetricPercent', () => {
  it('is signed and relative to the reference', () => {
    expect(formatMetricPercent(192, 310)).toBe('−38%');
    expect(formatMetricPercent(10, 8)).toBe('+25%');
  });

  it('drops the sign at zero change', () => {
    expect(formatMetricPercent(8, 8)).toBe('0%');
  });

  // A change from nothing is infinite, not a percentage — callers must fall
  // back to "none yesterday" rather than print +∞%.
  it('returns null against a zero reference', () => {
    expect(formatMetricPercent(6, 0)).toBeNull();
  });
});
