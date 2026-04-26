import type { MiddlewareHandler } from 'hono';
import { errorResponse } from './error.js';

// X-API-Key gate. Mirrors jimbo-api's pattern but uses a separate key
// (DASHBOARD_API_KEY) so the two services have independent rotation.
export const apiKeyAuth: MiddlewareHandler = async (c, next) => {
  const apiKey = c.req.header('X-API-Key');
  const expected = process.env.DASHBOARD_API_KEY;

  if (!expected) {
    return errorResponse(c, 500, 'SERVER_ERROR', 'Server misconfigured: no DASHBOARD_API_KEY set');
  }
  if (!apiKey) {
    return errorResponse(c, 401, 'UNAUTHORIZED', 'Missing X-API-Key header');
  }
  if (apiKey !== expected) {
    return errorResponse(c, 401, 'UNAUTHORIZED', 'Invalid API key');
  }

  await next();
};
