export const environment = {
  production: true,
  apiUrl: 'https://jimbo.fourfoldmedia.uk/data',
  // Caddy on jimbo.fourfoldmedia.uk routes /dashboard-api/* → :3201.
  dashboardApiUrl: '/dashboard-api',
  // Replaced at deploy time — see deploy.sh + /opt/dashboard-api.env on the VPS.
  // The committed value here is a placeholder; the real key never lands in git.
  dashboardApiKey: '__DASHBOARD_API_KEY__',
};
