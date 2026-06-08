import { HttpClient } from '@angular/common/http';
import { Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, Observable, of, startWith, switchMap } from 'rxjs';

/**
 * Cold single-entity fetch for deep-linked detail pages.
 *
 * Deep links (e.g. a search result opened from Discord) arrive without the
 * entity in any loaded list, so the detail page must fetch it by id on its own.
 * `loadOne` turns a reactive URL signal into a `{ data, loading, error }` view
 * model: it refetches whenever the URL changes, emits `loading` immediately, and
 * funnels jimbo-api's `{ error: { message } }` envelope into a flat string.
 *
 * A null URL (e.g. before the route param resolves) yields an idle, non-loading
 * state rather than firing a request. Call from an injection context (a field
 * initializer or constructor) so `toObservable`/`toSignal` bind correctly.
 */
export interface LoadState<T> {
  readonly data: T | null;
  readonly loading: boolean;
  readonly error: string | null;
}

export function loadOne<T>(http: HttpClient, url: Signal<string | null>): Signal<LoadState<T>> {
  const state$ = toObservable(url).pipe(
    switchMap((u): Observable<LoadState<T>> => {
      if (!u) return of<LoadState<T>>({ data: null, loading: false, error: null });
      return http.get<T>(u).pipe(
        map((data): LoadState<T> => ({ data, loading: false, error: null })),
        startWith<LoadState<T>>({ data: null, loading: true, error: null }),
        catchError((err) =>
          of<LoadState<T>>({
            data: null,
            loading: false,
            // jimbo-api wraps errors as { error: { code, message } }; fall back
            // to the transport message, then a generic string.
            error: err?.error?.error?.message ?? err?.message ?? 'Failed to load',
          }),
        ),
      );
    }),
  );
  return toSignal(state$, { initialValue: { data: null, loading: true, error: null } });
}
