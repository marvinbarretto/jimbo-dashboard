import type { MiddlewareHandler } from 'hono';

export const requestId: MiddlewareHandler = async (c, next) => {
  const id = crypto.randomUUID();
  c.set('requestId', id);
  await next();
  c.header('X-Request-Id', id);
};
