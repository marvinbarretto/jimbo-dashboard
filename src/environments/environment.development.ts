export const environment = {
  production: false,
  dashboardApiUrl: '/dashboard-api',
  // SSE activity stream — served directly by jimbo-api, Caddy basic_auth gated.
  // Dev: Angular proxy forwards /stream/* → localhost:3100.
  streamUrl: '/stream/system-events',
};
