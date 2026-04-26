export const environment = {
  production: false,
  apiUrl: 'https://jimbo.fourfoldmedia.uk/data',
  // Dashboard API (Hono service that wraps jimbo_pg). Same prefix in dev and
  // prod so request shape is identical: dev → Angular proxy → :3201,
  // prod → Caddy → :3201.
  dashboardApiUrl: '/dashboard-api',
  // Picked up by DashboardApiKeyInterceptor. The dashboard sits behind Caddy
  // basicauth in production, so leakage radius = compromised operator.
  dashboardApiKey: 'local-dev-key-ab1c1b2cc194d65f',
};
