import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { catchError, throwError } from 'rxjs';

// Bounce to the server login on an API 401.
//
// Caddy's SPA gate only checks that the `jimbo_session` cookie *exists*, not
// that it's still valid — so an expired-but-present cookie loads the app, then
// every /api/* call 401s. Without this, the user is stranded on a dashboard
// full of "failed to load" toasts with no hint they're actually logged out.
//
// Scope is deliberately tight to avoid redirect loops: only real 401s, only
// from /api/* requests, and never while already on the auth pages. After login
// the fresh cookie makes /api/* return 200, so there's nothing to loop on.
export const authRedirectInterceptor: HttpInterceptorFn = (req, next) => {
  const doc = inject(DOCUMENT);
  return next(req).pipe(
    catchError((err: unknown) => {
      const onAuthPage = doc.location.pathname.startsWith('/auth/');
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        req.url.includes('/api/') &&
        !onAuthPage
      ) {
        const ret = encodeURIComponent(doc.location.pathname + doc.location.search);
        doc.location.href = `/auth/login?return=${ret}`;
      }
      return throwError(() => err);
    }),
  );
};
