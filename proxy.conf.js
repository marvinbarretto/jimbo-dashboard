// Angular dev proxy.
//
// HTTP /dashboard-api/* → PRODUCTION so local UI work doesn't require the
// SSH tunnel + a local dashboard-api process. `npm run dev` fetches
// DASHBOARD_API_KEY from the VPS and exports it before running ng serve;
// the proxy injects it as X-API-Key on every forwarded request.
//
// WS /dashboard-api/ws/* → LOCAL dashboard-api on :3201. WebSocket auth
// uses ?key=<env.dashboardApiKey> (browsers can't set headers on WS
// upgrades), and the local-dev-key in environment.ts only matches the
// LOCAL DASHBOARD_API_KEY — not the production one. So to use the live
// activity stream in dev, run `npm run api` in another terminal.
//
// You ARE talking to prod data when running locally. Same blast radius as
// the production dashboard. Sole-operator setup.

const apiKey = process.env.DASHBOARD_API_KEY;
if (!apiKey) {
  // Fail loud during ng serve startup rather than silently 401 every request.
  throw new Error(
    'DASHBOARD_API_KEY is not set. Run via `npm run dev` (which fetches it from the VPS) or export it manually.',
  );
}

module.exports = [
  {
    context: ['/dashboard-api/ws'],
    target: 'ws://localhost:3201',
    ws: true,
    secure: false,
    changeOrigin: true,
  },
  {
    context: ['/dashboard-api'],
    target: 'https://jimbo.fourfoldmedia.uk',
    secure: true,
    changeOrigin: true,
    headers: {
      'X-API-Key': apiKey,
    },
  },
];
