// Angular dev proxy. Sends /dashboard-api/* requests to PRODUCTION so
// local UI work doesn't require the SSH tunnel + a local dashboard-api
// process anymore.
//
// `npm run dev` (see package.json) fetches DASHBOARD_API_KEY from the VPS
// and exports it before running `ng serve`. The proxy injects it as the
// X-API-Key header on every forwarded request.
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

module.exports = {
  '/dashboard-api': {
    target: 'https://jimbo.fourfoldmedia.uk',
    secure: true,
    changeOrigin: true,
    headers: {
      'X-API-Key': apiKey,
    },
  },
};
