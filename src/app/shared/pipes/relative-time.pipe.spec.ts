import { RelativeTimePipe } from './relative-time.pipe';

describe('RelativeTimePipe', () => {
  let pipe: RelativeTimePipe;

  beforeEach(() => { pipe = new RelativeTimePipe(); });

  it('returns never for null', () => {
    expect(pipe.transform(null)).toBe('never');
  });

  it('returns never for undefined', () => {
    expect(pipe.transform(undefined)).toBe('never');
  });

  it('returns just now for <1 minute ago', () => {
    const iso = new Date(Date.now() - 30_000).toISOString();
    expect(pipe.transform(iso)).toBe('just now');
  });

  it('returns Xm ago for past minutes', () => {
    const iso = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(pipe.transform(iso)).toBe('5m ago');
  });

  it('returns Xh ago for past hours', () => {
    const iso = new Date(Date.now() - 3 * 3_600_000).toISOString();
    expect(pipe.transform(iso)).toBe('3h ago');
  });

  it('returns Xd ago for past days', () => {
    const iso = new Date(Date.now() - 2 * 86_400_000).toISOString();
    expect(pipe.transform(iso)).toBe('2d ago');
  });

  it('returns in <1m for very near future', () => {
    const iso = new Date(Date.now() + 30_000).toISOString();
    expect(pipe.transform(iso)).toBe('in <1m');
  });

  it('returns in Xm for future minutes', () => {
    const iso = new Date(Date.now() + 10 * 60_000).toISOString();
    expect(pipe.transform(iso)).toBe('in 10m');
  });

  it('returns in Xh for future hours', () => {
    const iso = new Date(Date.now() + 2 * 3_600_000).toISOString();
    expect(pipe.transform(iso)).toBe('in 2h');
  });
});
