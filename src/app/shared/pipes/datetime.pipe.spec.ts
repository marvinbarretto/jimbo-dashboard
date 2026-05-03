import { DatetimePipe } from './datetime.pipe';

describe('DatetimePipe', () => {
  let pipe: DatetimePipe;

  beforeEach(() => { pipe = new DatetimePipe(); });

  it('returns — for null', () => {
    expect(pipe.transform(null)).toBe('—');
  });

  it('returns — for undefined', () => {
    expect(pipe.transform(undefined)).toBe('—');
  });

  it('returns — for empty string', () => {
    expect(pipe.transform('')).toBe('—');
  });

  it('returns the value unchanged for an invalid string', () => {
    expect(pipe.transform('not-a-date')).toBe('not-a-date');
  });

  it('includes year for a past-year date', () => {
    const result = pipe.transform('2020-03-15T09:30:45.000Z');
    expect(result).toMatch(/2020/);
    expect(result).toMatch(/Mar/);
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('omits year for current-year dates', () => {
    const year = new Date().getFullYear();
    const result = pipe.transform(`${year}-06-15T10:30:00.000Z`);
    expect(result).not.toMatch(new RegExp(String(year)));
    expect(result).toMatch(/Jun/);
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('formats time as HH:MM:SS', () => {
    const result = pipe.transform('2020-01-01T00:00:00.000Z');
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
  });
});
