// Angular dev proxy.
//
// All /api/* and /stream/* → LOCAL jimbo-api on :3100. Run `npm run dev:api`
// in another terminal.
//
// You ARE talking to prod data when running locally. Same blast radius
// as the production dashboard. Sole-operator setup.

module.exports = [
  {
    // SSE stream → local jimbo-api.
    context: ['/stream'],
    target: 'http://localhost:3100',
    secure: false,
    changeOrigin: true,
  },
  {
    // All API calls → local jimbo-api (no auth header needed locally).
    context: ['/api'],
    target: 'http://localhost:3100',
    secure: false,
    changeOrigin: true,
  },
];
