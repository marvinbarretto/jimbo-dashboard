export const environment = {
  production: true,
  // Caddy on jimbo.fourfoldmedia.uk routes /dashboard-api/* → :3201,
  // gated by basic_auth at the host level. Bundle ships nothing
  // sensitive — same artifact as dev.
  dashboardApiUrl: '/dashboard-api',
};
