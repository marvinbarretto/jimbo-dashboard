// Angular dev proxy.
//
// HTTP /dashboard-api/* → PRODUCTION (basic_auth gated). `npm run dev`
// fetches the basic_auth credential from the VPS and exports it as
// DASHBOARD_BASIC_AUTH ("user:password"); http-proxy-middleware injects
// it as the Authorization: Basic header on every forwarded request.
//
// WS /dashboard-api/ws/* → LOCAL dashboard-api on :3201 (no auth — the
// local API binds 127.0.0.1 and is only reachable from your machine).
// Run `npm run api` in another terminal to enable the live stream
// during dev.
//
// You ARE talking to prod data when running locally. Same blast radius
// as the production dashboard. Sole-operator setup.

const cred = process.env.DASHBOARD_BASIC_AUTH;
if (!cred) {
  // Fail loud during ng serve startup rather than silently 401 every request.
  throw new Error(
    'DASHBOARD_BASIC_AUTH is not set. Run via `npm run dev` (which fetches it from the VPS) or export it manually as "user:password".',
  );
}

module.exports = [
  {
    // SSE stream → local jimbo-api. Run `npm run dev:api` in another terminal.
    context: ['/stream'],
    target: 'http://localhost:3100',
    secure: false,
    changeOrigin: true,
  },
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
    auth: cred,
  },
];
