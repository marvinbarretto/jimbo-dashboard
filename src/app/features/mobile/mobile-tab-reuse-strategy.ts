import {
  type ActivatedRouteSnapshot,
  type DetachedRouteHandle,
  type RouteReuseStrategy,
} from '@angular/router';

/**
 * Route `data` key opting a route into detach/reattach reuse. Its value names
 * the stored handle, so it must be unique per reusable route.
 */
export const REUSE_TAB = 'reuseTab';

/**
 * Detach/reattach reuse for the /m bottom-nav tabs — the standard mobile tab
 * pattern: switching tabs parks the component (state, subscriptions, DOM)
 * instead of destroying it, so revisiting shows the previous render instantly
 * and no `httpResource` refires on remount.
 *
 * Deliberately opt-in via `data: { reuseTab }` on the three /m child routes.
 * Every other route — all of desktop — hits the base class's defaults and
 * keeps destroy-on-navigate, per the scope fence in JIM-4646.
 *
 * Parked tabs keep their timers (Today's visible-only briefing poll still
 * ticks) but a resource `reload()` issued while parked only marks the view
 * dirty — the fetch fires on reattach, verified in dev tools. Exactly right
 * for a tab nobody is looking at: no background spend, fresh on return.
 *
 * Implements the contract with type-only imports rather than extending the
 * decorated BaseRouteReuseStrategy: vitest bundles `.test.ts` files outside
 * the Angular compiler's program, and inheriting Angular metadata here would
 * break that build. Undecorated is fine — `useClass` in app.config news it
 * up, and it has no deps.
 */
export class MobileTabReuseStrategy implements RouteReuseStrategy {
  private readonly handles = new Map<string, DetachedRouteHandle>();

  private key(route: ActivatedRouteSnapshot): string | null {
    const key = route.data[REUSE_TAB];
    return typeof key === 'string' ? key : null;
  }

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return this.key(route) !== null;
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    const key = this.key(route);
    if (key === null) return;
    if (handle) this.handles.set(key, handle);
    else this.handles.delete(key);
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    const key = this.key(route);
    return key !== null && this.handles.has(key);
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    const key = this.key(route);
    return key === null ? null : (this.handles.get(key) ?? null);
  }

  /** The router default: reuse when the navigation stays on the same route config. */
  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === curr.routeConfig;
  }
}
