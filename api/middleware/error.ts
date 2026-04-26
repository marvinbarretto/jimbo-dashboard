import type { Context } from 'hono';
import type { Hook } from '@hono/zod-openapi';

type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 500;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validationHook: Hook<any, any, any, any> = (result, c) => {
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      path: issue.path.map(String).join('.'),
      issue: issue.message,
    }));
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          request_id: c.get('requestId') ?? '00000000-0000-0000-0000-000000000000',
          details,
        },
      },
      400,
    );
  }
};

export function errorResponse<S extends ErrorStatus>(
  c: Context,
  status: S,
  code: string,
  message: string,
) {
  return c.json(
    {
      error: {
        code,
        message,
        request_id: c.get('requestId') ?? '00000000-0000-0000-0000-000000000000',
      },
    },
    status,
  );
}
