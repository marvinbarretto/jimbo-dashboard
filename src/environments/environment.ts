export const environment = {
  production: false,
  // Dashboard API (Hono service that wraps jimbo_pg). Same prefix in dev
  // and prod so request shape is identical: dev → Angular proxy → :3201,
  // prod → Caddy → :3201. Auth: Caddy basic_auth on the public host —
  // the bundle ships nothing sensitive.
  dashboardApiUrl: '',
  // SSE activity stream — served directly by jimbo-api, Caddy basic_auth gated.
  // Dev: Angular proxy forwards /stream/* → localhost:3100.
  streamUrl: '/stream/system-events',
};
