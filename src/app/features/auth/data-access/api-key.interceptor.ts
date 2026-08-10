import { type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ApiCredentials } from './api-credentials.service';

/**
 * Attaches the native shell's X-API-Key to jimbo-api calls.
 *
 * No-ops in a browser, where `key()` is null and the session cookie the
 * browser sends automatically is the credential.
 *
 * Same-origin `/api` only. The key must not leak to a third-party host, and
 * the dashboard is served from the same origin as the API by construction, so
 * a relative-path check is the whole guard.
 *
 * Note `/stream/*` is deliberately not covered: SSE goes over EventSource,
 * which cannot set request headers. The stream stays cookie-only — no phone
 * shell tab consumes it today.
 */
export const apiKeyInterceptor: HttpInterceptorFn = (req, next) => {
  const key = inject(ApiCredentials).key();
  if (!key || !req.url.startsWith('/api')) return next(req);
  return next(req.clone({ setHeaders: { 'X-API-Key': key } }));
};
