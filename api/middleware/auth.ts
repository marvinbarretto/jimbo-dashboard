import type { MiddlewareHandler } from 'hono';
import { errorResponse } from './error.js';

// X-API-Key gate. Mirrors jimbo-api's pattern but uses a separate key
// (DASHBOARD_API_KEY) so the two services have independent rotation.
const keyPrefix = (k: string) => `${k.slice(0, 8)}…`;

export const apiKeyAuth: MiddlewareHandler = async (c, next) => {
  const apiKey = c.req.header('X-API-Key');
  const expected = process.env.DASHBOARD_API_KEY;

  if (!expected) {
    console.warn('[auth] 500 — DASHBOARD_API_KEY not set in environment');
    return errorResponse(c, 500, 'SERVER_ERROR', 'Server misconfigured: no DASHBOARD_API_KEY set');
  }
  if (!apiKey) {
    console.warn(`[auth] 401 — missing X-API-Key header (expected prefix: ${keyPrefix(expected)}) path=${c.req.path}`);
    return errorResponse(c, 401, 'UNAUTHORIZED', 'Missing X-API-Key header');
  }
  if (apiKey !== expected) {
    console.warn(`[auth] 401 — wrong key (received prefix: ${keyPrefix(apiKey)}, expected prefix: ${keyPrefix(expected)}) path=${c.req.path}`);
    return errorResponse(c, 401, 'UNAUTHORIZED', 'Invalid API key');
  }

  await next();
};
