import { describe, expect, it } from 'vitest';
import { type ActivatedRouteSnapshot, type DetachedRouteHandle } from '@angular/router';
import { MobileTabReuseStrategy, REUSE_TAB } from './mobile-tab-reuse-strategy';

const tabRoute = (tab: string): ActivatedRouteSnapshot =>
  ({ data: { [REUSE_TAB]: tab } }) as unknown as ActivatedRouteSnapshot;

const plainRoute = (): ActivatedRouteSnapshot =>
  ({ data: {} }) as unknown as ActivatedRouteSnapshot;

const handle = (): DetachedRouteHandle => ({ componentRef: {} });

describe('MobileTabReuseStrategy', () => {
  it('detaches and reattaches routes marked with reuseTab', () => {
    const strategy = new MobileTabReuseStrategy();
    const train = tabRoute('train');
    const stored = handle();

    expect(strategy.shouldDetach(train)).toBe(true);
    strategy.store(train, stored);

    expect(strategy.shouldAttach(tabRoute('train'))).toBe(true);
    expect(strategy.retrieve(tabRoute('train'))).toBe(stored);
  });

  it('keeps handles per tab', () => {
    const strategy = new MobileTabReuseStrategy();
    const trainHandle = handle();
    const logHandle = handle();
    strategy.store(tabRoute('train'), trainHandle);
    strategy.store(tabRoute('log'), logHandle);

    expect(strategy.retrieve(tabRoute('train'))).toBe(trainHandle);
    expect(strategy.retrieve(tabRoute('log'))).toBe(logHandle);
  });

  it('never detaches or attaches unmarked routes — desktop keeps destroy-on-navigate', () => {
    const strategy = new MobileTabReuseStrategy();
    strategy.store(tabRoute('train'), handle());

    expect(strategy.shouldDetach(plainRoute())).toBe(false);
    expect(strategy.shouldAttach(plainRoute())).toBe(false);
    expect(strategy.retrieve(plainRoute())).toBeNull();
    // Storing on an unmarked route is a no-op, not a crash.
    strategy.store(plainRoute(), handle());
  });

  it('does not attach before anything is stored', () => {
    const strategy = new MobileTabReuseStrategy();
    expect(strategy.shouldAttach(tabRoute('train'))).toBe(false);
    expect(strategy.retrieve(tabRoute('train'))).toBeNull();
  });

  it('clears a stored handle when the router stores null', () => {
    const strategy = new MobileTabReuseStrategy();
    strategy.store(tabRoute('train'), handle());
    strategy.store(tabRoute('train'), null);
    expect(strategy.shouldAttach(tabRoute('train'))).toBe(false);
  });
});
